import express from 'express';
import { sendWhatsAppMessage, getWhatsAppInstances, configureWhatsApp, removeWhatsApp, toggleSDRMode } from './whatsappBot';
import { buscarLead, salvarMensagemLead } from '../services/leadService';

const router = express.Router();

// WhatsApp API Routes
router.get('/whatsapp/instances', async (req, res) => {
  try {
    const instances = getWhatsAppInstances();
    res.json({ ok: true, data: instances });
  } catch (error) {
    console.error('Erro ao buscar instâncias WhatsApp:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

router.post('/whatsapp/configure', async (req, res) => {
  try {
    const { instanceId, number, enabled } = req.body;
    const success = await configureWhatsApp(instanceId, number, enabled);
    res.json({ ok: success });
  } catch (error) {
    console.error('Erro ao configurar WhatsApp:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

router.delete('/whatsapp/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const success = await removeWhatsApp(instanceId);
    res.json({ ok: success });
  } catch (error) {
    console.error('Erro ao remover WhatsApp:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

router.post('/whatsapp/sdr', async (req, res) => {
  try {
    const { contactId, instanceId } = req.body;
    const success = await toggleSDRMode(contactId, instanceId);
    res.json({ ok: success });
  } catch (error) {
    console.error('Erro ao alternar modo SDR:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

// Contacts API Routes
router.post('/contacts/:contactId/send', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ ok: false, error: 'Mensagem é obrigatória' });
    }

    const success = await sendWhatsAppMessage(contactId, message);
    res.json({ ok: success });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

router.post('/contacts/:contactId/status', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { status, attendantId } = req.body;
    
    // Aqui você pode implementar a lógica para atualizar o status do contato
    // Por enquanto, apenas retornamos sucesso
    console.log(`Atualizando status do contato ${contactId} para ${status} por ${attendantId}`);
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao atualizar status do contato:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

router.get('/contacts/:contactId/status', async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Aqui você pode implementar a lógica para buscar o status do contato
    // Por enquanto, retornamos um status padrão
    const status = {
      status: 'bot',
      attendantId: 'system',
      lastUpdate: new Date().toISOString()
    };
    
    res.json({ ok: true, data: status });
  } catch (error) {
    console.error('Erro ao buscar status do contato:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

// Sessions API Routes
router.get('/sessions/status', async (req, res) => {
  try {
    // Aqui você pode implementar a lógica para buscar status das sessões
    // Por enquanto, retornamos um array vazio
    const sessions: any[] = [];
    
    res.json({ ok: true, data: sessions });
  } catch (error) {
    console.error('Erro ao buscar status das sessões:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

// Leads API Routes
router.get('/leads', async (req, res) => {
  try {
    // Aqui você pode implementar a lógica para buscar todos os leads
    // Por enquanto, retornamos um array vazio
    const leads: any[] = [];
    
    res.json({ ok: true, data: leads });
  } catch (error) {
    console.error('Erro ao buscar leads:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

router.get('/leads/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    const lead = await buscarLead(numero);
    
    if (!lead) {
      return res.status(404).json({ ok: false, error: 'Lead não encontrado' });
    }
    
    res.json({ ok: true, data: lead });
  } catch (error) {
    console.error('Erro ao buscar lead:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

router.post('/leads/:numero/status', async (req, res) => {
  try {
    const { numero } = req.params;
    const { status } = req.body;
    
    // Aqui você pode implementar a lógica para atualizar o status do lead
    console.log(`Atualizando status do lead ${numero} para ${status}`);
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao atualizar status do lead:', error);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

export default router; 