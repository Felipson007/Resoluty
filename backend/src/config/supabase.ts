import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Para desenvolvimento, usar valores padrão se não estiverem definidos
const finalSupabaseUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalSupabaseKey = supabaseKey || 'placeholder-key';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não definidas. Usando valores padrão para desenvolvimento.');
}

export const supabase = createClient<Database>(finalSupabaseUrl, finalSupabaseKey);

export async function salvarConversaWhatsApp(
  conversationText: string, 
  clienteId: string, 
  userId: string = 'sistema'
) {
  const conversationHash = crypto
    .createHash('md5')
    .update(conversationText)
    .digest('hex');

  try {
    // Tentar usar RPC primeiro, se falhar, usar insert direto
    let result;
    
    try {
      const { data, error } = await supabase.rpc('insert_whatsapp_conversation', {
        p_conversation_text: conversationText,
        p_conversation_hash: conversationHash,
        p_metadata: {
          source: 'whatsapp',
          cliente_id: clienteId,
          user_id: userId,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) throw error;
      result = data;
    } catch (rpcError) {
      console.log('RPC não disponível, usando insert direto:', rpcError);
      
      // Fallback para insert direto
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .insert({
          conversation_text: conversationText,
          conversation_hash: conversationHash,
          metadata: {
            source: 'whatsapp',
            cliente_id: clienteId,
            user_id: userId,
            timestamp: new Date().toISOString()
          }
        })
        .select();
      
      if (error) throw error;
      result = data;
    }

    return result;
  } catch (err) {
    console.error('Erro ao salvar conversa:', err);
    return null;
  }
}

export async function recuperarConversasCliente(
  clienteId: string, 
  userId: string = 'sistema',
  limite: number = 10
) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .or(`metadata->>cliente_id.eq.${clienteId}`)
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) {
      console.error('Erro ao recuperar conversas:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exceção ao recuperar conversas:', err);
    return [];
  }
}

export async function listarContatosRecentes(limite: number = 50) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('metadata, created_at')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Erro ao listar contatos:', error);
      return [];
    }

    if (!data) return [];
    
    // Agrupa por cliente_id e pega o mais recente
    const contatosMap = new Map();
    
    for (const row of data) {
      const metadata = row.metadata as any;
      const clienteId = metadata?.cliente_id;
      
      if (clienteId && !contatosMap.has(clienteId)) {
        contatosMap.set(clienteId, {
          clienteId,
          userId: metadata?.user_id || 'sistema',
          lastMessageAt: row.created_at
        });
      }
    }
    
    return Array.from(contatosMap.values()).slice(0, limite);
  } catch (err) {
    console.error('Exceção ao listar contatos:', err);
    return [];
  }
}