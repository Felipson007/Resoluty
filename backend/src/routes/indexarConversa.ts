import { Router } from 'express';
import { indexarConversaController } from '../services/indexarConversaService';

const router = Router();

router.post('/', indexarConversaController);

export default router; 