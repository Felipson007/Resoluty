# Resoluty Backend

Backend da aplicação Resoluty, construído com Node.js, TypeScript e Express.

## Tecnologias

- Node.js
- TypeScript
- Express
- Socket.IO
- Supabase
- OpenAI
- WhatsApp Baileys

## Configuração Local

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp env.example .env
# Edite o arquivo .env com suas configurações
```

3. Execute em desenvolvimento:
```bash
npm run dev
```

## Deploy no Render

### Configuração do Render

1. **Build Command:**
```bash
npm install && npm run build
```

2. **Start Command:**
```bash
npm start
```

3. **Environment Variables:**
Configure as seguintes variáveis no Render:
- `PORT` (será definido automaticamente pelo Render)
- `OPENAI_API_KEY`
- `OPENAI_ASSISTANT_ID`
- `GHL_API_KEY`
- `GHL_API_BASE`
- `WHATSAPP_API_BASE`
- `WHATSAPP_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_SHEETS_CREDENTIALS` (opcional)

### Configurações Adicionais

- **Node Version:** 18.x ou superior
- **Auto-Deploy:** Habilitado para branch main
- **Health Check Path:** `/health`

## Estrutura do Projeto

```
src/
├── config/          # Configurações (logger, openai, supabase)
├── routes/          # Rotas da API
├── services/        # Serviços de negócio
├── types/           # Tipos TypeScript
├── utils/           # Utilitários
└── index.ts         # Arquivo principal
```

## Endpoints da API

### Health Check
- `GET /health` - Verificar status da aplicação

### Leads
- `GET /leads` - Listar todos os leads
- `GET /leads/:numero` - Buscar lead específico
- `GET /leads/:numero/messages` - Buscar mensagens do lead
- `PUT /leads/:numero/status` - Atualizar status do lead
- `GET /leads/status/:status` - Buscar leads por status

### WhatsApp
- `GET /whatsapp/instances` - Listar instâncias WhatsApp
- `POST /whatsapp/toggle-sdr` - Alternar modo SDR
- `POST /whatsapp/configure` - Configurar WhatsApp
- `DELETE /whatsapp/:instanceId` - Remover WhatsApp

## Socket.IO Events

- `connection` - Cliente conectado
- `disconnect` - Cliente desconectado
- `join-room` - Entrar em sala
- `leave-room` - Sair de sala

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `PORT` | Porta do servidor | Não (padrão: 4000) |
| `OPENAI_API_KEY` | Chave da API OpenAI | Sim |
| `OPENAI_ASSISTANT_ID` | ID do Assistant OpenAI | Sim |
| `GHL_API_KEY` | Chave da API GoHighLevel | Sim |
| `GHL_API_BASE` | URL base da API GHL | Sim |
| `WHATSAPP_API_BASE` | URL da API WhatsApp | Sim |
| `WHATSAPP_API_KEY` | Chave da API WhatsApp | Sim |
| `SUPABASE_URL` | URL do Supabase | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role do Supabase | Sim |
| `GOOGLE_SHEETS_CREDENTIALS` | Credenciais Google Sheets | Não |