import { Mensagem } from '../types/conversa';
import openai from '../config/openai';

export async function gerarPromptCerebro(
  historico: Mensagem[],
  mensagemCliente: string,
  numeroCliente?: string
): Promise<string | null> {
  try {
    console.log('🤖 Iniciando processamento da IA...');
    console.log('📝 Mensagem do cliente:', mensagemCliente);
    console.log('📋 Histórico:', historico.length, 'mensagens');

    // Formatar histórico para o prompt
    const historicoFormatado = historico
      .map((msg: Mensagem) => `${msg.autor}: ${msg.texto}`)
      .join('\n');

    // Prompt mais específico e contextual
    const prompt = `Você é Clara, uma assistente virtual especializada em consultoria de dívidas bancárias da Resoluty Consultoria.

CONTEXTO DA CONVERSA:
${historicoFormatado ? `HISTÓRICO ANTERIOR:
${historicoFormatado}

` : ''}MENSAGEM ATUAL DO CLIENTE: "${mensagemCliente}"

INSTRUÇÕES ESPECÍFICAS:
1. Se esta for a PRIMEIRA mensagem do cliente (sem histórico), responda com a mensagem de boas-vindas
2. Se o cliente já se apresentou, continue a conversa naturalmente
3. Se o cliente mencionar um valor específico de dívida, responda: "O Valor da Dívida do Cliente é de [VALOR]"
4. Se o cliente sugerir um horário para reunião, responda: "Agendar Google Meet"
5. Se o cliente mencionar que recebe salário em conta, responda: "Abrir para Atendente"
6. Para outras situações, consulte o SCRIPT SDR PDE e responda adequadamente

IMPORTANTE: 
- NÃO repita a mensagem de boas-vindas se o cliente já respondeu
- Mantenha o contexto da conversa
- Responda de forma natural e conversacional`;

    console.log('🧠 Prompt criado, enviando para OpenAI...');
    console.log('🧠 Histórico formatado:', historicoFormatado);

    // Usar o Assistant ID específico
    const assistantId = 'asst_rPvHoutBw01eSySqhtTK4Iv7';
    
    // Criar um novo thread
    const thread = await openai.beta.threads.create();
    console.log('🧵 Thread criado:', thread.id);
    
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt
    });
    console.log('📝 Mensagem adicionada ao thread');

    // Executar o assistente
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });
    console.log('🤖 Run iniciado:', run.id);

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log('📊 Status inicial do run:', runStatus.status);
    
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos máximo
    
    while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      console.log(`📊 Status do run (tentativa ${attempts}):`, runStatus.status);
    }

    console.log('📊 Status final do run:', runStatus.status);

    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      console.log('📨 Mensagens do thread:', messages.data.length);
      
      const lastMessage = messages.data[0];
      console.log('📨 Última mensagem:', lastMessage);
      
      if (lastMessage && lastMessage.content[0].type === 'text') {
        const resposta = lastMessage.content[0].text.value;
        
        console.log('🤖 Resposta da IA:', resposta);
        return resposta;
      } else {
        console.error('❌ Erro: IA não retornou resposta válida');
        console.error('❌ Última mensagem:', lastMessage);
        return null;
      }
    } else {
      console.error('❌ Erro: Run falhou com status:', runStatus.status);
      console.error('❌ Detalhes do erro:', runStatus);
      return null;
    }

  } catch (error) {
    console.error('❌ Erro ao gerar resposta da IA:', error);
    return null;
  }
}