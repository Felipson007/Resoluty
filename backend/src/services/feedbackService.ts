import { supabase } from '../config/supabase';
import logger from '../config/logger';

interface Feedback {
  cliente_id: string;
  mensagem_usuario: string;
  resposta_ia: string;
  feedback: 'positivo' | 'negativo';
  comentario?: string;
  data: string;
}

export async function salvarFeedback(feedback: Feedback) {
  try {
    const { error } = await supabase
      .from('feedback_ia')
      .insert([feedback] as any);

    if (error) {
      logger.error(`Erro ao salvar feedback: ${(error as any).message}`);
      throw new Error('Erro ao salvar feedback');
    }

    logger.info(`Feedback salvo para cliente ${feedback.cliente_id}`);
    return true;
  } catch (error: any) {
    logger.error(`Erro ao salvar feedback: ${error.message}`);
    throw error;
  }
} 