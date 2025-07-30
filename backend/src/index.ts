import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Client, LocalAuth } from 'whatsapp-web.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { gerarPromptCerebro } from './services/cerebroService';

dotenv.config();

const app = express();
const server = createServer(app);

// CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://resoluty-frontend.onrender.com', 'https://resoluty.onrender.com'],
  credentials: true
}));

app.use(express.json());

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://resoluty-frontend.onrender.com', 'https://resoluty.onrender.com'],
    credentials: true
  }
});

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// WhatsApp Client
let whatsappClient: Client | null = null;
let isAIActive = true;

// Histórico de mensagens
const messageHistory: { [key: string]: any[] } = {};

// Simular dados de leads para compatibilidade
const mockLeads = [
  {
    id: '1',
    numero: '5511999999999',
    status: 'lead_novo',
    created_at: new Date().toISOString()
  }
];

// Inicializar WhatsApp
async function initializeWhatsApp() {
  console.log('🚀 Iniciando WhatsApp...');
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({ 
      clientId: 'resoluty-ai',
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security'
      ]
    }
  });

  whatsappClient.on('qr', (qr) => {
    console.log('📱 QR Code disponível - escaneie no WhatsApp');
    // Emitir QR code para todos os clientes conectados
    io.emit('qr-code', { qr });
  });

  whatsappClient.on('loading_screen', (percent, message) => {
    console.log('📱 Carregando WhatsApp:', percent, message);
    // Emitir status de carregamento para o frontend
    io.emit('whatsapp-loading', { percent, message });
  });

  whatsappClient.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado!');
    // Aguardar um pouco para o WhatsApp carregar completamente
    setTimeout(() => {
      const status = { 
        connected: true, 
        number: whatsappClient?.info?.wid?.user || 'Número não disponível' 
      };
      io.emit('whatsapp-status', status);
      console.log('📱 Status emitido após autenticação:', status);
    }, 2000);
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    const status = { 
      connected: true, 
      number: whatsappClient?.info?.wid?.user || 'Número não disponível' 
    };
    io.emit('whatsapp-status', status);
    console.log('📱 Status emitido no ready:', status);
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.log('❌ Falha na autenticação WhatsApp:', msg);
    io.emit('whatsapp-status', { connected: false });
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('🔌 WhatsApp desconectado:', reason);
    io.emit('whatsapp-status', { connected: false });
  });

  // Processar mensagens
  whatsappClient.on('message', async (msg) => {
    const message = {
      id: msg.id._serialized,
      from: msg.from,
      body: msg.body,
      timestamp: new Date().toISOString(),
      isFromMe: false
    };

    // Salvar no histórico
    if (!messageHistory[msg.from]) {
      messageHistory[msg.from] = [];
    }
    messageHistory[msg.from].push(message);

    // Emitir para frontend
    io.emit('new-message', message);
    console.log(`📨 Mensagem de ${msg.from}: ${msg.body}`);

    // IA responder automaticamente
    if (isAIActive && !msg.fromMe) {
      await handleAIAutoReply(msg);
    }
  });

  // Mensagens enviadas
  whatsappClient.on('message_create', async (msg) => {
    if (msg.fromMe) {
      const message = {
        id: msg.id._serialized,
        from: msg.to,
        body: msg.body,
        timestamp: new Date().toISOString(),
        isFromMe: true
      };

      if (!messageHistory[msg.to]) {
        messageHistory[msg.to] = [];
      }
      messageHistory[msg.to].push(message);

      io.emit('new-message', message);
      console.log(`📤 Mensagem enviada para ${msg.to}: ${msg.body}`);
    }
  });

  try {
    await whatsappClient.initialize();
  } catch (error) {
    console.error('❌ Erro ao inicializar WhatsApp:', error);
  }
}

// IA responder automaticamente usando OpenAI Assistant com cérebro
async function handleAIAutoReply(msg: any) {
  try {
    console.log('🤖 IA processando mensagem...');

    const conversationHistory = messageHistory[msg.from] || [];
    
    // Converter histórico para formato do cérebro
    const historicoFormatado = conversationHistory.map(m => ({
      texto: m.body,
      autor: m.isFromMe ? 'sistema' as const : 'usuario' as const,
      timestamp: m.timestamp
    }));

    // Informações do cliente (extrair do número)
    const numeroCliente = msg.from.replace('@c.us', '');
    const clienteInfo = {
      numero: numeroCliente,
      nome: `Cliente ${numeroCliente}`,
      status: 'ativo'
    };

    // Gerar prompt usando o cérebro
    const promptCerebro = gerarPromptCerebro(
      historicoFormatado,
      clienteInfo,
      msg.body
    );

    console.log('🧠 Prompt gerado pelo cérebro:', promptCerebro.substring(0, 200) + '...');

    // Criar um novo thread para cada conversa
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: promptCerebro,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!,
    });

    // Poll até o run ser completado
    let runStatus = run.status;
    while (runStatus !== 'completed' && runStatus !== 'failed') {
      await new Promise((r) => setTimeout(r, 2000));
      const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      runStatus = updatedRun.status;
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find((msg) => msg.role === 'assistant');
    
    // Busca o primeiro bloco de texto do conteúdo
    let aiResponse = 'Desculpe, não consegui responder.';
    if (lastMessage && Array.isArray(lastMessage.content)) {
      const textBlock = (lastMessage.content as any[]).find((c) => c.type === 'text' && c.text && typeof c.text.value === 'string');
      if (textBlock) {
        aiResponse = textBlock.text.value;
      }
    }

    await msg.reply(aiResponse);
    console.log(`🤖 IA respondeu: ${aiResponse}`);

  } catch (error) {
    console.error('❌ Erro na IA:', error);
    await msg.reply('Desculpe, estou com dificuldades técnicas no momento. Tente novamente em alguns instantes.');
  }
}

// Socket.IO connections
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });

  // Enviar status atual - só conectado se realmente estiver inicializado e pronto
  const currentStatus = { 
    connected: whatsappClient && whatsappClient.info ? true : false,
    number: whatsappClient?.info?.wid?.user || ''
  };
  socket.emit('whatsapp-status', currentStatus);
  console.log('📱 Status inicial enviado:', currentStatus);
});

// APIs REST

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend funcionando!' });
});

// Status do WhatsApp
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    connected: whatsappClient ? true : false,
    number: whatsappClient?.info?.wid?.user || '',
    aiActive: isAIActive
  });
});

// Instâncias WhatsApp (simulado)
app.get('/api/whatsapp/instances', (req, res) => {
  res.json([{
    id: 'default',
    number: whatsappClient?.info?.wid?.user || '',
    isConnected: whatsappClient && whatsappClient.info ? true : false,
    enabled: true
  }]);
});

// Remove WhatsApp instance
app.delete('/api/whatsapp/instances/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  try {
    // Simular remoção da instância
    console.log(`🗑️ Removendo instância WhatsApp: ${instanceId}`);
    
    // Emitir evento para frontend
    io.emit('whatsapp-instance-removed', { instanceId });
    
    res.json({ 
      success: true, 
      message: 'WhatsApp removido com sucesso' 
    });
  } catch (error) {
    console.error('❌ Erro ao remover WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao remover WhatsApp' 
    });
  }
});

// Configure WhatsApp instance
app.post('/api/whatsapp/instances/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  const { number, enabled } = req.body;
  
  try {
    console.log(`⚙️ Configurando instância WhatsApp: ${instanceId}`, { number, enabled });
    
    // Emitir evento para frontend
    io.emit('whatsapp-instance-configured', { instanceId, number, enabled });
    
    res.json({ 
      success: true, 
      message: 'WhatsApp configurado com sucesso' 
    });
  } catch (error) {
    console.error('❌ Erro ao configurar WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao configurar WhatsApp' 
    });
  }
});

// Controle da IA
app.post('/api/ai/toggle', (req, res) => {
  isAIActive = !isAIActive;
  console.log(`🤖 IA ${isAIActive ? 'ativada' : 'desativada'}`);
  io.emit('ai-status', { active: isAIActive });
  res.json({ active: isAIActive });
});

// Enviar mensagem manual
app.post('/api/whatsapp/send', async (req, res) => {
  const { to, message } = req.body;
  
  if (!whatsappClient) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  try {
    await whatsappClient.sendMessage(to, message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Buscar histórico de conversas
app.get('/api/conversations', (req, res) => {
  const conversations = Object.keys(messageHistory).map(contact => ({
    contact,
    lastMessage: messageHistory[contact][messageHistory[contact].length - 1],
    messageCount: messageHistory[contact].length
  }));
  
  res.json(conversations);
});

// Buscar mensagens de um contato
app.get('/api/conversations/:contact/messages', (req, res) => {
  const { contact } = req.params;
  const messages = messageHistory[contact] || [];
  res.json(messages);
});

// Leads endpoints (simulados)
app.get('/api/leads', (req, res) => {
  res.json(mockLeads);
});

app.get('/api/leads/status/:status', (req, res) => {
  const { status } = req.params;
  const filteredLeads = mockLeads.filter(lead => lead.status === status);
  res.json(filteredLeads);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp: whatsappClient ? true : false,
    ai: isAIActive,
    timestamp: new Date().toISOString()
  });
});

// Verificação periódica do status do WhatsApp
setInterval(() => {
  if (whatsappClient && whatsappClient.info) {
    const status = {
      connected: true,
      number: whatsappClient.info.wid?.user || 'Número não disponível'
    };
    io.emit('whatsapp-status', status);
    console.log('📱 Status periódico emitido:', status);
  }
}, 10000); // Verificar a cada 10 segundos

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  initializeWhatsApp();
});

export { io };
