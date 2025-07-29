import { Router } from 'express';
import { consultarContexto } from '../services/consultarContextoService';

const router = Router();

router.post('/consultar-contexto', consultarContexto);

export default router; 