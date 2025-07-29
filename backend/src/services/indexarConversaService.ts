import { OpenAIEmbeddings } from '@langchain/openai';
import { supabase } from '../config/supabase';
import logger from '../config/logger';

interface RegistroMemoria {
  cliente_id: string;
  chunk: string;
  embedding: number[];
  metadata: any;
  data: string;
}

export async function indexarConversa(
  clienteId: string,
  mensagens: Array<{ texto: string; autor: 'usuario' | 'sistema'; timestamp: string }>
) {
  try {
    const embeddingsModel = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    });

    const registros: RegistroMemoria[] = [];

    for (const mensagem of mensagens) {
      // Gerar embedding para cada mensagem
      const [embedding] = await embeddingsModel.embedDocuments([mensagem.texto]);

      registros.push({
        cliente_id: clienteId,
        chunk: mensagem.texto,
        embedding,
        metadata: {
          autor: mensagem.autor,
          timestamp: mensagem.timestamp,
        },
        data: new Date().toISOString(),
      });
    }

    // Inserir registros no Supabase
    const { error } = await supabase
      .from('memoria_vetorial')
      .insert(registros as any);

    if (error) {
      logger.error(`Erro ao indexar conversa: ${(error as any).message}`);
      throw new Error('Erro ao indexar conversa');
    }

    logger.info(`Conversa indexada para cliente ${clienteId}: ${registros.length} registros`);
    return true;
  } catch (error: any) {
    logger.error(`Erro ao indexar conversa: ${error.message}`);
    throw error;
  }
} 