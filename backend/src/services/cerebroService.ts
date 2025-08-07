import { Mensagem } from '../types/conversa';
import openai from '../config/openai';
import { supabase } from '../config/supabase';

// Interface para configurações do cérebro
interface CerebroConfig {
  prompt: string;
  assistantId: string;
  maxAttempts: number;
  timeoutSeconds: number;
}

// Cache para configurações (evita consultas desnecessárias ao banco)
let cerebroConfigCache: CerebroConfig | null = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 30000; // 30 segundos

// Função para buscar configurações do cérebro do banco
async function buscarConfiguracoesCerebro(): Promise<CerebroConfig> {
  const now = Date.now();
  
  // Retornar cache se ainda válido
  if (cerebroConfigCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return cerebroConfigCache;
  }

  try {
    // Buscar todas as configurações do cérebro
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
      console.error('❌ Erro ao buscar configurações do cérebro:', error);
    }

    // Configurações padrão
    const defaultConfig: CerebroConfig = {
      prompt: `CONTEXTO DA CONVERSA:
\${historicoFormatado ? \`HISTÓRICO ANTERIOR:
\${historicoFormatado}

\` : ''}MENSAGEM ATUAL DO CLIENTE: "\${mensagemCliente}"`,
      assistantId: 'asst_rPvHoutBw01eSySqhtTK4Iv7',
      maxAttempts: 30,
      timeoutSeconds: 30
    };

    // Mapear configurações do banco
    const configMap = new Map();
    if (configs) {
      configs.forEach(config => {
        configMap.set(config.chave, config.valor);
      });
    }

    // Criar configuração final
    const finalConfig: CerebroConfig = {
      prompt: configMap.get('cerebro_prompt') || defaultConfig.prompt,
      assistantId: configMap.get('cerebro_assistant_id') || defaultConfig.assistantId,
      maxAttempts: parseInt(configMap.get('cerebro_max_attempts')) || defaultConfig.maxAttempts,
      timeoutSeconds: parseInt(configMap.get('cerebro_timeout_seconds')) || defaultConfig.timeoutSeconds
    };

    // Atualizar cache
    cerebroConfigCache = finalConfig;
    lastCacheUpdate = now;

    console.log('✅ Configurações do cérebro carregadas:', {
      assistantId: finalConfig.assistantId,
      maxAttempts: finalConfig.maxAttempts,
      timeoutSeconds: finalConfig.timeoutSeconds,
      promptLength: finalConfig.prompt.length
    });

    return finalConfig;
  } catch (error) {
    console.error('❌ Erro ao buscar configurações do cérebro:', error);
    return cerebroConfigCache || {
      prompt: `CONTEXTO DA CONVERSA:
\${historicoFormatado ? \`HISTÓRICO ANTERIOR:
\${historicoFormatado}

\` : ''}MENSAGEM ATUAL DO CLIENTE: "\${mensagemCliente}"`,
      assistantId: 'asst_rPvHoutBw01eSySqhtTK4Iv7',
      maxAttempts: 30,
      timeoutSeconds: 30
    };
  }
}

// Função para invalidar cache (chamada quando configurações são alteradas)
export function invalidarCacheCerebro() {
  cerebroConfigCache = null;
  lastCacheUpdate = 0;
  console.log('🔄 Cache do cérebro invalidado');
}

export async function gerarPromptCerebro(
  historico: Mensagem[],
  mensagemCliente: string,
  numeroCliente?: string
): Promise<string | null> {
  try {
    console.log('🤖 Iniciando processamento da IA...');
    console.log('📝 Mensagem do cliente:', mensagemCliente);
    console.log('📋 Histórico:', historico.length, 'mensagens');

    // Buscar configurações dinâmicas
    const config = await buscarConfiguracoesCerebro();

    // Formatar histórico para o prompt
    const historicoFormatado = historico
      .map((msg: Mensagem) => `${msg.autor}: ${msg.texto}`)
      .join('\n');

    // Substituir variáveis no prompt
    const prompt = config.prompt
      .replace('${historicoFormatado}', historicoFormatado)
      .replace('${mensagemCliente}', mensagemCliente);

    console.log('🧠 Prompt criado, enviando para OpenAI...');
    console.log('🧠 Histórico formatado:', historicoFormatado);
    console.log('🧠 Assistant ID:', config.assistantId);

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
      assistant_id: config.assistantId
    });
    console.log('🤖 Run iniciado:', run.id);

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log('📊 Status inicial do run:', runStatus.status);
    
    let attempts = 0;
    const maxAttempts = config.maxAttempts;
    
    while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      console.log(`📊 Status do run (tentativa ${attempts}/${maxAttempts}):`, runStatus.status);
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