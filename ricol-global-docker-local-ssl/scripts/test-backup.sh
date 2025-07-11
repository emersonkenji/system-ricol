#!/bin/bash

# Script de Teste do Sistema de Backup
# Verifica se todos os componentes estão funcionando corretamente

set -e

echo "🧪 Testando Sistema de Backup do System Ricol..."

# Configurações
GLOBAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$GLOBAL_DIR/backups"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função para verificar pré-requisitos
check_prerequisites() {
    log_info "Verificando pré-requisitos..."
    
    # Verifica se Docker está rodando
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker não está rodando"
        exit 1
    fi
    log_success "Docker está rodando"
    
    # Verifica se docker-compose existe
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker compose não encontrado"
        exit 1
    fi
    log_success "Docker compose disponível"
    
    # Verifica se está no diretório correto
    if [ ! -f "$GLOBAL_DIR/docker-compose.yml" ]; then
        log_error "Arquivo docker-compose.yml não encontrado em $GLOBAL_DIR"
        exit 1
    fi
    log_success "Diretório correto"
}

# Função para verificar containers
check_containers() {
    log_info "Verificando containers..."
    
    cd "$GLOBAL_DIR"
    
    # Verifica container do MariaDB
    if ! docker ps --filter "name=global-mariadb" --filter "status=running" | grep -q global-mariadb; then
        log_warning "Container MariaDB não está rodando. Iniciando..."
        docker compose up -d mariadb
        sleep 10
    fi
    log_success "Container MariaDB está rodando"
    
    # Verifica container de backup
    if ! docker ps --filter "name=global-backup" --filter "status=running" | grep -q global-backup; then
        log_warning "Container de backup não está rodando. Iniciando..."
        docker compose up -d backup
        sleep 15
    fi
    log_success "Container de backup está rodando"
}

# Função para testar conectividade MySQL
test_mysql_connection() {
    log_info "Testando conectividade MySQL..."
    
    if docker exec global-backup mysqladmin ping -h mariadb -u root -p"${MYSQL_ROOT_PASSWORD:-root}" >/dev/null 2>&1; then
        log_success "Conectividade MySQL OK"
    else
        log_error "Falha na conectividade MySQL"
        return 1
    fi
}

# Função para testar cron
test_cron() {
    log_info "Testando configuração do cron..."
    
    if docker exec global-backup pgrep cron >/dev/null 2>&1; then
        log_success "Processo cron está rodando"
    else
        log_error "Processo cron não está rodando"
        return 1
    fi
    
    # Verifica crontab
    if docker exec global-backup crontab -l 2>/dev/null | grep -q backup.sh; then
        log_success "Crontab configurado corretamente"
    else
        log_error "Crontab não configurado"
        return 1
    fi
}

# Função para criar banco de teste
create_test_database() {
    log_info "Criando banco de dados de teste..."
    
    local test_db="test_backup_$(date +%s)"
    
    docker exec global-mariadb mysql -u root -p"${MYSQL_ROOT_PASSWORD:-root}" -e "
        CREATE DATABASE IF NOT EXISTS $test_db;
        USE $test_db;
        CREATE TABLE test_table (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO test_table (name) VALUES 
            ('Teste 1'), 
            ('Teste 2'), 
            ('Backup Test $(date)');
    " 2>/dev/null
    
    echo "$test_db"
    log_success "Banco de teste criado: $test_db"
}

# Função para testar backup
test_backup_execution() {
    log_info "Testando execução do backup..."
    
    # Cria diretório de backup se não existir
    mkdir -p "$BACKUP_DIR"
    
    # Executa o backup
    if docker exec global-backup /usr/local/bin/backup.sh >/dev/null 2>&1; then
        log_success "Backup executado com sucesso"
    else
        log_error "Falha na execução do backup"
        return 1
    fi
    
    # Verifica se arquivos foram criados
    if ls "$BACKUP_DIR"/*.sql.gz >/dev/null 2>&1; then
        log_success "Arquivos de backup criados"
        
        # Mostra estatísticas
        local backup_count=$(ls "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
        local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
        log_info "Backups encontrados: $backup_count arquivos ($total_size)"
    else
        log_error "Nenhum arquivo de backup foi criado"
        return 1
    fi
}

# Função para testar restauração
test_backup_restore() {
    log_info "Testando restauração de backup..."
    
    # Encontra o backup mais recente do banco de teste
    local latest_backup=$(ls -t "$BACKUP_DIR"/test_backup_*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_warning "Nenhum backup de teste encontrado para restauração"
        return 0
    fi
    
    local backup_name=$(basename "$latest_backup")
    local db_name=$(echo "$backup_name" | sed 's/_[0-9]\{8\}_[0-9]\{6\}\.sql\.gz$//')
    local restore_db="${db_name}_restored"
    
    log_info "Restaurando backup: $backup_name -> $restore_db"
    
    # Cria banco para restauração
    docker exec global-mariadb mysql -u root -p"${MYSQL_ROOT_PASSWORD:-root}" -e "CREATE DATABASE IF NOT EXISTS $restore_db;" 2>/dev/null
    
    # Restaura o backup
    if docker exec global-backup sh -c "gunzip -c /backups/$backup_name | mysql -h mariadb -u root -p\"${MYSQL_ROOT_PASSWORD:-root}\" $restore_db" 2>/dev/null; then
        log_success "Backup restaurado com sucesso"
        
        # Verifica se os dados foram restaurados
        local record_count=$(docker exec global-mariadb mysql -u root -p"${MYSQL_ROOT_PASSWORD:-root}" -e "SELECT COUNT(*) FROM $restore_db.test_table;" 2>/dev/null | tail -1)
        if [ "$record_count" -gt 0 ]; then
            log_success "Dados verificados: $record_count registros restaurados"
        else
            log_error "Dados não foram restaurados corretamente"
            return 1
        fi
    else
        log_error "Falha na restauração do backup"
        return 1
    fi
}

# Função para limpeza
cleanup_test() {
    log_info "Limpando dados de teste..."
    
    # Remove bancos de teste
    docker exec global-mariadb mysql -u root -p"${MYSQL_ROOT_PASSWORD:-root}" -e "
        DROP DATABASE IF EXISTS test_backup_$(date +%s);
        SHOW DATABASES LIKE 'test_backup_%';
    " 2>/dev/null | grep test_backup_ | while read db; do
        docker exec global-mariadb mysql -u root -p"${MYSQL_ROOT_PASSWORD:-root}" -e "DROP DATABASE IF EXISTS $db;" 2>/dev/null
        log_info "Removido banco: $db"
    done
    
    # Remove bancos restaurados
    docker exec global-mariadb mysql -u root -p"${MYSQL_ROOT_PASSWORD:-root}" -e "
        SHOW DATABASES LIKE '%_restored';
    " 2>/dev/null | grep _restored | while read db; do
        docker exec global-mariadb mysql -u root -p"${MYSQL_ROOT_PASSWORD:-root}" -e "DROP DATABASE IF EXISTS $db;" 2>/dev/null
        log_info "Removido banco restaurado: $db"
    done
    
    log_success "Limpeza concluída"
}

# Função para gerar relatório
generate_report() {
    log_info "Gerando relatório do teste..."
    
    local report_file="$BACKUP_DIR/test_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "RELATÓRIO DE TESTE - SISTEMA DE BACKUP"
        echo "======================================"
        echo "Data: $(date)"
        echo "Ambiente: $(uname -a)"
        echo ""
        echo "CONTAINERS:"
        docker ps --filter "name=global-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo "BACKUPS DISPONÍVEIS:"
        ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "Nenhum backup encontrado"
        echo ""
        echo "ESPAÇO EM DISCO:"
        df -h "$BACKUP_DIR"
        echo ""
        echo "LOGS RECENTES:"
        tail -10 "$BACKUP_DIR/backup.log" 2>/dev/null || echo "Log não disponível"
    } > "$report_file"
    
    log_success "Relatório salvo: $report_file"
}

# Função principal
main() {
    echo "🧪 INICIANDO TESTE DO SISTEMA DE BACKUP"
    echo "======================================="
    
    local errors=0
    
    # Executa testes
    check_prerequisites || ((errors++))
    check_containers || ((errors++))
    test_mysql_connection || ((errors++))
    test_cron || ((errors++))
    
    # Cria banco de teste
    local test_db=$(create_test_database) || ((errors++))
    
    # Testa backup e restauração
    test_backup_execution || ((errors++))
    test_backup_restore || ((errors++))
    
    # Gera relatório
    generate_report
    
    # Limpeza
    cleanup_test
    
    echo ""
    echo "======================================="
    if [ $errors -eq 0 ]; then
        log_success "🎉 TODOS OS TESTES PASSARAM!"
        log_info "O sistema de backup está funcionando corretamente."
    else
        log_error "❌ $errors TESTE(S) FALHARAM!"
        log_info "Verifique os logs acima para mais detalhes."
        exit 1
    fi
    echo "======================================="
}

# Executa apenas se chamado diretamente
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi 