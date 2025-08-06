import { Mensagem } from '../types/conversa';
import openai from '../config/openai';

// Cache simples para manter estado da conversa por número
const conversationState: { [key: string]: any } = {};

/**
 * Gera prompt para o cérebro da IA com o contexto da conversa
 */
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

    // Obter estado da conversa
    const numero = numeroCliente || 'default';
    const estado = conversationState[numero] || { 
      nomeCliente: null, 
      etapa: 'inicial',
      mensagens: []
    };

    // Atualizar estado baseado na mensagem atual
    const mensagemLower = mensagemCliente.toLowerCase();
    
    // Detectar se é um nome
    if (!estado.nomeCliente && mensagemCliente.length > 2 && mensagemCliente.length < 30) {
      // Verificar se parece um nome (não contém números, não é uma pergunta)
      if (!/\d/.test(mensagemCliente) && !mensagemCliente.includes('?') && !mensagemCliente.includes('!')) {
        estado.nomeCliente = mensagemCliente.trim();
        estado.etapa = 'nome_fornecido';
      }
    }

    // Adicionar mensagem ao histórico local
    estado.mensagens.push({
      autor: 'cliente',
      texto: mensagemCliente,
      timestamp: new Date().toISOString()
    });

    // Manter apenas últimas 10 mensagens
    if (estado.mensagens.length > 10) {
      estado.mensagens = estado.mensagens.slice(-10);
    }

    // Salvar estado
    conversationState[numero] = estado;

    // Gerar resposta baseada no estado da conversa
    let resposta: string;

    if (estado.etapa === 'inicial') {
      if (mensagemLower.includes('olá') || mensagemLower.includes('oi') || mensagemLower.includes('ola')) {
        resposta = 'Olá! Seja bem-vindo à Resoluty Consultoria! Meu nome é Clara e estou aqui para te ajudar na redução das suas dívidas bancárias. Como você se chama?';
        estado.etapa = 'aguardando_nome';
      } else {
        resposta = 'Olá! Seja bem-vindo à Resoluty Consultoria! Meu nome é Clara e estou aqui para te ajudar na redução das suas dívidas bancárias. Como você se chama?';
        estado.etapa = 'aguardando_nome';
      }
    } else if (estado.etapa === 'aguardando_nome') {
      if (estado.nomeCliente) {
        resposta = `Olá ${estado.nomeCliente}! Prazer em conhecê-lo. Como posso ajudá-lo com suas dívidas bancárias hoje? Você tem alguma dívida específica que gostaria de discutir?`;
        estado.etapa = 'conversa_ativa';
      } else {
        resposta = 'Desculpe, não entendi seu nome. Pode me dizer como você se chama?';
      }
    } else if (estado.etapa === 'nome_fornecido') {
      resposta = `Olá ${estado.nomeCliente}! Prazer em conhecê-lo. Como posso ajudá-lo com suas dívidas bancárias hoje? Você tem alguma dívida específica que gostaria de discutir?`;
      estado.etapa = 'conversa_ativa';
    } else if (estado.etapa === 'conversa_ativa') {
      // Usar IA para respostas mais complexas
      try {
        const prompt = `Você é Clara, uma assistente virtual da Resoluty Consultoria especializada em ajudar clientes com redução de dívidas bancárias.

IMPORTANTE: 
- Responda de forma natural e amigável
- NUNCA mencione "histórico", "informações insuficientes" ou termos técnicos
- Foque sempre em ajudar com dívidas bancárias
- Seja direta e útil

Cliente: ${estado.nomeCliente}
Mensagem atual: ${mensagemCliente}

Responda de forma natural e amigável, sempre focando em ajudar com dívidas bancárias.`;

        // Criar um novo thread para cada conversa
        const thread = await openai.beta.threads.create();
        
        // Adicionar mensagem ao thread
        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: prompt
        });

        // Executar o assistente
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
          const messages = await openai.beta.threads.messages.list(thread.id);
          const lastMessage = messages.data[0];
          
          if (lastMessage && lastMessage.content[0].type === 'text') {
            const aiResponse = lastMessage.content[0].text.value;
            
            // Verificar se a resposta contém termos técnicos
            const termosTecnicos = ['histórico', 'informações insuficientes', 'dados', 'sistema', 'debug'];
            const contemTermosTecnicos = termosTecnicos.some(termo => 
              aiResponse.toLowerCase().includes(termo.toLowerCase())
            );
            
            if (contemTermosTecnicos) {
              resposta = `Olá ${estado.nomeCliente}! Como posso ajudá-lo com suas dívidas bancárias hoje?`;
            } else {
              resposta = aiResponse;
            }
          } else {
            resposta = `Olá ${estado.nomeCliente}! Como posso ajudá-lo com suas dívidas bancárias hoje?`;
          }
        } else {
          resposta = `Olá ${estado.nomeCliente}! Como posso ajudá-lo com suas dívidas bancárias hoje?`;
        }
      } catch (error) {
        console.error('❌ Erro ao processar com IA:', error);
        resposta = `Olá ${estado.nomeCliente}! Como posso ajudá-lo com suas dívidas bancárias hoje?`;
      }
    } else {
      resposta = 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
    }

    // Adicionar resposta ao histórico
    estado.mensagens.push({
      autor: 'clara',
      texto: resposta,
      timestamp: new Date().toISOString()
    });

    // Salvar estado atualizado
    conversationState[numero] = estado;

    console.log('🤖 Resposta gerada:', resposta);
    return resposta;

  } catch (error) {
    console.error('❌ Erro ao gerar resposta da IA:', error);
    
    // Fallback response
    if (mensagemCliente.toLowerCase().includes('olá') || mensagemCliente.toLowerCase().includes('oi') || mensagemCliente.toLowerCase().includes('ola')) {
      return 'Olá! Seja bem-vindo à Resoluty Consultoria! Meu nome é Clara e estou aqui para te ajudar na redução das suas dívidas bancárias. Como você se chama?';
    }
    
    return 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
  }
}