# CORS e Endpoint Fixes para Produção

## Problema Identificado

O frontend em produção (`https://resoluty-frontend.onrender.com`) estava enfrentando erros de CORS ao tentar se conectar ao backend (`https://resoluty.onrender.com`). Os erros incluíam:

1. **CORS Policy Error**: `The 'Access-Control-Allow-Origin' header has a value 'http://localhost:3000' that is not equal to the supplied origin.`
2. **404 Not Found**: `GET https://resoluty-backend.onrender.com/api/health net::ERR_FAILED 404 (Not Found)`

## Soluções Implementadas

### 1. Configuração CORS Atualizada

**Arquivo**: `backend/src/index.ts`

**Mudanças**:
- Adicionado array `allowedOrigins` com URLs de desenvolvimento e produção
- Configurado Socket.IO para aceitar múltiplas origens
- Configurado Express CORS para aceitar múltiplas origens
- Adicionado suporte a credenciais

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'https://resoluty-frontend.onrender.com'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

### 2. Endpoints API Padronizados

**Arquivo**: `backend/src/index.ts`

**Mudanças**:
- Removido endpoint duplicado `/health`
- Adicionado prefixo `/api/` para todos os endpoints de leads
- Padronizado endpoints de WhatsApp com prefixo `/api/`

```typescript
// Antes
app.put('/leads/:numero/status', ...)
app.get('/whatsapp/instances', ...)

// Depois
app.put('/api/leads/:numero/status', ...)
app.get('/api/whatsapp/instances', ...)
```

### 3. Frontend API Service Atualizado

**Arquivo**: `frontwpp/src/services/apiService.ts`

**Mudanças**:
- Atualizado `getLeads()` para usar `/api/leads`
- Atualizado `getLead()` para usar `/api/leads/:numero`

```typescript
// Antes
const response = await api.get('/leads');
const response = await api.get(`/leads/${encodeURIComponent(numero)}`);

// Depois
const response = await api.get('/api/leads');
const response = await api.get(`/api/leads/${encodeURIComponent(numero)}`);
```

## Endpoints Disponíveis

### Backend (`https://resoluty.onrender.com`)

**Health Check**:
- `GET /health` - Verificar status do servidor

**Leads**:
- `GET /api/leads` - Listar todos os leads
- `GET /api/leads/:numero` - Buscar lead específico
- `GET /api/leads/:numero/messages` - Buscar mensagens do lead
- `GET /api/leads/status/:status` - Buscar leads por status
- `PUT /api/leads/:numero/status` - Atualizar status do lead

**WhatsApp**:
- `GET /api/whatsapp/instances` - Listar instâncias WhatsApp
- `POST /api/whatsapp/toggle-sdr` - Alternar modo SDR
- `POST /api/whatsapp/configure` - Configurar WhatsApp

**Socket.IO**:
- Conecta em `https://resoluty.onrender.com` com CORS configurado

## Próximos Passos

1. **Re-deploy do Backend**: Faça push das mudanças para o repositório para que o Render re-deploy automaticamente
2. **Verificar Logs**: Monitore os logs do Render para confirmar que o deploy foi bem-sucedido
3. **Testar Frontend**: Acesse `https://resoluty-frontend.onrender.com` e verifique se os erros de CORS foram resolvidos
4. **Testar Funcionalidades**: Verifique se todas as funcionalidades (leads, WhatsApp, Socket.IO) estão funcionando corretamente

## Verificação

Para verificar se o fix funcionou:

1. Acesse o console do navegador em `https://resoluty-frontend.onrender.com`
2. Verifique se não há mais erros de CORS
3. Teste a funcionalidade de atualizar status de leads
4. Verifique se o Socket.IO está conectando corretamente

## Notas Importantes

- O backend agora aceita conexões tanto de `http://localhost:3000` (desenvolvimento) quanto de `https://resoluty-frontend.onrender.com` (produção)
- Todos os endpoints de API agora seguem o padrão `/api/...`
- O endpoint de health check permanece como `/health` (sem prefixo `/api/`)
- Socket.IO está configurado para aceitar múltiplas origens com suporte a credenciais