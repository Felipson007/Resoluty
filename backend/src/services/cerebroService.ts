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
      console.error('❌ Erro: OPENAI_API_KEY não está configurada');
      return null;
    }

    // Formatar histórico para o prompt
    const historicoFormatado = historico
      .map(msg => `${msg.autor}: ${msg.texto}`)
      .join('\n');

    // Prompt simplificado apenas com contexto
    const prompt = `Leia a seguinte mensagem do Cliente: ${mensagemCliente}

Baseado na mensagem recebida e no histórico das mensagens, detecte a intenção do cliente

Caso o Cliente tenha dito o valor total da divida, responda apenas o seguinte: "O Valor da Divida do Cliente é de" e adicione o valor da Divida

Caso o Cliente tenha sugerido claramente um horário para Reunião, responda apenas o seguinte: "Agendar Google Meet "

Caso o cliente tenha dito que recebe salário em conta responda apenas o seguinte: "Abrir para Atendente"

Caso não seja nenhuma das intenções citadas, apenas consulte o documento SCRIPT SDR PDE e mande a mensagem prevista, lembre se, mande somente a mensagem pronta, para que ela seja encaminhada diretamente para o cliente

=== HISTÓRICO DA CONVERSA ===
${historicoFormatado}`;

    console.log('🧠 Contexto fornecido (primeiros 500 chars):', prompt.substring(0, 500) + '...');

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
        console.log('🤖 Resposta da IA:', resposta);
        return resposta;
      } else {
        console.error('❌ Erro: IA não retornou resposta válida');
        return null;
      }
    } else {
      console.error('❌ Erro: Run falhou com status:', runStatus.status);
      return null;
    }

  } catch (error) {
    console.error('❌ Erro ao gerar resposta da IA:', error);
    return null;
  }
}