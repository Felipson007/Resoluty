# 🚀 Deploy Separado no Render

## ✅ Estratégia de Deploy

Você vai criar **dois serviços separados** no Render:
1. **Backend** - API Node.js/Express
2. **Frontend** - Aplicação React (Static Site)

## 🔧 Configuração dos Serviços

### 1. Backend Service

#### Configurações Básicas:
- **Nome:** `resoluty-backend`
- **Tipo:** Web Service
- **Environment:** Node
- **Plan:** Starter (Free) ou Pago

#### Build & Start Commands:
```bash
# Build Command
cd backend && npm install && npm run build

# Start Command
cd backend && npm start
```

#### Health Check:
```
/health
```

#### Variáveis de Ambiente (Obrigatórias):
```bash
NODE_ENV=production
PORT=4000
OPENAI_API_KEY=sk-proj-...
OPENAI_ASSISTANT_ID=asst_...
GHL_API_KEY=sua_chave_ghl
GHL_API_BASE=https://api.gohighlevel.com/v1
WHATSAPP_API_BASE=https://sua.url.whatsapp
WHATSAPP_API_KEY=sua_chave_whatsapp
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_SHEETS_CREDENTIALS=sua_credencial_google
```

### 2. Frontend Service

#### Configurações Básicas:
- **Nome:** `resoluty-frontend`
- **Tipo:** Static Site
- **Environment:** Static
- **Plan:** Free

#### Build & Start Commands:
```bash
# Build Command
cd frontwpp && npm install && npm run build

# Start Command
cd frontwpp && npm run serve
```

#### Publish Directory:
```
./frontwpp/build
```

#### Variáveis de Ambiente:
```bash
REACT_APP_API_URL=https://resoluty-backend.onrender.com
```

## 📋 Passos para Deploy

### 1. Criar Backend Service

1. **No Render Dashboard:**
   - Clique em "New +"
   - Selecione "Web Service"
   - Conecte seu repositório Git

2. **Configurações:**
   - **Name:** `resoluty-backend`
   - **Environment:** Node
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && npm start`

3. **Variáveis de Ambiente:**
   - Adicione todas as variáveis listadas acima
   - Configure cada uma com os valores corretos

4. **Health Check:**
   - **Path:** `/health`

### 2. Criar Frontend Service

1. **No Render Dashboard:**
   - Clique em "New +"
   - Selecione "Static Site"
   - Conecte o mesmo repositório Git

2. **Configurações:**
   - **Name:** `resoluty-frontend`
   - **Build Command:** `cd frontwpp && npm install && npm run build`
   - **Publish Directory:** `frontwpp/build`

3. **Variáveis de Ambiente:**
   - **REACT_APP_API_URL:** URL do backend (será configurada após o deploy do backend)

## 🔗 URLs de Produção

Após o deploy, você terá:
- **Backend:** `https://resoluty-backend.onrender.com`
- **Frontend:** `https://resoluty-frontend.onrender.com`

## 🔄 Ordem de Deploy

### 1. Deploy Backend Primeiro
```bash
# Commit e push das mudanças
git add .
git commit -m "Configure backend for Render deploy"
git push origin main
```

### 2. Configurar Frontend
Após o backend estar funcionando:
1. Vá para o serviço frontend no Render
2. Configure a variável `REACT_APP_API_URL` com a URL do backend
3. Faça deploy do frontend

## 📊 Monitoramento

### Backend
- **Health Check:** `https://resoluty-backend.onrender.com/health`
- **Logs:** Dashboard do Render → Backend Service → Logs

### Frontend
- **URL:** `https://resoluty-frontend.onrender.com`
- **Logs:** Dashboard do Render → Frontend Service → Logs

## 🆘 Troubleshooting

### Backend Issues
1. **Build Failing:**
   ```bash
   # Teste local
   cd backend
   npm install
   npm run build
   ```

2. **Health Check Failing:**
   ```bash
   # Teste local
   npm start
   curl http://localhost:4000/health
   ```

### Frontend Issues
1. **Build Failing:**
   ```bash
   # Teste local
   cd frontwpp
   npm install
   npm run build
   ```

2. **API Connection:**
   - Verifique se `REACT_APP_API_URL` está correto
   - Teste se o backend está respondendo

## 💰 Custos

### Plano Gratuito
- **Backend:** 750 horas/mês
- **Frontend:** Ilimitado

### Plano Pago
- **Starter:** $7/mês por serviço
- **Professional:** $25/mês por serviço

## ✅ Checklist

### Backend
- [ ] Serviço criado no Render
- [ ] Build command configurado
- [ ] Start command configurado
- [ ] Health check funcionando
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy bem-sucedido

### Frontend
- [ ] Serviço criado no Render
- [ ] Build command configurado
- [ ] Publish directory configurado
- [ ] REACT_APP_API_URL configurado
- [ ] Deploy bem-sucedido
- [ ] Conectando com o backend

---

**🎉 Ambos os serviços estarão rodando separadamente no Render!**