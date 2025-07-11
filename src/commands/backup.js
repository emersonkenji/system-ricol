const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../utils/logger');

const backup = async () => {
  const userDir = require('os').homedir();
  const globalPath = path.join(userDir, 'ricol-global-docker-local-ssl');
  const backupDir = path.join(globalPath, 'backups');

  try {
    // Opções de backup
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'O que você deseja fazer com os backups?',
        choices: [
          { name: '💾 Executar backup agora', value: 'run' },
          { name: '📋 Listar backups disponíveis', value: 'list' },
          { name: '📊 Ver relatório de backup', value: 'report' },
          { name: '♻️  Restaurar backup', value: 'restore' },
          { name: '🗑️  Limpar backups antigos', value: 'cleanup' },
          { name: '⚙️  Configurar backup automático', value: 'configure' },
          { name: '📈 Status do serviço de backup', value: 'status' }
        ]
      }
    ]);

    switch (action) {
      case 'run':
        await runBackupNow(globalPath);
        break;
      
      case 'list':
        await listBackups(backupDir);
        break;
      
      case 'report':
        await showBackupReport(backupDir);
        break;
      
      case 'restore':
        await restoreBackup(backupDir);
        break;
      
      case 'cleanup':
        await cleanupBackups(globalPath);
        break;
      
      case 'configure':
        await configureBackup(globalPath);
        break;
      
      case 'status':
        await checkBackupStatus(globalPath);
        break;
    }

  } catch (error) {
    logger.errorWithStack(error);
    process.exit(1);
  }
};

async function runBackupNow(globalPath) {
  logger.info('🚀 Executando backup manual...');
  
  try {
    // Verifica se o container de backup está rodando
    const containerStatus = execSync('docker ps --filter "name=global-backup" --format "{{.Status}}"', {
      encoding: 'utf-8',
      cwd: globalPath
    }).trim();

    if (!containerStatus) {
      logger.warn('Container de backup não está rodando. Iniciando...');
      execSync('docker compose up -d backup', {
        cwd: globalPath,
        stdio: 'inherit'
      });
      
      // Aguarda o container inicializar
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Executa o backup manualmente
    logger.info('Executando script de backup...');
    execSync('docker exec global-backup /usr/local/bin/backup.sh', {
      cwd: globalPath,
      stdio: 'inherit'
    });

    logger.success('✅ Backup executado com sucesso!');
    
    // Mostra os backups mais recentes
    await listBackups(path.join(globalPath, 'backups'), true);

  } catch (error) {
    logger.error(`Erro ao executar backup: ${error.message}`);
  }
}

async function listBackups(backupDir, onlyRecent = false) {
  logger.info('📋 Listando backups disponíveis...');
  
  try {
    if (!fs.existsSync(backupDir)) {
      logger.warn('Diretório de backup não encontrado');
      return;
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql.gz'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const match = file.match(/^(.+)_(\d{8}_\d{6})\.sql\.gz$/);
        
        return {
          database: match ? match[1] : 'unknown',
          timestamp: match ? match[2] : 'unknown',
          file,
          size: stats.size,
          date: stats.mtime
        };
      })
      .sort((a, b) => b.date - a.date);

    if (files.length === 0) {
      logger.warn('Nenhum backup encontrado');
      return;
    }

    const displayFiles = onlyRecent ? files.slice(0, 10) : files;

    console.log('\n📦 BACKUPS DISPONÍVEIS:\n');
    
    // Agrupa por banco de dados
    const groupedByDb = displayFiles.reduce((groups, backup) => {
      if (!groups[backup.database]) {
        groups[backup.database] = [];
      }
      groups[backup.database].push(backup);
      return groups;
    }, {});

    Object.keys(groupedByDb).sort().forEach(dbName => {
      console.log(`📁 ${dbName}:`);
      groupedByDb[dbName].slice(0, 5).forEach(backup => {
        const sizeKB = Math.round(backup.size / 1024);
        const dateStr = backup.date.toLocaleString('pt-BR');
        console.log(`   ${dateStr} - ${backup.file} (${sizeKB} KB)`);
      });
      console.log('');
    });

    if (onlyRecent && files.length > 10) {
      console.log(`... e mais ${files.length - 10} backups\n`);
    }

    // Estatísticas
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = Math.round(totalSize / (1024 * 1024));
    console.log(`📊 Total: ${files.length} backups, ${totalSizeMB} MB`);

  } catch (error) {
    logger.error(`Erro ao listar backups: ${error.message}`);
  }
}

async function showBackupReport(backupDir) {
  logger.info('📊 Exibindo relatório de backup...');
  
  try {
    const reportFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup_report_'))
      .sort()
      .reverse();

    if (reportFiles.length === 0) {
      logger.warn('Nenhum relatório de backup encontrado');
      return;
    }

    const latestReport = path.join(backupDir, reportFiles[0]);
    const reportContent = fs.readFileSync(latestReport, 'utf8');
    
    console.log('\n' + reportContent);

  } catch (error) {
    logger.error(`Erro ao exibir relatório: ${error.message}`);
  }
}

async function restoreBackup(backupDir) {
  logger.info('♻️  Iniciando processo de restauração...');
  
  try {
    if (!fs.existsSync(backupDir)) {
      logger.warn('Diretório de backup não encontrado');
      return;
    }

    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql.gz'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          date: stats.mtime.toLocaleString('pt-BR'),
          value: file
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20); // Mostra apenas os 20 mais recentes

    if (backupFiles.length === 0) {
      logger.warn('Nenhum backup encontrado para restauração');
      return;
    }

    const { selectedBackup } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedBackup',
        message: 'Selecione o backup para restaurar:',
        choices: backupFiles,
        pageSize: 15
      }
    ]);

    // Extrai informações do arquivo de backup
    const match = selectedBackup.match(/^(.+)_(\d{8}_\d{6})\.sql\.gz$/);
    const databaseName = match ? match[1] : null;

    if (!databaseName) {
      logger.error('Não foi possível identificar o banco de dados do backup');
      return;
    }

    // Confirmação de segurança
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `⚠️  ATENÇÃO: Isso irá SOBRESCREVER o banco "${databaseName}". Continuar?`,
        default: false
      }
    ]);

    if (!confirm) {
      logger.info('Restauração cancelada');
      return;
    }

    logger.info(`Restaurando backup: ${selectedBackup}`);
    
    // Executa a restauração via Docker
    const restoreCommand = `
      gunzip -c /backups/${selectedBackup} | 
      mysql -h mariadb -u root -p\${MYSQL_ROOT_PASSWORD:-root} ${databaseName}
    `;

    execSync(`docker exec global-backup sh -c "${restoreCommand}"`, {
      stdio: 'inherit'
    });

    logger.success(`✅ Backup restaurado com sucesso para o banco: ${databaseName}`);

  } catch (error) {
    logger.error(`Erro ao restaurar backup: ${error.message}`);
  }
}

async function cleanupBackups(globalPath) {
  logger.info('🧹 Limpando backups antigos...');
  
  try {
    const { days } = await inquirer.prompt([
      {
        type: 'number',
        name: 'days',
        message: 'Remover backups com mais de quantos dias?',
        default: 7,
        validate: input => input > 0 && input <= 365
      }
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Confirma a remoção de backups com mais de ${days} dias?`,
        default: false
      }
    ]);

    if (!confirm) {
      logger.info('Limpeza cancelada');
      return;
    }

    // Executa limpeza via container
    execSync(`docker exec global-backup find /backups -name "*.sql.gz" -type f -mtime +${days} -delete`, {
      stdio: 'inherit'
    });

    logger.success('✅ Limpeza concluída');

  } catch (error) {
    logger.error(`Erro na limpeza: ${error.message}`);
  }
}

async function configureBackup(globalPath) {
  logger.info('⚙️  Configurando backup automático...');
  
  try {
    const { schedule, retention } = await inquirer.prompt([
      {
        type: 'list',
        name: 'schedule',
        message: 'Quando executar o backup automático?',
        choices: [
          { name: 'Diariamente às 2:00', value: '0 2 * * *' },
          { name: 'Diariamente às 3:00', value: '0 3 * * *' },
          { name: 'A cada 6 horas', value: '0 */6 * * *' },
          { name: 'A cada 12 horas', value: '0 */12 * * *' },
          { name: 'Semanalmente (domingo 2:00)', value: '0 2 * * 0' }
        ]
      },
      {
        type: 'number',
        name: 'retention',
        message: 'Por quantos dias manter os backups?',
        default: 7,
        validate: input => input > 0 && input <= 365
      }
    ]);

    // Atualiza variáveis de ambiente
    const envPath = path.join(globalPath, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Remove configurações antigas
    envContent = envContent.replace(/BACKUP_SCHEDULE=.*\n?/g, '');
    envContent = envContent.replace(/BACKUP_RETENTION_DAYS=.*\n?/g, '');

    // Adiciona novas configurações
    envContent += `\n# Configurações de Backup\n`;
    envContent += `BACKUP_SCHEDULE="${schedule}"\n`;
    envContent += `BACKUP_RETENTION_DAYS=${retention}\n`;

    fs.writeFileSync(envPath, envContent);

    logger.success('✅ Configuração salva! Reinicie o ambiente global para aplicar as mudanças.');
    logger.info('Execute: system-ricol global stop && system-ricol global start');

  } catch (error) {
    logger.error(`Erro na configuração: ${error.message}`);
  }
}

async function checkBackupStatus(globalPath) {
  logger.info('📈 Verificando status do serviço de backup...');
  
  try {
    // Verifica status do container
    const containerStatus = execSync('docker ps --filter "name=global-backup" --format "{{.Status}}"', {
      encoding: 'utf-8'
    }).trim();

    console.log('\n🐳 CONTAINER DE BACKUP:');
    if (containerStatus) {
      console.log(`   ✅ Status: ${containerStatus}`);
    } else {
      console.log('   ❌ Container não está rodando');
    }

    // Verifica cron
    try {
      const cronStatus = execSync('docker exec global-backup crontab -l', {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      console.log('\n⏰ AGENDAMENTO:');
      console.log(`   ${cronStatus.trim()}`);
    } catch (error) {
      console.log('\n⏰ AGENDAMENTO:');
      console.log('   ❌ Cron não configurado');
    }

    // Verifica logs recentes
    try {
      const backupLogPath = path.join(globalPath, 'backups', 'backup.log');
      if (fs.existsSync(backupLogPath)) {
        const logs = fs.readFileSync(backupLogPath, 'utf8');
        const recentLogs = logs.split('\n').slice(-5).filter(line => line.trim());
        
        console.log('\n📋 LOGS RECENTES:');
        recentLogs.forEach(log => console.log(`   ${log}`));
      }
    } catch (error) {
      console.log('\n📋 LOGS: Não disponível');
    }

    // Estatísticas dos backups
    const backupDir = path.join(globalPath, 'backups');
    if (fs.existsSync(backupDir)) {
      const backupFiles = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.sql.gz'));
      
      console.log('\n📊 ESTATÍSTICAS:');
      console.log(`   Total de backups: ${backupFiles.length}`);
      
      if (backupFiles.length > 0) {
        const latestBackup = backupFiles
          .map(file => ({
            file,
            date: fs.statSync(path.join(backupDir, file)).mtime
          }))
          .sort((a, b) => b.date - a.date)[0];
        
        console.log(`   Último backup: ${latestBackup.date.toLocaleString('pt-BR')}`);
      }
    }

  } catch (error) {
    logger.error(`Erro ao verificar status: ${error.message}`);
  }
}

module.exports = backup; 