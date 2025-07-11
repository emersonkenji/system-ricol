#!/bin/bash

# Sistema de Backup Automático - System Ricol
# Executa backup de todos os bancos de dados do MariaDB

set -e  # Para na primeira falha

# Configurações
MYSQL_HOST="${MYSQL_HOST:-mariadb}"
MYSQL_USER="root"
MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"
BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_DIR/backup.log"

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Função para verificar se o MySQL está acessível
check_mysql() {
    local retries=5
    local count=0
    
    while [ $count -lt $retries ]; do
        if mysqladmin ping -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" >/dev/null 2>&1; then
            return 0
        fi
        count=$((count + 1))
        log "Tentativa $count/$retries - MySQL não está pronto, aguardando..."
        sleep 10
    done
    
    log "ERRO: MySQL não está acessível após $retries tentativas"
    return 1
}

# Função para obter lista de bancos de dados
get_databases() {
    mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SHOW DATABASES;" 2>/dev/null | \
    grep -Ev "^(Database|information_schema|performance_schema|mysql|sys)$"
}

# Função para fazer backup de um banco específico
backup_database() {
    local db_name="$1"
    local backup_file="$BACKUP_DIR/${db_name}_${DATE}.sql.gz"
    
    log "Iniciando backup do banco: $db_name"
    
    # Executa mysqldump e comprime o resultado
    if mysqldump -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" \
        --routines --triggers --single-transaction --lock-tables=false \
        --default-character-set=utf8mb4 "$db_name" | gzip > "$backup_file"; then
        
        local size=$(du -h "$backup_file" | cut -f1)
        log "✅ Backup concluído: $db_name ($size) -> $backup_file"
        return 0
    else
        log "❌ Erro no backup de: $db_name"
        rm -f "$backup_file"  # Remove arquivo incompleto
        return 1
    fi
}

# Função para limpar backups antigos
cleanup_old_backups() {
    log "Limpando backups com mais de $RETENTION_DAYS dias..."
    
    # Encontra e remove arquivos mais antigos que RETENTION_DAYS
    local deleted_count=0
    
    # Busca arquivos .sql.gz mais antigos que RETENTION_DAYS
    while IFS= read -r -d '' file; do
        rm -f "$file"
        deleted_count=$((deleted_count + 1))
        log "🗑️  Removido: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    if [ $deleted_count -eq 0 ]; then
        log "📋 Nenhum backup antigo para remover"
    else
        log "🧹 Removidos $deleted_count backups antigos"
    fi
}

# Função para gerar relatório de status
generate_report() {
    log "📊 Gerando relatório de backup..."
    
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d).txt"
    
    {
        echo "RELATÓRIO DE BACKUP - SYSTEM RICOL"
        echo "Data: $(date)"
        echo "Host MySQL: $MYSQL_HOST"
        echo "Retenção: $RETENTION_DAYS dias"
        echo ""
        echo "BACKUPS DISPONÍVEIS:"
        
        # Lista todos os backups agrupados por banco
        for db in $(get_databases 2>/dev/null | sort); do
            echo ""
            echo "📁 Banco: $db"
            find "$BACKUP_DIR" -name "${db}_*.sql.gz" -type f -printf "   %TY-%Tm-%Td %TH:%TM - %f (%s bytes)\n" 2>/dev/null | sort -r | head -10
        done
        
        echo ""
        echo "ESPAÇO UTILIZADO:"
        du -sh "$BACKUP_DIR" 2>/dev/null || echo "Erro ao calcular espaço"
        
        echo ""
        echo "ÚLTIMOS LOGS:"
        tail -20 "$LOG_FILE" 2>/dev/null || echo "Log não disponível"
        
    } > "$report_file"
    
    log "📄 Relatório salvo em: $report_file"
}

# Função principal
main() {
    log "🚀 Iniciando processo de backup automático"
    
    # Cria diretório de backup se não existir
    mkdir -p "$BACKUP_DIR"
    
    # Verifica conexão com MySQL
    if ! check_mysql; then
        log "❌ Backup cancelado - MySQL não acessível"
        exit 1
    fi
    
    # Obtém lista de bancos
    local databases
    databases=$(get_databases)
    
    if [ -z "$databases" ]; then
        log "⚠️  Nenhum banco de dados encontrado para backup"
        return 0
    fi
    
    local total_dbs=0
    local success_count=0
    local failed_count=0
    
    # Faz backup de cada banco
    while IFS= read -r db; do
        [ -z "$db" ] && continue
        total_dbs=$((total_dbs + 1))
        
        if backup_database "$db"; then
            success_count=$((success_count + 1))
        else
            failed_count=$((failed_count + 1))
        fi
    done <<< "$databases"
    
    # Limpa backups antigos
    cleanup_old_backups
    
    # Gera relatório
    generate_report
    
    # Log final
    log "📈 Backup concluído: $success_count/$total_dbs sucessos, $failed_count falhas"
    
    if [ $failed_count -gt 0 ]; then
        log "⚠️  Alguns backups falharam - verifique os logs"
        exit 1
    else
        log "✅ Todos os backups foram concluídos com sucesso"
    fi
}

# Executa apenas se chamado diretamente
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi 