import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
const qrcode = require('qrcode-terminal');
import axios from 'axios';
import { buscarHistoricoCliente, salvarInteracaoHistorico } from '../services/historicoService';
import { gerarPromptCerebro } from '../services/cerebroService';
import { salvarMensagemLead, buscarLead } from '../services/leadService';

// Interface para múltiplos WhatsApp
interface WhatsAppInstance {
  id: string;
  number: string;
  sock: any;
  qrDisplayed: boolean;
  isConnected: boolean;
  sdrMode: Set<string>; // Números em modo SDR (IA desligada)
  enabled: boolean; // Se o WhatsApp está habilitado
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
    // Se não especificar instância, usar a primeira disponível
    const instance = instanceId ? whatsappInstances.get(instanceId) : Array.from(whatsappInstances.values()).find(i => i.enabled && i.isConnected);
    
    if (!instance || !instance.sock.user || !instance.sock.user.id) {
      console.log('WhatsApp não está conectado ou instância não encontrada');
      return false;
    }

    await instance.sock.sendMessage(to, { text: message });
    console.log(`Mensagem enviada via ${instance.number}: ${message}`);
    return true;
  } catch (error: any) {
    console.error('Erro ao enviar mensagem WhatsApp:', error.message);
    if (error.message.includes('Connection Closed')) {
      console.log('Conexão fechada durante envio. Aguardando reconexão...');
    }
    return false;
  }
}

// Função para alternar modo SDR
export async function toggleSDRMode(contactId: string, instanceId: string): Promise<boolean> {
  try {
    const instance = whatsappInstances.get(instanceId);
    if (!instance) return false;

    const numero = contactId.replace('@s.whatsapp.net', '');
    
    if (instance.sdrMode.has(numero)) {
      instance.sdrMode.delete(numero);
      console.log(`IA reativada para ${numero} em ${instance.number}`);
    } else {
      instance.sdrMode.add(numero);
      console.log(`SDR ativo para ${numero} em ${instance.number}`);
    }

    // Emitir evento para o frontend
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

// Função para obter status de todas as instâncias
export function getWhatsAppInstances(): Array<{id: string, number: string, isConnected: boolean, enabled: boolean}> {
  return Array.from(whatsappInstances.values()).map(instance => ({
    id: instance.id,
    number: instance.number,
    isConnected: instance.isConnected,
    enabled: instance.enabled
  }));
}

// Função para configurar WhatsApp
export async function configureWhatsApp(instanceId: string, number: string, enabled: boolean): Promise<boolean> {
  try {
    const existingInstance = whatsappInstances.get(instanceId);
    
    if (existingInstance) {
      // Atualizar instância existente
      existingInstance.number = number;
      existingInstance.enabled = enabled;
      
      if (!enabled && existingInstance.sock) {
        // Desconectar se foi desabilitado
        await existingInstance.sock.logout();
        existingInstance.isConnected = false;
      } else if (enabled && !existingInstance.isConnected) {
        // Reconectar se foi habilitado
        await startBot(instanceId, number);
      }
    } else {
      // Criar nova instância
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

// Função para remover WhatsApp
export async function removeWhatsApp(instanceId: string): Promise<boolean> {
  try {
    const instance = whatsappInstances.get(instanceId);
    if (instance) {
      if (instance.sock) {
        await instance.sock.logout();
      }
      whatsappInstances.delete(instanceId);
    }
    return true;
  } catch (error) {
    console.error('Erro ao remover WhatsApp:', error);
    return false;
  }
}

async function startBot(instanceId: string, number: string): Promise<void> {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(`auth_info_baileys_${instanceId}`);
    
    const sock = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      logger: require('pino')({ level: 'silent' })
    });

    const instance: WhatsAppInstance = {
      id: instanceId,
      number: number,
      sock,
      qrDisplayed: false,
      isConnected: false,
      sdrMode: new Set(),
      enabled: true
    };

    whatsappInstances.set(instanceId, instance);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !instance.qrDisplayed) {
        console.log(`\n=== QR Code para ${number} (${instanceId}) ===`);
        qrcode(qr, { small: true });
        instance.qrDisplayed = true;
        
        // Emitir QR para frontend
        if (socketIO) {
          socketIO.emit('qr', { 
            qr, 
            instanceId, 
            number 
          });
        }
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`Conexão ${number} fechada devido a ${lastDisconnect?.error}, reconectando: ${shouldReconnect}`);
        
        instance.isConnected = false;
        instance.qrDisplayed = false;
        
        if (socketIO) {
          socketIO.emit('wpp-status', { 
            status: 'close', 
            instanceId, 
            number 
          });
        }

        if (shouldReconnect && instance.enabled) {
          setTimeout(() => startBot(instanceId, number), 3000);
        }
      } else if (connection === 'open') {
        console.log(`WhatsApp ${number} conectado!`);
        instance.isConnected = true;
        instance.qrDisplayed = false;
        
        if (socketIO) {
          socketIO.emit('wpp-status', { 
            status: 'open', 
            instanceId, 
            number 
          });
        }
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.key.fromMe && msg.message) {
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (!from || !text) return;

        console.log(`Mensagem recebida de ${from} via ${number}: ${text}`);

        // Buscar informações do lead
        const lead = await buscarLead(from);

        // Salvar mensagem do usuário no sistema de leads
        await salvarMensagemLead(from, text, 'usuario');

        // Emitir evento via Socket.IO para mensagem do usuário
        if (socketIO) {
          socketIO.emit('new-message', {
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
          });
        }

        // Acumula histórico estruturado por usuário
        if (!historicoPorUsuario[from]) historicoPorUsuario[from] = [];
        historicoPorUsuario[from].push({
          texto: text,
          timestamp: new Date().toISOString(),
          autor: 'usuario',
        });

        // Salva mensagem do usuário no banco
        await salvarInteracaoHistorico({
          cliente_id: from,
          mensagem_usuario: text,
          resposta_ia: '',
          data: new Date().toISOString(),
          canal: 'whatsapp',
        });

        // Verificar se está em modo SDR
        if (instance.sdrMode.has(from.replace('@s.whatsapp.net', ''))) {
          console.log(`Conversa ${from} está em modo SDR - IA desligada`);
          return;
        }

        // Se já existe um timeout, limpa para reiniciar a contagem
        if (timeoutsPorUsuario[from]) clearTimeout(timeoutsPorUsuario[from]);

        // Inicia/reinicia o timeout de 15 segundos
        timeoutsPorUsuario[from] = setTimeout(() => {
          (async () => {
            // Buscar histórico do banco antes de montar o prompt
            const { data: historicoDB } = await buscarHistoricoCliente(from, 10);
            // Montar histórico estruturado para o cérebro
            const historicoEstruturado = (historicoDB || []).flatMap((item: any) => [
              { texto: item.mensagem_usuario, timestamp: item.data, autor: 'usuario' },
              item.resposta_ia ? { texto: item.resposta_ia, timestamp: item.data, autor: 'sistema' } : null
            ]).filter(Boolean);
            // Acrescenta mensagens não salvas ainda (caso existam)
            // Remove possíveis valores nulos do histórico estruturado antes de concatenar
            const historicoFinal = [
              ...historicoEstruturado.filter((msg: any) => msg !== null),
              ...(historicoPorUsuario[from] || [])
            ];
            // Gera prompt usando o cérebro
            const promptCerebro = gerarPromptCerebro(historicoFinal);
            let resposta = 'Desculpe, não consegui responder.';
            try {
              // Usar URL de produção ou localhost baseado no ambiente
              const baseUrl = process.env.NODE_ENV === 'production' 
                ? 'https://resoluty.onrender.com' 
                : 'http://localhost:4000';
              
              console.log(`Chamando IA em ${baseUrl}/webhook/ia com:`, promptCerebro);
              const iaResp = await axios.post(`${baseUrl}/webhook/ia`, { message: promptCerebro });
              console.log('Resposta recebida da IA:', iaResp.data);
              resposta = iaResp.data.resposta || resposta;
              // Adiciona resposta ao histórico em memória
              historicoPorUsuario[from].push({
                texto: resposta,
                timestamp: new Date().toISOString(),
                autor: 'sistema',
              });
              // Salva resposta da IA no banco
              await salvarInteracaoHistorico({
                cliente_id: from,
                mensagem_usuario: '',
                resposta_ia: resposta,
                data: new Date().toISOString(),
                canal: 'whatsapp',
              });
            } catch (e: any) {
              console.error('Erro ao chamar IA:', e.message);
            }
            
            // Verificar se ainda está conectado antes de enviar
            if (sock.user && sock.user.id) {
              try {
                await sock.sendMessage(from, { text: resposta });
                
                // Salvar resposta da IA no sistema de leads
                await salvarMensagemLead(from, resposta, 'ai');
                
                // Emitir evento via Socket.IO para resposta do bot
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
              } catch (sendError: any) {
                console.error('Erro ao enviar mensagem WhatsApp:', sendError.message);
                if (sendError.message.includes('Connection Closed')) {
                  console.log('Conexão fechada durante envio. Aguardando reconexão...');
                }
              }
            } else {
              console.log('WhatsApp não está conectado. Mensagem não enviada.');
            }
            
            // Limpa o contexto textual após responder, mas mantém o histórico estruturado
            // Se quiser limpar tudo, use: historicoPorUsuario[from] = [];
            delete timeoutsPorUsuario[from];
          })();
        }, 15000); // 15 segundos
      }
    });
  } catch (error) {
    console.error(`Erro ao iniciar bot ${instanceId}:`, error);
  }
}

// Inicializar com configuração padrão (vazia)
export async function initializeWhatsApp(): Promise<void> {
  console.log('Sistema WhatsApp inicializado. Use a página de configuração para adicionar números.');
} 