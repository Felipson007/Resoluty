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
    // Verificar se a API key está configurada
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Erro: OPENAI_API_KEY não está configurada');
      return null;
    }

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
    const prompt = `Você é Clara, uma assistente virtual da Resoluty Consultoria especializada em ajudar clientes com redução de dívidas bancárias.

IMPORTANTE: Você deve SEMPRE responder diretamente ao cliente de forma natural e amigável. NUNCA mencione "histórico", "informações insuficientes" ou qualquer termo técnico interno.

Mensagem atual do cliente: ${mensagemCliente}

Baseado na mensagem recebida e no histórico da conversa, responda de forma natural e direta ao cliente:

- Se o cliente disser seu nome, confirme e pergunte sobre suas dívidas
- Se o cliente mencionar valor de dívida, confirme e ofereça ajuda
- Se o cliente sugerir horário para reunião, confirme e agende
- Se o cliente disser que recebe salário em conta, ofereça atendimento personalizado
- Para qualquer outra situação, responda de forma natural e amigável, sempre focando em ajudar com as dívidas

Lembre-se: Responda como se fosse uma conversa natural com o cliente. NUNCA mencione termos técnicos ou internos.

=== HISTÓRICO DA CONVERSA ===
${historicoFormatado}`;

    console.log('🧠 Contexto fornecido (primeiros 500 chars):', prompt.substring(0, 500) + '...');

    // Criar um novo thread para cada conversa
    const thread = await openai.beta.threads.create();
    
    // Adicionar mensagem ao thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt
    });

    // Executar o assistente com o ID específico
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: 'asst_rPvHoutBw01eSySqhtTK4Iv7'
    });

    // Aguardar conclusão
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'completed') {
      // Buscar a resposta
      const messages = await openai.beta.threads.messages.list(thread.id);
      const lastMessage = messages.data[0];
      
      if (lastMessage && lastMessage.content[0].type === 'text') {
        const aiResponse = lastMessage.content[0].text.value;
        
        // Verificar se a resposta contém termos técnicos que não devem ser mostrados ao cliente
        const termosTecnicos = ['histórico', 'informações insuficientes', 'dados', 'sistema', 'debug'];
        const contemTermosTecnicos = termosTecnicos.some(termo => 
          aiResponse.toLowerCase().includes(termo.toLowerCase())
        );
        
        if (contemTermosTecnicos) {
          console.log('⚠️ IA retornou resposta com termos técnicos, usando fallback');
          // Fallback para respostas naturais
          if (mensagemCliente.toLowerCase().includes('olá') || mensagemCliente.toLowerCase().includes('oi') || mensagemCliente.toLowerCase().includes('ola')) {
            return 'Olá! Como posso ajudá-lo com suas dívidas hoje?';
          }
          if (mensagemCliente.toLowerCase().includes('felipe') || mensagemCliente.toLowerCase().includes('nome')) {
            return 'Olá Felipe! Prazer em conhecê-lo. Como posso ajudá-lo com suas dívidas bancárias?';
          }
          return 'Olá! Sou a Clara da Resoluty Consultoria. Como posso ajudá-lo com suas dívidas hoje?';
        }
        
        console.log('🤖 Resposta da IA:', aiResponse);
        return aiResponse;
      } else {
        console.error('❌ Erro: IA não retornou resposta válida');
        return null;
      }
    } else {
      console.error('❌ Erro na execução da IA:', runStatus.status);
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