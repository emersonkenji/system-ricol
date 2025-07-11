const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Utilitário para segurança e gerenciamento de credenciais
 */
class SecurityUtils {
  
  /**
   * Gera senha segura aleatória
   */
  static generateSecurePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Gera hash para nomes de bancos de dados seguros
   */
  static generateDbName(projectName, type = 'wp') {
    const hash = crypto.createHash('md5').update(projectName).digest('hex').substring(0, 8);
    return `${type}_${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${hash}`;
  }

  /**
   * Cria arquivo de configuração segura
   */
  static createSecureConfig(projectPath, config) {
    const configPath = path.join(projectPath, '.ricol-config');
    const secureConfig = {
      ...config,
      created: new Date().toISOString(),
      version: require('../../package.json').version
    };
    
    fs.writeFileSync(configPath, JSON.stringify(secureConfig, null, 2), { mode: 0o600 });
    return configPath;
  }

  /**
   * Lê configuração segura
   */
  static readSecureConfig(projectPath) {
    try {
      const configPath = path.join(projectPath, '.ricol-config');
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  /**
   * Valida URLs para prevenir path traversal
   */
  static validateProjectUrl(url) {
    const validPattern = /^[a-z0-9-]+\.(dev\.localhost|dev\.local|dev\.test)$/i;
    if (!validPattern.test(url)) {
      throw new Error('URL do projeto inválida. Use apenas letras, números e hífens.');
    }
    return url.toLowerCase();
  }

  /**
   * Sanitiza nome do projeto
   */
  static sanitizeProjectName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Gera configuração PHP segura
   */
  static getSecurePHPConfig() {
    return {
      'expose_php': 'Off',
      'display_errors': 'Off',
      'display_startup_errors': 'Off',
      'log_errors': 'On',
      'allow_url_fopen': 'Off',
      'allow_url_include': 'Off',
      'session.cookie_httponly': 'On',
      'session.cookie_secure': 'On',
      'session.use_strict_mode': '1',
      'disable_functions': 'exec,passthru,shell_exec,system,proc_open,popen'
    };
  }
}

module.exports = SecurityUtils; 