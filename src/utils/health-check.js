const { execSync } = require('child_process');
const logger = require('./logger');

/**
 * Sistema de health checks para containers e serviços
 */
class HealthCheck {
  
  /**
   * Verifica se um container está saudável
   */
  static async checkContainer(containerName) {
    try {
      const status = execSync(`docker inspect --format='{{.State.Status}}' ${containerName}`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
      
      const health = execSync(`docker inspect --format='{{.State.Health.Status}}' ${containerName}`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
      
      return {
        name: containerName,
        status,
        health: health || 'no-health-check',
        healthy: status === 'running' && (health === 'healthy' || health === '')
      };
    } catch (error) {
      return {
        name: containerName,
        status: 'not-found',
        health: 'unknown',
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica se uma URL está respondendo
   */
  static async checkUrl(url, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const check = async () => {
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(timeout)
          });
          
          resolve({
            url,
            status: response.status,
            healthy: response.status >= 200 && response.status < 400,
            responseTime: Date.now() - startTime
          });
        } catch (error) {
          if (Date.now() - startTime < timeout) {
            setTimeout(check, 1000);
          } else {
            resolve({
              url,
              status: 0,
              healthy: false,
              error: error.message,
              responseTime: Date.now() - startTime
            });
          }
        }
      };
      
      check();
    });
  }

  /**
   * Verifica se uma porta está aberta
   */
  static async checkPort(host, port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ host, port, open: false, error: 'timeout' });
      }, 5000);
      
      socket.connect(port, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ host, port, open: true });
      });
      
      socket.on('error', () => {
        clearTimeout(timeout);
        resolve({ host, port, open: false, error: 'connection_refused' });
      });
    });
  }

  /**
   * Executa health check completo do ambiente global
   */
  static async checkGlobalEnvironment() {
    logger.info('🔍 Executando health check do ambiente global...');
    
    const results = {
      timestamp: new Date().toISOString(),
      containers: {},
      networks: {},
      services: {},
      overall: true
    };

    // Verifica containers principais
    const containers = ['global-traefik', 'global-mariadb', 'global-phpmyadmin'];
    
    for (const container of containers) {
      results.containers[container] = await this.checkContainer(container);
      if (!results.containers[container].healthy) {
        results.overall = false;
      }
    }

    // Verifica redes Docker
    const networks = ['sr-reverse-proxy', 'sr-public_network'];
    
    for (const network of networks) {
      try {
        execSync(`docker network inspect ${network}`, { stdio: 'ignore' });
        results.networks[network] = { exists: true, healthy: true };
      } catch (error) {
        results.networks[network] = { exists: false, healthy: false };
        results.overall = false;
      }
    }

    // Verifica serviços
    results.services.traefik = await this.checkUrl('http://localhost:8080/api/http/services');
    results.services.mariadb = await this.checkPort('localhost', 3306);
    results.services.phpmyadmin = await this.checkUrl('http://localhost:8092');

    // Log do resultado
    if (results.overall) {
      logger.success('✅ Ambiente global está saudável');
    } else {
      logger.warn('⚠️  Problemas detectados no ambiente global');
    }

    return results;
  }

  /**
   * Executa health check de um projeto específico
   */
  static async checkProject(projectPath, projectUrl) {
    logger.info(`🔍 Executando health check do projeto: ${projectUrl}`);
    
    const results = {
      timestamp: new Date().toISOString(),
      project: projectUrl,
      containers: {},
      services: {},
      overall: true
    };

    try {
      // Lê docker-compose para identificar containers
      const dockerCompose = require('fs').readFileSync(
        require('path').join(projectPath, 'docker-compose.yml'),
        'utf8'
      );
      
      // Identifica containers baseado no SITE_NAME
      const siteNameMatch = dockerCompose.match(/<SITE_NAME>/g);
      if (siteNameMatch) {
        const projectName = require('path').basename(projectPath);
        const containerNames = [`${projectName}-nginx`, `${projectName}-phpfpm`];
        
        for (const container of containerNames) {
          results.containers[container] = await this.checkContainer(container);
          if (!results.containers[container].healthy) {
            results.overall = false;
          }
        }
      }

      // Verifica se o site está respondendo
      results.services.website = await this.checkUrl(`https://${projectUrl}`);
      
      if (!results.services.website.healthy) {
        results.overall = false;
      }

    } catch (error) {
      logger.error(`Erro ao verificar projeto: ${error.message}`);
      results.overall = false;
      results.error = error.message;
    }

    // Log do resultado
    if (results.overall) {
      logger.success(`✅ Projeto ${projectUrl} está saudável`);
    } else {
      logger.warn(`⚠️  Problemas detectados no projeto ${projectUrl}`);
    }

    return results;
  }

  /**
   * Gera relatório de health check em formato legível
   */
  static generateReport(results) {
    let report = `\n📊 RELATÓRIO DE HEALTH CHECK\n`;
    report += `⏰ ${results.timestamp}\n\n`;

    if (results.containers) {
      report += `🐳 CONTAINERS:\n`;
      Object.entries(results.containers).forEach(([name, status]) => {
        const icon = status.healthy ? '✅' : '❌';
        report += `  ${icon} ${name}: ${status.status} (${status.health})\n`;
      });
      report += '\n';
    }

    if (results.networks) {
      report += `🌐 REDES:\n`;
      Object.entries(results.networks).forEach(([name, status]) => {
        const icon = status.healthy ? '✅' : '❌';
        report += `  ${icon} ${name}: ${status.exists ? 'existe' : 'não existe'}\n`;
      });
      report += '\n';
    }

    if (results.services) {
      report += `🚀 SERVIÇOS:\n`;
      Object.entries(results.services).forEach(([name, status]) => {
        const icon = status.healthy ? '✅' : '❌';
        const info = status.status ? `HTTP ${status.status}` : status.open ? 'porta aberta' : 'indisponível';
        report += `  ${icon} ${name}: ${info}\n`;
      });
      report += '\n';
    }

    const overallIcon = results.overall ? '✅' : '❌';
    report += `${overallIcon} STATUS GERAL: ${results.overall ? 'SAUDÁVEL' : 'PROBLEMAS DETECTADOS'}\n`;

    return report;
  }
}

module.exports = HealthCheck; 