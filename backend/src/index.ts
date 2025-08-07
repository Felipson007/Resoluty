import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { listarLeads, buscarLeadsPorStatus, atualizarStatusLead, buscarLead } from './services/leadService';
import { supabase } from './config/supabase';
import whatsappManager from './services/whatsappManager';
import whatsappOptimizedRouter from './routes/whatsappOptimized';
import { setSocketIO as setWhatsAppOptimizedSocketIO } from './routes/whatsappOptimized';
import webhookGHL from './routes/webhookGHL';
import googleCalendarRouter from './routes/googleCalendar';
import { STARTUP_CONFIG, startupEvents, setStartupState, StartupState, MONITORING_CONFIG } from './config/startup';
import { PERFORMANCE_CONFIG, getSocketIOConfig, startPerformanceMonitoring } from './config/performance';

dotenv.config();

const app = express();
const server = createServer(app);

// CORS otimizado
app.use(cors({
  origin: ['http://localhost:3000', 'https://resoluty-frontend.onrender.com', 'https://resoluty.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Registrar rotas
app.use('/webhook', webhookGHL);
app.use('/api/whatsapp', whatsappOptimizedRouter);
app.use('/api/calendar', googleCalendarRouter);

// Socket.IO otimizado
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://resoluty-frontend.onrender.com', 'https://resoluty.onrender.com'],
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: PERFORMANCE_CONFIG.SOCKET_PING_TIMEOUT,
  pingInterval: PERFORMANCE_CONFIG.SOCKET_PING_INTERVAL,
  maxHttpBufferSize: PERFORMANCE_CONFIG.SOCKET_MAX_HTTP_BUFFER_SIZE
});

// Configurar Socket.IO para o WhatsApp otimizado
setWhatsAppOptimizedSocketIO(io);

// Usar configurações de performance importadas

// Cache para status
let lastStatusCheck = 0;
let statusCache: any = null;
let connectedClients = new Set<string>();

// Função otimizada para verificar status
function checkSystemStatus() {
  const now = Date.now();
  
  // Verificar se passou tempo suficiente desde a última verificação
  if (now - lastStatusCheck < PERFORMANCE_CONFIG.STATUS_CHECK_INTERVAL) {
    return statusCache;
  }
  
  try {
    const instances = whatsappManager.getInstances();
    const connectedInstance = instances.find(instance => instance.isConnected);
    
    const currentStatus = {
      connected: !!connectedInstance,
      number: connectedInstance ? connectedInstance.number : '',
      aiActive: true,
      instances: instances,
      timestamp: now
    };
    
    // Atualizar cache apenas se houve mudança significativa
    if (!statusCache || JSON.stringify(currentStatus) !== JSON.stringify(statusCache)) {
      console.log('📱 Status do sistema atualizado:', currentStatus);
      statusCache = currentStatus;
      
      // Emitir para todos os clientes
      io.emit('whatsapp-status', currentStatus);
      
      // Atualizar estado de inicialização
      if (currentStatus.connected) {
        setStartupState(StartupState.READY);
      } else {
        setStartupState(StartupState.INITIALIZING);
      }
    }
    
    lastStatusCheck = now;
    return currentStatus;
  } catch (error) {
    console.error('❌ Erro ao verificar status do sistema:', error);
    setStartupState(StartupState.ERROR);
    return statusCache;
  }
}

// Verificar status periodicamente
setInterval(checkSystemStatus, PERFORMANCE_CONFIG.STATUS_CHECK_INTERVAL);

// Verificação inicial com delay
setTimeout(checkSystemStatus, STARTUP_CONFIG.INITIAL_DELAY);

// Socket.IO connections otimizadas
io.on('connection', (socket) => {
  const clientId = socket.id;
  console.log('🔌 Cliente conectado:', clientId);
  
  // Verificar limite de clientes
  if (connectedClients.size >= PERFORMANCE_CONFIG.MAX_CLIENTS) {
    console.warn('⚠️ Limite de clientes atingido, desconectando cliente mais antigo');
    const oldestClient = Array.from(connectedClients)[0];
    io.sockets.sockets.get(oldestClient)?.disconnect();
  }
  
  connectedClients.add(clientId);
  console.log(`📊 Total de clientes conectados: ${connectedClients.size}`);

  // Enviar status atual
  const currentStatus = statusCache || checkSystemStatus();
  socket.emit('whatsapp-status', currentStatus);
  console.log('📱 Status inicial enviado:', currentStatus);

  // Heartbeat para manter conexão ativa
  const heartbeat = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat');
    }
  }, 30000); // 30 segundos

  socket.on('disconnect', (reason) => {
    console.log('🔌 Cliente desconectado:', clientId, 'Razão:', reason);
    connectedClients.delete(clientId);
    clearInterval(heartbeat);
    console.log(`📊 Total de clientes conectados: ${connectedClients.size}`);
  });

  // Eventos específicos
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`👥 Cliente ${clientId} entrou na sala: ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`👥 Cliente ${clientId} saiu da sala: ${roomId}`);
  });
});

// APIs REST otimizadas

// Health check
app.get('/health', (req, res) => {
  const healthStatus = whatsappManager.getHealthStatus();
  const startupState = require('./config/startup').getStartupState();
  
  res.json({
    status: 'ok',
    startupState,
    whatsapp: healthStatus,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    clients: connectedClients.size,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend funcionando!',
    timestamp: new Date().toISOString(),
    clients: connectedClients.size
  });
});

// Leads endpoints
app.get('/api/leads', async (req, res) => {
  try {
    console.log('📋 Endpoint /api/leads chamado');
    const leads = await listarLeads(50);
    console.log('📋 Leads encontrados no banco:', leads.length);
    res.json(leads);
  } catch (error) {
    console.error('❌ Erro ao buscar leads:', error);
    res.status(500).json({ error: 'Erro ao buscar leads' });
  }
});

app.get('/api/leads/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const leads = await buscarLeadsPorStatus(status as any);
    res.json(leads);
  } catch (error) {
    console.error('❌ Erro ao buscar leads por status:', error);
    res.status(500).json({ error: 'Erro ao buscar leads por status' });
  }
});

// Atualizar status do lead
app.put('/api/leads/:numero/status', async (req, res) => {
  try {
    const { numero } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const success = await atualizarStatusLead(numero, status);
    
    if (success) {
      res.json({ success: true, message: 'Status atualizado com sucesso' });
    } else {
      res.status(404).json({ error: 'Lead não encontrado' });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar status do lead:', error);
    res.status(500).json({ error: 'Erro ao atualizar status do lead' });
  }
});

// Buscar histórico de conversas
app.get('/api/conversations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mensagens_leads')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100); // Limitar para performance
    
    if (error) {
      throw error;
    }
    
    // Agrupar por número
    const conversations = data.reduce((acc: any, msg: any) => {
      const numero = msg.numero;
      if (!acc[numero]) {
        acc[numero] = {
          contact: numero,
          lastMessage: msg,
          messageCount: 0
        };
      }
      acc[numero].messageCount++;
      return acc;
    }, {});
    
    res.json(Object.values(conversations));
  } catch (error) {
    console.error('❌ Erro ao buscar conversas:', error);
    res.status(500).json({ error: 'Erro ao buscar conversas' });
  }
});

// Buscar mensagens de um contato
app.get('/api/conversations/:contact/messages', async (req, res) => {
  const { contact } = req.params;
  try {
    // Normalizar o número do contato
    const contactWithSuffix = contact.includes('@c.us') ? contact : `${contact}@c.us`;
    const contactWithoutSuffix = contact.replace('@c.us', '');
    
    console.log(`📨 Buscando mensagens para: ${contact}`);
    
    const { data, error } = await supabase
      .from('mensagens_leads')
      .select('*')
      .or(`numero.eq.${contactWithSuffix},numero.eq.${contactWithoutSuffix}`)
      .order('timestamp', { ascending: true })
      .limit(200); // Limitar para performance
    
    if (error) {
      console.error('❌ Erro na consulta Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
    
    const messages = (data || []).map(msg => ({
      id: msg.id,
      texto: msg.mensagem,
      timestamp: msg.timestamp,
              autor: msg.autor === 'sistema' ? 'sistema' : 'usuario',
      contactId: msg.numero
    }));
    
    console.log(`📨 Mensagens encontradas para ${contact}: ${messages.length}`);
    res.json(messages);
  } catch (err) {
    console.error('❌ Erro ao buscar mensagens:', err);
    res.status(500).json({ error: 'Erro ao buscar mensagens do banco' });
  }
});

// Enviar mensagem manual
app.post('/api/whatsapp/send', async (req, res) => {
  const { to, message, instanceId } = req.body;
  
  try {
    let success = false;
    
    if (instanceId) {
      success = await whatsappManager.sendMessage(instanceId, to, message);
    } else {
      const connectedInstance = whatsappManager.getConnectedInstance();
      if (connectedInstance) {
        success = await whatsappManager.sendMessage(connectedInstance.id, to, message);
      }
    }
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Erro ao enviar mensagem - WhatsApp não está conectado' });
    }
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Controle da IA
app.post('/api/ai/toggle', (req, res) => {
  // Por enquanto sempre ativo
  const aiStatus = true;
  io.emit('ai-status', { active: aiStatus });
  res.json({ active: aiStatus });
});

// Monitoramento de memória
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
  
  if (memUsagePercent > 0.8) { // 80%
    console.log(`⚠️ Alto uso de memória: ${(memUsagePercent * 100).toFixed(2)}%`);
    
    // Forçar garbage collection
    if (global.gc) {
      global.gc();
      console.log('🗑️ Garbage collection forçado');
    }
  }
}, PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Recebido SIGTERM, iniciando shutdown...');
  
  // Desconectar todos os clientes
  io.disconnectSockets();
  
  // Shutdown do WhatsApp Manager
  await whatsappManager.shutdown();
  
  // Fechar servidor
  server.close(() => {
    console.log('✅ Servidor fechado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🔄 Recebido SIGINT, iniciando shutdown...');
  
  // Desconectar todos os clientes
  io.disconnectSockets();
  
  // Shutdown do WhatsApp Manager
  await whatsappManager.shutdown();
  
  // Fechar servidor
  server.close(() => {
    console.log('✅ Servidor fechado com sucesso');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📊 Configurações de performance ativas`);
  console.log(`🔧 Limite de clientes: ${PERFORMANCE_CONFIG.MAX_CLIENTS}`);
  console.log(`⏱️ Intervalo de status: ${PERFORMANCE_CONFIG.STATUS_CHECK_INTERVAL}ms`);
  console.log(`💾 Verificação de memória: ${PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL}ms`);
  
  // Iniciar monitoramento de performance
  startPerformanceMonitoring();
});

export { io };
