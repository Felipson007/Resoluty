# Configuração do Google Calendar

Este documento explica como configurar a integração com Google Calendar para que a IA tenha acesso às informações de disponibilidade dos atendentes em tempo real.

## 📋 Pré-requisitos

1. **Conta Google** com acesso ao Google Calendar
2. **Projeto no Google Cloud Console**
3. **Credenciais OAuth 2.0** configuradas
4. **3 Calendários** dos atendentes configurados

## 🔧 Configuração do Google Cloud Console

### 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google Calendar:
   - Vá para "APIs & Services" > "Library"
   - Procure por "Google Calendar API"
   - Clique em "Enable"

### 2. Configurar Credenciais OAuth 2.0

1. Vá para "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure:
   - **Application type**: Web application
   - **Name**: Resoluty Calendar Integration
   - **Authorized redirect URIs**: 
     - `http://localhost:3001/api/calendar/auth/callback` (desenvolvimento)
     - `https://resoluty.onrender.com/api/calendar/auth/callback` (produção)

### 3. Obter Credenciais

Após criar as credenciais, você receberá:
- **Client ID**
- **Client Secret**

## 🗄️ Configuração do Banco de Dados

### 1. Executar Script SQL

Execute o script `sql/google_credentials.sql` no seu banco Supabase:

```sql
-- Criar tabela para armazenar credenciais do Google
CREATE TABLE IF NOT EXISTS google_credentials (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL DEFAULT 'calendar',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Configurações do Google Calendar
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/auth/callback
```

## 👥 Configuração dos Atendentes

### 1. Editar Configuração dos Atendentes

No arquivo `src/services/googleCalendarService.ts`, edite a configuração dos atendentes:

```typescript
const ATENDENTES: Atendente[] = [
  {
    id: 'atendente1',
    nome: 'João Silva',
    email: 'joao.silva@resoluty.com',
    calendarId: 'primary', // ou ID específico do calendário
    timezone: 'America/Sao_Paulo',
    horarioInicio: '09:00',
    horarioFim: '18:00',
    diasTrabalho: [1, 2, 3, 4, 5] // Segunda a sexta
  },
  // Adicione mais atendentes conforme necessário
];
```

### 2. Obter Calendar IDs

Para obter os IDs dos calendários:

1. Acesse [Google Calendar](https://calendar.google.com/)
2. Vá em "Settings" > "Settings"
3. Na aba "Calendars", clique no calendário desejado
4. Role até "Integrate calendar" e copie o "Calendar ID"

## 🔐 Autorização do Google Calendar

### 1. Obter URL de Autorização

```bash
GET /api/calendar/auth-url
```

### 2. Autorizar Acesso

1. Acesse a URL retornada
2. Faça login com a conta Google
3. Conceda as permissões necessárias
4. O sistema redirecionará para o callback e salvará as credenciais

### 3. Verificar Status

```bash
GET /api/calendar/status
```

## 📅 Funcionalidades Disponíveis

### 1. Verificar Disponibilidade

```bash
GET /api/calendar/disponibilidade/2024-01-15
```

### 2. Obter Próximas Datas Disponíveis

```bash
GET /api/calendar/proximas-datas?dias=7
```

### 3. Agendar Reunião

```bash
POST /api/calendar/agendar
{
  "atendenteId": "atendente1",
  "data": "2024-01-15",
  "hora": "14:00",
  "duracao": 60,
  "titulo": "Reunião Resoluty",
  "descricao": "Reunião sobre dívidas",
  "clienteNome": "João Silva",
  "clienteTelefone": "11999999999"
}
```

## 🤖 Integração com IA

A IA agora tem acesso automático às informações de disponibilidade quando o cliente mencionar:

- "agendar"
- "reunião"
- "disponível"
- "horário"

### Exemplo de Prompt com Disponibilidade

```
HISTÓRICO DA CONVERSA:
usuario: Gostaria de agendar uma reunião
sistema: Claro! Vou verificar a disponibilidade dos nossos atendentes.

MENSAGEM ATUAL DO CLIENTE: "Gostaria de agendar uma reunião"
Analise o histórico acima para entender o contexto da conversa. Caso não historico e seja uma primeira mensagem, apresente-se normalmente

INFORMAÇÕES DE DISPONIBILIDADE DOS ATENDENTES:
Disponibilidade para 2024-01-15:

João Silva:
  - 09:00 às 10:00
  - 10:00 às 11:00
  - 14:00 às 15:00
  - 15:00 às 16:00

Maria Santos:
  - 09:00 às 10:00
  - 11:00 às 12:00
  - 16:00 às 17:00

Pedro Costa:
  - 10:00 às 11:00
  - 13:00 às 14:00
  - 17:00 às 18:00
```

## 🔄 Cache e Performance

- **Cache de disponibilidade**: 5 minutos
- **Verificação automática**: Quando cliente menciona agendamento
- **Slots de 1 hora**: Configuráveis
- **Horário de trabalho**: 09:00 às 18:00 (configurável)

## 🛠️ Troubleshooting

### Erro: "Credenciais do Google Calendar não encontradas"

1. Verifique se as credenciais foram salvas no banco
2. Execute o processo de autorização novamente
3. Verifique as variáveis de ambiente

### Erro: "Access token expired"

1. O sistema deve renovar automaticamente
2. Se persistir, reautorize o acesso

### Erro: "Calendar not found"

1. Verifique se o Calendar ID está correto
2. Confirme se o calendário é público ou compartilhado
3. Verifique as permissões da conta Google

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique os logs do servidor
2. Teste as rotas individualmente
3. Confirme a configuração das credenciais
4. Verifique a conectividade com Google APIs
