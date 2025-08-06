import { Mensagem } from '../types/conversa';
import openai from '../config/openai';

// Cache simples para manter histórico por número (independente do banco)
const conversationHistory: { [key: string]: any[] } = {};

export async function gerarPromptCerebro(
  historico: Mensagem[],
  mensagemCliente: string,
  numeroCliente?: string
): Promise<string | null> {
  try {
    const numero = numeroCliente || 'default';
    
    // Adicionar mensagem atual ao histórico
    if (!conversationHistory[numero]) {
      conversationHistory[numero] = [];
    }
    
    conversationHistory[numero].push({
      autor: 'cliente',
      texto: mensagemCliente,
      timestamp: new Date().toISOString()
    });

    // Manter apenas últimas 20 mensagens para contexto
    if (conversationHistory[numero].length > 20) {
      conversationHistory[numero] = conversationHistory[numero].slice(-20);
    }

    // Formatar histórico simples para a IA
    const historicoFormatado = conversationHistory[numero]
      .map((msg: { autor: string; texto: string }) => `${msg.autor}: ${msg.texto}`)
      .join('\n');

    // Prompt simples apenas com histórico
    const prompt = `Histórico da conversa:
${historicoFormatado}

Mensagem atual do cliente: ${mensagemCliente}

Responda de forma natural e amigável, sempre focando em ajudar com dívidas bancárias.`;

    console.log('🧠 Histórico fornecido (primeiros 500 chars):', prompt.substring(0, 500) + '...');

    // Usar o Assistant ID específico
    const assistantId = 'asst_rPvHoutBw01eSySqhtTK4Iv7';
    
    // Criar um novo thread para cada conversa
    const thread = await openai.beta.threads.create();
    
    // Adicionar mensagem ao thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt
    });

    // Executar o assistente
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });

    // Aguardar conclusão
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const lastMessage = messages.data[0];
      
      if (lastMessage && lastMessage.content[0].type === 'text') {
        const resposta = lastMessage.content[0].text.value;
        
        // Adicionar resposta da IA ao histórico
        conversationHistory[numero].push({
          autor: 'clara',
          texto: resposta,
          timestamp: new Date().toISOString()
        });
        
        console.log('🤖 Resposta da IA:', resposta);
        return resposta;
      } else {
        console.error('❌ Erro: IA não retornou resposta válida');
        return 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
      }
    } else {
      console.error('❌ Erro: Run falhou com status:', runStatus.status);
      return 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
    }

  } catch (error) {
    console.error('❌ Erro ao gerar resposta da IA:', error);
    
    // Fallback simples
    if (mensagemCliente.toLowerCase().includes('olá') || mensagemCliente.toLowerCase().includes('oi') || mensagemCliente.toLowerCase().includes('ola')) {
      return 'Olá! Seja bem-vindo à Resoluty Consultoria! Meu nome é Clara e estou aqui para te ajudar na redução das suas dívidas bancárias. Como você se chama?';
    }
    
    return 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
  }
}