import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { buscarHistoricoCliente, salvarInteracaoHistorico } from '../services/historicoService';
import { gerarPromptCerebro } from '../services/cerebroService';
import { salvarMensagemLead, buscarLead } from '../services/leadService';
import { callInternalWebhook } from '../config/api';

// Interface para múltiplos WhatsApp
interface WhatsAppInstance {
  id: string;
  number: string;
  client: Client;
  qrDisplayed: boolean;
  isConnected: boolean;
  sdrMode: Set<string>;
  enabled: boolean;
  qrTimeout?: NodeJS.Timeout;
}

// Armazenar múltiplas instâncias
const whatsappInstances = new Map<string, WhatsAppInstance>();
let socketIO: any = null;

export function setSocketIO(io: any) {
  socketIO = io;
}

// Histórico por usuário para cada instância
const historicoPorUsuario: { [key: string]: any[] } = {};
const timeoutsPorUsuario: { [key: string]: NodeJS.Timeout } = {};

export async function sendWhatsAppMessage(to: string, message: string, instanceId?: string): Promise<boolean> {
  try {
    const instance = instanceId ? whatsappInstances.get(instanceId) : Array.from(whatsappInstances.values()).find(i => i.enabled && i.isConnected);
    
    if (!instance || !instance.isConnected) {
      console.log('WhatsApp não está conectado ou instância não encontrada');
      return false;
    }

    await instance.client.sendMessage(to, message);
    console.log(`Mensagem enviada via ${instance.number}: ${message}`);
    return true;
  } catch (error: any) {
    console.error('Erro ao enviar mensagem WhatsApp:', error.message);
    return false;
  }
}

export async function toggleSDRMode(contactId: string, instanceId: string): Promise<boolean> {
  try {
    const instance = whatsappInstances.get(instanceId);
    if (!instance) return false;

    const numero = contactId.replace('@c.us', '');
    
    if (instance.sdrMode.has(numero)) {
      instance.sdrMode.delete(numero);
      console.log(`IA reativada para ${numero} em ${instance.number}`);
    } else {
      instance.sdrMode.add(numero);
      console.log(`SDR ativo para ${numero} em ${instance.number}`);
    }

    if (socketIO) {
      socketIO.emit('sdr-mode-changed', {
        contactId,
        instanceId,
        sdrActive: instance.sdrMode.has(numero)
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao alternar modo SDR:', error);
    return false;
  }
}

export function getWhatsAppInstances(): Array<{id: string, number: string, isConnected: boolean, enabled: boolean}> {
  return Array.from(whatsappInstances.values()).map(instance => ({
    id: instance.id,
    number: instance.number,
    isConnected: instance.isConnected,
    enabled: instance.enabled
  }));
}

export async function configureWhatsApp(instanceId: string, number: string, enabled: boolean): Promise<boolean> {
  try {
    const existingInstance = whatsappInstances.get(instanceId);
    
    if (existingInstance) {
      existingInstance.number = number;
      existingInstance.enabled = enabled;
      
      if (!enabled && existingInstance.client) {
        await existingInstance.client.destroy();
        existingInstance.isConnected = false;
      } else if (enabled && !existingInstance.isConnected) {
        await startBot(instanceId, number);
      }
    } else {
      if (whatsappInstances.size >= 4) {
        throw new Error('Limite máximo de 4 WhatsApp atingido.');
      }
      
      if (enabled) {
        await startBot(instanceId, number);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao configurar WhatsApp:', error);
    return false;
  }
}

export async function removeWhatsApp(instanceId: string): Promise<boolean> {
  try {
    const instance = whatsappInstances.get(instanceId);
    if (instance) {
      if (instance.client) {
        await instance.client.destroy();
      }
      whatsappInstances.delete(instanceId);
    }
    return true;
  } catch (error) {
    console.error('Erro ao remover WhatsApp:', error);
    return false;
  }
}

export async function startBot(instanceId: string, number: string): Promise<void> {
  try {
    console.log(`📱 Configurando instância WhatsApp: ${instanceId} (${number})`);
    
    // Verificar se a instância já existe
    let instance = whatsappInstances.get(instanceId);
    
    if (!instance) {
      console.log(`📱 Criando nova instância: ${instanceId}`);
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: instanceId }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      instance = {
        id: instanceId,
        number: number,
        client,
        qrDisplayed: false,
        isConnected: false,
        sdrMode: new Set(),
        enabled: true
      };

      whatsappInstances.set(instanceId, instance);
      
      // Configurar eventos do cliente
      setupClientEvents(instance);
    }
    
    console.log(`✅ Instância ${instanceId} configurada. Use requestQRCode() para gerar QR Code.`);
    
  } catch (error) {
    console.error(`❌ Erro ao configurar instância ${instanceId}:`, error);
    throw error;
  }
}

export async function initializeWhatsApp(): Promise<void> {
  console.log('Inicializando WhatsApp Web JS...');
  // Implementar inicialização se necessário
} 

// Função para solicitar QR Code manualmente
export async function requestQRCode(instanceId: string, number: string): Promise<{ success: boolean; message: string; instanceId?: string }> {
  try {
    console.log(`📱 Solicitando QR Code para instância: ${instanceId} (${number})`);
    
    // Verificar se a instância já existe
    let instance = whatsappInstances.get(instanceId);
    
    if (!instance) {
      console.log(`📱 Criando nova instância: ${instanceId}`);
      // Criar nova instância sem iniciar automaticamente
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: instanceId }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      instance = {
        id: instanceId,
        number: number,
        client,
        qrDisplayed: false,
        isConnected: false,
        sdrMode: new Set(),
        enabled: true
      };

      whatsappInstances.set(instanceId, instance);
      
      // Configurar eventos do cliente
      setupClientEvents(instance);
    }
    
    // Verificar se já está conectado
    if (instance.isConnected) {
      return {
        success: true,
        message: 'WhatsApp já está conectado',
        instanceId
      };
    }
    
    // Iniciar o cliente para gerar QR Code
    console.log(`🚀 Iniciando cliente para gerar QR Code: ${instanceId}`);
    await instance.client.initialize();
    
    return {
      success: true,
      message: 'QR Code solicitado com sucesso',
      instanceId
    };
    
  } catch (error) {
    console.error(`❌ Erro ao solicitar QR Code para ${instanceId}:`, error);
    return {
      success: false,
      message: `Erro ao solicitar QR Code: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

// Função para configurar eventos do cliente
function setupClientEvents(instance: WhatsAppInstance) {
  const { client, id: instanceId, number } = instance;
  
  client.on('qr', (qr) => {
    console.log(`📱 QR Code disponível para ${number} (${instanceId})`);
    console.log(`📡 SocketIO disponível: ${socketIO ? 'Sim' : 'Não'}`);
    console.log(`📊 Total de clientes conectados: ${socketIO ? socketIO.sockets.sockets.size : 0}`);
    
    instance.qrDisplayed = true;
    
    // Limpar timeout anterior se existir
    if (instance.qrTimeout) {
      clearTimeout(instance.qrTimeout);
    }
    
    // Configurar timeout para detectar expiração do QR (60 segundos)
    instance.qrTimeout = setTimeout(() => {
      console.log(`QR Code para ${number} (${instanceId}) expirou. Regenerando...`);
      instance.qrDisplayed = false;
      
      // Emitir evento de QR expirado
      if (socketIO) {
        socketIO.emit('qr-expired', { 
          instanceId, 
          number 
        });
      }
    }, 60000); // 60 segundos
    
    // Emitir QR para frontend
    if (socketIO) {
      console.log(`📤 Emitindo QR para frontend: ${instanceId}`);
      socketIO.emit('qr', { 
        qr, 
        instanceId, 
        number 
      });
      
      socketIO.emit('qr-code', { 
        qr 
      });
      
      console.log(`✅ QR Code emitido com sucesso para ${instanceId}`);
    } else {
      console.error(`❌ SocketIO não está disponível para emitir QR Code`);
    }
  });

  client.on('ready', async () => {
    try {
      const realNumber = client.info.wid.user;
      
      console.log(`WhatsApp conectado! Número real: ${realNumber}`);
      
      instance.number = realNumber;
      instance.isConnected = true;
      instance.qrDisplayed = false;
      
      if (instance.qrTimeout) {
        clearTimeout(instance.qrTimeout);
        instance.qrTimeout = undefined;
      }
      
      if (socketIO) {
        socketIO.emit('wpp-status', { status: 'open', instanceId, number: realNumber });
        socketIO.emit('whatsapp-status', { 
          connected: true, 
          number: realNumber,
          aiActive: true 
        });
      }
      
      console.log(`✅ Instância ${instanceId} conectada com sucesso`);
      
    } catch (error) {
      console.error(`❌ Erro ao processar conexão da instância ${instanceId}:`, error);
    }
  });

  client.on('disconnected', (reason) => {
    console.log(`📱 WhatsApp desconectado (${instanceId}): ${reason}`);
    instance.isConnected = false;
    instance.qrDisplayed = false;
    
    if (instance.qrTimeout) {
      clearTimeout(instance.qrTimeout);
      instance.qrTimeout = undefined;
    }
    
    if (socketIO) {
      socketIO.emit('wpp-status', { status: 'disconnected', instanceId, number });
      socketIO.emit('whatsapp-status', { 
        connected: false, 
        number: '',
        aiActive: true 
      });
    }
  });

  client.on('auth_failure', (message) => {
    console.error(`❌ Falha de autenticação (${instanceId}): ${message}`);
    instance.isConnected = false;
    
    if (socketIO) {
      socketIO.emit('wpp-status', { status: 'auth_failure', instanceId, number });
    }
  });
} 