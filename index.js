#!/usr/bin/env node

const yargs = require('yargs');
const packageJson = require('./package.json');

// Importa os comandos
const config = require('./src/commands/config');
const globalStart = require('./src/commands/global-start');
const globalStop = require('./src/commands/global-stop');
const start = require('./src/commands/start');
const stop = require('./src/commands/stop');
const create = require('./src/commands/create');
const deleteProject = require('./src/commands/delete-project');
const backup = require('./src/commands/backup');

// Configuração do CLI
yargs
  .version('version', 'Exibe a versão do system-ricol', packageJson.version)
  .alias('version', 'v')
  .help('h')
  .alias('h', 'help')
  .command({
    command: 'config',
    desc: 'Configura o ambiente',
    handler: config
  })
  .command({
    command: 'global <action>',
    desc: 'Gerencia o ambiente global',
    builder: (yargs) => {
      return yargs.positional('action', {
        describe: 'Ação a ser executada (start ou stop)',
        choices: ['start', 'stop']
      });
    },
    handler: (argv) => {
      if (argv.action === 'start') {
        globalStart();
      } else if (argv.action === 'stop') {
        globalStop();
      }
    }
  })
  .command({
    command: 'start',
    desc: 'Inicia um projeto específico',
    handler: start
  })
  .command({
    command: 'stop',
    desc: 'Para um projeto específico',
    handler: stop
  })
  .command({
    command: 'create',
    desc: 'Cria um novo projeto',
    handler: create
  })
  .command({
    command: 'delete',
    desc: 'Remove um projeto existente',
    handler: deleteProject
  })
  .command({
    command: 'backup',
    desc: 'Gerencia backups do sistema',
    handler: backup
  })
  .argv;
// ```
// Certifique-se de que o arquivo `index.js` tenha a permissão de execução correta. Você pode fazer isso executando `chmod +x index.js`.
