import { Mensagem } from '../types/conversa';
import openai from '../config/openai';
import { supabase } from '../config/supabase';
import { obterDisponibilidadeFormatada, obterProximasDatasDisponiveis, agendarReuniao } from './googleCalendarService';
import { extrairValorDivida, extrairNomeCliente, extrairBancoDivida, extrairTipoDivida, salvarValorDivida, isValorAceito } from './leadService';

// Interface para configurações do cérebro
interface CerebroConfig {
  prompt: string;
  assistantId: string;
  maxAttempts: number;
  timeoutSeconds: number;
}

// Função para buscar configurações do cérebro do banco
async function buscarConfiguracoesCerebro(): Promise<CerebroConfig> {
  try {
    const { data: configs, error } = await supabase
      .from('configuracoes')
      .select('*')
      .in('chave', [
        'cerebro_prompt',
        'cerebro_assistant_id',
        'cerebro_max_attempts',
        'cerebro_timeout_seconds'
      ]);

    if (error) {
      console.error('❌ Erro ao buscar configurações:', error);
      throw error;
    }

    const configMap = new Map();
    if (configs) {
      configs.forEach(config => {
        configMap.set(config.chave, config.valor);
      });
    }

    // Prompt padrão melhorado para evitar repetições
    const defaultPrompt = `Leia a seguinte mensagem do Cliente: \${mensagemCliente}

IMPORTANTE: 
- Analise cuidadosamente o histórico da conversa antes de responder
- NÃO repita informações que já foram dadas pelo cliente
- Se o cliente já forneceu informações sobre dívida, salário, etc., não peça novamente
- Seja conciso e direto ao ponto
- Se houver ERRO_GOOGLE_CALENDAR no contexto, você deve informar ao cliente que o sistema de agendamento está temporariamente indisponível e que um atendente humano entrará em contato em breve. Seja cordial e profissional.

=== HISTÓRICO DA CONVERSA ===
\${historicoFormatado}`;

    return {
      prompt: configMap.get('cerebro_prompt') || defaultPrompt,
      assistantId: configMap.get('cerebro_assistant_id') || 'asst_rPvHoutBw01eSySqhtTK4Iv7',
      maxAttempts: parseInt(configMap.get('cerebro_max_attempts')) || 30,
      timeoutSeconds: parseInt(configMap.get('cerebro_timeout_seconds')) || 30
    };
  } catch (error) {
    console.error('❌ Erro ao buscar configurações:', error);
    throw error;
  }
}

// Função para analisar valor da dívida e gerar resposta apropriada
async function analisarValorDivida(mensagemCliente: string, numeroCliente: string, historico: Mensagem[]): Promise<string | null> {
  try {
    console.log('💰 Analisando valor da dívida na mensagem:', mensagemCliente);
    
    // Extrair valor da dívida
    const valorDivida = extrairValorDivida(mensagemCliente);
    
    if (valorDivida) {
      console.log('💰 Valor da dívida extraído:', valorDivida);
      
      // Extrair outras informações
      const nomeCliente = extrairNomeCliente(mensagemCliente) || extrairNomeCliente(historico.map(m => m.texto).join(' '));
      const bancoDivida = extrairBancoDivida(mensagemCliente) || extrairBancoDivida(historico.map(m => m.texto).join(' '));
      const tipoDivida = extrairTipoDivida(mensagemCliente) || extrairTipoDivida(historico.map(m => m.texto).join(' '));
      
      // Salvar no banco
      await salvarValorDivida(numeroCliente, valorDivida, nomeCliente || undefined, bancoDivida || undefined, tipoDivida || undefined);
      
      // Verificar se o valor é aceito
      if (!isValorAceito(valorDivida)) {
        console.log('❌ Valor abaixo de 6 mil reais:', valorDivida);
        
        // Buscar nome do cliente no histórico se não foi extraído da mensagem atual
        let nomeParaResposta = nomeCliente;
        if (!nomeParaResposta) {
          for (const msg of historico) {
            const nomeExtraido = extrairNomeCliente(msg.texto);
            if (nomeExtraido) {
              nomeParaResposta = nomeExtraido;
              break;
            }
          }
        }
        
        // Gerar resposta para valor não aceito
        const nome = nomeParaResposta || 'Cliente';
        return `${nome}, em razão do valor da sua dívida a contratação dos nossos serviços se torna inviável para você, e como seguimos uma política de transparência meu objetivo é te informar. Então nesse caso o Sr. possui alguma outra dívida com outro banco ou com o mesmo banco?`;
      } else {
        console.log('✅ Valor aceito (acima de 6 mil):', valorDivida);
        return null; // Deixar a IA processar normalmente
      }
    }
    
    return null; // Nenhum valor extraído, deixar a IA processar
  } catch (error) {
    console.error('❌ Erro ao analisar valor da dívida:', error);
    return null;
  }
}

export async function gerarPromptCerebro(
  historico: Mensagem[],
  mensagemCliente: string,  
  numeroCliente?: string
): Promise<string | null> {
  try {
    console.log('🤖 Processando mensagem:', mensagemCliente);
    console.log('📋 Histórico:', historico.length, 'mensagens');

    const config = await buscarConfiguracoesCerebro();

    // Delay padrão de 30 segundos antes de processar
    const delaySeconds = 30;
    console.log(`⏰ Aguardando ${delaySeconds} segundos antes de processar...`);
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    console.log('✅ Delay concluído, processando IA...');

    // Analisar valor da dívida primeiro
    if (numeroCliente) {
      const respostaValorDivida = await analisarValorDivida(mensagemCliente, numeroCliente, historico);
      if (respostaValorDivida) {
        console.log('💰 Retornando resposta para valor não aceito:', respostaValorDivida);
        return respostaValorDivida;
      }
    }

    // Formatar histórico simples
    const historicoFormatado = historico
      .map((msg: Mensagem) => `${msg.autor}: ${msg.texto}`)
      .join('\n');

    // Prompt do frontend (editável)
    const promptFrontend = config.prompt
      .replace('${historicoFormatado}', historicoFormatado)
      .replace('${mensagemCliente}', mensagemCliente);

    // Verificar se a mensagem menciona agendamento ou disponibilidade
    const mensagemMencionaAgendamento = mensagemCliente.toLowerCase().includes('agendar') || 
                                       mensagemCliente.toLowerCase().includes('reunião') || 
                                       mensagemCliente.toLowerCase().includes('reuniao') ||
                                       mensagemCliente.toLowerCase().includes('disponível') ||
                                       mensagemCliente.toLowerCase().includes('disponivel') ||
                                       mensagemCliente.toLowerCase().includes('horário') ||
                                       mensagemCliente.toLowerCase().includes('horario');

    // Obter informações de disponibilidade se necessário
    let informacoesDisponibilidade = '';
    let googleCalendarError = false;
    
    if (mensagemMencionaAgendamento) {
      try {
        // Buscar próximas datas disponíveis
        const datasDisponiveis = await obterProximasDatasDisponiveis(7);
        
        if (datasDisponiveis.length > 0) {
          // Verificar disponibilidade para as próximas 3 datas
          const disponibilidadeFormatada = [];
          for (let i = 0; i < Math.min(3, datasDisponiveis.length); i++) {
            const disponibilidade = await obterDisponibilidadeFormatada(datasDisponiveis[i]);
            disponibilidadeFormatada.push(disponibilidade);
          }
          
          informacoesDisponibilidade = `\n\nINFORMAÇÕES DE DISPONIBILIDADE DOS ATENDENTES:\n${disponibilidadeFormatada.join('\n\n')}`;
        }
      } catch (error) {
        console.error('❌ Erro ao obter disponibilidade:', error);
        googleCalendarError = true;
        informacoesDisponibilidade = '\n\nERRO_GOOGLE_CALENDAR: Sistema de agendamento temporariamente indisponível. IA deve informar que passará para atendente humano.';
      }
    }

    // Prompt do backend melhorado para contexto
    const promptBackend = `HISTÓRICO DA CONVERSA:
${historicoFormatado}

MENSAGEM ATUAL DO CLIENTE: "${mensagemCliente}"

INSTRUÇÕES IMPORTANTES:
1. Analise cuidadosamente todo o histórico da conversa
2. NÃO peça informações que o cliente já forneceu
3. Se o cliente já mencionou valores de dívida, banco, salário, etc., use essas informações
4. Seja conciso e direto ao ponto
5. Evite repetir perguntas já feitas${informacoesDisponibilidade}`;

    // Combinar os dois prompts
    const promptFinal = `${promptBackend}

${promptFrontend}`;

    console.log('🧠 Enviando para OpenAI...');

    // Criar thread e executar
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: promptFinal
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: config.assistantId
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    
    while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < config.maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const lastMessage = messages.data[0];
      
      if (lastMessage && lastMessage.content[0].type === 'text') {
        const resposta = lastMessage.content[0].text.value;
        console.log('🤖 Resposta:', resposta);
        return resposta;
      }
    }

    console.error('❌ IA não retornou resposta válida');
    return null;

  } catch (error) {
    console.error('❌ Erro ao processar IA:', error);
    return null;
  }
}