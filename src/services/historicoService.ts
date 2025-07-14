import { supabase } from '../config/supabase';

export interface HistoricoInteracao {
  cliente_id: string;
  mensagem_usuario: string;
  resposta_ia: string;
  data: string;
  canal?: string;
}

export async function salvarInteracaoHistorico(interacao: HistoricoInteracao) {
  const { data, error } = await supabase
    .from('historico_conversas')
    .insert([interacao]);
  return { data, error };
} 