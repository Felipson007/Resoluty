import openai from '../config/openai';
import { supabase } from '../config/supabase';
import { salvarInteracaoHistorico } from './historicoService';
import logger from '../config/logger';

interface ChatRequest {
  clienteId: string;
  mensagem: string;
  canal?: string;
  topK?: number;
}

interface ContextoItem {
  chunk: string;
  [key: string]: any;
}

export async function fluxoConversacional({ clienteId, mensagem, canal, topK = 5 }: ChatRequest) {
  try {
    // 1. Gerar embedding da mensagem
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: mensagem,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 2. Buscar contexto relevante
    const { data: contexto, error: contextoError } = await supabase.rpc('match_memoria_vetorial', {
      query_embedding: embedding,
      match_count: topK,
      cliente_id: clienteId,
    } as any);
    
    if (contextoError) {
      logger.error(`Erro ao buscar contexto: ${(contextoError as any).message}`);
      throw new Error('Erro ao buscar contexto');
    }

    // 3. Montar prompt para o LLM
    const contextoTexto = (contexto as ContextoItem[] || [])
      .map((c: ContextoItem) => c.chunk)
      .join('\n---\n');
    const prompt = `Você está respondendo para o cliente ${clienteId}. Este é o histórico relevante recente:\n${contextoTexto}\n\nMensagem do cliente: ${mensagem}`;

    // 4. Chamar o LLM (GPT-4o via OpenAI)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
    });
    const resposta = completion.choices[0]?.message?.content || 'Desculpe, não consegui responder.';

    // 5. Salvar interação no histórico
    await salvarInteracaoHistorico({
      cliente_id: clienteId,
      mensagem_usuario: mensagem,
      resposta_ia: resposta,
      data: new Date().toISOString(),
      canal,
    });

    return { resposta, contexto: contexto || [] };
  } catch (error) {
    logger.error(`Erro no fluxo conversacional: ${error}`);
    throw error;
  }
} 