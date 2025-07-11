# Comandos Úteis - Ricol Stack WordPress

Este arquivo contém comandos úteis para gerenciar o stack WordPress com Nginx.

## 🚀 Comandos Básicos

### Iniciar o Stack
```bash
# Construir e iniciar todos os serviços
docker-compose up -d --build

# Iniciar sem reconstruir
docker-compose up -d

# Iniciar com logs em tempo real
docker-compose up
```

### Parar o Stack
```bash
# Parar todos os serviços
docker-compose down

# Parar e remover volumes (cuidado!)
docker-compose down -v

# Parar e remover imagens
docker-compose down --rmi all
```

### Status e Logs
```bash
# Verificar status dos containers
docker-compose ps

# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f nginx
docker-compose logs -f phpfpm

# Ver logs das últimas 100 linhas
docker-compose logs --tail=100
```

## 🔧 Comandos de Manutenção

### Reiniciar Serviços
```bash
# Reiniciar todos os serviços
docker-compose restart

# Reiniciar um serviço específico
docker-compose restart nginx
docker-compose restart phpfpm
```

### Reconstruir Containers
```bash
# Reconstruir todos os containers
docker-compose up -d --build

# Reconstruir um serviço específico
docker-compose up -d --build phpfpm
```

### Limpeza
```bash
# Remover containers parados
docker container prune

# Remover imagens não utilizadas
docker image prune

# Remover volumes não utilizados
docker volume prune

# Limpeza completa
docker system prune -a
```

## 🌐 Comandos WordPress

### Acessar o Container PHP-FPM
```bash
# Acessar como root
docker-compose exec phpfpm bash

# Acessar como usuário www-data
docker-compose exec -u www-data phpfpm bash
```

### Comandos WP-CLI
```bash
# Verificar status do WordPress
docker-compose exec phpfpm wp core version

# Atualizar WordPress
docker-compose exec phpfpm wp core update

# Atualizar plugins
docker-compose exec phpfpm wp plugin update --all

# Atualizar temas
docker-compose exec phpfpm wp theme update --all

# Listar plugins
docker-compose exec phpfpm wp plugin list

# Listar temas
docker-compose exec phpfpm wp theme list

# Verificar saúde do site
docker-compose exec phpfpm wp site health
```

### Instalação do WordPress
```bash
# Baixar WordPress
docker-compose exec phpfpm wp core download --path=/var/www/html

# Configurar banco de dados
docker-compose exec phpfpm wp config create --dbname=wordpress --dbuser=wordpress --dbpass=password --dbhost=mysql

# Instalar WordPress
docker-compose exec phpfpm wp core install --url=meusite.com --title="Meu Site" --admin_user=admin --admin_password=senha123 --admin_email=admin@meusite.com
```

## 💾 Comandos de Backup

### Backup do Banco de Dados
```bash
# Exportar banco de dados
docker-compose exec phpfpm wp db export backup.sql

# Exportar com compressão
docker-compose exec phpfpm wp db export backup.sql --add-drop-table

# Backup com timestamp
docker-compose exec phpfpm wp db export backup-$(date +%Y%m%d-%H%M%S).sql
```

### Backup dos Arquivos
```bash
# Backup completo do diretório system
tar -czf wordpress-backup-$(date +%Y%m%d-%H%M%S).tar.gz system/

# Backup apenas de uploads
tar -czf uploads-backup-$(date +%Y%m%d-%H%M%S).tar.gz system/wp-content/uploads/
```

### Restaurar Backup
```bash
# Restaurar banco de dados
docker-compose exec phpfpm wp db import backup.sql

# Restaurar arquivos
tar -xzf wordpress-backup.tar.gz
```

## 🔍 Comandos de Debug

### Verificar Configurações
```bash
# Verificar configuração do Nginx
docker-compose exec nginx nginx -t

# Verificar configuração do PHP
docker-compose exec phpfpm php -m

# Verificar extensões PHP instaladas
docker-compose exec phpfpm php -m | grep -E "(gd|mysql|zip|curl)"

# Verificar logs do PHP
docker-compose exec phpfpm tail -f /var/log/php-fpm.log
```

### Verificar Redes
```bash
# Listar redes Docker
docker network ls

# Verificar conectividade entre containers
docker-compose exec nginx ping phpfpm

# Verificar configurações de rede
docker network inspect sr-reverse-proxy
```

### Verificar Volumes
```bash
# Listar volumes
docker volume ls

# Verificar conteúdo de um volume
docker run --rm -v ricol-stack-wp-nginx_system:/data alpine ls -la /data
```

## 🛠️ Comandos de Desenvolvimento

### Modo de Desenvolvimento
```bash
# Habilitar debug do WordPress
docker-compose exec phpfpm wp config set WP_DEBUG true

# Habilitar log de queries
docker-compose exec phpfpm wp config set SAVEQUERIES true

# Desabilitar cache
docker-compose exec phpfpm wp config set WP_CACHE false
```

### Comandos de Cache
```bash
# Limpar cache do WordPress
docker-compose exec phpfpm wp cache flush

# Limpar cache do OPcache
docker-compose exec phpfpm wp eval 'opcache_reset();'

# Limpar cache do Nginx
docker-compose exec nginx nginx -s reload
```

## 📊 Comandos de Monitoramento

### Verificar Recursos
```bash
# Verificar uso de CPU e memória
docker stats

# Verificar uso de disco
docker system df

# Verificar logs de erro
docker-compose logs | grep -i error
```

### Verificar Performance
```bash
# Testar performance do PHP
docker-compose exec phpfpm php -r "echo 'PHP Version: ' . PHP_VERSION . PHP_EOL;"

# Verificar configurações do OPcache
docker-compose exec phpfpm php -r "print_r(opcache_get_status());"
```

## 🔒 Comandos de Segurança

### Verificar Permissões
```bash
# Verificar permissões dos arquivos
docker-compose exec phpfpm ls -la /var/www/html

# Corrigir permissões
docker-compose exec phpfpm chown -R www-data:www-data /var/www/html
docker-compose exec phpfpm chmod -R 755 /var/www/html
```

### Verificar Configurações de Segurança
```bash
# Verificar headers de segurança
curl -I https://meusite.com

# Verificar certificado SSL
openssl s_client -connect meusite.com:443 -servername meusite.com
```

## 📝 Notas Importantes

- Sempre faça backup antes de executar comandos destrutivos
- Use `docker-compose logs` para debug
- Mantenha o WordPress e plugins atualizados
- Monitore regularmente o uso de recursos
- Configure backups automáticos em produção 