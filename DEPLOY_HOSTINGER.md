# 🚀 Deploy no Hostinger Cloud - Resoluty

## 📋 Pré-requisitos

1. **Conta Hostinger Cloud** ativa
2. **Node.js 18+** instalado localmente
3. **Git** configurado
4. **Variáveis de ambiente** preparadas

## 🔧 Configuração do Ambiente

### 1. Preparar Variáveis de Ambiente

Criar arquivo `.env` no backend:

```bash
# Backend (.env)
NODE_ENV=production
PORT=10000

# Database
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_supabase

# OpenAI
OPENAI_API_KEY=sua_chave_openai
OPENAI_ASSISTANT_ID=seu_assistant_id

# Hostinger
HOSTINGER_DOMAIN=seu-dominio.com
```

### 2. Configurar Frontend

Atualizar `frontwpp/src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://seu-dominio.com',
  // ... resto da configuração
};
```

## 🚀 Deploy no Hostinger Cloud

### Passo 1: Acessar Hostinger Cloud

1. Faça login no [Hostinger Cloud](https://cloud.hostinger.com)
2. Crie um novo projeto ou use um existente

### Passo 2: Configurar Servidor

```bash
# Conectar via SSH
ssh root@seu-ip-do-servidor

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Instalar PM2 (Process Manager)
npm install -g pm2

# Instalar Nginx
apt install nginx -y

# Instalar Certbot para SSL
apt install certbot python3-certbot-nginx -y
```

### Passo 3: Configurar Nginx

Criar arquivo `/etc/nginx/sites-available/resoluty`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Backend API
    location /api {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (React)
    location / {
        root /var/www/resoluty/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache estático
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check
    location /health {
        proxy_pass http://localhost:10000;
        proxy_set_header Host $host;
    }
}
```

### Passo 4: Deploy do Backend

```bash
# Criar diretório do projeto
mkdir -p /var/www/resoluty
cd /var/www/resoluty

# Clonar repositório (ou fazer upload)
git clone https://github.com/seu-usuario/resoluty.git .

# Instalar dependências
cd backend
npm install

# Build do projeto
npm run build

# Configurar PM2
pm2 start dist/index.js --name "resoluty-backend" --max-memory-restart 512M

# Salvar configuração do PM2
pm2 save
pm2 startup
```

### Passo 5: Deploy do Frontend

```bash
# Instalar dependências do frontend
cd /var/www/resoluty/frontwpp
npm install

# Build para produção
npm run build

# Configurar permissões
chown -R www-data:www-data /var/www/resoluty
chmod -R 755 /var/www/resoluty
```

### Passo 6: Configurar SSL

```bash
# Ativar site no Nginx
ln -s /etc/nginx/sites-available/resoluty /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Configurar SSL
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

## 🔧 Scripts de Deploy Automatizado

### Criar script de deploy (`deploy.sh`):

```bash
#!/bin/bash

echo "🚀 Iniciando deploy do Resoluty..."

# Parar aplicação
pm2 stop resoluty-backend

# Pull das mudanças
git pull origin main

# Backend
cd backend
npm install
npm run build
pm2 start dist/index.js --name "resoluty-backend" --max-memory-restart 512M

# Frontend
cd ../frontwpp
npm install
npm run build

# Reiniciar Nginx
systemctl reload nginx

echo "✅ Deploy concluído!"
```

### Tornar executável:
```bash
chmod +x deploy.sh
```

## 📊 Monitoramento

### Configurar logs do PM2:
```bash
# Ver logs em tempo real
pm2 logs resoluty-backend

# Monitorar recursos
pm2 monit
```

### Configurar monitoramento do Nginx:
```bash
# Ver logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔒 Segurança

### Configurar firewall:
```bash
# Instalar UFW
apt install ufw

# Configurar regras
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

### Configurar backup automático:
```bash
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

echo "Backup criado: $DATE"
EOF

chmod +x /root/backup-resoluty.sh

# Adicionar ao crontab (backup diário às 2h)
echo "0 2 * * * /root/backup-resoluty.sh" | crontab -
```

## 🚨 Troubleshooting

### Problemas comuns:

1. **Erro de memória**:
```bash
# Aumentar swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

2. **Puppeteer não funciona**:
```bash
# Instalar dependências do Chrome
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
```

3. **Verificar status dos serviços**:
```bash
# Status do PM2
pm2 status

# Status do Nginx
systemctl status nginx

# Verificar portas
netstat -tlnp
```

## 📈 Otimizações para Produção

### Configurar cache do Nginx:
```nginx
# Adicionar ao nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=resoluty_cache:10m max_size=10g inactive=60m use_temp_path=off;

# No location /api
proxy_cache resoluty_cache;
proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
proxy_cache_valid 200 1m;
```

### Configurar compressão:
```nginx
# Adicionar ao server block
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/atom+xml
    image/svg+xml;
```

## 🎯 Checklist Final

- [ ] Servidor configurado com Node.js 18+
- [ ] PM2 instalado e configurado
- [ ] Nginx configurado e funcionando
- [ ] SSL configurado
- [ ] Backend rodando na porta 10000
- [ ] Frontend buildado e servido pelo Nginx
- [ ] Firewall configurado
- [ ] Backup automático configurado
- [ ] Monitoramento ativo
- [ ] Testes de conectividade realizados

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs: `pm2 logs` e `nginx -t`
2. Verificar recursos: `htop` e `df -h`
3. Verificar conectividade: `curl -I https://seu-dominio.com`

O sistema está pronto para produção no Hostinger Cloud! 🚀 