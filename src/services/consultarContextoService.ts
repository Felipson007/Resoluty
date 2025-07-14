import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import logger from '../config/logger';

export const consultarContextoController = async (req: Request, res: Response) => {
  try {
    const { clienteId, mensagem, topK } = req.body;
    if (!clienteId || !mensagem) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }

    // Gerar embedding da nova mensagem
    const embeddingsModel = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    });
    const [embedding] = await embeddingsModel.embedDocuments([mensagem]);

    // Consulta vetorial no Supabase (pgvector)
    // Exemplo para Supabase com extensão pgvector:
    const { data, error } = await supabase.rpc('match_memoria_vetorial', {
      query_embedding: embedding,
      match_count: topK || 5,
      cliente_id: clienteId,
    });

    logger.info(`Consulta contexto: cliente ${clienteId}, mensagem: ${mensagem}`);

    if (error) {
      logger.error(`Erro ao consultar contexto: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ contexto: data });
  } catch (err: any) {
    logger.error(`Erro interno: ${err.message}`);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}; 