import { Request, Response } from 'express';

export const consultarContextoController = async (req: Request, res: Response) => {
  // TODO: Implementar lógica de geração de embedding, consulta ao Supabase e retorno do contexto
  res.status(501).json({ message: 'Não implementado ainda.' });
}; 