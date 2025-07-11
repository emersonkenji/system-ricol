const { execSync } = require('child_process');

/**
 * Utilitário para tratamento centralizado de erros
 */
class ErrorHandler {
  static gracefulExit(message, code = 1) {
    console.error(`❌ ${message}`);
    process.exit(code);
  }

  static async retryOperation(operation, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`⚠️  Tentativa ${i + 1} falhou, tentando novamente em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  static async waitForContainer(containerName, maxWait = 60000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      try {
        const status = execSync(`docker inspect --format='{{.State.Health.Status}}' ${containerName}`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        }).trim();
        
        if (status === 'healthy' || status === '') {
          return true;
        }
      } catch (error) {
        // Container ainda não existe ou não está pronto
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error(`Container ${containerName} não ficou pronto em ${maxWait}ms`);
  }

  static validateRequiredCommands() {
    const commands = ['docker', 'docker-compose', 'mkcert'];
    const missing = [];

    commands.forEach(cmd => {
      try {
        execSync(`which ${cmd}`, { stdio: 'ignore' });
      } catch (error) {
        missing.push(cmd);
      }
    });

    if (missing.length > 0) {
      this.gracefulExit(`Comandos obrigatórios não encontrados: ${missing.join(', ')}`);
    }
  }
}

module.exports = ErrorHandler; 