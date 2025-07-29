import { Router } from 'express';
import { salvarFeedback } from '../services/feedbackService';
import logger from '../config/logger';

const router = Router();

router.post('/feedback', async (req, res) => {
  try {
    const feedback = req.body;
    
    if (!feedback.cliente_id || !feedback.mensagem_usuario || !feedback.resposta_ia || !feedback.feedback) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    await salvarFeedback({ ...feedback, data: new Date().toISOString() });
    
    res.json({ success: true, message: 'Feedback salvo com sucesso' });
  } catch (error: any) {
    logger.error(`Erro ao salvar feedback: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router; 