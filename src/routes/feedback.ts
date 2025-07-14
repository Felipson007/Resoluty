import { Router } from 'express';
import { salvarFeedback } from '../services/feedbackService';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const feedback = req.body;
    const { data, error } = await salvarFeedback({ ...feedback, data: new Date().toISOString() });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

export default router; 