import { Router } from 'express';
import { indexarConversa } from '../services/indexarConversaService';
import logger from '../config/logger';

const router = Router();

router.post('/indexar-conversa', async (req, res) => {
  try {
    const { clienteId, mensagens } = req.body;
    
    if (!clienteId || !mensagens || !Array.isArray(mensagens)) {
      return res.status(400).json({ error: 'clienteId e mensagens são obrigatórios' });
    }

    await indexarConversa(clienteId, mensagens);
    
    res.json({ success: true, message: 'Conversa indexada com sucesso' });
  } catch (error: any) {
    logger.error(`Erro ao indexar conversa: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router; 