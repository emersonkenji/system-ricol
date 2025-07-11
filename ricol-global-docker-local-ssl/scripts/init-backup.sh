#!/bin/bash

# Script de Inicialização do Sistema de Backup
# Prepara diretórios e permissões necessárias

set -e

echo "🚀 Inicializando sistema de backup do System Ricol..."

# Diretórios necessários
BACKUP_DIR="/backups"
SCRIPTS_DIR="/usr/local/bin"

# Cria diretório de backup se não existir
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "📁 Diretório de backup criado: $BACKUP_DIR"
fi

# Define permissões corretas
chmod 755 "$BACKUP_DIR"
chown root:root "$BACKUP_DIR"

# Verifica se o script de backup existe e está executável
if [ -f "$SCRIPTS_DIR/backup.sh" ]; then
    chmod +x "$SCRIPTS_DIR/backup.sh"
    echo "✅ Script de backup configurado e executável"
else
    echo "❌ Script de backup não encontrado em $SCRIPTS_DIR/backup.sh"
    exit 1
fi

# Instala dependências necessárias
echo "📦 Instalando dependências..."
apt-get update -qq > /dev/null 2>&1
apt-get install -y cron findutils > /dev/null 2>&1

# Configura timezone
if [ ! -z "$TZ" ]; then
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime
    echo $TZ > /etc/timezone
    echo "🌍 Timezone configurado: $TZ"
fi

# Configura cron para backup automático
CRON_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"
echo "$CRON_SCHEDULE /usr/local/bin/backup.sh >> /backups/backup.log 2>&1" | crontab -

echo "⏰ Backup automático agendado: $CRON_SCHEDULE"

# Cria arquivo de log inicial
touch "$BACKUP_DIR/backup.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sistema de backup inicializado" >> "$BACKUP_DIR/backup.log"

# Verifica conectividade com MySQL
echo "🔍 Verificando conectividade com MySQL..."
MYSQL_HOST="${MYSQL_HOST:-mariadb}"
MYSQL_USER="root"
MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"

# Aguarda MySQL estar disponível
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if mysqladmin ping -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" >/dev/null 2>&1; then
        echo "✅ MySQL está acessível"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "⏳ Aguardando MySQL... tentativa $retry_count/$max_retries"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ MySQL não está acessível após $max_retries tentativas"
    exit 1
fi

# Log de configuração
{
    echo "CONFIGURAÇÃO DO BACKUP:"
    echo "- Host MySQL: $MYSQL_HOST"
    echo "- Agendamento: $CRON_SCHEDULE"
    echo "- Retenção: ${BACKUP_RETENTION_DAYS:-7} dias"
    echo "- Diretório: $BACKUP_DIR"
    echo "- Timezone: ${TZ:-UTC}"
} >> "$BACKUP_DIR/backup.log"

echo "✅ Sistema de backup inicializado com sucesso!"

# Inicia o cron
echo "🔄 Iniciando serviço cron..."
service cron start

# Executa um backup inicial se solicitado
if [ "$RUN_INITIAL_BACKUP" = "true" ]; then
    echo "🚀 Executando backup inicial..."
    "$SCRIPTS_DIR/backup.sh"
fi

echo "🎉 Sistema de backup está pronto e funcionando!"

# Mantém o container rodando
exec "$@" 