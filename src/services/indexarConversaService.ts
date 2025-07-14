import { Request, Response } from 'express';

export const indexarConversaController = async (req: Request, res: Response) => {
  // TODO: Implementar lógica de chunking, geração de embeddings e indexação no Supabase
  res.status(501).json({ message: 'Não implementado ainda.' });
}; 