# 🔐 Configuração OAuth Google - 3 Contas Diferentes

Este guia explica as **duas abordagens** para configurar as credenciais OAuth das 3 contas Google.

## 🎯 **Abordagem 1: Uma Aplicação OAuth (Recomendada)**

### **Vantagens:**
✅ **Mais simples** de configurar e manter  
✅ **Menos variáveis** de ambiente  
✅ **Mesma aplicação** para todas as contas  
✅ **Tokens diferentes** para cada conta  

### **Como Funciona:**
- **Uma única aplicação OAuth** no Google Cloud Console
- **Mesmas credenciais** para todas as contas
- **Cada conta faz login separadamente** e gera seus próprios tokens
- **Tokens armazenados** individualmente no banco

### **Configuração:**

#### **1. Google Cloud Console**
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie **uma aplicação OAuth**:
   - **Name**: Resoluty Calendar
   - **Application type**: Web application
   - **Authorized redirect URIs**: 
     - `https://resoluty.onrender.com/api/calendar/auth/callback`
     - `http://localhost:3001/api/calendar/auth/callback`

#### **2. Variáveis de Ambiente**
```env
# Uma única aplicação OAuth
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=https://resoluty.onrender.com/api/calendar/auth/callback
```

#### **3. Processo de Autorização**
```bash
# Cada conta acessa sua URL específica e faz login separadamente

# Conta 1 - Login com joao.silva@resoluty.com
GET /api/calendar/auth-url/atendente1

# Conta 2 - Login com maria.santos@resoluty.com  
GET /api/calendar/auth-url/atendente2

# Conta 3 - Login com pedro.costa@resoluty.com
GET /api/calendar/auth-url/atendente3
```

#### **4. Resultado no Banco**
```sql
-- Cada conta terá seus próprios tokens
google_credentials:
├── atendente1: access_token_1, refresh_token_1
├── atendente2: access_token_2, refresh_token_2  
└── atendente3: access_token_3, refresh_token_3
```

---

## 🔐 **Abordagem 2: Três Aplicações OAuth Separadas**

### **Vantagens:**
✅ **Máxima separação** entre contas  
✅ **Controle individual** de permissões  
✅ **Isolamento completo** de credenciais  
✅ **Segurança adicional**  

### **Como Funciona:**
- **Três aplicações OAuth** separadas no Google Cloud Console
- **Credenciais diferentes** para cada conta
- **Cada aplicação** tem suas próprias configurações
- **Máximo isolamento** entre as contas

### **Configuração:**

#### **1. Google Cloud Console (3 Aplicações)**

**Aplicação 1 - Atendente1:**
1. Crie aplicação OAuth: "Resoluty Calendar - Atendente1"
2. **Authorized redirect URIs**: 
   - `https://resoluty.onrender.com/api/calendar/auth/callback`
   - `http://localhost:3001/api/calendar/auth/callback`

**Aplicação 2 - Atendente2:**
1. Crie aplicação OAuth: "Resoluty Calendar - Atendente2"
2. **Authorized redirect URIs**: 
   - `https://resoluty.onrender.com/api/calendar/auth/callback`
   - `http://localhost:3001/api/calendar/auth/callback`

**Aplicação 3 - Atendente3:**
1. Crie aplicação OAuth: "Resoluty Calendar - Atendente3"
2. **Authorized redirect URIs**: 
   - `https://resoluty.onrender.com/api/calendar/auth/callback`
   - `http://localhost:3001/api/calendar/auth/callback`

#### **2. Variáveis de Ambiente**
```env
# Aplicação 1 - Atendente1
GOOGLE_CLIENT_ID_1=client_id_atendente1
GOOGLE_CLIENT_SECRET_1=client_secret_atendente1
GOOGLE_REDIRECT_URI_1=https://resoluty.onrender.com/api/calendar/auth/callback

# Aplicação 2 - Atendente2
GOOGLE_CLIENT_ID_2=client_id_atendente2
GOOGLE_CLIENT_SECRET_2=client_secret_atendente2
GOOGLE_REDIRECT_URI_2=https://resoluty.onrender.com/api/calendar/auth/callback

# Aplicação 3 - Atendente3
GOOGLE_CLIENT_ID_3=client_id_atendente3
GOOGLE_CLIENT_SECRET_3=client_secret_atendente3
GOOGLE_REDIRECT_URI_3=https://resoluty.onrender.com/api/calendar/auth/callback
```

#### **3. Processo de Autorização**
```bash
# Cada conta usa sua própria aplicação OAuth

# Conta 1 - Usa GOOGLE_CLIENT_ID_1
GET /api/calendar/auth-url/atendente1

# Conta 2 - Usa GOOGLE_CLIENT_ID_2
GET /api/calendar/auth-url/atendente2

# Conta 3 - Usa GOOGLE_CLIENT_ID_3
GET /api/calendar/auth-url/atendente3
```

---

## 📊 **Comparação das Abordagens**

| Aspecto | Abordagem 1 | Abordagem 2 |
|---------|-------------|-------------|
| **Complexidade** | ⭐⭐ | ⭐⭐⭐⭐ |
| **Manutenção** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Segurança** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Configuração** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Variáveis** | 3 | 9 |
| **Aplicações OAuth** | 1 | 3 |

---

## 🚀 **Recomendação**

### **Use Abordagem 1 se:**
- Quer **simplicidade** na configuração
- Não precisa de **isolamento máximo** entre contas
- Prefere **menos variáveis** de ambiente
- As contas são da **mesma organização**

### **Use Abordagem 2 se:**
- Precisa de **máxima segurança** e isolamento
- As contas são de **organizações diferentes**
- Quer **controle granular** de permissões
- Tem requisitos de **compliance** específicos

---

## 🔧 **Configuração Rápida (Abordagem 1)**

### **1. Google Cloud Console**
```bash
# 1. Acesse: https://console.cloud.google.com/
# 2. Crie projeto ou use existente
# 3. Ative Google Calendar API
# 4. Crie OAuth 2.0 Client ID:
#    - Type: Web application
#    - Name: Resoluty Calendar
#    - Redirect URIs: https://resoluty.onrender.com/api/calendar/auth/callback
```

### **2. Variáveis de Ambiente**
```env
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=https://resoluty.onrender.com/api/calendar/auth/callback
```

### **3. Banco de Dados**
```sql
-- Executar no Supabase SQL Editor
-- Arquivo: backend/sql/google_credentials.sql

-- Inserir contas iniciais
INSERT INTO google_credentials (conta_id, nome_conta, email_conta, tipo) VALUES
  ('atendente1', 'João Silva', 'joao.silva@resoluty.com', 'calendar'),
  ('atendente2', 'Maria Santos', 'maria.santos@resoluty.com', 'calendar'),
  ('atendente3', 'Pedro Costa', 'pedro.costa@resoluty.com', 'calendar');
```

### **4. Autorizar Contas**
```bash
# Acesse cada URL e faça login com a conta correspondente

# Conta 1
https://resoluty.onrender.com/api/calendar/auth-url/atendente1
# Login: joao.silva@resoluty.com

# Conta 2
https://resoluty.onrender.com/api/calendar/auth-url/atendente2
# Login: maria.santos@resoluty.com

# Conta 3
https://resoluty.onrender.com/api/calendar/auth-url/atendente3
# Login: pedro.costa@resoluty.com
```

### **5. Verificar Configuração**
```bash
# Verificar status
GET /api/calendar/status

# Listar contas
GET /api/calendar/contas
```

---

## 🛠️ **Troubleshooting**

### **Problemas Comuns:**

**Erro: "Credenciais OAuth não configuradas"**
- Verifique se as variáveis de ambiente estão corretas
- Confirme se está usando a abordagem correta (1 ou 2)

**Erro: "Redirect URI mismatch"**
- Verifique se o redirect URI está configurado corretamente no Google Cloud Console
- Confirme se a URL de callback está correta

**Erro: "Token expirado"**
- Reautorize a conta usando a URL de autorização
- Verifique se o refresh_token está sendo usado

### **Logs Úteis:**
```bash
# Verificar logs do backend
npm run dev

# Testar autorização
curl https://resoluty.onrender.com/api/calendar/auth-url/atendente1

# Verificar status
curl https://resoluty.onrender.com/api/calendar/status
```

---

## 📝 **Notas Importantes**

1. **Abordagem 1 é recomendada** para a maioria dos casos
2. **Abordagem 2** só é necessária para requisitos específicos de segurança
3. **Tokens são armazenados** individualmente no banco de dados
4. **Cada conta pode ter** configurações diferentes (horários, dias, etc.)
5. **Sistema funciona** mesmo se uma conta falhar

---

## 🤝 **Suporte**

Para dúvidas sobre a configuração OAuth:

1. Verifique se as variáveis de ambiente estão corretas
2. Confirme se a aplicação OAuth está configurada no Google Cloud Console
3. Teste a autorização de cada conta individualmente
4. Verifique os logs do backend para erros específicos
