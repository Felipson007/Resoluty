import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function salvarConversaWhatsApp(
  conversationText: string, 
  clienteId: string, 
  userId: string // Novo parâmetro
) {
  const conversationHash = crypto
    .createHash('md5')
    .update(conversationText)
    .digest('hex');

  try {
    const { data, error } = await supabase.rpc('insert_whatsapp_conversation', {
      p_conversation_text: conversationText,
      p_conversation_hash: conversationHash,
      p_metadata: {
        source: 'whatsapp',
        cliente_id: clienteId,
        user_id: userId,  // Adicionar ID do usuário autenticado
        timestamp: new Date().toISOString()
      }
    });

    if (error) {
      console.error('Erro ao salvar conversa no Supabase:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exceção ao salvar conversa:', err);
    return null;
  }
}

export async function recuperarConversasCliente(
  clienteId: string, 
  userId: string,  // Novo parâmetro
  limite: number = 10
) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .filter('metadata->>clienteId', 'eq', clienteId)
      .filter('metadata->>userId', 'eq', userId)
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) {
      console.error('Erro ao recuperar conversas:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('Exceção ao recuperar conversas:', err);
    return [];
  }
}