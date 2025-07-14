import { Router } from 'express';
import { fluxoConversacional } from '../services/chatService';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { clienteId, mensagem, canal, topK } = req.body;
    if (!clienteId || !mensagem) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }
    const resultado = await fluxoConversacional({ clienteId, mensagem, canal, topK });
    return res.status(200).json(resultado);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
  }
});

export default router; 