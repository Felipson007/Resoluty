# 🌐 Configuração de URLs de Produção

## ✅ Alterações Implementadas

### 1. Frontend - API Service
- **Arquivo:** `frontwpp/src/services/apiService.ts`
- **Alteração:** BaseURL agora usa `https://resoluty.onrender.com`
- **Configuração:** Usa variável de ambiente `REACT_APP_API_URL`

### 2. Frontend - Socket Service
- **Arquivo:** `frontwpp/src/services/socketService.ts`
- **Alteração:** Socket URL agora usa `https://resoluty.onrender.com`
- **Configuração:** Usa variável de ambiente `REACT_APP_SOCKET_URL`

### 3. Frontend - Componentes
- **Arquivos:** 
  - `frontwpp/src/components/WhatsAppQR.tsx`
  - `frontwpp/src/components/WhatsAppConfig.tsx`
  - `frontwpp/src/components/MultiWhatsAppQR.tsx`
- **Alteração:** Todos agora usam URLs de produção

### 4. Backend - WhatsApp Bot
- **Arquivo:** `backend/src/routes/whatsappBot.ts`
- **Alteração:** URLs internas agora detectam ambiente (produção/desenvolvimento)

## 🔧 Configuração no Render

### Frontend Service - Variáveis de Ambiente
```bash
REACT_APP_API_URL=https://resoluty.onrender.com
REACT_APP_SOCKET_URL=https://resoluty.onrender.com
```

### Backend Service - Variáveis de Ambiente
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

## 📋 Passos para Aplicar

### 1. Commit das Alterações
```bash
git add .
git commit -m "Configure production URLs for frontend and backend"
git push origin main
```

### 2. No Render Dashboard

#### Frontend Service:
1. Vá para o serviço `resoluty-frontend`
2. **Settings** → **Environment Variables**
3. Adicione:
   - `REACT_APP_API_URL` = `https://resoluty.onrender.com`
   - `REACT_APP_SOCKET_URL` = `https://resoluty.onrender.com`
4. **Manual Deploy**

#### Backend Service:
1. Vá para o serviço `resoluty-backend`
2. **Settings** → **Environment Variables**
3. Certifique-se que `NODE_ENV` = `production`
4. **Manual Deploy**

## 🔗 URLs de Produção

- **Backend API:** `https://resoluty.onrender.com`
- **Frontend:** `https://resoluty-frontend.onrender.com`
- **Health Check:** `https://resoluty.onrender.com/health`

## ✅ Verificação

### 1. Teste Backend
```bash
curl https://resoluty.onrender.com/health
```

### 2. Teste Frontend
- Acesse: `https://resoluty-frontend.onrender.com`
- Verifique se não há erros no console
- Teste funcionalidades principais

### 3. Teste Socket.IO
- Abra o console do navegador
- Verifique se há conexão WebSocket com `https://resoluty.onrender.com`

## 🆘 Troubleshooting

### Se o frontend não conectar:
1. **Verifique as variáveis de ambiente** no Render
2. **Teste a API diretamente:**
   ```bash
   curl https://resoluty.onrender.com/health
   ```
3. **Verifique CORS** no backend

### Se o Socket.IO não conectar:
1. **Verifique se o backend está rodando**
2. **Teste a conexão WebSocket:**
   ```javascript
   // No console do navegador
   const socket = io('https://resoluty.onrender.com');
   socket.on('connect', () => console.log('Conectado!'));
   ```

## 📊 Estrutura Final

```
Resoluty/
├── frontwpp/src/services/apiService.ts      # ✅ URL de produção
├── frontwpp/src/services/socketService.ts   # ✅ URL de produção
├── frontwpp/src/components/                 # ✅ URLs de produção
├── backend/src/routes/whatsappBot.ts        # ✅ URLs dinâmicas
└── PRODUCTION_URL_SETUP.md                 # ✅ Este guia
```

---

**🎉 Agora o frontend está configurado para usar a URL de produção!**