# 🚀 Guia de Deploy no Render

Este guia detalha como fazer o deploy da aplicação Resoluty no Render.

## 📋 Pré-requisitos

1. Conta no Render (gratuita)
2. Repositório Git com o código
3. Variáveis de ambiente configuradas

## 🔧 Configuração do Render

### 1. Criar Conta no Render
- Acesse [render.com](https://render.com)
- Crie uma conta gratuita
- Conecte seu repositório Git

### 2. Deploy Automático (Recomendado)

O projeto inclui um arquivo `render.yaml` que configura automaticamente os serviços:

1. **Conecte o Repositório:**
   - No dashboard do Render, clique em "New +"
   - Selecione "Blueprint"
   - Conecte seu repositório Git
   - O Render detectará automaticamente o `render.yaml`

2. **Configure as Variáveis de Ambiente:**
   - No dashboard do Render, vá para cada serviço
   - Em "Environment", adicione as variáveis necessárias

### 3. Deploy Manual

Se preferir configurar manualmente:

#### Backend Service
1. **Tipo:** Web Service
2. **Nome:** `resoluty-backend`
3. **Environment:** Node
4. **Build Command:** `cd backend && npm install && npm run build`
5. **Start Command:** `cd backend && npm start`
6. **Health Check Path:** `/health`

#### Frontend Service
1. **Tipo:** Static Site
2. **Nome:** `resoluty-frontend`
3. **Build Command:** `cd frontwpp && npm install && npm run build`
4. **Publish Directory:** `frontwpp/build`

## 🔐 Variáveis de Ambiente

### Backend (Obrigatórias)
```bash
OPENAI_API_KEY=sk-proj-...
OPENAI_ASSISTANT_ID=asst_...
GHL_API_KEY=sua_chave_ghl
GHL_API_BASE=https://api.gohighlevel.com/v1
WHATSAPP_API_BASE=https://sua.url.whatsapp
WHATSAPP_API_KEY=sua_chave_whatsapp
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Frontend
```bash
REACT_APP_API_URL=https://resoluty-backend.onrender.com
```

## 📊 Configurações Recomendadas

### Backend
- **Plan:** Starter ($7/mês) ou Free
- **Auto-Deploy:** Habilitado
- **Branch:** main
- **Node Version:** 18.x

### Frontend
- **Plan:** Free
- **Auto-Deploy:** Habilitado
- **Branch:** main

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Build Failing
```bash
# Verifique os logs no Render
# Certifique-se de que todas as dependências estão no package.json
npm install --production
```

#### 2. Variáveis de Ambiente
- Verifique se todas as variáveis estão configuradas
- Certifique-se de que não há espaços extras
- Use o formato correto para cada variável

#### 3. Health Check Failing
```bash
# Teste localmente primeiro
curl http://localhost:4000/health
```

#### 4. CORS Issues
- Configure o CORS no backend para aceitar o domínio do frontend
- Verifique se as URLs estão corretas

### Logs e Debugging

1. **Acesse os Logs:**
   - No dashboard do Render, vá para o serviço
   - Clique em "Logs"
   - Monitore os logs em tempo real

2. **Debug Local:**
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontwpp
npm run build
npm run serve
```

## 🚀 URLs de Produção

Após o deploy, você terá URLs como:
- **Backend:** `https://resoluty-backend.onrender.com`
- **Frontend:** `https://resoluty-frontend.onrender.com`

## 📈 Monitoramento

### Health Checks
- Backend: `/health`
- Frontend: Automático

### Métricas
- Uptime
- Response time
- Error rate
- Build status

## 🔄 Atualizações

### Deploy Automático
- Push para a branch `main` dispara deploy automático
- Configure webhooks se necessário

### Deploy Manual
1. No dashboard do Render
2. Selecione o serviço
3. Clique em "Manual Deploy"

## 💰 Custos

### Plano Gratuito
- **Backend:** 750 horas/mês
- **Frontend:** Ilimitado
- **Domínios:** Custom domains disponíveis

### Plano Pago
- **Starter:** $7/mês por serviço
- **Professional:** $25/mês por serviço
- Recursos adicionais disponíveis

## 🆘 Suporte

### Render Support
- [Documentação Render](https://render.com/docs)
- [Community Forum](https://community.render.com)

### Problemas Específicos
1. Verifique os logs no dashboard
2. Teste localmente
3. Verifique as variáveis de ambiente
4. Consulte a documentação do projeto

## ✅ Checklist de Deploy

- [ ] Repositório conectado ao Render
- [ ] Variáveis de ambiente configuradas
- [ ] Build passando
- [ ] Health checks funcionando
- [ ] Frontend conectando ao backend
- [ ] Testes básicos passando
- [ ] Domínio customizado configurado (opcional)
- [ ] Monitoramento ativo