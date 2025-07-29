import openai from '../config/openai';
import { supabase } from '../config/supabase';
import logger from '../config/logger';

interface ContextoItem {
  chunk: string;
  [key: string]: any;
}

export async function consultarContexto(clienteId: string, mensagem: string, topK: number = 5) {
  try {
    // 1. Gerar embedding da mensagem
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: mensagem,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 2. Buscar contexto relevante
    const { data: contexto, error } = await supabase.rpc('match_memoria_vetorial', {
      query_embedding: embedding,
      match_count: topK,
      cliente_id: clienteId,
    } as any);
    
    if (error) {
      logger.error(`Erro ao buscar contexto: ${(error as any).message}`);
      throw new Error('Erro ao buscar contexto');
    }

    return {
      ok: true,
      data: contexto || [],
    };
  } catch (error) {
    logger.error(`Erro ao consultar contexto: ${error}`);
    return {
      ok: false,
      error: 'Erro ao consultar contexto',
    };
  }
} 