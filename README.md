# Resoluty - Sistema de WhatsApp com IA

Sistema completo de WhatsApp com integração de IA e Google Calendar para agendamento de reuniões.

## 🚀 Funcionalidades

- **WhatsApp Integration**: Conexão via QR Code com múltiplas instâncias
- **AI Assistant**: IA inteligente para atendimento automático
- **Google Calendar**: Agendamento de reuniões com múltiplas contas
- **Dashboard**: Interface para gerenciar conversas e status
- **Real-time**: Atualizações em tempo real via Socket.IO

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL (Supabase)
- Contas Google (para Calendar)
- OpenAI API Key

## 🔧 Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` no diretório `backend/`:

```env
# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# OpenAI
OPENAI_API_KEY=sua_chave_da_openai
OPENAI_ASSISTANT_ID=asst_rPvHoutBw01eSySqhtTK4Iv7

# Google Calendar (para múltiplas contas)
GOOGLE_CLIENT_ID=seu_client_id_do_google
GOOGLE_CLIENT_SECRET=seu_client_secret_do_google
GOOGLE_REDIRECT_URI=https://resoluty.onrender.com/api/calendar/auth/callback

# Servidor
PORT=3001
NODE_ENV=production
```

### 2. Configuração do Google Cloud Console

#### 2.1 Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou use um existente
3. Ative a Google Calendar API

#### 2.2 Configurar OAuth 2.0

1. Vá para "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure:
   - **Application type**: Web application
   - **Name**: Resoluty Calendar
   - **Authorized redirect URIs**: 
     - `https://resoluty.onrender.com/api/calendar/auth/callback`
     - `http://localhost:3001/api/calendar/auth/callback` (para desenvolvimento)

#### 2.3 Obter Credenciais

Copie o `Client ID` e `Client Secret` para as variáveis de ambiente.

### 3. Configuração do Banco de Dados

Execute o script SQL para criar as tabelas necessárias:

```sql
-- Executar no Supabase SQL Editor
-- Arquivo: backend/sql/google_credentials.sql
```

### 4. Configuração das 3 Contas Google

#### 4.1 Preparação das Contas

Para integrar 3 contas Google diferentes, você precisa:

1. **3 contas Google separadas** (pode ser a mesma pessoa com 3 emails diferentes)
2. **Acesso ao Google Calendar** em cada conta
3. **Permissões de leitura/escrita** nos calendários

#### 4.2 Processo de Configuração

**Passo 1: Criar registros iniciais no banco**

Execute no Supabase SQL Editor:

```sql
-- Inserir as 3 contas iniciais
INSERT INTO google_credentials (conta_id, nome_conta, email_conta, tipo) VALUES
  ('atendente1', 'João Silva', 'joao.silva@resoluty.com', 'calendar'),
  ('atendente2', 'Maria Santos', 'maria.santos@resoluty.com', 'calendar'),
  ('atendente3', 'Pedro Costa', 'pedro.costa@resoluty.com', 'calendar');
```

**Passo 2: Autorizar cada conta**

Para cada conta, siga este processo:

1. **Acesse a URL de autorização**:
   ```
   GET /api/calendar/auth-url/atendente1
   GET /api/calendar/auth-url/atendente2
   GET /api/calendar/auth-url/atendente3
   ```

2. **Faça login com a conta Google correspondente**:
   - Para `atendente1`: use `joao.silva@resoluty.com`
   - Para `atendente2`: use `maria.santos@resoluty.com`
   - Para `atendente3`: use `pedro.costa@resoluty.com`

3. **Conceda as permissões**:
   - ✅ Ver eventos do Google Calendar
   - ✅ Criar eventos do Google Calendar
   - ✅ Ver informações de disponibilidade

4. **O sistema salvará automaticamente** as credenciais no banco

#### 4.3 Verificar Configuração

```bash
# Verificar status das contas
GET /api/calendar/status

# Listar todas as contas
GET /api/calendar/contas
```

### 5. Configuração dos Atendentes

#### 5.1 Personalizar Configurações

Cada atendente pode ter configurações diferentes:

```sql
-- Exemplo: Atualizar configurações do atendente1
UPDATE google_credentials 
SET 
  horario_inicio = '08:00',
  horario_fim = '17:00',
  dias_trabalho = '{1,2,3,4,5}', -- Segunda a sexta
  timezone = 'America/Sao_Paulo',
  calendar_id = 'primary' -- ou ID específico do calendário
WHERE conta_id = 'atendente1';
```

#### 5.2 Configurações Disponíveis

- **horario_inicio**: Horário de início do trabalho (HH:MM)
- **horario_fim**: Horário de fim do trabalho (HH:MM)
- **dias_trabalho**: Array com dias da semana (1=segunda, 7=domingo)
- **timezone**: Fuso horário da conta
- **calendar_id**: ID do calendário principal ('primary' ou ID específico)
- **ativo**: Se a conta está ativa (true/false)

### 6. Instalação e Execução

```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
cd frontwpp
npm install
npm start
```

## 🔄 Como Funciona

### 1. Integração com IA

Quando um cliente menciona agendamento, a IA:

1. **Detecta a intenção** de agendar reunião
2. **Busca disponibilidade** das 3 contas Google
3. **Fornece horários disponíveis** para o cliente
4. **Agenda automaticamente** quando confirmado

### 2. Múltiplas Contas

O sistema suporta 3 contas Google independentes:

- **Cada conta tem suas próprias credenciais OAuth**
- **Calendários separados** para cada atendente
- **Configurações individuais** de horário e dias de trabalho
- **Ativação/desativação** independente de cada conta

### 3. Tratamento de Erros

Se houver erro no Google Calendar:

1. **IA informa** ao cliente sobre indisponibilidade temporária
2. **Status do lead** é alterado para "lead_avancado"
3. **Flag aparece** na dashboard indicando "passado para SDR"
4. **Atendente humano** assume a conversa

## 📊 APIs Disponíveis

### Google Calendar

```bash
# Verificar disponibilidade
GET /api/calendar/disponibilidade/2024-01-15

# Próximas datas disponíveis
GET /api/calendar/proximas-datas?dias=7

# Agendar reunião
POST /api/calendar/agendar
{
  "atendenteId": "atendente1",
  "data": "2024-01-15",
  "hora": "14:00",
  "duracao": 60,
  "titulo": "Reunião Resoluty",
  "clienteNome": "João Silva",
  "clienteTelefone": "5511999999999"
}

# Listar contas configuradas
GET /api/calendar/contas

# Alterar status de uma conta
PUT /api/calendar/contas/atendente1/status
{
  "ativo": false
}

# URL de autorização para uma conta
GET /api/calendar/auth-url/atendente1

# Status das credenciais
GET /api/calendar/status
```

### WhatsApp

```bash
# Instâncias WhatsApp
GET /api/whatsapp/instances
POST /api/whatsapp/add

# Enviar mensagem
POST /api/whatsapp/send

# Solicitar QR Code
POST /api/whatsapp/request-qr
```

## 🛠️ Troubleshooting

### Problemas Comuns

1. **Erro 404 nas APIs**
   - Verifique se as rotas estão registradas no `index.ts`
   - Confirme se o servidor está rodando

2. **Erro de credenciais Google**
   - Verifique se as variáveis de ambiente estão corretas
   - Confirme se a API do Google Calendar está ativada
   - Reautorize as contas se necessário

3. **IA não responde**
   - Verifique se a `OPENAI_API_KEY` está configurada
   - Confirme se o `OPENAI_ASSISTANT_ID` está correto
   - Verifique os logs do backend

4. **Loop de mensagens**
   - Verifique se não há processamento de mensagens próprias
   - Confirme se o `fromMe` está sendo verificado

### Logs Úteis

```bash
# Verificar logs do backend
npm run dev

# Verificar status das contas Google
curl https://resoluty.onrender.com/api/calendar/status

# Testar disponibilidade
curl https://resoluty.onrender.com/api/calendar/disponibilidade/2024-01-15
```

## 📝 Notas Importantes

1. **Segurança**: As credenciais OAuth são armazenadas criptografadas no banco
2. **Cache**: Disponibilidade é cacheada por 5 minutos para performance
3. **Fallback**: Se Google Calendar falhar, IA passa para atendente humano
4. **Múltiplas Contas**: Cada conta Google é independente e pode ter configurações diferentes
5. **Timezone**: Todas as operações respeitam o timezone configurado para cada conta

## 🤝 Suporte

Para dúvidas ou problemas:

1. Verifique os logs do backend
2. Teste as APIs individualmente
3. Confirme as configurações no banco de dados
4. Verifique se todas as variáveis de ambiente estão corretas