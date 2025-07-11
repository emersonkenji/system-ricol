const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Sistema de logging estruturado
 */
class Logger {
  constructor() {
    this.logDir = path.join(os.homedir(), '.ricol-logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, context = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      pid: process.pid,
      version: require('../../package.json').version
    });
  }

  writeLog(level, message, context = {}) {
    const logFile = path.join(this.logDir, `ricol-${new Date().toISOString().split('T')[0]}.log`);
    const formattedMessage = this.formatMessage(level, message, context);
    
    fs.appendFileSync(logFile, formattedMessage + '\n');
    
    // Console output com cores
    const colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[37m',
      success: '\x1b[32m'
    };
    
    const color = colors[level] || '\x1b[0m';
    const resetColor = '\x1b[0m';
    
    console.log(`${color}[${level.toUpperCase()}]${resetColor} ${message}`);
  }

  error(message, context = {}) {
    this.writeLog('error', message, context);
  }

  warn(message, context = {}) {
    this.writeLog('warn', message, context);
  }

  info(message, context = {}) {
    this.writeLog('info', message, context);
  }

  debug(message, context = {}) {
    if (process.env.RICOL_DEBUG === 'true') {
      this.writeLog('debug', message, context);
    }
  }

  success(message, context = {}) {
    this.writeLog('success', message, context);
  }

  command(command, cwd = process.cwd()) {
    this.debug(`Executando comando: ${command}`, { cwd });
  }

  /**
   * Captura informações do sistema para debugging
   */
  systemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cwd: process.cwd()
    };
  }

  /**
   * Log de erro com stack trace completo
   */
  errorWithStack(error, context = {}) {
    this.error(error.message, {
      ...context,
      stack: error.stack,
      systemInfo: this.systemInfo()
    });
  }

  /**
   * Limpa logs antigos (mantém últimos 7 dias)
   */
  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      files.forEach(file => {
        if (file.startsWith('ricol-') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < sevenDaysAgo) {
            fs.unlinkSync(filePath);
            this.debug(`Log antigo removido: ${file}`);
          }
        }
      });
    } catch (error) {
      // Ignora erros de limpeza
    }
  }
}

// Instância singleton
const logger = new Logger();

module.exports = logger; 