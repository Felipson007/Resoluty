import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { listarLeads, buscarLeadsPorStatus, atualizarStatusLead, buscarLead } from './services/leadService';
import { supabase } from './config/supabase';
import { startWhatsAppService, getWhatsAppStatus, toggleAI, sendMessage, setSocketIO as setWhatsAppServiceSocketIO } from './whatsappService';
import { setSocketIO as setWhatsAppWebJSSocketIO } from './routes/whatsappWebJS';
import { setSocketIO as setWhatsAppBotSocketIO } from './routes/whatsappBot';

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

// Configurar Socket.IO para as rotas do WhatsApp
setWhatsAppWebJSSocketIO(io);
setWhatsAppBotSocketIO(io);
setWhatsAppServiceSocketIO(io);

// Status do WhatsApp
let lastEmittedStatus = { connected: false, number: '' };

// Inicializar WhatsApp Service
async function initializeWhatsAppService() {
  console.log('🚀 Iniciando WhatsApp Service...');
  await startWhatsAppService();
}

// Socket.IO connections
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });

  // Enviar status atual
  const currentStatus = getWhatsAppStatus();
  socket.emit('whatsapp-status', currentStatus);
  console.log('📱 Status inicial enviado:', currentStatus);
});

// APIs REST

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend funcionando!' });
});

// Test QR Code endpoint
app.post('/api/test/qr', (req, res) => {
  try {
    console.log('🧪 Teste de QR Code solicitado');
    
    // Verificar se o SocketIO está configurado
    if (!io) {
      console.error('❌ SocketIO não está configurado');
      return res.status(500).json({ error: 'SocketIO não configurado' });
    }
    
    // Emitir um QR code de teste
    const testQR = 'test-qr-code-data';
    io.emit('qr', { 
      qr: testQR, 
      instanceId: 'test-instance', 
      number: 'test-number' 
    });
    
    // Também emitir o evento alternativo
    io.emit('qr-code', { qr: testQR });
    
    console.log('✅ QR Code de teste emitido');
    res.json({ 
      success: true, 
      message: 'QR Code de teste emitido',
      qr: testQR
    });
  } catch (error) {
    console.error('❌ Erro no teste de QR Code:', error);
    res.status(500).json({ error: 'Erro no teste de QR Code' });
  }
});

// Status do WhatsApp
app.get('/api/whatsapp/status', (req, res) => {
  const status = getWhatsAppStatus();
  res.json(status);
});

// Instâncias WhatsApp (simulado)
app.get('/api/whatsapp/instances', (req, res) => {
  const status = getWhatsAppStatus();
  res.json([{
    id: 'default',
    number: status.number,
    isConnected: status.connected,
    enabled: true
  }]);
});

// Remove WhatsApp instance
app.delete('/api/whatsapp/instances/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  try {
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
  const aiStatus = toggleAI();
  io.emit('ai-status', { active: aiStatus });
  res.json({ active: aiStatus });
});

// Enviar mensagem manual
app.post('/api/whatsapp/send', async (req, res) => {
  const { to, message } = req.body;
  
  try {
    const success = await sendMessage(to, message);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Erro ao enviar mensagem' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Buscar histórico de conversas
app.get('/api/conversations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mensagens_leads')
      .select('*')
      .order('timestamp', { ascending: false });
    
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
    
    console.log(`📨 Buscando mensagens para: ${contact} (com sufixo: ${contactWithSuffix}, sem sufixo: ${contactWithoutSuffix})`);
    
    const { data, error } = await supabase
      .from('mensagens_leads')
      .select('*')
      .or(`numero.eq.${contactWithSuffix},numero.eq.${contactWithoutSuffix}`)
      .order('timestamp', { ascending: true });
    
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
    
    console.log(`📨 Buscando mensagens para ${contact}. Encontradas: ${messages.length}`);
    console.log('📨 Primeiras mensagens:', messages.slice(0, 3));
    
    res.json(messages);
  } catch (err) {
    console.error('❌ Erro ao buscar mensagens:', err);
    res.status(500).json({ error: 'Erro ao buscar mensagens do banco' });
  }
});

// Leads endpoints (do banco de dados)
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await listarLeads(50);
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

// Health check
app.get('/health', (req, res) => {
  const status = getWhatsAppStatus();
  res.json({
    status: 'ok',
    whatsapp: status.connected,
    ai: status.aiActive,
    timestamp: new Date().toISOString()
  });
});

// Verificação periódica do status do WhatsApp (silenciosa)
setInterval(async () => {
  try {
    const currentStatus = getWhatsAppStatus();
    
    // Só emitir se houve mudança de status
    if (JSON.stringify(currentStatus) !== JSON.stringify(lastEmittedStatus)) {
      io.emit('whatsapp-status', currentStatus);
      lastEmittedStatus = currentStatus;
      console.log('📱 Status atualizado:', currentStatus);
    }
  } catch (error: any) {
    console.error('❌ Erro ao verificar status do WhatsApp:', error?.message || error);
  }
}, 30000); // Verificar a cada 30 segundos

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  initializeWhatsAppService();
});

export { io };
