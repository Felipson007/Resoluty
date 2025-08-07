import { Router } from 'express';
import whatsappManager from '../services/whatsappManager';
import { salvarMensagemLead, buscarLead } from '../services/leadService';
import { buscarHistoricoCliente } from '../services/historicoService';
import { gerarPromptCerebro } from '../services/cerebroService';
import { callInternalWebhook } from '../config/api';
import { supabase } from '../config/supabase';
import crypto from 'crypto';

const router = Router();

// Configurar Socket.IO
let socketIO: any = null;

export function setSocketIO(io: any) {
  socketIO = io;
  whatsappManager.setSocketIO(io);
}

// Endpoint para solicitar QR Code
router.post('/request-qr', async (req, res) => {
  try {
    const { instanceId, number } = req.body;
    
    if (!instanceId || !number) {
      return res.status(400).json({
        success: false,
        error: 'instanceId e number são obrigatórios'
      });
    }

    console.log(`📱 Solicitando QR Code para instância: ${instanceId} (${number})`);

    // Criar instância se não existir
    const createResult = await whatsappManager.createInstance(instanceId, number);
    if (!createResult.success) {
      return res.status(500).json({
        success: false,
        error: createResult.message
      });
    }

    // Inicializar cliente
    const initResult = await whatsappManager.initializeClient(instanceId);
    if (!initResult.success) {
      return res.status(500).json({
        success: false,
        error: initResult.message
      });
    }

    res.json({
      success: true,
      message: 'QR Code solicitado com sucesso',
      instanceId
    });

  } catch (error) {
    console.error('❌ Erro ao solicitar QR Code:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Endpoint para obter status das instâncias
router.get('/instances', (req, res) => {
  try {
    console.log('📱 Endpoint /instances chamado');
    const instances = whatsappManager.getInstances();
    const healthStatus = whatsappManager.getHealthStatus();
    
    console.log('📱 Instâncias retornadas:', instances);
    console.log('📱 Health status:', healthStatus);
    
    res.json({
      success: true,
      instances,
      health: healthStatus
    });
  } catch (error) {
    console.error('❌ Erro ao obter instâncias:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter instâncias'
    });
  }
});

// Endpoint para adicionar nova instância
router.post('/add', async (req, res) => {
  try {
    const { instanceId, number } = req.body;
    
    if (!instanceId || !number) {
      return res.status(400).json({
        success: false,
        error: 'instanceId e number são obrigatórios'
      });
    }

    console.log(`➕ Adicionando nova instância WhatsApp: ${instanceId}`, { number });

    const result = await whatsappManager.createInstance(instanceId, number);
    
    if (result.success) {
      // Emitir evento para frontend
      if (socketIO) {
        socketIO.emit('whatsapp-instance-added', { instanceId, number });
      }
      
      res.json({
        success: true,
        message: 'WhatsApp adicionado com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message
      });
    }

  } catch (error) {
    console.error('❌ Erro ao adicionar WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao adicionar WhatsApp'
    });
  }
});

// Endpoint para remover instância
router.delete('/instances/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    console.log(`🗑️ Removendo instância WhatsApp: ${instanceId}`);
    
    const success = await whatsappManager.destroyInstance(instanceId);
    
    if (success) {
      // Emitir evento para frontend
      if (socketIO) {
        socketIO.emit('whatsapp-instance-removed', { instanceId });
      }
      
      res.json({
        success: true,
        message: 'WhatsApp removido com sucesso'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Instância não encontrada'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao remover WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao remover WhatsApp'
    });
  }
});

// Endpoint para enviar mensagem
router.post('/send', async (req, res) => {
  try {
    const { to, message, instanceId } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'to e message são obrigatórios'
      });
    }

    let success = false;
    
    if (instanceId) {
      // Enviar via instância específica
      success = await whatsappManager.sendMessage(instanceId, to, message);
    } else {
      // Enviar via primeira instância conectada
      const connectedInstance = whatsappManager.getConnectedInstance();
      if (connectedInstance) {
        success = await whatsappManager.sendMessage(connectedInstance.id, to, message);
      }
    }

    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({
        success: false,
        error: 'Erro ao enviar mensagem - WhatsApp não está conectado'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Endpoint para obter status de saúde
router.get('/health', (req, res) => {
  try {
    const healthStatus = whatsappManager.getHealthStatus();
    res.json(healthStatus);
  } catch (error) {
    console.error('❌ Erro ao obter status de saúde:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter status de saúde'
    });
  }
});

// Configurar eventos do WhatsApp Manager
whatsappManager.on('instance-created', ({ instanceId, number }) => {
  console.log(`✅ Instância criada: ${instanceId} (${number})`);
});

whatsappManager.on('instance-connected', ({ instanceId, number }) => {
  console.log(`✅ Instância conectada: ${instanceId} (${number})`);
});

whatsappManager.on('instance-disconnected', ({ instanceId, reason }) => {
  console.log(`📱 Instância desconectada: ${instanceId} - ${reason}`);
});

whatsappManager.on('instance-destroyed', ({ instanceId }) => {
  console.log(`🗑️ Instância destruída: ${instanceId}`);
});

whatsappManager.on('message-received', async ({ instanceId, message }) => {
  try {
    console.log(`📨 Mensagem recebida via ${instanceId}:`, message.body);
    console.log(`📨 De: ${message.from}, Para: ${message.to}, FromMe: ${message.fromMe}`);
    
    // 🔧 CORREÇÃO: Verificação adicional para evitar processamento de mensagens próprias
    if (message.fromMe) {
      console.log(`📱 Ignorando mensagem própria no processamento:`, message.body);
      return;
    }
    
    // Processar mensagem com IA
    const processedMessage = await processMessageWithAI(message, instanceId);
    
    // Salvar no banco de dados
    await salvarMensagemLead(message.from, message.body, 'usuario', instanceId);
    
    // Emitir para frontend
    if (socketIO) {
      socketIO.emit('new-message', {
        contactId: message.from,
        message: {
          id: message.id._serialized,
          texto: message.body,
          timestamp: new Date().toISOString(),
          autor: 'usuario'
        },
        instanceId
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem recebida:', error);
  }
});

// Função para processar mensagem com IA
async function processMessageWithAI(message: any, instanceId: string): Promise<string | null> {
  try {
    // Buscar histórico diretamente da tabela mensagens_leads
    const numeroLimpo = message.from.replace('@s.whatsapp.net', '');
    console.log('📋 Buscando histórico para:', numeroLimpo);
    
    let historico: any[] = [];
    
    try {
      const { data: mensagens, error } = await supabase
        .from('mensagens_leads')
        .select('*')
        .eq('numero', numeroLimpo)
        .order('timestamp', { ascending: true })
        .limit(10);

      if (error) {
        console.error('❌ Erro ao buscar mensagens:', error);
        console.warn('⚠️ Continuando sem histórico devido a erro de RLS');
      } else {
        historico = (mensagens || []).map(msg => ({
          id: msg.id,
          texto: msg.mensagem,
          timestamp: msg.timestamp,
          autor: msg.autor
        }));
      }
    } catch (historicoError) {
      console.warn('⚠️ Erro ao buscar histórico, continuando sem:', historicoError);
    }

    console.log('📋 Histórico encontrado:', historico.length, 'mensagens');
    
    // Gerar resposta com IA usando o cérebro
    const resposta = await gerarPromptCerebro(historico, message.body, message.from);
    
    if (resposta) {
      // Enviar resposta via WhatsApp
      const success = await whatsappManager.sendMessage(instanceId, message.from, resposta);
      
      if (success) {
        // Salvar resposta no banco (com tratamento de erro)
        try {
          await salvarMensagemLead(message.from, resposta, 'ai', instanceId);
        } catch (saveError) {
          console.warn('⚠️ Erro ao salvar resposta no banco, mas mensagem foi enviada:', saveError);
        }
        
        // Emitir para frontend
        if (socketIO) {
          socketIO.emit('new-message', {
            contactId: message.from,
            message: {
              id: `ai-${Date.now()}`,
              texto: resposta,
              timestamp: new Date().toISOString(),
              autor: 'ai'
            },
            instanceId
          });
        }
        
        console.log('✅ Resposta da IA enviada e salva:', resposta);
        return resposta;
      } else {
        console.error('❌ Erro: Falha ao enviar mensagem via WhatsApp');
        return null;
      }
    } else {
      console.error('❌ Erro: IA não retornou resposta válida');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem com IA:', error);
    return null;
  }
}

// Endpoint para testar a IA
router.post('/test-ai', async (req, res) => {
  try {
    const { message, historico = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Mensagem é obrigatória'
      });
    }

    console.log('🧪 Testando IA com mensagem:', message);
    console.log('🧪 Histórico:', historico);

    const resposta = await gerarPromptCerebro(historico, message);
    
    res.json({
      success: true,
      message: message,
      resposta: resposta,
      historico: historico
    });

  } catch (error) {
    console.error('❌ Erro no teste da IA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Endpoint para testar conexão com banco
router.get('/test-db', async (req, res) => {
  try {
    console.log('🧪 Testando conexão com banco de dados...');
    
    // Teste 1: Verificar se consegue conectar
    const { data: testData, error: testError } = await supabase
      .from('leads')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erro ao conectar com banco:', testError);
      return res.status(500).json({
        success: false,
        error: 'Erro de conexão com banco',
        details: testError
      });
    }
    
    console.log('✅ Conexão com banco OK');
    
    // Teste 2: Tentar inserir um lead de teste
    const testLead = {
      id: crypto.randomUUID(),
      numero: 'teste-connection',
      metadata: {
        id: crypto.randomUUID(),
        numero: 'teste-connection',
        status: 'lead_novo',
        ultima_atividade: new Date().toISOString()
      }
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('leads')
      .insert(testLead)
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir lead de teste:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao inserir no banco',
        details: insertError,
        connection: 'OK',
        insert: 'FAILED'
      });
    }
    
    console.log('✅ Inserção no banco OK');
    
    // Limpar o lead de teste
    await supabase
      .from('leads')
      .delete()
      .eq('numero', 'teste-connection');
    
    res.json({
      success: true,
      message: 'Banco de dados funcionando corretamente',
      connection: 'OK',
      insert: 'OK',
      delete: 'OK'
    });
    
  } catch (error) {
    console.error('❌ Erro no teste do banco:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no teste',
      details: error
    });
  }
});

// Endpoint para obter configurações atuais do cérebro
router.get('/cerebro-prompt', async (req, res) => {
  try {
    console.log('🧠 Buscando configurações atuais do cérebro...');
    
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
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar configurações'
      });
    }
    
    // Configurações padrão
    const defaultConfig = {
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

    const response = {
      prompt: configMap.get('cerebro_prompt') || defaultConfig.prompt,
      assistantId: configMap.get('cerebro_assistant_id') || defaultConfig.assistantId,
      maxAttempts: parseInt(configMap.get('cerebro_max_attempts')) || defaultConfig.maxAttempts,
      timeoutSeconds: parseInt(configMap.get('cerebro_timeout_seconds')) || defaultConfig.timeoutSeconds,
      isDefault: configs.length === 0
    };
    
    res.json({
      success: true,
      ...response
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Endpoint para salvar configurações do cérebro
router.post('/cerebro-prompt', async (req, res) => {
  try {
    const { prompt, assistantId, maxAttempts, timeoutSeconds } = req.body;
    
    console.log('🧠 Recebendo dados para salvar:', { prompt: prompt?.substring(0, 100) + '...', assistantId, maxAttempts, timeoutSeconds });
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt é obrigatório'
      });
    }
    
    console.log('🧠 Salvando configurações do cérebro...');
    
    // Preparar configurações para salvar
    const configsToSave = [
      {
        chave: 'cerebro_prompt',
        valor: prompt,
        atualizado_em: new Date().toISOString()
      }
    ];

    // Adicionar outras configurações se fornecidas
    if (assistantId) {
      configsToSave.push({
        chave: 'cerebro_assistant_id',
        valor: assistantId,
        atualizado_em: new Date().toISOString()
      });
    }

    if (maxAttempts) {
      configsToSave.push({
        chave: 'cerebro_max_attempts',
        valor: maxAttempts.toString(),
        atualizado_em: new Date().toISOString()
      });
    }

    if (timeoutSeconds) {
      configsToSave.push({
        chave: 'cerebro_timeout_seconds',
        valor: timeoutSeconds.toString(),
        atualizado_em: new Date().toISOString()
      });
    }
    
    console.log('📝 Configurações preparadas:', configsToSave);
    
    // Upsert: inserir se não existir, atualizar se existir
    const { data, error } = await supabase
      .from('configuracoes')
      .upsert(configsToSave, {
        onConflict: 'chave',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar configurações',
        details: error.message
      });
    }
    
    console.log('✅ Configurações salvas com sucesso');
    
    // Invalidar cache do cérebro
    try {
      const { invalidarCacheCerebro } = await import('../services/cerebroService');
      invalidarCacheCerebro();
    } catch (cacheError) {
      console.warn('⚠️ Erro ao invalidar cache, mas configurações foram salvas:', cacheError);
    }
    
    res.json({
      success: true,
      message: 'Configurações salvas com sucesso',
      data
    });
    
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint de teste simples
router.get('/test-simple', (req, res) => {
  try {
    console.log('🧪 Teste simples chamado');
    res.json({
      success: true,
      message: 'Backend funcionando',
      timestamp: new Date().toISOString(),
      env: {
        supabaseUrl: process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado',
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ Não configurado'
      }
    });
  } catch (error) {
    console.error('❌ Erro no teste simples:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno'
    });
  }
});

export default router; 