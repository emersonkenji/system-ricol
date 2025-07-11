# 📦 Sistema de Backup - System Ricol

O System Ricol inclui um sistema completo de backup automático para todos os bancos de dados MySQL/MariaDB.

## 🔧 **Como Funciona**

### **Componentes do Sistema:**

1. **Container de Backup** (`global-backup`)
   - Baseado na imagem MariaDB 10.6
   - Executa como serviço no Docker Compose
   - Inclui cron para agendamento automático

2. **Script de Backup** (`backup.sh`)
   - Faz dump de todos os bancos de dados
   - Comprime os arquivos (gzip)
   - Gerencia retenção automática
   - Gera logs detalhados

3. **Script de Inicialização** (`init-backup.sh`)
   - Prepara o ambiente
   - Configura cron
   - Verifica conectividade

4. **Comando CLI** (`system-ricol backup`)
   - Interface amigável para gerenciar backups
   - Execução manual, listagem, restauração

## 🚀 **Uso Básico**

### **Executar Backup Manual:**
```bash
system-ricol backup
# Escolha: "💾 Executar backup agora"
```

### **Listar Backups Disponíveis:**
```bash
system-ricol backup
# Escolha: "📋 Listar backups disponíveis"
```

### **Restaurar um Backup:**
```bash
system-ricol backup
# Escolha: "♻️ Restaurar backup"
```

## ⚙️ **Configuração**

### **Variáveis de Ambiente:**

Crie/edite o arquivo `.env` em `ricol-global-docker-local-ssl/`:

```bash
# Configurações de Backup
BACKUP_SCHEDULE="0 2 * * *"        # Diário às 2:00
BACKUP_RETENTION_DAYS=7            # Manter por 7 dias
TZ="America/Sao_Paulo"             # Timezone
RUN_INITIAL_BACKUP=false           # Backup inicial

# Configurações do MySQL
MYSQL_ROOT_PASSWORD=sua_senha_root
MYSQL_ADMIN_PASSWORD=sua_senha_admin
```

### **Horários de Backup Comuns:**

| Descrição | Cron Expression |
|-----------|----------------|
| Diário às 2:00 | `0 2 * * *` |
| Diário às 3:00 | `0 3 * * *` |
| A cada 6 horas | `0 */6 * * *` |
| A cada 12 horas | `0 */12 * * *` |
| Semanal (domingo 2:00) | `0 2 * * 0` |

### **Configurar via CLI:**
```bash
system-ricol backup
# Escolha: "⚙️ Configurar backup automático"
```

## 📁 **Estrutura de Arquivos**

### **Diretório de Backups:**
```
ricol-global-docker-local-ssl/backups/
├── wp_meusite_abc123_20241201_020000.sql.gz
├── laravel_projeto_def456_20241201_020001.sql.gz
├── backup.log
├── backup_report_20241201.txt
└── ...
```

### **Formato dos Arquivos:**
- **Nome:** `{tipo}_{projeto}_{hash}_{data}_{hora}.sql.gz`
- **Exemplo:** `wp_meusite_abc123_20241201_020000.sql.gz`
- **Compressão:** gzip para economia de espaço

## 🔍 **Monitoramento**

### **Verificar Status:**
```bash
system-ricol backup
# Escolha: "📈 Status do serviço de backup"
```

### **Ver Logs:**
```bash
# Logs do container
docker logs global-backup

# Logs do backup
cat ~/ricol-global-docker-local-ssl/backups/backup.log
```

### **Ver Relatório:**
```bash
system-ricol backup
# Escolha: "📊 Ver relatório de backup"
```

## 🛠️ **Comandos Avançados**

### **Backup Manual via Docker:**
```bash
cd ~/ricol-global-docker-local-ssl
docker exec global-backup /usr/local/bin/backup.sh
```

### **Restaurar via Docker:**
```bash
# Restaurar banco específico
docker exec -i global-backup mysql -h mariadb -u root -p[SENHA] [BANCO] < backup.sql

# Restaurar backup comprimido
docker exec -i global-backup sh -c "gunzip -c /backups/arquivo.sql.gz | mysql -h mariadb -u root -p[SENHA] [BANCO]"
```

### **Limpeza Manual:**
```bash
# Remover backups com mais de 7 dias
docker exec global-backup find /backups -name "*.sql.gz" -type f -mtime +7 -delete
```

## 🔧 **Troubleshooting**

### **Container não inicia:**
```bash
# Verificar logs
docker logs global-backup

# Verificar dependências
docker ps --filter "name=global-mariadb"

# Reiniciar serviço
cd ~/ricol-global-docker-local-ssl
docker compose restart backup
```

### **Backup falha:**
```bash
# Verificar conectividade MySQL
docker exec global-backup mysqladmin ping -h mariadb -u root -p[SENHA]

# Verificar espaço em disco
df -h

# Verificar permissões
docker exec global-backup ls -la /backups
```

### **Cron não funciona:**
```bash
# Verificar cron
docker exec global-backup crontab -l

# Verificar processo cron
docker exec global-backup pgrep cron

# Restart cron
docker exec global-backup service cron restart
```

## 📊 **Health Checks**

O sistema inclui health checks automáticos:

- **Container:** Verifica se o processo cron está rodando
- **MySQL:** Testa conectividade antes de cada backup
- **Espaço:** Monitora espaço disponível em disco
- **Logs:** Registra todas as operações

## 🔒 **Segurança**

### **Proteções Implementadas:**
- Senhas via variáveis de ambiente
- Containers com `no-new-privileges`
- Validação de entrada nos scripts
- Logs detalhados para auditoria

### **Recomendações:**
- Use senhas fortes para MySQL
- Monitore logs regularmente
- Mantenha backups em local seguro
- Teste restaurações periodicamente

## 📈 **Performance**

### **Otimizações:**
- Compressão gzip (reduz 70-90% do tamanho)
- Backups incrementais via mysqldump
- Limpeza automática de arquivos antigos
- Execução em horários de baixo uso

### **Monitoramento:**
- Tempo de execução nos logs
- Tamanho dos backups
- Espaço em disco utilizado
- Falhas e sucessos

## 🎯 **Próximos Passos**

Para melhorar ainda mais o sistema de backup:

1. **Backup Remoto:** Integração com S3, Google Drive
2. **Notificações:** Email/Slack para falhas
3. **Backup Incremental:** Apenas mudanças
4. **Criptografia:** Arquivos criptografados
5. **Múltiplas Retenções:** Diário, semanal, mensal 