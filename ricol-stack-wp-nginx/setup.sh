#!/bin/bash

# Ricol Stack - Script de Configuração
# Este script ajuda a configurar o ambiente WordPress com Nginx

set -e

echo "🚀 Ricol Stack - Configuração Inicial"
echo "======================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[PASSO]${NC} $1"
}

# Verificar se o Docker está instalado
check_docker() {
    print_step "Verificando se o Docker está instalado..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker não está instalado. Por favor, instale o Docker primeiro."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
        exit 1
    fi
    
    print_message "Docker e Docker Compose estão instalados."
}

# Verificar se as redes necessárias existem
check_networks() {
    print_step "Verificando redes Docker..."
    
    if ! docker network ls | grep -q "sr-reverse-proxy"; then
        print_warning "Rede 'sr-reverse-proxy' não encontrada. Criando..."
        docker network create sr-reverse-proxy
        print_message "Rede 'sr-reverse-proxy' criada."
    else
        print_message "Rede 'sr-reverse-proxy' já existe."
    fi
    
    if ! docker network ls | grep -q "sr-public_network"; then
        print_warning "Rede 'sr-public_network' não encontrada. Criando..."
        docker network create sr-public_network
        print_message "Rede 'sr-public_network' criada."
    else
        print_message "Rede 'sr-public_network' já existe."
    fi
}

# Solicitar informações do usuário
get_user_input() {
    print_step "Configurando variáveis do projeto..."
    
    read -p "Digite o nome do site (ex: meusite): " SITE_NAME
    read -p "Digite a URL do site (ex: meusite.com): " SITE_URL
    read -p "Digite a versão do PHP (ex: 8.2-fpm): " PHP_VERSION
    read -p "Digite seu nome de usuário: " USER_NAME
    
    # Validações básicas
    if [ -z "$SITE_NAME" ] || [ -z "$SITE_URL" ] || [ -z "$PHP_VERSION" ] || [ -z "$USER_NAME" ]; then
        print_error "Todas as informações são obrigatórias."
        exit 1
    fi
    
    print_message "Configurações coletadas com sucesso."
}

# Criar arquivo docker-compose.yml personalizado
create_docker_compose() {
    print_step "Criando arquivo docker-compose.yml personalizado..."
    
    # Fazer backup do arquivo original se existir
    if [ -f "docker-compose.yml" ]; then
        cp docker-compose.yml docker-compose.yml.backup
        print_message "Backup do docker-compose.yml criado."
    fi
    
    # Criar novo arquivo com as variáveis substituídas
    sed "s/<SITE_NAME>/$SITE_NAME/g; s/<SITE_URL>/$SITE_URL/g; s/<PHP_IMAGE>/php:$PHP_VERSION/g; s/<USER_NAME>/$USER_NAME/g; s/<labels>/$SITE_NAME/g" docker-compose.example.yml > docker-compose.yml
    
    print_message "Arquivo docker-compose.yml criado com sucesso."
}

# Criar diretórios necessários
create_directories() {
    print_step "Criando diretórios necessários..."
    
    mkdir -p system
    mkdir -p config/php-fpm
    
    print_message "Diretórios criados."
}

# Verificar se o WordPress já está instalado
check_wordpress() {
    if [ -f "system/wp-config.php" ]; then
        print_message "WordPress já está instalado no diretório system/."
        return 0
    else
        print_warning "WordPress não encontrado no diretório system/."
        print_message "Você precisará instalar o WordPress manualmente ou usar WP-CLI."
        return 1
    fi
}

# Instruções pós-configuração
show_next_steps() {
    echo ""
    echo "🎉 Configuração concluída!"
    echo "=========================="
    echo ""
    echo "Próximos passos:"
    echo "1. Execute: docker-compose up -d --build"
    echo "2. Acesse: https://$SITE_URL"
    echo ""
    echo "Para instalar o WordPress (se necessário):"
    echo "1. docker-compose exec phpfpm bash"
    echo "2. wp core download --path=/var/www/html"
    echo "3. wp core install --url=$SITE_URL --title='Meu Site' --admin_user=admin --admin_password=senha123 --admin_email=admin@$SITE_URL"
    echo ""
    echo "Para ver logs:"
    echo "docker-compose logs -f"
    echo ""
    echo "Para parar os serviços:"
    echo "docker-compose down"
    echo ""
}

# Função principal
main() {
    check_docker
    check_networks
    get_user_input
    create_docker_compose
    create_directories
    check_wordpress
    show_next_steps
}

# Executar função principal
main "$@" 