const { execSync } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const MINIMUM_VERSION = '5.17.0';

/**
 * Compara duas versões semver
 * @param {string} version1 
 * @param {string} version2 
 * @returns {number} -1 se version1 < version2, 0 se iguais, 1 se version1 > version2
 */
function compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    // Garante que ambas as versões tenham 3 partes
    while (v1parts.length < 3) v1parts.push(0);
    while (v2parts.length < 3) v2parts.push(0);
    
    for (let i = 0; i < 3; i++) {
        if (v1parts[i] < v2parts[i]) return -1;
        if (v1parts[i] > v2parts[i]) return 1;
    }
    return 0;
}

/**
 * Extrai a versão do output do comando laravel --version
 * @param {string} versionOutput 
 * @returns {string} versão limpa
 */
function extractVersion(versionOutput) {
    // Exemplo de outputs possíveis:
    // "Laravel Installer 5.17.0"
    // "Laravel Installer v5.17.0"
    // "v5.17.0"
    const match = versionOutput.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
}

/**
 * Verifica a versão atual do Laravel Installer
 * @returns {Promise<string|null>} versão atual ou null se não instalado
 */
async function getCurrentLaravelVersion() {
    try {
        const { stdout } = await exec('laravel --version');
        return extractVersion(stdout.trim());
    } catch (error) {
        return null;
    }
}

/**
 * Atualiza o Laravel Installer
 * @returns {Promise<boolean>} true se sucesso, false se erro
 */
async function updateLaravelInstaller() {
    try {
        console.log('🔄 Atualizando Laravel Installer...');
        execSync('composer global require laravel/installer', { stdio: 'inherit' });
        console.log('✅ Laravel Installer atualizado com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao atualizar Laravel Installer:', error.message);
        return false;
    }
}

/**
 * Instala o Laravel Installer
 * @returns {Promise<boolean>} true se sucesso, false se erro
 */
async function installLaravelInstaller() {
    try {
        // Verifica se o Composer está instalado
        execSync('composer --version', { stdio: 'ignore' });
        
        console.log('📦 Instalando Laravel Installer...');
        execSync('composer global require laravel/installer', { stdio: 'inherit' });
        
        // Adiciona o diretório do Composer ao PATH se necessário
        await addComposerToPath();
        
        console.log('✅ Laravel Installer instalado com sucesso!');
        return true;
    } catch (composerError) {
        console.error('❌ Erro: Composer não está instalado. Por favor, instale o Composer primeiro.');
        console.log('📖 Visite: https://getcomposer.org/download/');
        return false;
    }
}

/**
 * Adiciona o diretório global do Composer ao PATH
 */
async function addComposerToPath() {
    try {
        const os = require('os');
        const path = require('path');
        const fs = require('fs');
        
        const homeDir = os.homedir();
        let composerBinPath;
        
        // Detecta o sistema operacional e define o caminho correto
        if (process.platform === 'win32') {
            composerBinPath = path.join(homeDir, 'AppData', 'Roaming', 'Composer', 'vendor', 'bin');
        } else {
            composerBinPath = path.join(homeDir, '.composer', 'vendor', 'bin');
            
            // Também verifica o caminho alternativo ~/.config/composer
            const altPath = path.join(homeDir, '.config', 'composer', 'vendor', 'bin');
            if (fs.existsSync(altPath)) {
                composerBinPath = altPath;
            }
        }
        
        // Para sistemas Unix-like, adiciona ao shell profile
        if (process.platform !== 'win32') {
            const shellProfiles = [
                path.join(homeDir, '.bashrc'),
                path.join(homeDir, '.zshrc'),
                path.join(homeDir, '.profile')
            ];
            
            const exportLine = `export PATH="$PATH:${composerBinPath}"`;
            
            for (const profile of shellProfiles) {
                try {
                    if (fs.existsSync(profile)) {
                        const content = fs.readFileSync(profile, 'utf8');
                        if (!content.includes(composerBinPath)) {
                            fs.appendFileSync(profile, `\n${exportLine}\n`);
                        }
                    }
                } catch (err) {
                    // Ignora erros de acesso a arquivos específicos
                }
            }
            
            console.log(`💡 Adicione ao PATH: ${composerBinPath}`);
            console.log('💡 Reinicie o terminal ou execute: source ~/.bashrc');
        }
    } catch (error) {
        console.warn('⚠️ Não foi possível configurar o PATH automaticamente');
    }
}

/**
 * Função principal para garantir que o Laravel Installer esteja instalado e atualizado
 * @returns {Promise<boolean>} true se tudo estiver OK, false se houver erro
 */
async function ensureLaravelInstalled() {
    console.log('🔍 Verificando Laravel Installer...');
    
    const currentVersion = await getCurrentLaravelVersion();
    
    if (!currentVersion) {
        console.log('❌ Laravel Installer não encontrado.');
        return await installLaravelInstaller();
    }
    
    console.log(`📦 Laravel Installer encontrado: v${currentVersion}`);
    
    const comparison = compareVersions(currentVersion, MINIMUM_VERSION);
    
    if (comparison >= 0) {
        console.log(`✅ Versão compatível (>= ${MINIMUM_VERSION})`);
        return true;
    }
    
    console.log(`⚠️ Versão ${currentVersion} é inferior à mínima requerida (${MINIMUM_VERSION})`);
    console.log('🔄 Atualizando Laravel Installer...');
    
    const updateSuccess = await updateLaravelInstaller();
    
    if (updateSuccess) {
        // Verifica a nova versão após atualização
        const newVersion = await getCurrentLaravelVersion();
        if (newVersion) {
            console.log(`✅ Atualizado para versão: v${newVersion}`);
            
            if (compareVersions(newVersion, MINIMUM_VERSION) >= 0) {
                console.log(`✅ Versão agora é compatível!`);
                return true;
            } else {
                console.log(`⚠️ Versão ainda é inferior à mínima requerida`);
                return false;
            }
        }
    }
    
    return false;
}

/**
 * Função para verificar apenas a versão (sem instalar/atualizar)
 * @returns {Promise<{installed: boolean, version: string|null, compatible: boolean}>}
 */
async function checkLaravelVersion() {
    const version = await getCurrentLaravelVersion();
    const installed = version !== null;
    const compatible = installed && compareVersions(version, MINIMUM_VERSION) >= 0;
    
    return {
        installed,
        version,
        compatible,
        minimumRequired: MINIMUM_VERSION
    };
}

module.exports = { 
    ensureLaravelInstalled,
    checkLaravelVersion,
    compareVersions,
    MINIMUM_VERSION
};

// Exemplo de uso:
/*
(async () => {
    // Verificar status atual
    const status = await checkLaravelVersion();
    console.log('Status:', status);
    
    // Garantir que está instalado e atualizado
    const success = await ensureLaravelInstalled();
    if (success) {
        console.log('Pronto para usar Laravel Installer!');
    } else {
        console.log('Falha ao configurar Laravel Installer');
    }
})();
*/



// const { execSync } = require('child_process');
// const { promisify } = require('util');
// const exec = promisify(require('child_process').exec);

// async function ensureLaravelInstalled() {
//   try {
//     // Verifica se o Laravel Installer está instalado
//     execSync('laravel --version');
//     console.log('Laravel CLI já está instalado.');
//     return true;
//   } catch (error) {
//     console.log('Laravel CLI não encontrado. Iniciando instalação...');
//     try {
//       // Verifica se o Composer está instalado
//       execSync('composer --version');

//       // Instala o Laravel CLI globalmente via Composer
//       console.log('Instalando Laravel Installer...');
//       execSync('composer global require laravel/installer', { stdio: 'inherit' });

//       // Adiciona o diretório do Composer ao PATH
//       const homeDir = require('os').homedir();
//       const composerPath = `${homeDir}/.composer/vendor/bin`;
      
//       // Para sistemas Unix-like
//       execSync(`echo 'export PATH="$PATH:${composerPath}"' >> ~/.bashrc`);
//       execSync(`echo 'export PATH="$PATH:${composerPath}"' >> ~/.zshrc`, { stdio: 'inherit' });

//       console.log('Laravel CLI instalado com sucesso!');
//       return true;
//     } catch (composerError) {
//       console.error('Erro: Composer não está instalado. Por favor, instale o Composer primeiro.');
//       return false;
//     }
//   }
// }

// module.exports = { ensureLaravelInstalled };