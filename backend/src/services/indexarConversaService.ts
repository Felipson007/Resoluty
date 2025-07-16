import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { chunkText } from '../utils/chunking';
import { OpenAIEmbeddings } from '@langchain/openai';
import logger from '../config/logger';

export const indexarConversaController = async (req: Request, res: Response) => {
  try {
    const { clienteId, mensagens, etapa, tipo_interacao } = req.body;
    if (!clienteId || !mensagens || !Array.isArray(mensagens)) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }

    // Junta todas as mensagens em um texto único
    const rawConversa = mensagens.map((m: any) => m.texto).join(' ');
    // Chunking real
    const chunks = await chunkText(rawConversa, 500);

    // Gera embeddings para cada chunk
    const embeddingsModel = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    });
    const embeddings = await embeddingsModel.embedDocuments(chunks);

    // Monta os registros para o Supabase
    const registros = chunks.map((chunk, i) => ({
      cliente_id: clienteId,
      chunk,
      embedding: embeddings[i],
      etapa: etapa || null,
      tipo_interacao: tipo_interacao || null,
      historico_raw: rawConversa,
      data: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('memoria_vetorial')
      .insert(registros);

    logger.info(`Indexação: cliente ${clienteId}, chunks: ${chunks.length}`);

    if (error) {
      logger.error(`Erro ao indexar: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ data });
  } catch (err: any) {
    logger.error(`Erro interno: ${err.message}`);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}; 