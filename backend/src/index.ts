import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import webhookGHL from './routes/webhookGHL';
import { buscarHistoricoCliente } from './services/historicoService';
import { listarContatosRecentes } from './services/historicoService';
import { sendWhatsAppMessage } from './routes/whatsappBot';
import { setSocketIO } from './routes/whatsappBot';
import { updateSessionStatus, getSessionStatus, getAllSessionStatuses } from './services/historicoService';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Cliente ${socket.id} entrou na sala ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Exportar io para uso em outros módulos
export { io };

app.use(cors());
app.use(express.json());
app.use(webhookGHL);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Resoluty rodando!' });
});


// Endpoint de teste para Supabase
app.get('/api/test-supabase/:clienteId', async (req, res) => {
  const { clienteId } = req.params;
  try {
    const result = await buscarHistoricoCliente(clienteId, 5);
    res.json({ ok: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para listar contatos recentes
app.get('/api/contacts', async (req, res) => {
  try {
    const contatos = await listarContatosRecentes(50);
    res.json({ ok: true, data: contatos });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para buscar histórico de mensagens de um contato
app.get('/api/contacts/:contactId/messages', async (req, res) => {
  const { contactId } = req.params;
  const { limit } = req.query;
  try {
    const result = await buscarHistoricoCliente(contactId, limit ? parseInt(limit as string) : 50);
    res.json({ ok: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para enviar mensagem manual para um contato
app.post('/api/contacts/:contactId/send', async (req, res) => {
  const { contactId } = req.params;
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ ok: false, error: 'Mensagem é obrigatória' });
  }
  
  try {
    const success = await sendWhatsAppMessage(contactId, message);
    if (success) {
      res.json({ ok: true, message: 'Mensagem enviada com sucesso' });
    } else {
      res.status(500).json({ ok: false, error: 'Falha ao enviar mensagem' });
    }
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para atualizar status de uma sessão
app.post('/api/contacts/:contactId/status', async (req, res) => {
  const { contactId } = req.params;
  const { status, attendantId } = req.body;
  
  if (!status || !['bot', 'humano', 'aguardando', 'finalizado'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Status inválido' });
  }
  
  try {
    updateSessionStatus(contactId, status, attendantId);
    
    // Emitir evento via Socket.IO para atualização de status
    io.emit('status-updated', {
      contactId,
      status,
      attendantId,
      timestamp: new Date().toISOString()
    });
    
    res.json({ ok: true, message: 'Status atualizado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para buscar status de uma sessão
app.get('/api/contacts/:contactId/status', async (req, res) => {
  const { contactId } = req.params;
  
  try {
    const status = getSessionStatus(contactId);
    res.json({ ok: true, data: status });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para listar todos os status de sessões
app.get('/api/sessions/status', async (req, res) => {
  try {
    const allStatuses = getAllSessionStatuses();
    res.json({ ok: true, data: allStatuses });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend Resoluty rodando na porta ${PORT}`);
  
  // Configurar Socket.IO no whatsappBot
  setSocketIO(io);
}); 

const AUTH_DIR = path.join(__dirname, '..', 'auth_info_baileys');

function cleanupAuthDir() {
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log('auth_info_baileys removido ao encerrar o backend.');
  }
}

process.on('SIGINT', () => {
  cleanupAuthDir();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanupAuthDir();
  process.exit();
});
process.on('exit', () => {
  cleanupAuthDir();
}); 