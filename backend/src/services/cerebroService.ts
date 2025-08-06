import { Mensagem } from '../types/conversa';
import openai from '../config/openai';

export async function gerarPromptCerebro(
  historico: Mensagem[],
  mensagemCliente: string,
  numeroCliente?: string
): Promise<string | null> {
  try {
    // Verificar se a API key está configurada
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY não configurada');
      return 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
    }

    // Formatar histórico fornecido para o prompt
    const historicoFormatado = historico
      .map((msg: Mensagem) => `${msg.autor}: ${msg.texto}`)
      .join('\n');

    console.log('📋 Histórico recebido:', historico);
    console.log('📋 Histórico formatado:', historicoFormatado);

    // Prompt específico para respostas concisas conforme solicitado
    const prompt = `Leia a seguinte mensagem do Cliente: ${mensagemCliente}


Caso não seja nenhuma das intenções citadas, apenas consulte o documento SCRIPT SDR PDE e mande a mensagem prevista, lembre se, mande somente a mensagem pronta, para que ela seja encaminhada diretamente para o cliente

=== HISTÓRICO DA CONVERSA ===
${historicoFormatado}`;

    console.log('🧠 Prompt completo:', prompt);
    console.log('🧠 Assistant ID:', 'asst_rPvHoutBw01eSySqhtTK4Iv7');

    // Usar o Assistant ID específico
    const assistantId = 'asst_rPvHoutBw01eSySqhtTK4Iv7';
    
    // Verificar se o assistant existe
    try {
      const assistant = await openai.beta.assistants.retrieve(assistantId);
      console.log('✅ Assistant encontrado:', assistant.name);
    } catch (assistantError) {
      console.error('❌ Erro ao verificar assistant:', assistantError);
      return 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
    }
    
    // Criar um novo thread para cada conversa
    const thread = await openai.beta.threads.create();
    console.log('🧵 Thread criado:', thread.id);
    
    // Adicionar mensagem ao thread
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

    // Aguardar conclusão
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log('📊 Status inicial do run:', runStatus.status);
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('📊 Status do run:', runStatus.status);
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
        return 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
      }
    } else {
      console.error('❌ Erro: Run falhou com status:', runStatus.status);
      console.error('❌ Detalhes do erro:', runStatus);
      return 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
    }

  } catch (error) {
    console.error('❌ Erro ao gerar resposta da IA:', error);
    
    // Fallback simples e conciso
    if (mensagemCliente.toLowerCase().includes('olá') || mensagemCliente.toLowerCase().includes('oi') || mensagemCliente.toLowerCase().includes('ola')) {
      return 'Olá! Seja bem-vindo à Resoluty Consultoria! Meu nome é Clara e estou aqui para te ajudar na redução das suas dívidas bancárias. Como você se chama?';
    }
    
    return 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
  }
}