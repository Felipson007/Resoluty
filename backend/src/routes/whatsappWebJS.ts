import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { buscarHistoricoCliente, salvarInteracaoHistorico } from '../services/historicoService';
import { gerarPromptCerebro } from '../services/cerebroService';
import { salvarMensagemLead, buscarLead } from '../services/leadService';
import axios from 'axios';

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

    const instance: WhatsAppInstance = {
      id: instanceId,
      number: number,
      client,
      qrDisplayed: false,
      isConnected: false,
      sdrMode: new Set(),
      enabled: true
    };

    whatsappInstances.set(instanceId, instance);

    client.on('qr', (qr) => {
      console.log(`\n=== QR Code para ${number} (${instanceId}) ===`);
      console.log('QR Code disponível no frontend');
      console.log(`Tamanho do QR: ${qr.length} caracteres`);
      console.log(`SocketIO disponível: ${socketIO ? 'Sim' : 'Não'}`);
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
        console.log(`Emitindo QR para frontend: ${instanceId}`);
        console.log(`Dados do QR: { qr: "${qr.substring(0, 50)}...", instanceId: "${instanceId}", number: "${number}" }`);
        
        // Emitir para todos os clientes conectados
        socketIO.emit('qr', { 
          qr, 
          instanceId, 
          number 
        });
        
        // Também emitir o evento alternativo para compatibilidade
        socketIO.emit('qr-code', { 
          qr 
        });
        
        console.log('✅ QR Code emitido com sucesso para todos os clientes');
        console.log(`📊 Total de clientes conectados: ${socketIO.sockets.sockets.size}`);
      } else {
        console.error('❌ SocketIO não está disponível para emitir QR');
        console.error('SocketIO object:', socketIO);
      }
    });

    client.on('ready', () => {
      console.log(`WhatsApp ${number} conectado!`);
      instance.isConnected = true;
      instance.qrDisplayed = false;
      
      if (instance.qrTimeout) {
        clearTimeout(instance.qrTimeout);
        instance.qrTimeout = undefined;
      }
      
      if (socketIO) {
        socketIO.emit('wpp-status', { status: 'open', instanceId, number });
        // Emitir status geral do WhatsApp
        socketIO.emit('whatsapp-status', { 
          connected: true, 
          number: number,
          aiActive: true 
        });
      }
    });

    client.on('disconnected', (reason) => {
      console.log(`WhatsApp ${number} desconectado: ${reason}`);
      instance.isConnected = false;
      instance.qrDisplayed = false;
      
      if (instance.qrTimeout) {
        clearTimeout(instance.qrTimeout);
        instance.qrTimeout = undefined;
      }
      
      if (socketIO) {
        socketIO.emit('wpp-status', { status: 'close', instanceId, number });
        // Verificar se ainda há outras instâncias conectadas
        const connectedInstances = Array.from(whatsappInstances.values()).filter(i => i.isConnected);
        const connectedInstance = connectedInstances[0];
        
        socketIO.emit('whatsapp-status', { 
          connected: connectedInstances.length > 0, 
          number: connectedInstance ? connectedInstance.number : '',
          aiActive: true 
        });
      }
    });

    client.on('message', async (message: Message) => {
      if (message.fromMe) return;

      const from = message.from;
      const text = message.body;

      if (!from || !text) return;

      console.log(`Mensagem recebida de ${from} via ${number}: ${text}`);

      const lead = await buscarLead(from);
      await salvarMensagemLead(from, text, 'usuario');

      if (socketIO) {
        console.log('📨 Emitindo evento new-message para mensagem do usuário (WebJS)');
        console.log('📨 Dados do lead encontrado:', lead);
        console.log('📨 ContactId:', from);
        console.log('📨 InstanceId:', instanceId);
        console.log('📨 Number:', number);
        
        const eventData = {
          contactId: from,
          message: {
            texto: text,
            timestamp: new Date().toISOString(),
            autor: 'usuario'
          },
          lead: lead ? {
            id: lead.id,
            numero: lead.numero,
            status: lead.metadata.status,
            total_mensagens: (lead.metadata as any).total_mensagens,
            ultima_interacao: (lead.metadata as any).ultima_interacao
          } : null,
          instanceId,
          number
        };
        
        console.log('📨 Dados do evento new-message (WebJS):', eventData);
        socketIO.emit('new-message', eventData);
        console.log('✅ Evento new-message emitido com sucesso (WebJS)');
      }

      if (!historicoPorUsuario[from]) historicoPorUsuario[from] = [];
      historicoPorUsuario[from].push({
        texto: text,
        timestamp: new Date().toISOString(),
        autor: 'usuario',
      });

      await salvarInteracaoHistorico({
        cliente_id: from,
        mensagem_usuario: text,
        resposta_ia: '',
        data: new Date().toISOString(),
        canal: 'whatsapp',
      });

      if (instance.sdrMode.has(from.replace('@c.us', ''))) {
        console.log(`Conversa ${from} está em modo SDR - IA desligada`);
        return;
      }

      if (timeoutsPorUsuario[from]) clearTimeout(timeoutsPorUsuario[from]);

      timeoutsPorUsuario[from] = setTimeout(async () => {
        try {
          const { data: historicoDB } = await buscarHistoricoCliente(from, 10);
          const historicoEstruturado = (historicoDB || []).flatMap((item: any) => [
            { texto: item.mensagem_usuario, timestamp: item.data, autor: 'usuario' },
            item.resposta_ia ? { texto: item.resposta_ia, timestamp: item.data, autor: 'sistema' } : null
          ]).filter(Boolean);

          const historicoFinal = [
            ...historicoEstruturado.filter((msg: any) => msg !== null),
            ...(historicoPorUsuario[from] || [])
          ];

          const promptCerebro = gerarPromptCerebro(historicoFinal);
          let resposta = 'Desculpe, não consegui responder.';

          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://resoluty.onrender.com' 
            : 'https://resoluty.onrender.com';
          
          const iaResp = await axios.post(`${baseUrl}/webhook/ia`, { message: promptCerebro });
          resposta = iaResp.data.resposta || resposta;

          historicoPorUsuario[from].push({
            texto: resposta,
            timestamp: new Date().toISOString(),
            autor: 'sistema',
          });

          await salvarInteracaoHistorico({
            cliente_id: from,
            mensagem_usuario: '',
            resposta_ia: resposta,
            data: new Date().toISOString(),
            canal: 'whatsapp',
          });

          await instance.client.sendMessage(from, resposta);

          if (socketIO) {
            socketIO.emit('new-message', {
              contactId: from,
              message: {
                texto: resposta,
                timestamp: new Date().toISOString(),
                autor: 'sistema'
              },
              instanceId,
              number
            });
          }

          console.log(`Resposta enviada via ${number}: ${resposta}`);
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      }, 15000);
    });

    await client.initialize();
  } catch (error) {
    console.error('Erro ao iniciar WhatsApp:', error);
  }
}

export async function initializeWhatsApp(): Promise<void> {
  console.log('Inicializando WhatsApp Web JS...');
  // Implementar inicialização se necessário
} 