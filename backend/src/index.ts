import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { setSocketIO } from './routes/whatsappBot';
import { updateSessionStatus, getSessionStatus, getAllSessionStatuses } from './services/historicoService';
import { buscarMensagensLead, buscarLeadsPorStatus, listarLeads, buscarLead, atualizarStatusLead } from './services/leadService';
import { getWhatsAppInstances, toggleSDRMode, configureWhatsApp, removeWhatsApp, initializeWhatsApp } from './routes/whatsappBot';

// Configurar dotenv com o caminho correto
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Configurar Socket.IO no WhatsApp Bot
setSocketIO(io);

app.use(cors());
app.use(express.json());

// Endpoint de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint para buscar mensagens de leads
app.get('/api/leads/:numero/messages', async (req, res) => {
  const { numero } = req.params;
  const { limit } = req.query;
  try {
    const mensagens = await buscarMensagensLead(numero, limit ? parseInt(limit as string) : 50);
    res.json({ ok: true, data: mensagens });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para listar todos os leads
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await listarLeads(50);
    res.json({ ok: true, data: leads });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para buscar leads por status
app.get('/api/leads/status/:status', async (req, res) => {
  const { status } = req.params;
  try {
    const leads = await buscarLeadsPorStatus(status as any);
    res.json({ ok: true, data: leads });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para atualizar status do lead
app.put('/leads/:numero/status', async (req, res) => {
  const { numero } = req.params;
  const { status } = req.body;
  try {
    const success = await atualizarStatusLead(numero, status);
    res.json({ ok: success });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para obter status de todas as instâncias WhatsApp
app.get('/whatsapp/instances', async (req, res) => {
  try {
    const instances = await getWhatsAppInstances();
    res.json({ ok: true, data: instances });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para alternar modo SDR
app.post('/api/whatsapp/toggle-sdr', async (req, res) => {
  const { contactId, instanceId } = req.body;
  try {
    const success = await toggleSDRMode(contactId, instanceId);
    res.json({ ok: success });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para configurar WhatsApp
app.post('/api/whatsapp/configure', async (req, res) => {
  const { instanceId, number, enabled } = req.body;
  try {
    const success = await configureWhatsApp(instanceId, number, enabled);
    res.json({ ok: success });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para remover WhatsApp
app.delete('/api/whatsapp/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  try {
    const success = await removeWhatsApp(instanceId);
    res.json({ ok: success });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Cliente ${socket.id} entrou na sala: ${room}`);
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`Cliente ${socket.id} saiu da sala: ${room}`);
  });
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('Desligando servidor...');
  
  // Deletar diretórios auth_info_baileys
  const fs = require('fs');
  const path = require('path');
  
  try {
    const authDir = path.join(__dirname, '..', 'auth_info_baileys');
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log('Diretório auth_info_baileys removido');
    }
    
    // Remover diretórios específicos de instâncias
    for (let i = 1; i <= 3; i++) {
      const instanceDir = path.join(__dirname, '..', `auth_info_baileys_${i}`);
      if (fs.existsSync(instanceDir)) {
        fs.rmSync(instanceDir, { recursive: true, force: true });
        console.log(`Diretório auth_info_baileys_${i} removido`);
      }
    }
  } catch (error) {
    console.error('Erro ao remover diretórios:', error);
  }
  
  process.exit(0);
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Backend Resoluty rodando na porta ${PORT}`);
  
  // Inicializar WhatsApp
  initializeWhatsApp();
}); 

