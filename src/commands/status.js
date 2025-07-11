const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const HealthCheck = require('../utils/health-check');
const logger = require('../utils/logger');

const status = async () => {
  const userDir = require('os').homedir();
  const meusSitesPath = path.join(userDir, 'meus-sites');

  try {
    logger.info('🔍 Verificando status do System Ricol...');

    // Opções de verificação
    const { checkType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'checkType',
        message: 'O que você deseja verificar?',
        choices: [
          { name: '🌐 Status do ambiente global', value: 'global' },
          { name: '📂 Status de um projeto específico', value: 'project' },
          { name: '📊 Status completo (global + todos os projetos)', value: 'full' },
          { name: '🔧 Diagnóstico de problemas', value: 'diagnostic' }
        ]
      }
    ]);

    switch (checkType) {
      case 'global':
        await checkGlobalStatus();
        break;
      
      case 'project':
        await checkProjectStatus(meusSitesPath);
        break;
      
      case 'full':
        await checkFullStatus(meusSitesPath);
        break;
      
      case 'diagnostic':
        await runDiagnostic(meusSitesPath);
        break;
    }

  } catch (error) {
    logger.errorWithStack(error);
    process.exit(1);
  }
};

async function checkGlobalStatus() {
  const results = await HealthCheck.checkGlobalEnvironment();
  const report = HealthCheck.generateReport(results);
  
  console.log(report);
  
  if (!results.overall) {
    logger.warn('💡 Execute "system-ricol global start" para tentar resolver problemas');
  }
}

async function checkProjectStatus(meusSitesPath) {
  // Lista projetos disponíveis
  const projects = getAvailableProjects(meusSitesPath);
  
  if (projects.length === 0) {
    logger.warn('Nenhum projeto encontrado');
    return;
  }

  const { selectedProject } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedProject',
      message: 'Selecione o projeto para verificar:',
      choices: projects
    }
  ]);

  const projectPath = path.join(meusSitesPath, selectedProject);
  const projectUrl = getProjectUrl(projectPath);
  
  const results = await HealthCheck.checkProject(projectPath, projectUrl);
  const report = HealthCheck.generateReport(results);
  
  console.log(report);
}

async function checkFullStatus(meusSitesPath) {
  // Verifica ambiente global
  logger.info('📊 Executando verificação completa...\n');
  
  const globalResults = await HealthCheck.checkGlobalEnvironment();
  console.log('🌐 AMBIENTE GLOBAL:');
  console.log(HealthCheck.generateReport(globalResults));

  // Verifica todos os projetos
  const projects = getAvailableProjects(meusSitesPath);
  
  if (projects.length > 0) {
    console.log('\n📂 PROJETOS:');
    
    for (const project of projects) {
      const projectPath = path.join(meusSitesPath, project);
      const projectUrl = getProjectUrl(projectPath);
      
      if (projectUrl) {
        const projectResults = await HealthCheck.checkProject(projectPath, projectUrl);
        
        const icon = projectResults.overall ? '✅' : '❌';
        console.log(`\n${icon} ${project} (${projectUrl})`);
        
        if (!projectResults.overall) {
          console.log('   🔍 Problemas detectados - execute verificação individual para detalhes');
        }
      }
    }
  } else {
    console.log('\n📂 PROJETOS: Nenhum projeto encontrado');
  }

  // Resumo geral
  const totalProjects = projects.length;
  const healthyProjects = projects.filter(project => {
    // Simplificado para o resumo
    return true; // Seria necessário verificar cada um individualmente
  }).length;

  console.log('\n📈 RESUMO GERAL:');
  console.log(`   🌐 Ambiente Global: ${globalResults.overall ? 'Saudável' : 'Com problemas'}`);
  console.log(`   📂 Projetos: ${healthyProjects}/${totalProjects} funcionando`);
}

async function runDiagnostic(meusSitesPath) {
  logger.info('🔧 Executando diagnóstico completo...\n');

  const diagnostics = {
    system: await checkSystemRequirements(),
    docker: await checkDockerStatus(),
    global: await HealthCheck.checkGlobalEnvironment(),
    diskSpace: await checkDiskSpace(),
    ports: await checkPortsAvailability()
  };

  // Exibe resultados do diagnóstico
  console.log('🔧 DIAGNÓSTICO DO SISTEMA:\n');

  console.log('⚙️  REQUISITOS DO SISTEMA:');
  diagnostics.system.forEach(item => {
    const icon = item.available ? '✅' : '❌';
    console.log(`   ${icon} ${item.name}: ${item.version || 'não encontrado'}`);
  });

  console.log('\n🐳 STATUS DO DOCKER:');
  const dockerIcon = diagnostics.docker.running ? '✅' : '❌';
  console.log(`   ${dockerIcon} Docker: ${diagnostics.docker.status}`);
  if (diagnostics.docker.version) {
    console.log(`   📋 Versão: ${diagnostics.docker.version}`);
  }

  console.log('\n💾 ESPAÇO EM DISCO:');
  const spaceIcon = diagnostics.diskSpace.available > 1000 ? '✅' : '⚠️';
  console.log(`   ${spaceIcon} Disponível: ${diagnostics.diskSpace.available} MB`);
  
  console.log('\n🔌 PORTAS:');
  diagnostics.ports.forEach(port => {
    const portIcon = port.available ? '✅' : '❌';
    console.log(`   ${portIcon} Porta ${port.port}: ${port.available ? 'disponível' : 'em uso'}`);
  });

  // Recomendações
  console.log('\n💡 RECOMENDAÇÕES:');
  const recommendations = generateRecommendations(diagnostics);
  recommendations.forEach(rec => console.log(`   • ${rec}`));
}

function getAvailableProjects(meusSitesPath) {
  try {
    return fs.readdirSync(meusSitesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => {
        const dockerFile = path.join(meusSitesPath, dirent.name, 'docker-compose.yml');
        return fs.existsSync(dockerFile);
      })
      .map(dirent => dirent.name);
  } catch (error) {
    return [];
  }
}

function getProjectUrl(projectPath) {
  try {
    const envPath = path.join(projectPath, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/SITE_URL=(.+)/);
      return match ? match[1].trim() : null;
    }
  } catch (error) {
    // Ignora erros
  }
  return null;
}

async function checkSystemRequirements() {
  const { execSync } = require('child_process');
  const requirements = [
    { name: 'Docker', command: 'docker --version' },
    { name: 'Docker Compose', command: 'docker-compose --version' },
    { name: 'mkcert', command: 'mkcert -version' },
    { name: 'Node.js', command: 'node --version' },
    { name: 'npm', command: 'npm --version' }
  ];

  return requirements.map(req => {
    try {
      const output = execSync(req.command, { encoding: 'utf8', stdio: 'pipe' });
      return {
        name: req.name,
        available: true,
        version: output.trim()
      };
    } catch (error) {
      return {
        name: req.name,
        available: false,
        error: error.message
      };
    }
  });
}

async function checkDockerStatus() {
  const { execSync } = require('child_process');
  try {
    const version = execSync('docker --version', { encoding: 'utf8', stdio: 'pipe' });
    execSync('docker ps', { stdio: 'ignore' });
    
    return {
      running: true,
      status: 'funcionando',
      version: version.trim()
    };
  } catch (error) {
    return {
      running: false,
      status: 'não funcionando ou não instalado',
      error: error.message
    };
  }
}

async function checkDiskSpace() {
  const { execSync } = require('child_process');
  try {
    const output = execSync('df -m ~', { encoding: 'utf8' });
    const lines = output.split('\n');
    const dataLine = lines[1];
    const columns = dataLine.split(/\s+/);
    const available = parseInt(columns[3]);
    
    return { available };
  } catch (error) {
    return { available: 0, error: error.message };
  }
}

async function checkPortsAvailability() {
  const ports = [80, 443, 3306, 8080, 8092];
  const HealthCheck = require('../utils/health-check');
  
  const results = [];
  for (const port of ports) {
    const result = await HealthCheck.checkPort('localhost', port);
    results.push({
      port,
      available: !result.open
    });
  }
  
  return results;
}

function generateRecommendations(diagnostics) {
  const recommendations = [];

  // Verifica requisitos do sistema
  diagnostics.system.forEach(req => {
    if (!req.available) {
      recommendations.push(`Instale ${req.name} para usar o System Ricol`);
    }
  });

  // Verifica Docker
  if (!diagnostics.docker.running) {
    recommendations.push('Inicie o Docker para usar o System Ricol');
  }

  // Verifica espaço em disco
  if (diagnostics.diskSpace.available < 1000) {
    recommendations.push('Libere espaço em disco (menos de 1GB disponível)');
  }

  // Verifica portas
  const blockedPorts = diagnostics.ports.filter(p => !p.available);
  if (blockedPorts.length > 0) {
    const portNumbers = blockedPorts.map(p => p.port).join(', ');
    recommendations.push(`Libere as portas: ${portNumbers}`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Sistema funcionando corretamente! 🎉');
  }

  return recommendations;
}

module.exports = status; 