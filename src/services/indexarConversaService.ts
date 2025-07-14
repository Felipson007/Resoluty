import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const indexarConversaController = async (req: Request, res: Response) => {
  // Exemplo de inserção na tabela memoria_vetorial
  try {
    const { data, error } = await supabase
      .from('memoria_vetorial')
      .insert([
        {
          cliente_id: 'cliente123',
          chunk: 'texto',
          embedding: [0.1, 0.2, 0.3], // Substitua pelo embedding real
          etapa: 'qualificado',
        },
      ]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}; 