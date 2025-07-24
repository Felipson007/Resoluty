# 🚀 Central de Atendimento WhatsApp - Instruções de Setup

## 📋 Pré-requisitos

- Node.js 16+ instalado
- Conta Supabase configurada
- Git

## ⚙️ Configuração do Backend

### 1. Configurar variáveis de ambiente

Crie o arquivo `.env` na pasta `backend/` com:

```env
# Configurações do Supabase
SUPABASE_URL=sua_url_do_supabase_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Configurações do servidor
PORT=4000

# Configurações do WhatsApp
WHATSAPP_BOT_TIMEOUT=15000

# OpenAI (opcional para IA)
OPENAI_API_KEY=sua_chave_openai_aqui

# GoHighLevel (opcional)
GHL_API_KEY=sua_chave_ghl_aqui
```

### 2. Configurar tabela no Supabase

Execute este SQL no Supabase SQL Editor:

```sql
-- Criar tabela para conversas do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_text TEXT NOT NULL,
  conversation_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_cliente_id 
ON whatsapp_conversations USING GIN ((metadata->>'cliente_id'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_created_at 
ON whatsapp_conversations (created_at DESC);

-- RLS (Row Level Security) - opcional
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (ajuste conforme necessário)
CREATE POLICY "Permitir todas operações" ON whatsapp_conversations
FOR ALL USING (true) WITH CHECK (true);
```

### 3. Instalar dependências e iniciar backend

```bash
cd backend
npm install
npm start
```

O backend estará rodando em http://localhost:4000

## 🎨 Configuração do Frontend

### 1. Instalar dependências e iniciar frontend

```bash
cd frontwpp
npm install
npm start
```

O frontend estará rodando em http://localhost:3000

## 🔄 Como usar

### 1. Primeiro acesso
- O frontend tentará conectar com o backend automaticamente
- Se não houver contatos, aparecerá "Aguardando mensagens de clientes..."

### 2. Conectar WhatsApp
- O backend já está configurado para WhatsApp via Baileys
- Escaneie o QR Code que aparece no terminal do backend
- Após conectar, as mensagens recebidas aparecerão automaticamente

### 3. Interface de atendimento

**Sidebar (Esquerda):**
- Lista de contatos com status
- Busca por conversa
- Status: Bot (verde), SDR (laranja), Aguardando (vermelho), Finalizado (verde)

**Área Central:**
- Chat em tempo real
- Balões de mensagem estilo WhatsApp
- Header com info do contato e status

**Campo de Digitação (Inferior):**
- Respostas rápidas
- Campo de texto com suporte a múltiplas linhas
- Botões de ação (Assumir SDR, Passar p/ Bot, Finalizar)

### 4. Fluxo de atendimento

1. **Mensagem chega** → Aparece na sidebar
2. **Clique no contato** → Abre o chat
3. **Bot responde automaticamente** (padrão)
4. **Para assumir atendimento:** Clique em "Assumir SDR"
5. **Digite e envie mensagens** manuais
6. **Para voltar ao bot:** Clique em "Passar p/ Bot"
7. **Para finalizar:** Clique em "Finalizar"

## 🐛 Solução de Problemas

### Backend não conecta com Supabase
- Verifique se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão corretos no `.env`
- Teste a conexão no painel do Supabase

### Frontend não conecta com backend
- Verifique se o backend está rodando na porta 4000
- Verifique o console do navegador para erros de CORS

### WhatsApp não conecta
- Certifique-se de que não há outra sessão ativa do WhatsApp Web
- Delete a pasta `auth_info_baileys` e escaneie o QR novamente

### Mensagens não aparecem
- Verifique se a tabela `whatsapp_conversations` foi criada no Supabase
- Verifique os logs do backend no terminal

## 📡 Endpoints da API

- `GET /api/health` - Status do servidor
- `GET /api/contacts` - Lista de contatos
- `GET /api/contacts/:id/messages` - Mensagens de um contato
- `POST /api/contacts/:id/send` - Enviar mensagem
- `POST /api/contacts/:id/status` - Atualizar status

## 🔧 Desenvolvimento

### Estrutura do projeto
```
├── backend/                 # Servidor Node.js + Express
│   ├── src/
│   │   ├── config/         # Configuração Supabase
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Lógica de negócio
│   │   └── types/          # Tipos TypeScript
│   └── .env               # Variáveis de ambiente
│
└── frontwpp/              # Frontend React
    ├── src/
    │   ├── components/    # Componentes React
    │   └── services/      # API e Socket.IO
    └── package.json
```

### Tecnologias utilizadas
- **Backend:** Node.js, Express, Socket.IO, Baileys (WhatsApp), Supabase
- **Frontend:** React, TypeScript, Material-UI, Socket.IO Client
- **Banco:** Supabase (PostgreSQL)

## 🚀 Deploy (Produção)

### Backend
1. Configure as variáveis de ambiente no servidor
2. Use PM2 ou similar para manter o processo ativo
3. Configure reverse proxy (Nginx) se necessário

### Frontend
```bash
cd frontwpp
npm run build
# Deploy a pasta build/ para seu hosting
```

### Considerações de segurança
- Use HTTPS em produção
- Configure CORS adequadamente
- Implemente autenticação para operadores
- Configure RLS no Supabase adequadamente

---

✅ **A central está pronta para uso!** 

Para suporte, verifique os logs do console tanto no backend quanto no frontend. 