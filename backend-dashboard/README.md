# Backend Dashboard - Frontend API

Este backend foi simplificado para servir **apenas o frontend**, fornecendo:
- ✅ API REST para Google Sheets
- ✅ Socket.IO para comunicação em tempo real
- ✅ Logging de ações do usuário e eventos do frontend

## 🚀 Instalação

```bash
cd backend-dashboard
npm install
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz da pasta:

```bash
# Porta do servidor (opcional, padrão: 4000)
PORT=4000

# Google Sheets (opcional)
GOOGLE_SHEET_ID=sua_sheet_id_aqui
GOOGLE_CREDENTIALS_PATH=./credentials.json
```

### Google Sheets (Opcional)

Se quiser usar Google Sheets:
1. Crie um projeto no Google Cloud Console
2. Ative a API do Google Sheets
3. Crie uma Service Account e baixe o `credentials.json`
4. Coloque o arquivo na raiz da pasta `backend-dashboard`
5. Adicione o `GOOGLE_SHEET_ID` no `.env`

## 🏃‍♂️ Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Status do servidor

### Google Sheets
- `GET /api/sheets/test` - Testar conexão
- `POST /api/sheets/write` - Escrever dados
- `POST /api/sheets/append` - Adicionar dados
- `GET /api/sheets/read/:range` - Ler dados
- `POST /api/sheets/log` - Log de eventos
- `GET /api/stats` - Estatísticas

### Socket.IO
- `POST /api/emit` - Emitir eventos para frontend

## 📊 Logging

### Ações do Usuário
```javascript
POST /api/sheets/log
{
  "type": "user-action",
  "data": {
    "action": "click_button",
    "details": { "buttonId": "send-message" },
    "userId": "user123"
  }
}
```

### Eventos do Frontend
```javascript
POST /api/sheets/log
{
  "type": "frontend-event", 
  "data": {
    "event": "page_load",
    "details": { "page": "/dashboard", "loadTime": 1200 }
  }
}
```

## 🔌 Socket.IO

Eventos disponíveis:
- `connection` - Cliente conectado
- `join-room` - Entrar em uma sala
- `disconnect` - Cliente desconectado

## 🎯 Uso com Frontend

Este backend está otimizado para trabalhar com o frontend em `/frontend/`. 

**Não possui:**
- ❌ Integração WhatsApp
- ❌ Banco de dados Supabase 
- ❌ Serviços de mensagens
- ❌ Backend de IA

**É focado em:**
- ✅ Servir o frontend
- ✅ Logging e auditoria
- ✅ Comunicação em tempo real
- ✅ Integração Google Sheets 