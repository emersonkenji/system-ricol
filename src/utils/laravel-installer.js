const inquirer = require('inquirer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ensureLaravelInstalled } = require('./laravel-cli-installer');

async function configureLaravelProject(projectPath) {
    const projectName = path.basename(projectPath);
    const options = await getProjectOptions();
    const execPermissionsPath = path.join(projectPath, 'laravel');

    const laravelInstalled = await ensureLaravelInstalled();

    async () => {
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
    };
    // console.log(`Iniciando a criação do projeto Laravel em ${projectPath}...`);
    
    // return false;

    // if (!laravelInstalled) {
    //     console.error('Não foi possível continuar. Laravel CLI não instalado.');
    //     return false;
    // } else {
    //     console.log('Laravel CLI já está instalado.');
    // }

    const command = constructLaravelCommand('laravel', options);

    try {
        console.log(`Executando: laravel new ${command}`);
        console.log(`Criando projeto Laravel em ${projectPath}...`);
        
        execSync(`laravel new ${command}`, {
            cwd: projectPath,
            stdio: 'inherit'
        });

        // Após a criação do Laravel, configurando permissões
        console.log('Configurando permissões para a pasta do Laravel...');
        
        // Definindo permissões para as pastas de storage e cache
        execSync(`chmod -R 777 ${execPermissionsPath}/storage ${execPermissionsPath}/database ${execPermissionsPath}/bootstrap/cache`, {
            stdio: 'inherit'
        });

        console.log('Permissões configuradas com sucesso!');

    } catch (error) {
        console.error('Erro ao criar projeto Laravel:', error.message);
        throw error;
    }
}

async function bootstrappingProject(projectPath) {
    const bootstrappingPath = path.join(projectPath, 'laravel');

    try {
        console.log(`Executando: provisionamento do projeto Laravel`);
        
        execSync(`npm install && npm run build && php artisan migrate`, {
            cwd: bootstrappingPath,
            stdio: 'inherit'
        });
    } catch (error) {
        console.error('Erro ao execultar provisionamento do projeto Laravel:', error.message);
        throw error;
    }
}

async function configureEnv(projectPath, projectUrl, dbName) {
    const projectLocale = 'pt_BR';
    const projectTimezone = 'America/Sao_Paulo';
    const envPath = path.join(projectPath, 'laravel', '.env');
    console.log('envPath', envPath);
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
  
      // Configurações de banco de dados
      envContent = envContent
        // .replace(/DB_CONNECTION=.*/, `DB_CONNECTION=mysql`)
        .replace(/DB_HOST=.*/, `DB_HOST=10.0.120.10`)
        .replace(/DB_PORT=.*/, `DB_PORT=3306`)
        .replace(/DB_DATABASE=.*/, `DB_DATABASE=${dbName}`)
        .replace(/DB_USERNAME=.*/, `DB_USERNAME=laravel`)
        .replace(/DB_PASSWORD=.*/, `DB_PASSWORD=laravel`);
  
      // Configurações adicionais
      envContent = envContent
        .replace(/APP_URL=.*/, `APP_URL=https://${projectUrl}`)
        // .replace(/APP_ENV=.*/, `APP_ENV=local`);
  
      fs.writeFileSync(envPath, envContent);
    }
}

async function getProjectOptions() {
    const options = [];

    // Starter Kit Selection (Laravel Installer novo)
    const { starterKit } = await inquirer.prompt([
        {
            type: 'list',
            name: 'starterKit',
            message: 'Escolha o starter kit:',
            choices: [
                { name: 'Nenhum', value: 'none' },
                { name: 'Livewire (Breeze)', value: 'livewire' },
                { name: 'Vue (Breeze)', value: 'vue' },
                { name: 'React (Breeze)', value: 'react' },
                { name: 'Jetstream (instalar depois)', value: 'jetstream' }
            ]
        }
    ]);

    if (starterKit === 'livewire') {
        options.push('--livewire');

        const { classComponents } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'classComponents',
                message: 'Usar Livewire Class Components?'
            }
        ]);
        if (classComponents) options.push('--livewire-class-components');
    }

    if (starterKit === 'vue') {
        options.push('--vue');
    }

    if (starterKit === 'react') {
        options.push('--react');
    }

    // Jetstream é instalado depois
    if (starterKit === 'jetstream') {
        console.log(`
            ℹ O Jetstream não é instalado via "laravel new".
            Após criar o projeto, execute:
            composer require laravel/jetstream
            php artisan jetstream:install livewire --teams --verification
        `);
    }

    // Database selection
    const { database } = await inquirer.prompt([
        {
            type: 'list',
            name: 'database',
            message: 'Escolha o banco de dados:',
            choices: ['mysql', 'mariadb', 'pgsql', 'sqlite', 'sqlsrv']
        }
    ]);
    options.push(`--database=${database}`);

    // Testing framework
    const { testFramework } = await inquirer.prompt([
        {
            type: 'list',
            name: 'testFramework',
            message: 'Escolha o framework de testes:',
            choices: ['Pest', 'PHPUnit']
        }
    ]);
    options.push(testFramework === 'Pest' ? '--pest' : '--phpunit');

    // Git options
    const { git } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'git',
            message: 'Inicializar repositório Git?'
        }
    ]);
    if (git) {
        options.push('--git');

        const { branch } = await inquirer.prompt([
            {
                type: 'input',
                name: 'branch',
                message: 'Nome do branch inicial:',
                default: 'main'
            }
        ]);
        options.push(`--branch=${branch}`);
    }

    return options;
}


function constructLaravelCommand(projectName, options) {
    console.log(`${projectName} ${options.join(' ')} --no-interaction`);
    return `${projectName} ${options.join(' ')} --no-interaction`;
}

module.exports = { configureLaravelProject, configureEnv, bootstrappingProject };




// const inquirer = require('inquirer');
// const { setupStarterKit } = require('./starter-kit-setup');
// const { setupBreeze } = require('./breeze-setup');
// const { setupJetstream } = require('./jetstream-setup');
// const { ensureLaravelInstalled } = require('./laravel-cli-installer');

// async function configureLaravelProject(projectPath) {
//     const laravelInstalled = await ensureLaravelInstalled();
  
//   if (!laravelInstalled) {
//     console.error('Não foi possível continuar. Laravel CLI não instalado.');
//     return false;
//   }

//   const { starterKit } = await inquirer.prompt([
//     {
//       type: 'list',
//       name: 'starterKit',
//       message: 'Escolha o starter kit para seu projeto Laravel:',
//       choices: [
//         { name: 'Nenhum', value: 'none' },
//         { name: 'Breeze', value: 'breeze' },
//         { name: 'Jetstream', value: 'jetstream' }
//       ]
//     }
//   ]);

//   switch(starterKit) {
//     case 'breeze':
//       await setupBreeze(projectPath);
//       break;
//     case 'jetstream':
//       await setupJetstream(projectPath);
//       break;
//     default:
//       await setupStarterKit(projectPath);
//   }
// }

// module.exports = { configureLaravelProject };