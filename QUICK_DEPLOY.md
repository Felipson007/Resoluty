# 🚀 Deploy Rápido - Hostinger Cloud

## 📋 Passos Rápidos

### 1. Preparar Servidor
```bash
# Conectar via SSH
ssh root@seu-ip-hostinger

# Executar script de deploy
wget https://raw.githubusercontent.com/seu-usuario/resoluty/main/deploy-hostinger.sh
chmod +x deploy-hostinger.sh
./deploy-hostinger.sh seu-dominio.com
```

### 2. Configurar Variáveis
```bash
# Editar arquivo .env
nano /var/www/resoluty/backend/.env

# Adicionar suas variáveis:
NODE_ENV=production
PORT=10000
SUPABASE_URL=sua_url
SUPABASE_ANON_KEY=sua_chave
OPENAI_API_KEY=sua_chave_openai
OPENAI_ASSISTANT_ID=seu_assistant_id
```

### 3. Atualizar Frontend
```bash
# Editar configuração da API
nano /var/www/resoluty/frontwpp/src/config/api.ts

# Alterar BASE_URL para:
BASE_URL: 'https://seu-dominio.com'
```

### 4. Reiniciar Aplicação
```bash
# Reiniciar backend
pm2 restart resoluty-backend

# Rebuild frontend
cd /var/www/resoluty/frontwpp
npm run build

# Reiniciar Nginx
systemctl reload nginx
```

## ✅ Verificações

```bash
# Status do backend
pm2 status

# Logs em tempo real
pm2 logs resoluty-backend

# Testar health check
curl https://seu-dominio.com/health

# Verificar SSL
curl -I https://seu-dominio.com
```

## 🔧 Comandos Úteis

```bash
# Monitorar recursos
pm2 monit

# Ver logs do Nginx
tail -f /var/log/nginx/access.log

# Backup manual
/root/backup-resoluty.sh

# Reiniciar tudo
pm2 restart all && systemctl reload nginx
```

## 🚨 Troubleshooting

### Problema: Puppeteer não funciona
```bash
# Instalar dependências do Chrome
apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

### Problema: Erro de memória
```bash
# Aumentar swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### Problema: SSL não funciona
```bash
# Renovar certificado
certbot renew --dry-run

# Forçar renovação
certbot --nginx -d seu-dominio.com --force-renewal
```

## 📞 Suporte

- **Logs**: `pm2 logs resoluty-backend`
- **Status**: `pm2 status`
- **Monitoramento**: `pm2 monit`
- **Nginx**: `nginx -t && systemctl status nginx`

O sistema está pronto! 🎉 