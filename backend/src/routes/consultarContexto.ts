import { Router } from 'express';
import { consultarContexto } from '../services/consultarContextoService';

const router = Router();

router.post('/consultar-contexto', async (req, res) => {
  try {
    const { clienteId, mensagem, topK = 5 } = req.body;

    if (!clienteId || !mensagem) {
      return res.status(400).json({ error: 'clienteId e mensagem são obrigatórios' });
    }

    const result = await consultarContexto(clienteId, mensagem, topK);
    
    if (result.ok) {
      res.json({ contexto: result.data });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 