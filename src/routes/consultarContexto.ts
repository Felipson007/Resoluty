import { Router } from 'express';
import { consultarContextoController } from '../services/consultarContextoService';

const router = Router();

router.post('/', consultarContextoController);

export default router; 