# 🗓️ Configuração do Google Calendar - 3 Contas Diferentes

Este guia explica como configurar 3 contas Google diferentes para o sistema de agendamento do Resoluty.

## 📋 Pré-requisitos

1. **3 contas Google separadas** (pode ser a mesma pessoa com 3 emails diferentes)
2. **Acesso ao Google Calendar** em cada conta
3. **Projeto configurado no Google Cloud Console**
4. **Banco de dados Supabase configurado**

## 🔧 Passo a Passo

### 1. Preparação no Google Cloud Console

#### 1.1 Criar/Configurar Projeto

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou use um existente
3. Ative a **Google Calendar API**

#### 1.2 Configurar OAuth 2.0

1. Vá para "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure:
   - **Application type**: Web application
   - **Name**: Resoluty Calendar
   - **Authorized redirect URIs**: 
     - `https://resoluty.onrender.com/api/calendar/auth/callback`
     - `http://localhost:3001/api/calendar/auth/callback` (desenvolvimento)

#### 1.3 Obter Credenciais

Copie o `Client ID` e `Client Secret` para as variáveis de ambiente:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=https://resoluty.onrender.com/api/calendar/auth/callback
```

### 2. Configuração do Banco de Dados

#### 2.1 Executar Script SQL

Execute no Supabase SQL Editor:

```sql
-- Criar tabela para múltiplas contas Google
CREATE TABLE IF NOT EXISTS google_credentials (
  id SERIAL PRIMARY KEY,
  conta_id VARCHAR(100) NOT NULL UNIQUE,
  nome_conta VARCHAR(200) NOT NULL,
  email_conta VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'calendar',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id VARCHAR(200) DEFAULT 'primary',
  timezone VARCHAR(100) DEFAULT 'America/Sao_Paulo',
  horario_inicio VARCHAR(5) DEFAULT '09:00',
  horario_fim VARCHAR(5) DEFAULT '18:00',
  dias_trabalho INTEGER[] DEFAULT '{1,2,3,4,5}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_google_credentials_conta_id ON google_credentials(conta_id);
CREATE INDEX IF NOT EXISTS idx_google_credentials_tipo ON google_credentials(tipo);
CREATE INDEX IF NOT EXISTS idx_google_credentials_ativo ON google_credentials(ativo);
```

#### 2.2 Inserir Contas Iniciais

```sql
-- Inserir as 3 contas iniciais (sem credenciais ainda)
INSERT INTO google_credentials (conta_id, nome_conta, email_conta, tipo) VALUES
  ('atendente1', 'João Silva', 'joao.silva@resoluty.com', 'calendar'),
  ('atendente2', 'Maria Santos', 'maria.santos@resoluty.com', 'calendar'),
  ('atendente3', 'Pedro Costa', 'pedro.costa@resoluty.com', 'calendar');
```

### 3. Autorização das 3 Contas

#### 3.1 Processo para Cada Conta

Para cada conta, siga este processo:

**Conta 1 - Atendente1:**
1. Acesse: `GET /api/calendar/auth-url/atendente1`
2. Faça login com: `joao.silva@resoluty.com`
3. Conceda permissões do Google Calendar
4. Aguarde redirecionamento e confirmação

**Conta 2 - Atendente2:**
1. Acesse: `GET /api/calendar/auth-url/atendente2`
2. Faça login com: `maria.santos@resoluty.com`
3. Conceda permissões do Google Calendar
4. Aguarde redirecionamento e confirmação

**Conta 3 - Atendente3:**
1. Acesse: `GET /api/calendar/auth-url/atendente3`
2. Faça login com: `pedro.costa@resoluty.com`
3. Conceda permissões do Google Calendar
4. Aguarde redirecionamento e confirmação

#### 3.2 URLs de Autorização

```bash
# Para desenvolvimento local
http://localhost:3001/api/calendar/auth-url/atendente1
http://localhost:3001/api/calendar/auth-url/atendente2
http://localhost:3001/api/calendar/auth-url/atendente3

# Para produção
https://resoluty.onrender.com/api/calendar/auth-url/atendente1
https://resoluty.onrender.com/api/calendar/auth-url/atendente2
https://resoluty.onrender.com/api/calendar/auth-url/atendente3
```

### 4. Verificação da Configuração

#### 4.1 Verificar Status das Contas

```bash
# Verificar status geral
GET /api/calendar/status

# Resposta esperada:
{
  "configured": true,
  "message": "3 de 3 contas ativas",
  "contas": [
    {
      "conta_id": "atendente1",
      "nome_conta": "João Silva",
      "email_conta": "joao.silva@resoluty.com",
      "ativo": true
    },
    // ... outras contas
  ],
  "totalContas": 3,
  "contasAtivas": 3
}
```

#### 4.2 Listar Todas as Contas

```bash
GET /api/calendar/contas

# Resposta esperada:
{
  "contas": [
    {
      "conta_id": "atendente1",
      "nome_conta": "João Silva",
      "email_conta": "joao.silva@resoluty.com",
      "calendar_id": "primary",
      "timezone": "America/Sao_Paulo",
      "horario_inicio": "09:00",
      "horario_fim": "18:00",
      "dias_trabalho": [1,2,3,4,5],
      "ativo": true
    }
    // ... outras contas
  ],
  "totalContas": 3,
  "contasAtivas": 3
}
```

### 5. Personalização das Configurações

#### 5.1 Configurar Horários Diferentes

```sql
-- Atendente1: 8h às 17h
UPDATE google_credentials 
SET horario_inicio = '08:00', horario_fim = '17:00'
WHERE conta_id = 'atendente1';

-- Atendente2: 9h às 18h (padrão)
UPDATE google_credentials 
SET horario_inicio = '09:00', horario_fim = '18:00'
WHERE conta_id = 'atendente2';

-- Atendente3: 10h às 19h
UPDATE google_credentials 
SET horario_inicio = '10:00', horario_fim = '19:00'
WHERE conta_id = 'atendente3';
```

#### 5.2 Configurar Dias de Trabalho

```sql
-- Atendente1: Segunda a sexta
UPDATE google_credentials 
SET dias_trabalho = '{1,2,3,4,5}'
WHERE conta_id = 'atendente1';

-- Atendente2: Segunda a sábado
UPDATE google_credentials 
SET dias_trabalho = '{1,2,3,4,5,6}'
WHERE conta_id = 'atendente2';

-- Atendente3: Terça a sábado
UPDATE google_credentials 
SET dias_trabalho = '{2,3,4,5,6}'
WHERE conta_id = 'atendente3';
```

#### 5.3 Configurar Calendários Específicos

```sql
-- Se você tiver IDs específicos de calendário
UPDATE google_credentials 
SET calendar_id = 'c_abc123@group.calendar.google.com'
WHERE conta_id = 'atendente1';
```

### 6. Testando a Integração

#### 6.1 Testar Disponibilidade

```bash
# Verificar disponibilidade para uma data
GET /api/calendar/disponibilidade/2024-01-15

# Resposta esperada:
{
  "data": "2024-01-15",
  "disponibilidade": [
    {
      "atendenteId": "atendente1",
      "atendenteNome": "João Silva",
      "data": "2024-01-15",
      "horaInicio": "08:00",
      "horaFim": "09:00",
      "disponivel": true
    }
    // ... mais slots
  ],
  "totalSlots": 27,
  "slotsDisponiveis": 15
}
```

#### 6.2 Testar Agendamento

```bash
# Agendar uma reunião
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
```

### 7. Gerenciamento das Contas

#### 7.1 Ativar/Desativar Contas

```bash
# Desativar uma conta
PUT /api/calendar/contas/atendente1/status
{
  "ativo": false
}

# Reativar uma conta
PUT /api/calendar/contas/atendente1/status
{
  "ativo": true
}
```

#### 7.2 Reautorizar Contas

Se uma conta expirar ou der erro:

1. Acesse a URL de autorização novamente
2. Faça login com a conta correspondente
3. Conceda as permissões novamente

```bash
# Reautorizar atendente1
GET /api/calendar/auth-url/atendente1
```

### 8. Troubleshooting

#### 8.1 Problemas Comuns

**Erro: "Credenciais não encontradas"**
- Verifique se a conta existe no banco
- Confirme se o `conta_id` está correto
- Verifique se a conta está ativa

**Erro: "Token expirado"**
- Reautorize a conta usando a URL de autorização
- Verifique se o `refresh_token` está sendo usado

**Erro: "Sem permissão no calendário"**
- Verifique se a conta tem acesso ao calendário
- Confirme se o `calendar_id` está correto

#### 8.2 Logs Úteis

```bash
# Verificar logs do backend
npm run dev

# Testar status das contas
curl https://resoluty.onrender.com/api/calendar/status

# Testar disponibilidade
curl https://resoluty.onrender.com/api/calendar/disponibilidade/2024-01-15
```

### 9. Estrutura Final

Após a configuração, você terá:

```
google_credentials
├── atendente1 (joao.silva@resoluty.com)
│   ├── Credenciais OAuth próprias
│   ├── Calendário próprio
│   └── Configurações individuais
├── atendente2 (maria.santos@resoluty.com)
│   ├── Credenciais OAuth próprias
│   ├── Calendário próprio
│   └── Configurações individuais
└── atendente3 (pedro.costa@resoluty.com)
    ├── Credenciais OAuth próprias
    ├── Calendário próprio
    └── Configurações individuais
```

### 10. Integração com IA

Quando um cliente menciona agendamento, a IA:

1. **Detecta a intenção** de agendar reunião
2. **Busca disponibilidade** das 3 contas simultaneamente
3. **Fornece horários disponíveis** de todos os atendentes
4. **Agenda automaticamente** quando confirmado pelo cliente

### 11. Vantagens da Configuração Múltipla

✅ **Independência**: Cada conta é totalmente independente
✅ **Flexibilidade**: Configurações diferentes para cada atendente
✅ **Redundância**: Se uma conta falhar, outras continuam funcionando
✅ **Escalabilidade**: Fácil adicionar mais contas no futuro
✅ **Controle**: Ativar/desativar contas individualmente

---

## 📞 Suporte

Para dúvidas sobre a configuração:

1. Verifique os logs do backend
2. Teste as APIs individualmente
3. Confirme as configurações no banco de dados
4. Verifique se todas as variáveis de ambiente estão corretas
