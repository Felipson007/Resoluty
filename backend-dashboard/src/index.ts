import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { googleSheetsService } from './services/googleSheetsService';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 Cliente conectado:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`📥 Cliente ${socket.id} entrou na sala ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('👤 Cliente desconectado:', socket.id);
  });
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend Dashboard Resoluty rodando!',
    services: {
      googleSheets: 'connected',
      socketIO: 'active'
    },
    timestamp: new Date().toISOString()
  });
});

// Google Sheets endpoints
app.get('/api/sheets/test', async (req, res) => {
  try {
    const result = await googleSheetsService.testConnection();
    res.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('❌ Erro ao testar Google Sheets:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/sheets/write', async (req, res) => {
  const { range, values } = req.body;
  
  if (!range || !values) {
    return res.status(400).json({ ok: false, error: 'Range e values são obrigatórios' });
  }
  
  try {
    const result = await googleSheetsService.writeData(range, values);
    res.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('❌ Erro ao escrever no Sheets:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/sheets/read/:range', async (req, res) => {
  const { range } = req.params;
  
  try {
    const result = await googleSheetsService.readData(range);
    res.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('❌ Erro ao ler do Sheets:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/sheets/append', async (req, res) => {
  const { range, values } = req.body;
  
  if (!range || !values) {
    return res.status(400).json({ ok: false, error: 'Range e values são obrigatórios' });
  }
  
  try {
    const result = await googleSheetsService.appendData(range, values);
    res.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('❌ Erro ao adicionar no Sheets:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/sheets/log', async (req, res) => {
  const { type, data } = req.body;
  
  if (!type || !data) {
    return res.status(400).json({ ok: false, error: 'Type e data são obrigatórios' });
  }
  
  try {
    switch (type) {
      case 'user-action':
        await googleSheetsService.logUserAction(data.action, data.details, data.userId);
        break;
      case 'frontend-event':
        await googleSheetsService.logFrontendEvent(data.event, data.details);
        break;
      default:
        return res.status(400).json({ ok: false, error: 'Tipo de log não suportado' });
    }
    
    res.json({ ok: true, message: 'Log registrado com sucesso' });
  } catch (error: any) {
    console.error('❌ Erro ao registrar log:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para emitir eventos via Socket.IO para frontend
app.post('/api/emit', async (req, res) => {
  const { event, data, room } = req.body;
  
  if (!event) {
    return res.status(400).json({ ok: false, error: 'Event é obrigatório' });
  }
  
  try {
    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
    
    res.json({ ok: true, message: 'Evento emitido com sucesso' });
  } catch (error: any) {
    console.error('❌ Erro ao emitir evento:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para estatísticas simples do Google Sheets
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await googleSheetsService.getStats();
    res.json({ ok: true, data: stats });
  } catch (error: any) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Backend Dashboard rodando na porta ${PORT}`);
  console.log(`📡 Socket.IO habilitado para tempo real`);
  console.log(`📊 Google Sheets integração ativa`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎯 Focado apenas no frontend!`);
});

// Exportar io para uso em outros módulos
export { io }; 