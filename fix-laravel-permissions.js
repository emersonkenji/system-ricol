#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const inquirer = require('inquirer');

/**
 * Script para corrigir permissões de projetos Laravel no Docker
 */

async function main() {
  console.log('🔧 Laravel Permissions Fixer');
  console.log('================================\n');

  const userDir = require('os').homedir();
  const meusSitesPath = path.join(userDir, 'meus-sites');

  try {
    // Verificar se a pasta meus-sites existe
    if (!fs.existsSync(meusSitesPath)) {
      console.log('❌ Pasta meus-sites não encontrada!');
      console.log(`Esperado em: ${meusSitesPath}`);
      process.exit(1);
    }

    // Listar projetos disponíveis
    const projects = fs.readdirSync(meusSitesPath)
      .filter(item => {
        const projectPath = path.join(meusSitesPath, item);
        return fs.statSync(projectPath).isDirectory() && 
               (fs.existsSync(path.join(projectPath, 'artisan')) || 
                fs.existsSync(path.join(projectPath, 'composer.json')));
      });

    if (projects.length === 0) {
      console.log('❌ Nenhum projeto Laravel encontrado em meus-sites!');
      process.exit(1);
    }

    // Permitir escolher projeto ou todos
    const { selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProject',
        message: 'Qual projeto deseja corrigir?',
        choices: [
          ...projects.map(project => ({ name: project, value: project })),
          { name: '🔧 Corrigir TODOS os projetos', value: '__all__' }
        ]
      }
    ]);

    const projectsToFix = selectedProject === '__all__' ? projects : [selectedProject];

    for (const project of projectsToFix) {
      console.log(`\n🔄 Processando projeto: ${project}`);
      const projectPath = path.join(meusSitesPath, project);
      
      try {
        await fixLaravelPermissions(projectPath);
        console.log(`✅ ${project} - Permissões corrigidas!`);
      } catch (error) {
        console.error(`❌ ${project} - Erro: ${error.message}`);
      }
    }

    console.log('\n🎉 Processo concluído!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    process.exit(1);
  }
}

/**
 * Corrige permissões do Laravel
 * @param {string} projectPath - Caminho do projeto
 */
async function fixLaravelPermissions(projectPath) {
  const userName = require('os').userInfo().username;
  
  console.log('  📁 Verificando estrutura de diretórios...');
  
  // Criar diretórios necessários
  const requiredDirs = [
    'storage/app',
    'storage/app/public', 
    'storage/framework',
    'storage/framework/cache',
    'storage/framework/cache/data',
    'storage/framework/sessions',
    'storage/framework/views',
    'storage/logs',
    'bootstrap/cache'
  ];

  for (const dir of requiredDirs) {
    const fullPath = path.join(projectPath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`    ➕ Criado: ${dir}`);
    }
  }

  console.log('  🔒 Aplicando permissões...');
  
  try {
    // Obter UID/GID do usuário atual
    const uid = process.getuid ? process.getuid() : 1000;
    const gid = process.getgid ? process.getgid() : 1000;

    // Permissões básicas
    execSync(`chmod -R 755 "${projectPath}"`, { stdio: 'pipe' });
    
    // Permissões específicas para diretórios writable
    execSync(`chmod -R 775 "${path.join(projectPath, 'storage')}"`, { stdio: 'pipe' });
    execSync(`chmod -R 775 "${path.join(projectPath, 'bootstrap', 'cache')}"`, { stdio: 'pipe' });
    
    // Tentar definir ownership
    try {
      execSync(`chown -R ${uid}:${gid} "${projectPath}"`, { stdio: 'pipe' });
      console.log(`    👤 Ownership: ${uid}:${gid}`);
    } catch (chownError) {
      // Se não conseguir fazer chown, usar permissões mais permissivas
      execSync(`chmod -R 777 "${path.join(projectPath, 'storage')}"`, { stdio: 'pipe' });
      execSync(`chmod -R 777 "${path.join(projectPath, 'bootstrap', 'cache')}"`, { stdio: 'pipe' });
      console.log('    🔓 Permissões 777 aplicadas (fallback)');
    }

  } catch (error) {
    console.log('    ⚠️ Erro nas permissões, tentando fallback...');
    // Fallback para permissões mais amplas
    execSync(`chmod -R 777 "${path.join(projectPath, 'storage')}"`, { stdio: 'pipe' });
    execSync(`chmod -R 777 "${path.join(projectPath, 'bootstrap', 'cache')}"`, { stdio: 'pipe' });
  }

  console.log('  🗑️ Limpando cache...');
  
  // Limpar cache existente
  try {
    const cacheFiles = [
      path.join(projectPath, 'storage/framework/views/*'),
      path.join(projectPath, 'storage/framework/cache/data/*'),
      path.join(projectPath, 'bootstrap/cache/*.php')
    ];

    for (const pattern of cacheFiles) {
      try {
        execSync(`rm -f ${pattern}`, { stdio: 'pipe' });
      } catch (e) {
        // Ignorar erros de arquivos não encontrados
      }
    }
  } catch (error) {
    console.log('    ⚠️ Alguns arquivos de cache não puderam ser removidos');
  }

  console.log('  📝 Criando .gitkeep...');
  
  // Criar arquivos .gitkeep
  const gitkeepDirs = [
    'storage/app',
    'storage/framework/cache/data',
    'storage/framework/sessions', 
    'storage/framework/views',
    'storage/logs'
  ];

  for (const dir of gitkeepDirs) {
    const gitkeepPath = path.join(projectPath, dir, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
    }
  }
}

/**
 * Função para uso direto de um projeto específico
 * @param {string} projectPath - Caminho completo do projeto
 */
async function fixSingleProject(projectPath) {
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Projeto não encontrado: ${projectPath}`);
  }

  const projectName = path.basename(projectPath);
  console.log(`🔧 Corrigindo permissões: ${projectName}`);
  
  await fixLaravelPermissions(projectPath);
  console.log(`✅ ${projectName} - Concluído!`);
}

// Se executado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  fixLaravelPermissions,
  fixSingleProject
};