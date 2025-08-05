#!/bin/bash

# 🚀 Script de Deploy Automatizado - Resoluty para Hostinger Cloud
# Autor: Sistema Otimizado
# Versão: 1.0

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERRO] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[AVISO] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   error "Este script deve ser executado como root"
   exit 1
fi

log "🚀 Iniciando deploy do Resoluty no Hostinger Cloud..."

# Configurações
PROJECT_DIR="/var/www/resoluty"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontwpp"
DOMAIN=${1:-"seu-dominio.com"}

# Função para instalar dependências do sistema
install_system_dependencies() {
    log "📦 Instalando dependências do sistema..."
    
    # Atualizar sistema
    apt update && apt upgrade -y
    
    # Instalar Node.js 18
    if ! command -v node &> /dev/null; then
        log "📦 Instalando Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        apt-get install -y nodejs
    fi
    
    # Instalar PM2
    if ! command -v pm2 &> /dev/null; then
        log "📦 Instalando PM2..."
        npm install -g pm2
    fi
    
    # Instalar Nginx
    if ! command -v nginx &> /dev/null; then
        log "📦 Instalando Nginx..."
        apt install nginx -y
    fi
    
    # Instalar Certbot
    if ! command -v certbot &> /dev/null; then
        log "📦 Instalando Certbot..."
        apt install certbot python3-certbot-nginx -y
    fi
    
    # Instalar dependências do Puppeteer
    log "📦 Instalando dependências do Puppeteer..."
    apt install -y \
        gconf-service \
        libasound2 \
        libatk1.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgcc1 \
        libgconf-2-4 \
        libgdk-pixbuf2.0-0 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        ca-certificates \
        fonts-liberation \
        libappindicator1 \
        libnss3 \
        lsb-release \
        xdg-utils \
        wget
}

# Função para configurar Nginx
setup_nginx() {
    log "🌐 Configurando Nginx..."
    
    # Criar configuração do Nginx
    cat > /etc/nginx/sites-available/resoluty << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Backend API
    location /api {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend (React)
    location / {
        root $FRONTEND_DIR/build;
        try_files \$uri \$uri/ /index.html;
        
        # Cache estático
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check
    location /health {
        proxy_pass http://localhost:10000;
        proxy_set_header Host \$host;
    }
}
EOF

    # Ativar site
    ln -sf /etc/nginx/sites-available/resoluty /etc/nginx/sites-enabled/
    
    # Remover site padrão se existir
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    nginx -t
    
    # Reiniciar Nginx
    systemctl restart nginx
    systemctl enable nginx
}

# Função para configurar firewall
setup_firewall() {
    log "🔒 Configurando firewall..."
    
    # Instalar UFW se não estiver instalado
    if ! command -v ufw &> /dev/null; then
        apt install ufw -y
    fi
    
    # Configurar regras
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw --force enable
}

# Função para deploy do backend
deploy_backend() {
    log "🔧 Deployando backend..."
    
    cd $BACKEND_DIR
    
    # Instalar dependências
    npm install --production
    
    # Build do projeto
    npm run build
    
    # Parar aplicação se estiver rodando
    pm2 stop resoluty-backend 2>/dev/null || true
    pm2 delete resoluty-backend 2>/dev/null || true
    
    # Iniciar com PM2
    pm2 start dist/index.js --name "resoluty-backend" --max-memory-restart 512M
    
    # Salvar configuração do PM2
    pm2 save
    pm2 startup
}

# Função para deploy do frontend
deploy_frontend() {
    log "🎨 Deployando frontend..."
    
    cd $FRONTEND_DIR
    
    # Instalar dependências
    npm install --production
    
    # Build para produção
    npm run build
    
    # Configurar permissões
    chown -R www-data:www-data $PROJECT_DIR
    chmod -R 755 $PROJECT_DIR
}

# Função para configurar SSL
setup_ssl() {
    log "🔐 Configurando SSL..."
    
    # Configurar SSL com Certbot
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
}

# Função para configurar backup
setup_backup() {
    log "💾 Configurando backup automático..."
    
    # Criar diretório de backup
    mkdir -p /backup/resoluty
    
    # Criar script de backup
    cat > /root/backup-resoluty.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/resoluty"

mkdir -p $BACKUP_DIR

# Backup do código
tar -czf $BACKUP_DIR/code_$DATE.tar.gz /var/www/resoluty

# Backup do PM2
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/pm2_$DATE.pm2

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.pm2" -mtime +7 -delete

echo "Backup criado: $DATE"
EOF

    chmod +x /root/backup-resoluty.sh
    
    # Adicionar ao crontab (backup diário às 2h)
    (crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-resoluty.sh") | crontab -
}

# Função para configurar monitoramento
setup_monitoring() {
    log "📊 Configurando monitoramento..."
    
    # Criar script de monitoramento
    cat > /root/monitor-resoluty.sh << 'EOF'
#!/bin/bash

# Verificar se o backend está rodando
if ! pm2 list | grep -q "resoluty-backend.*online"; then
    echo "Backend offline, reiniciando..."
    pm2 restart resoluty-backend
fi

# Verificar uso de memória
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    echo "Alto uso de memória: ${MEMORY_USAGE}%"
    pm2 restart resoluty-backend
fi

# Verificar espaço em disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Alto uso de disco: ${DISK_USAGE}%"
fi
EOF

    chmod +x /root/monitor-resoluty.sh
    
    # Adicionar ao crontab (verificação a cada 5 minutos)
    (crontab -l 2>/dev/null; echo "*/5 * * * * /root/monitor-resoluty.sh") | crontab -
}

# Função para testar a aplicação
test_application() {
    log "🧪 Testando aplicação..."
    
    # Aguardar um pouco para a aplicação inicializar
    sleep 10
    
    # Testar health check
    if curl -f http://localhost:10000/health > /dev/null 2>&1; then
        log "✅ Backend funcionando corretamente"
    else
        error "❌ Backend não está respondendo"
        return 1
    fi
    
    # Testar frontend
    if curl -f http://localhost > /dev/null 2>&1; then
        log "✅ Frontend funcionando corretamente"
    else
        error "❌ Frontend não está respondendo"
        return 1
    fi
}

# Função principal
main() {
    log "🚀 Iniciando deploy completo do Resoluty..."
    
    # Verificar se o domínio foi fornecido
    if [ "$DOMAIN" = "seu-dominio.com" ]; then
        error "Por favor, forneça o domínio como parâmetro:"
        error "Exemplo: ./deploy-hostinger.sh meudominio.com"
        exit 1
    fi
    
    # Criar diretório do projeto se não existir
    mkdir -p $PROJECT_DIR
    
    # Instalar dependências do sistema
    install_system_dependencies
    
    # Configurar Nginx
    setup_nginx
    
    # Configurar firewall
    setup_firewall
    
    # Deploy do backend
    deploy_backend
    
    # Deploy do frontend
    deploy_frontend
    
    # Configurar SSL
    setup_ssl
    
    # Configurar backup
    setup_backup
    
    # Configurar monitoramento
    setup_monitoring
    
    # Testar aplicação
    test_application
    
    log "🎉 Deploy concluído com sucesso!"
    log "🌐 Acesse: https://$DOMAIN"
    log "📊 Monitoramento: pm2 monit"
    log "📝 Logs: pm2 logs resoluty-backend"
}

# Executar função principal
main "$@" 