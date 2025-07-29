import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setSocketIO } from './routes/whatsappBot';
import apiRoutes from './routes/api';

const app = express();
const server = createServer(app);

// Configuração CORS mais robusta
const allowedOrigins = [
  'http://localhost:3000',
  'https://resoluty-frontend.onrender.com',
  'https://resoluty.onrender.com',
  'https://resoluty-frontend.onrender.com/',
  'https://resoluty.onrender.com/',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// Middleware CORS dinâmico
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Log de inicialização com timestamp
const startTime = new Date();
console.log(`🚀 Backend Resoluty iniciando em: ${startTime.toISOString()}`);
console.log(`📊 Memória inicial: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

// Monitoramento de saúde do processo
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  console.error('📊 Memória no erro:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  console.error('📊 Memória no erro:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
});

// Monitoramento de memória
setInterval(() => {
  const memUsage = process.memoryUsage();
  const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
  
  if (heapUsed > 500) { // Alertar se usar mais de 500MB
    console.warn(`⚠️ Alto uso de memória: ${heapUsed}MB / ${heapTotal}MB`);
  }
}, 30000); // Verificar a cada 30 segundos

// Socket.IO com configuração otimizada
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8,
  connectTimeout: 45000
});

// Log de conexões Socket.IO
io.on('connection', (socket) => {
  const clientId = socket.id;
  const timestamp = new Date().toISOString();
  
  console.log(`🔌 Cliente conectado: ${clientId} - ${timestamp}`);
  console.log(`📊 Total de clientes conectados: ${io.engine.clientsCount}`);
  
  // Monitorar desconexões
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Cliente desconectado: ${clientId} - Motivo: ${reason} - ${new Date().toISOString()}`);
    console.log(`📊 Total de clientes conectados: ${io.engine.clientsCount}`);
  });
  
  // Monitorar erros de socket
  socket.on('error', (error) => {
    console.error(`❌ Erro no socket ${clientId}:`, error);
  });
});

// Rota de saúde melhorada
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
    },
    clients: io.engine.clientsCount,
    startTime: startTime.toISOString()
  };
  
  res.json(health);
});

// Rota de teste de conectividade
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend funcionando!',
    timestamp: new Date().toISOString(),
    clients: io.engine.clientsCount
  });
});

// Rota de diagnósticos
app.get('/api/diagnostics', (req, res) => {
  const { Diagnostics } = require('./utils/diagnostics');
  const diagnostics = Diagnostics.getInstance();
  
  res.json({
    health: diagnostics.getDiagnosticsReport(),
    connectivity: diagnostics.testConnectivity()
  });
});

// Registrar rotas da API
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`✅ Backend Resoluty rodando na porta ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Memória inicial: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
});

export { io }; 


// Configurar Socket.IO no WhatsApp Bot
setSocketIO(io);
