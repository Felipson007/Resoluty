# Resoluty Backend

Backend para o sistema Resoluty com integração WhatsApp, IA e Google Calendar.

## 🚀 Funcionalidades

- **WhatsApp Integration**: Conexão com WhatsApp Web JS
- **AI Assistant**: Integração com OpenAI Assistants API
- **Google Calendar**: Verificação de disponibilidade em tempo real
- **Real-time Updates**: Socket.IO para atualizações em tempo real
- **Database**: Supabase PostgreSQL
- **Auto-reply**: Resposta automática com IA
- **Delay Control**: Delay fixo de 30 segundos antes da resposta da IA

## 📋 Pré-requisitos

- Node.js 18+
- Supabase account
- OpenAI API key
- Google Cloud Console (para Google Calendar)

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# OpenAI
OPENAI_API_KEY=sua_chave_da_openai

# Google Calendar (Opcional)
GOOGLE_CLIENT_ID=seu_client_id_do_google
GOOGLE_CLIENT_SECRET=seu_client_secret_do_google
GOOGLE_REDIRECT_URI=https://resoluty.onrender.com/api/calendar/auth/callback

# Servidor
PORT=3001
NODE_ENV=production
```

### Instalação

```bash
npm install
npm run build
npm start
```

## 🗄️ Banco de Dados

Execute os scripts SQL na seguinte ordem:

1. `sql/leads.sql` - Tabela de leads
2. `sql/mensagens_leads.sql` - Tabela de mensagens
3. `sql/configuracoes.sql` - Tabela de configurações
4. `sql/google_credentials.sql` - Tabela de credenciais Google

## 🤖 Configuração da IA

### Delay de Resposta

A IA aguarda **30 segundos** antes de processar cada mensagem. Este delay é fixo e não pode ser alterado via configuração.

### Configurações Disponíveis

- `cerebro_prompt`: Prompt personalizado da IA
- `cerebro_assistant_id`: ID do Assistant OpenAI
- `cerebro_max_attempts`: Máximo de tentativas (padrão: 30)
- `cerebro_timeout_seconds`: Timeout em segundos (padrão: 30)

## 📱 API Endpoints

### WhatsApp
- `GET /api/whatsapp/instances` - Listar instâncias
- `POST /api/whatsapp/add` - Adicionar instância
- `DELETE /api/whatsapp/remove/:id` - Remover instância
- `GET /api/whatsapp/qr/:id` - Obter QR Code
- `POST /api/whatsapp/send` - Enviar mensagem

### Google Calendar
- `GET /api/calendar/disponibilidade/:data` - Verificar disponibilidade
- `GET /api/calendar/proximas-datas` - Próximas datas disponíveis
- `POST /api/calendar/agendar` - Agendar reunião
- `GET /api/calendar/contas` - Listar contas configuradas
- `GET /api/calendar/auth-url/:contaId` - URL de autorização
- `GET /api/calendar/auth/callback` - Callback OAuth

## 🔄 Socket.IO Events

- `whatsapp-status` - Status do WhatsApp
- `new-message` - Nova mensagem
- `lead-status-changed` - Mudança de status do lead
- `qr-code` - QR Code atualizado

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar testes
npm test
```

## 📝 Logs

O sistema gera logs detalhados para debug:

- `🤖` - Processamento da IA
- `📱` - Eventos do WhatsApp
- `📋` - Operações do banco
- `⏰` - Delay de processamento
- `✅` - Sucesso
- `❌` - Erro

## 🔧 Troubleshooting

### IA não responde
1. Verificar se `OPENAI_API_KEY` está configurada
2. Verificar se o Assistant ID está correto
3. Verificar logs para erros específicos

### WhatsApp não conecta
1. Verificar se o QR Code foi escaneado
2. Verificar se a sessão não expirou
3. Verificar logs de autenticação

### Google Calendar não funciona
1. Verificar se as credenciais OAuth estão configuradas
2. Verificar se as contas foram autorizadas
3. Verificar se a API está ativada no Google Cloud Console

## 📞 Suporte

Para suporte técnico, verifique os logs e a documentação do Google Calendar em `GOOGLE_CALENDAR_SETUP.md`.