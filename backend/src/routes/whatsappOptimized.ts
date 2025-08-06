import { Router } from 'express';
import whatsappManager from '../services/whatsappManager';
import { salvarMensagemLead, buscarLead } from '../services/leadService';
import { buscarHistoricoCliente } from '../services/historicoService';
import { gerarPromptCerebro } from '../services/cerebroService';
import { callInternalWebhook } from '../config/api';

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
    const instances = whatsappManager.getInstances();
    const healthStatus = whatsappManager.getHealthStatus();
    
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
    // Buscar histórico do cliente
    const historicoResult = await buscarHistoricoCliente(message.from);
    const historico = historicoResult.data || [];
    
    // Gerar resposta com IA usando o cérebro
    const resposta = await gerarPromptCerebro(historico, message.body, message.from);
    
    if (resposta) {
      // Enviar resposta via WhatsApp
      const success = await whatsappManager.sendMessage(instanceId, message.from, resposta);
      
      if (success) {
        // Salvar resposta no banco
        await salvarMensagemLead(message.from, resposta, 'sistema', instanceId);
        
        // Emitir para frontend
        if (socketIO) {
          socketIO.emit('new-message', {
            contactId: message.from,
            message: {
              id: `ai-${Date.now()}`,
              texto: resposta,
              timestamp: new Date().toISOString(),
              autor: 'sistema'
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
    
    // Fallback em caso de erro
    const fallbackResponse = 'Olá! Como posso ajudá-lo com suas dívidas bancárias hoje?';
    
    try {
      await whatsappManager.sendMessage(instanceId, message.from, fallbackResponse);
      console.log('✅ Resposta de fallback enviada');
      return fallbackResponse;
    } catch (fallbackError) {
      console.error('❌ Erro ao enviar resposta de fallback:', fallbackError);
      return null;
    }
  }
}

export default router; 