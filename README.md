# System Ricol CLI

Uma ferramenta de linha de comando para gerenciar projetos WordPress e laravel com Docker.

## Instalação

```bash
npm install -g system-ricol
```

## Pré-requisitos

- Docker
- Docker Compose
- mkcert
- Node.js
- npm

## Comandos Disponíveis

### Verificar Versão
```bash
system-ricol -v
# ou
system-ricol --version
```

### Ajuda
```bash
system-ricol -h
# ou
system-ricol --help
```

### Hello (Teste)
```bash
system-ricol hello
```
Exibe uma mensagem de boas-vindas para testar o CLI.

### Criar Pasta
```bash
system-ricol create-folder <nome-da-pasta>
```
Cria uma pasta no diretório do usuário.

### Configuração Inicial
```bash
system-ricol config
```
Este comando:
- Verifica se o mkcert está instalado
- Cria a pasta SSL no diretório do usuário
- Cria a pasta `meus-sites` no diretório do usuário
- Gera certificados SSL para desenvolvimento local

### Gerenciamento do Ambiente Global
```bash
# Iniciar ambiente global
system-ricol global start

# Parar ambiente global
system-ricol global stop
```

O ambiente global inclui:
- Traefik como proxy reverso
- Certificados SSL para desenvolvimento local
- Rede Docker compartilhada

### Gerenciamento de Projetos
```bash
# Criar novo projeto
system-ricol create

# Deletar projeto existente
system-ricol delete
```

O comando `create`:
1. Solicita a URL do projeto (exemplo: meuprojeto.localhost)
2. Cria uma nova pasta no diretório `~/meus-sites`
3. Configura o projeto com:
   - WordPress
   - MariaDB
   - Nginx
4. Inicia automaticamente os containers
5. Verifica se tudo está funcionando corretamente

O comando `delete`:
1. Lista todos os projetos disponíveis
2. Permite selecionar qual projeto deletar
3. Solicita confirmação antes de deletar
4. Para os containers do projeto
5. Remove todos os arquivos do projeto

### Gerenciamento de Projetos Individuais
```bash
# Iniciar um projeto específico
system-ricol start

# Parar um projeto específico
system-ricol stop
```

O comando `start`:
1. Verifica se o ambiente global está rodando
2. Lista todos os projetos disponíveis
3. Permite selecionar qual projeto iniciar
4. Inicia os containers do projeto
5. Verifica se tudo está funcionando corretamente

O comando `stop`:
1. Lista todos os projetos disponíveis
2. Permite selecionar qual projeto parar
3. Para os containers do projeto selecionado

## Estrutura de Pastas

```
/home/seu-usuario/
├── ricol-global-docker-local-ssl/
│   └── certs/
│       ├── localhost-cert.pem
│       └── localhost-key.pem
│
└── meus-sites/
    └── seu-projeto/
        ├── docker-compose.yml
        └── nginx/
            └── default.conf
```

## URLs

- Seus projetos estarão disponíveis em:
  - `https://seuprojeto.localhost`
  - `https://seuprojeto.local`
  - `https://seuprojeto.test`
- Certifique-se que o ambiente global esteja rodando antes de iniciar projetos

## Observações

- Todos os sites usam HTTPS com certificados locais
- Os certificados são gerados automaticamente pelo mkcert
- Cada projeto tem sua própria instância do WordPress e banco de dados
- O proxy reverso (Traefik) gerencia automaticamente as URLs

## Solução de Problemas

Se os containers não iniciarem corretamente:
1. Verifique os logs: `docker compose logs`
2. Certifique-se que o ambiente global está rodando
3. Verifique se as portas necessárias estão disponíveis
4. Confirme se os certificados SSL foram gerados corretamente