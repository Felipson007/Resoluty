import { Mensagem } from '../types/conversa';
import openai from '../config/openai';

/**
 * Gera prompt para o cérebro da IA com o contexto da conversa
 */
export async function gerarPromptCerebro(
  historico: Mensagem[], 
  mensagemCliente: string
): Promise<string | null> {
  try {
    // Filtra mensagens muito curtas ou vazias
    const historicoFiltrado = historico.filter(msg => msg.texto && msg.texto.length > 2);
    
    // Filtra mensagens muito antigas (mantém apenas últimas 50 mensagens)
    const historicoLimitado = historicoFiltrado.slice(-50);
    
    // Formata o histórico com timestamps
    const historicoFormatado = historicoLimitado.map((msg) => {
      const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString('pt-BR') : 'Sem timestamp';
      return `[${timestamp}] ${msg.autor === 'usuario' ? 'Cliente' : 'Clara'}: ${msg.texto}`;
    }).join('\n');

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

    // Verificar se a API key está configurada
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Erro: OPENAI_API_KEY não está configurada');
      return null;
    }

    // Chamar OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Você é Clara, uma assistente virtual especializada em atendimento ao cliente. Responda de forma clara e direta, seguindo exatamente as instruções fornecidas."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0]?.message?.content?.trim();
    
    if (aiResponse) {
      console.log('🤖 Resposta da IA:', aiResponse);
      return aiResponse;
    } else {
      console.error('❌ Erro: IA não retornou resposta');
      return null;
    }

  } catch (error) {
    console.error('❌ Erro ao gerar resposta da IA:', error);
    
    // Fallback response para evitar quebra do sistema
    if (mensagemCliente.toLowerCase().includes('olá') || mensagemCliente.toLowerCase().includes('oi') || mensagemCliente.toLowerCase().includes('ola')) {
      return 'Olá! Como posso ajudá-lo hoje?';
    }
    
    return 'Desculpe, não consegui processar sua mensagem no momento. Um atendente será direcionado para você em breve.';
  }
}