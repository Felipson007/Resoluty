import { supabase } from '../config/supabase';

export interface FeedbackIA {
  cliente_id: string;
  mensagem_usuario: string;
  resposta_ia: string;
  util: boolean;
  comentario?: string;
  data: string;
}

export async function salvarFeedback(feedback: FeedbackIA) {
  const { data, error } = await supabase
    .from('feedback_ia')
    .insert([feedback]);
  return { data, error };
} 