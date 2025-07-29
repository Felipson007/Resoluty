# 🚀 Instruções de Deploy - Resoluty

Seu projeto está pronto para deploy no Render! Aqui estão as instruções completas.

## ✅ Checklist de Preparação

- [x] Backend compilando sem erros
- [x] Frontend compilando sem erros  
- [x] Arquivos de configuração criados
- [x] Variáveis de ambiente documentadas
- [x] render.yaml configurado

## 🔧 Passos para Deploy

### 1. Preparar o Repositório

Certifique-se de que seu código está no GitHub/GitLab com:
- `render.yaml` na raiz
- `backend/` com package.json atualizado
- `frontwpp/` com package.json atualizado
- Todos os arquivos de configuração

### 2. Criar Conta no Render

1. Acesse [render.com](https://render.com)
2. Crie uma conta gratuita
3. Conecte seu repositório Git

### 3. Deploy Automático (Recomendado)

1. No dashboard do Render, clique em "New +"
2. Selecione "Blueprint"
3. Conecte seu repositório
4. O Render detectará automaticamente o `render.yaml`
5. Configure as variáveis de ambiente (veja abaixo)

### 4. Configurar Variáveis de Ambiente

#### Backend (Obrigatórias)
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

#### Frontend
```bash
REACT_APP_API_URL=https://resoluty-backend.onrender.com
```

### 5. Deploy Manual (Alternativo)

Se preferir configurar manualmente:

#### Backend Service
- **Tipo:** Web Service
- **Nome:** `resoluty-backend`
- **Environment:** Node
- **Build Command:** `cd backend && npm install && npm run build`
- **Start Command:** `cd backend && npm start`
- **Health Check Path:** `/health`

#### Frontend Service
- **Tipo:** Static Site
- **Nome:** `resoluty-frontend`
- **Build Command:** `cd frontwpp && npm install && npm run build`
- **Publish Directory:** `frontwpp/build`

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

## ✅ Checklist Final

- [ ] Repositório conectado ao Render
- [ ] Variáveis de ambiente configuradas
- [ ] Build passando
- [ ] Health checks funcionando
- [ ] Frontend conectando ao backend
- [ ] Testes básicos passando
- [ ] Domínio customizado configurado (opcional)
- [ ] Monitoramento ativo

## 📞 Suporte Adicional

Se precisar de ajuda:
1. Verifique os logs no Render
2. Teste localmente primeiro
3. Consulte a documentação do projeto
4. Abra uma issue no repositório

---

**🎉 Parabéns! Seu projeto Resoluty está pronto para produção!**