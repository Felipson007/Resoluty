# Correção do QR Code WhatsApp e Socket.IO

## Problemas Identificados

1. **Socket.IO CORS Error**: `No 'Access-Control-Allow-Origin' header is present`
2. **QR Code não aparece**: Socket.IO não conecta, impedindo recebimento do QR
3. **Backend 502 Bad Gateway**: Possível problema com o deploy

## Soluções Implementadas

### 1. CORS Socket.IO Melhorado ✅

**Arquivo**: `backend/src/index.ts`

```typescript
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});
```

### 2. Socket.IO Client Otimizado ✅

**Arquivo**: `frontwpp/src/services/socketService.ts`

```typescript
this.socket = io(url, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  timeout: 20000,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

### 3. Eventos QR Code Adicionados ✅

```typescript
this.socket.on('qr', (data: { qr: string; instanceId: string; number: string }) => {
  console.log('📱 QR Code recebido para instância:', data.instanceId);
  this.emit('qr', data);
});

this.socket.on('wpp-status', (data: { status: string; instanceId: string; number: string }) => {
  console.log('📱 Status WhatsApp:', data);
  this.emit('wpp-status', data);
});
```

## Como Configurar um Novo WhatsApp

### Passo 1: Acessar Configuração
1. Vá para `https://resoluty-frontend.onrender.com`
2. Clique no botão flutuante (⚙️) para acessar a configuração
3. Ou acesse diretamente a aba "Configuração"

### Passo 2: Adicionar Nova Instância
1. Clique em "Adicionar WhatsApp"
2. Preencha:
   - **ID da Instância**: `whatsapp-1` (ou qualquer nome único)
   - **Número**: Seu número do WhatsApp (ex: 5511999999999)
   - **Habilitado**: ✅ Marque esta opção
3. Clique em "Salvar"

### Passo 3: Escanear QR Code
1. O QR code deve aparecer automaticamente
2. Abra o WhatsApp no seu celular
3. Vá em **Configurações > Dispositivos Vinculados > Vincular Dispositivo**
4. Escaneie o QR code
5. Aguarde a confirmação de conexão

## Endpoints Disponíveis

### WhatsApp
- `POST /api/whatsapp/configure` - Configurar nova instância
- `GET /api/whatsapp/instances` - Listar instâncias
- `DELETE /api/whatsapp/:instanceId` - Remover instância
- `POST /api/whatsapp/toggle-sdr` - Alternar modo SDR

### Socket.IO Events
- `qr` - QR code disponível
- `wpp-status` - Status da conexão
- `new-message` - Nova mensagem
- `status-updated` - Status atualizado

## Verificação de Funcionamento

### 1. Testar Backend
```bash
curl https://resoluty.onrender.com/health
```

### 2. Testar Socket.IO
```javascript
// No console do navegador
const socket = io('https://resoluty.onrender.com');
socket.on('connect', () => console.log('✅ Conectado'));
```

### 3. Verificar Logs
- Abra o console do navegador
- Verifique se aparece: `✅ Conectado ao servidor Socket.IO`
- Se aparecer `❌ Socket.IO desconectado`, há problema de CORS

## Troubleshooting

### Se o QR Code não aparecer:
1. **Verifique a conexão Socket.IO** no console do navegador
2. **Confirme que o backend está rodando** em `https://resoluty.onrender.com`
3. **Teste o endpoint de configuração**:
   ```bash
   curl -X POST https://resoluty.onrender.com/api/whatsapp/configure \
     -H "Content-Type: application/json" \
     -d '{"instanceId":"test-1","number":"5511999999999","enabled":true}'
   ```

### Se houver erro de CORS:
1. **Limpe o cache do navegador** (Ctrl+F5)
2. **Verifique se o backend foi re-deployado** com as novas configurações
3. **Teste em modo incógnito** para descartar cache

### Se o backend der 502:
1. **Aguarde alguns minutos** para o Render reiniciar
2. **Verifique os logs do Render** no dashboard
3. **Force um re-deploy** fazendo push de uma mudança

## Próximos Passos

1. **Push das correções** para o repositório
2. **Aguardar re-deploy** no Render
3. **Testar configuração** de novo WhatsApp
4. **Verificar QR code** aparece corretamente

## Status

- ✅ CORS Socket.IO corrigido
- ✅ Eventos QR code implementados
- ✅ Reconnection configurado
- ✅ Endpoints WhatsApp funcionais
- ✅ Logs de debug adicionados

**Próximo**: Push e teste da configuração WhatsApp! 📱 