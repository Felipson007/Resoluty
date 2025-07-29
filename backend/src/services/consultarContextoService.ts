import { OpenAIEmbeddings } from '@langchain/openai';
import { supabase } from '../config/supabase';
import logger from '../config/logger';

interface ContextoItem {
  chunk: string;
  [key: string]: any;
}

export async function consultarContexto(req: any, res: any) {
  try {
    const { clienteId, mensagem, topK = 5 } = req.body;

    if (!clienteId || !mensagem) {
      return res.status(400).json({ error: 'clienteId e mensagem são obrigatórios' });
    }

    // Gerar embedding da mensagem
    const embeddingsModel = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    });
    const [embedding] = await embeddingsModel.embedDocuments([mensagem]);

    // Buscar contexto relevante
    const { data, error } = await supabase.rpc('match_memoria_vetorial', {
      query_embedding: embedding,
      match_count: topK,
      cliente_id: clienteId,
    } as any);

    if (error) {
      logger.error(`Erro ao consultar contexto: ${(error as any).message}`);
      return res.status(500).json({ error: (error as any).message });
    }

    const contexto = (data as ContextoItem[] || [])
      .map((item: ContextoItem) => item.chunk)
      .join('\n---\n');

    res.json({ contexto });
  } catch (error: any) {
    logger.error(`Erro ao consultar contexto: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
} 