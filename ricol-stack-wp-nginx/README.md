# Ricol Stack - WordPress com Nginx

Este é um stack Docker para WordPress com Nginx, PHP-FPM e Traefik como reverse proxy. O projeto está configurado para funcionar em um ambiente de produção com SSL automático.

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Traefik configurado como reverse proxy
- Rede `sr-reverse-proxy` criada
- Rede `sr-public_network` criada

## 🚀 Configuração Inicial

### 1. Variáveis de Ambiente

Antes de executar o projeto, você precisa configurar as seguintes variáveis no arquivo `docker-compose.yml`:

- `<SITE_NAME>`: Nome do site (ex: `meusite`)
- `<SITE_URL>`: URL do site (ex: `meusite.com`)
- `<PHP_IMAGE>`: Imagem PHP desejada (ex: `php:8.2-fpm`)
- `<USER_NAME>`: Nome do usuário do sistema
- `<labels>`: Identificador único para o Traefik (ex: `meusite`)

### 2. Estrutura de Diretórios

```
ricol-stack-wp-nginx/
├── docker-compose.yml          # Configuração principal do Docker
├── .containers/                # Dockerfiles e configurações PHP
│   ├── php-fpm                 # Dockerfile para PHP-FPM
│   └── php.ini                 # Configurações PHP customizadas
├── config/                     # Configurações dos serviços
│   ├── nginx/                  # Configurações do Nginx
│   │   ├── default.conf        # Configuração padrão
│   │   ├── server.conf         # Configuração do servidor
│   │   ├── wordpress.conf      # Configuração específica do WordPress
│   │   └── develop.conf        # Configuração para desenvolvimento
│   ├── php-fpm/                # Configurações PHP-FPM
│   └── elasticsearch/          # Configurações Elasticsearch (se aplicável)
└── system/                     # Arquivos do WordPress
```

## 🐳 Serviços

### Nginx
- **Imagem**: `nginx:1.25-alpine`
- **Portas**: 80, 443 (expostas internamente)
- **Função**: Servidor web e proxy reverso
- **Configurações**: Localizadas em `config/nginx/`

### PHP-FPM
- **Imagem**: Customizada baseada na imagem PHP especificada
- **Função**: Processamento PHP para WordPress
- **Extensões**: Inclui extensões essenciais para WordPress
- **Configurações**: Otimizadas para performance

## 🔧 Configurações

### Nginx
O Nginx está configurado com:
- Suporte a SSL/TLS
- Configurações otimizadas para WordPress
- Headers de segurança
- Compressão gzip
- Cache de arquivos estáticos

### PHP-FPM
O PHP-FPM inclui:
- Extensões essenciais para WordPress
- OPcache habilitado
- Configurações de memória otimizadas
- Suporte a uploads de arquivos

### Traefik
O Traefik está configurado para:
- Roteamento automático baseado em hostname
- SSL/TLS automático
- Load balancing
- Middleware para prefixos de URL

## 🚀 Como Usar

### 1. Configurar Variáveis
Edite o arquivo `docker-compose.yml` e substitua as variáveis:
```yaml
# Exemplo de configuração
<SITE_NAME>: meusite
<SITE_URL>: meusite.com
<PHP_IMAGE>: php:8.2-fpm
<USER_NAME>: kenji
<labels>: meusite
```

### 2. Executar o Stack
```bash
# Construir e iniciar os serviços
docker-compose up -d --build

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 3. Acessar o Site
Após a configuração, o site estará disponível em:
- `https://meusite.com` (produção)
- `http://localhost` (desenvolvimento local)

## 🔍 Monitoramento

### Logs
```bash
# Logs do Nginx
docker-compose logs nginx

# Logs do PHP-FPM
docker-compose logs phpfpm

# Logs de todos os serviços
docker-compose logs -f
```

### Status dos Containers
```bash
docker-compose ps
```

## 🛠️ Manutenção

### Atualizar WordPress
```bash
# Acessar o container PHP-FPM
docker-compose exec phpfpm bash

# Executar comandos WP-CLI
wp core update
wp plugin update --all
wp theme update --all
```

### Backup
```bash
# Backup do banco de dados
docker-compose exec phpfpm wp db export backup.sql

# Backup dos arquivos
tar -czf wordpress-backup.tar.gz system/
```

### Restaurar
```bash
# Restaurar banco de dados
docker-compose exec phpfpm wp db import backup.sql

# Restaurar arquivos
tar -xzf wordpress-backup.tar.gz
```

## 🔒 Segurança

### Configurações de Segurança
- Headers de segurança configurados no Nginx
- Permissões de arquivo restritas
- SSL/TLS obrigatório em produção
- Isolamento de rede entre serviços

### Recomendações
- Mantenha o WordPress e plugins atualizados
- Use senhas fortes
- Configure backups regulares
- Monitore logs regularmente

## 🐛 Troubleshooting

### Problemas Comuns

#### Site não carrega
1. Verifique se o Traefik está rodando
2. Confirme se as redes estão criadas
3. Verifique os logs: `docker-compose logs nginx`

#### Erros de PHP
1. Verifique os logs do PHP-FPM: `docker-compose logs phpfpm`
2. Confirme se as extensões PHP estão instaladas
3. Verifique as configurações do `php.ini`

#### Problemas de SSL
1. Confirme se o Traefik está configurado corretamente
2. Verifique se o domínio está apontando para o servidor
3. Aguarde a geração automática do certificado

### Comandos Úteis
```bash
# Reiniciar serviços
docker-compose restart

# Reconstruir containers
docker-compose up -d --build

# Parar todos os serviços
docker-compose down

# Remover volumes (cuidado!)
docker-compose down -v
```

## 📝 Notas

- Este stack é otimizado para produção
- O WordPress deve ser instalado no diretório `system/`
- As configurações podem ser personalizadas em `config/`
- O OPcache está habilitado para melhor performance
- Logs são mantidos para debugging

## 🤝 Contribuição

Para contribuir com melhorias:
1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes. 