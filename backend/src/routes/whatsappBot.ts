import { makeWASocket, DisconnectReason, useMultiFileAuthState, AuthenticationState, SignalDataTypeMap, initAuthCreds, proto } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import axios from 'axios';
import { buscarHistoricoCliente, salvarInteracaoHistorico } from '../services/historicoService';
import { gerarPromptCerebro } from '../services/cerebroService';
import { salvarMensagemLead, buscarLead } from '../services/leadService';
import { supabase } from '../config/supabase';

// Interface para múltiplos WhatsApp
interface WhatsAppInstance {
  id: string;
  number: string;
  sock: any;
  qrDisplayed: boolean;
  isConnected: boolean;
  sdrMode: Set<string>; // Números em modo SDR (IA desligada)
  enabled: boolean; // Se o WhatsApp está habilitado
  qrTimeout?: NodeJS.Timeout; // Timeout para detectar expiração do QR
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

// Sistema de autenticação híbrido (Supabase em produção, arquivos locais em desenvolvimento)
async function useHybridAuthState(instanceId: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Usar Supabase em produção
    return await useSupabaseAuthState(instanceId);
  } else {
    // Usar sistema de arquivos local em desenvolvimento
    return await useMultiFileAuthState(`auth_info_baileys_${instanceId}`);
  }
}

// Sistema de autenticação customizado para Supabase
async function useSupabaseAuthState(instanceId: string) {
  const writeData = async (data: any, file: string) => {
    try {
      // Garantir que data seja uma string JSON válida
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
      
      const { error } = await supabase
        .from('whatsapp_auth')
        .upsert({
          instance_id: instanceId,
          file_name: file,
          data: jsonData,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Erro ao salvar dados de autenticação:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar dados de autenticação:', error);
    }
  };

  const readData = async (file: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_auth')
        .select('data')
        .eq('instance_id', instanceId)
        .eq('file_name', file)
        .single();

      if (error || !data) {
        return null;
      }

      // Verificar se data.data é uma string válida
      if (typeof data.data !== 'string') {
        console.error('Dados de autenticação inválidos para', file);
        return null;
      }

      try {
        return JSON.parse(data.data);
      } catch (parseError) {
        console.error('Erro ao fazer parse dos dados de autenticação para', file, parseError);
        return null;
      }
    } catch (error) {
      console.error('Erro ao ler dados de autenticação:', error);
      return null;
    }
  };

  const removeData = async (file: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_auth')
        .delete()
        .eq('instance_id', instanceId)
        .eq('file_name', file);

      if (error) {
        console.error('Erro ao remover dados de autenticação:', error);
      }
    } catch (error) {
      console.error('Erro ao remover dados de autenticação:', error);
    }
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
          const data: { [key: string]: any } = {};
          for (const id of ids) {
            const value = await readData(`${type}-${id}`);
            if (value) {
              data[id] = value;
            }
          }
          return data;
        },
        set: async (data: any) => {
          const tasks: Promise<void>[] = [];
          for (const [type, id, value] of data) {
            tasks.push(writeData(value, `${type}-${id}`));
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeData(creds, 'creds');
    }
  };
}

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
      // Verificar limite de 4 WhatsApp
      if (whatsappInstances.size >= 4) {
        throw new Error('Limite máximo de 4 WhatsApp atingido. Remova uma instância antes de adicionar outra.');
      }
      
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
      
      // Limpar dados de autenticação
      console.log(`WhatsApp removido para ${instanceId} - limpando dados de autenticação`);
      if (process.env.NODE_ENV === 'production') {
        try {
          const { error } = await supabase
            .from('whatsapp_auth')
            .delete()
            .eq('instance_id', instanceId);
          
          if (error) {
            console.error('Erro ao limpar dados de autenticação:', error);
          } else {
            console.log(`Dados de autenticação limpos para ${instanceId}`);
          }
        } catch (error) {
          console.error('Erro ao limpar dados de autenticação:', error);
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Erro ao remover WhatsApp:', error);
    return false;
  }
}

async function startBot(instanceId: string, number: string): Promise<void> {
  try {
    // Usar sistema híbrido de autenticação
    const { state, saveCreds } = await useHybridAuthState(instanceId);
    
    console.log(`Iniciando WhatsApp ${instanceId} (${number}) - Modo: ${process.env.NODE_ENV === 'production' ? 'Produção (Supabase)' : 'Desenvolvimento (Arquivos Locais)'}`);
    
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

    // Handler para salvar credenciais quando mudarem
    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
        console.log(`Credenciais salvas para ${instanceId} (${process.env.NODE_ENV === 'production' ? 'Supabase' : 'Arquivos Locais'})`);
      } catch (error) {
        console.error('Erro ao salvar credenciais:', error);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !instance.qrDisplayed) {
        console.log(`\n=== QR Code para ${number} (${instanceId}) ===`);
        console.log('QR Code disponível no frontend');
        instance.qrDisplayed = true;
        
        // Limpar timeout anterior se existir
        if (instance.qrTimeout) {
          clearTimeout(instance.qrTimeout);
        }
        
        // Configurar timeout para detectar expiração do QR (45 segundos)
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
        }, 45000); // 45 segundos (tempo típico de expiração do QR)
        
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
        
        // Limpar timeout do QR quando desconectar
        if (instance.qrTimeout) {
          clearTimeout(instance.qrTimeout);
          instance.qrTimeout = undefined;
        }
        
        // Se foi logout, limpar dados de autenticação
        if (!shouldReconnect) {
          console.log(`Logout realizado para ${instanceId} - limpando dados de autenticação`);
          if (process.env.NODE_ENV === 'production') {
            try {
              const { error } = await supabase
                .from('whatsapp_auth')
                .delete()
                .eq('instance_id', instanceId);
              
              if (error) {
                console.error('Erro ao limpar dados de autenticação após logout:', error);
              } else {
                console.log(`Dados de autenticação limpos após logout para ${instanceId}`);
              }
            } catch (error) {
              console.error('Erro ao limpar dados de autenticação após logout:', error);
            }
          }
        }
        
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
        
        // Limpar timeout do QR quando conectar
        if (instance.qrTimeout) {
          clearTimeout(instance.qrTimeout);
          instance.qrTimeout = undefined;
        }
        
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