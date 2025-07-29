import openai from '../config/openai';
import { supabase } from '../config/supabase';
import logger from '../config/logger';

interface RegistroMemoria {
  cliente_id: string;
  chunk: string;
  embedding: number[];
  metadata: any;
}

export async function indexarConversa(clienteId: string, mensagens: Array<{ texto: string; autor: string; timestamp: string }>) {
  try {
    const registros: RegistroMemoria[] = [];

    for (const mensagem of mensagens) {
      // Gerar embedding para cada mensagem
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: mensagem.texto,
      });
      const embedding = embeddingResponse.data[0].embedding;

      registros.push({
        cliente_id: clienteId,
        chunk: mensagem.texto,
        embedding,
        metadata: {
          autor: mensagem.autor,
          timestamp: mensagem.timestamp,
        },
      });
    }

    // Inserir registros no banco
    const { error } = await supabase.from('memoria_vetorial').insert(registros) as any;
    
    if (error) {
      logger.error(`Erro ao indexar conversa: ${(error as any).message}`);
      throw new Error('Erro ao indexar conversa');
    }

    return {
      ok: true,
      message: `Indexadas ${registros.length} mensagens`,
    };
  } catch (error) {
    logger.error(`Erro ao indexar conversa: ${error}`);
    return {
      ok: false,
      error: 'Erro ao indexar conversa',
    };
  }
} 