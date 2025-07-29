import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { Boom } from '@hapi/boom';
import axios from 'axios';
import { buscarHistoricoCliente, salvarInteracaoHistorico } from '../services/historicoService';
import { gerarPromptCerebro } from '../services/cerebroService';
import { salvarMensagemLead, buscarLead } from '../services/leadService';
import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

// Interface para múltiplos WhatsApp
interface WhatsAppInstance {
  id: string;
  number: string;
  client: Client;
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

// Sistema de autenticação customizado para Supabase
class SupabaseAuthStrategy {
  private instanceId: string;

  constructor(instanceId: string) {
    this.instanceId = instanceId;
  }

  async beforeBrowserLaunch() {
    // Não precisa fazer nada antes do launch
  }

  async afterBrowserLaunch() {
    // Não precisa fazer nada após o launch
  }

  async onAuthenticationNeeded() {
    // QR code será gerado automaticamente
  }

  async getAuthInfo() {
    try {
      const { data, error } = await supabase
        .from('whatsapp_auth')
        .select('data')
        .eq('instance_id', this.instanceId)
        .eq('file_name', 'session')
        .single();

      if (error || !data) {
        return null;
      }

      return JSON.parse(data.data);
    } catch (error) {
      console.error('Erro ao ler dados de autenticação:', error);
      return null;
    }
  }

  async setAuthInfo(authInfo: any) {
    try {
      const { error } = await supabase
        .from('whatsapp_auth')
        .upsert({
          instance_id: this.instanceId,
          file_name: 'session',
          data: JSON.stringify(authInfo),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao salvar dados de autenticação:', error);
      } else {
        console.log(`Dados de autenticação salvos para ${this.instanceId}`);
      }
    } catch (error) {
      console.error('Erro ao salvar dados de autenticação:', error);
    }
  }

  async deleteAuthInfo() {
    try {
      const { error } = await supabase
        .from('whatsapp_auth')
        .delete()
        .eq('instance_id', this.instanceId);

      if (error) {
        console.error('Erro ao deletar dados de autenticação:', error);
      } else {
        console.log(`Dados de autenticação deletados para ${this.instanceId}`);
      }
    } catch (error) {
      console.error('Erro ao deletar dados de autenticação:', error);
    }
  }
}

// Sistema de autenticação híbrido
class HybridAuthStrategy {
  private instanceId: string;
  private isProduction: boolean;

  constructor(instanceId: string) {
    this.instanceId = instanceId;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async beforeBrowserLaunch() {
    // Não precisa fazer nada antes do launch
  }

  async afterBrowserLaunch() {
    // Não precisa fazer nada após o launch
  }

  async onAuthenticationNeeded() {
    // QR code será gerado automaticamente
  }

  async getAuthInfo() {
    if (this.isProduction) {
      // Usar Supabase em produção
      try {
        const { data, error } = await supabase
          .from('whatsapp_auth')
          .select('data')
          .eq('instance_id', this.instanceId)
          .eq('file_name', 'session')
          .single();

        if (error || !data) {
          return null;
        }

        return JSON.parse(data.data);
      } catch (error) {
        console.error('Erro ao ler dados de autenticação do Supabase:', error);
        return null;
      }
    } else {
      // Usar arquivos locais em desenvolvimento
      try {
        const sessionPath = path.join(process.cwd(), '.wwebjs_auth', this.instanceId, 'session.json');
        if (fs.existsSync(sessionPath)) {
          const data = fs.readFileSync(sessionPath, 'utf8');
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('Erro ao ler dados de autenticação local:', error);
      }
      return null;
    }
  }

  async setAuthInfo(authInfo: any) {
    if (this.isProduction) {
      // Salvar no Supabase em produção
      try {
        const { error } = await supabase
          .from('whatsapp_auth')
          .upsert({
            instance_id: this.instanceId,
            file_name: 'session',
            data: JSON.stringify(authInfo),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Erro ao salvar dados de autenticação no Supabase:', error);
        } else {
          console.log(`Dados de autenticação salvos no Supabase para ${this.instanceId}`);
        }
      } catch (error) {
        console.error('Erro ao salvar dados de autenticação no Supabase:', error);
      }
    } else {
      // Salvar em arquivo local em desenvolvimento
      try {
        const authDir = path.join(process.cwd(), '.wwebjs_auth', this.instanceId);
        if (!fs.existsSync(authDir)) {
          fs.mkdirSync(authDir, { recursive: true });
        }
        const sessionPath = path.join(authDir, 'session.json');
        fs.writeFileSync(sessionPath, JSON.stringify(authInfo, null, 2));
        console.log(`Dados de autenticação salvos localmente para ${this.instanceId}`);
      } catch (error) {
        console.error('Erro ao salvar dados de autenticação local:', error);
      }
    }
  }

  async deleteAuthInfo() {
    if (this.isProduction) {
      // Deletar do Supabase em produção
      try {
        const { error } = await supabase
          .from('whatsapp_auth')
          .delete()
          .eq('instance_id', this.instanceId);

        if (error) {
          console.error('Erro ao deletar dados de autenticação do Supabase:', error);
        } else {
          console.log(`Dados de autenticação deletados do Supabase para ${this.instanceId}`);
        }
      } catch (error) {
        console.error('Erro ao deletar dados de autenticação do Supabase:', error);
      }
    } else {
      // Deletar arquivo local em desenvolvimento
      try {
        const authDir = path.join(process.cwd(), '.wwebjs_auth', this.instanceId);
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
          console.log(`Dados de autenticação deletados localmente para ${this.instanceId}`);
        }
      } catch (error) {
        console.error('Erro ao deletar dados de autenticação local:', error);
      }
    }
  }
}

export async function sendWhatsAppMessage(to: string, message: string, instanceId?: string): Promise<boolean> {
  try {
    // Se não especificar instância, usar a primeira disponível
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

// Função para alternar modo SDR
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
    console.log(`🔧 Configurando WhatsApp ${instanceId}: ${number} - ${enabled ? 'habilitado' : 'desabilitado'}`);
    
    const existingInstance = whatsappInstances.get(instanceId);
    
    if (existingInstance) {
      // Atualizar instância existente
      existingInstance.number = number;
      existingInstance.enabled = enabled;
      
      if (!enabled && existingInstance.client) {
        // Desconectar se foi desabilitado
        console.log(`🔌 Desconectando WhatsApp ${instanceId}`);
        await existingInstance.client.destroy();
        existingInstance.isConnected = false;
      } else if (enabled && !existingInstance.isConnected) {
        // Reconectar se foi habilitado
        console.log(`🔌 Reconectando WhatsApp ${instanceId}`);
        await startBot(instanceId, number);
      }
    } else {
      // Verificar limite de 4 WhatsApp
      if (whatsappInstances.size >= 4) {
        throw new Error('Limite máximo de 4 WhatsApp atingido. Remova uma instância antes de adicionar outra.');
      }
      
      // Criar nova instância
      if (enabled) {
        console.log(`🆕 Criando nova instância WhatsApp ${instanceId}`);
        await startBot(instanceId, number);
      }
    }
    
    console.log(`✅ WhatsApp ${instanceId} configurado com sucesso`);
    
    // Emitir atualização das instâncias
    if (socketIO) {
      socketIO.emit('whatsapp-instances-updated', getWhatsAppInstances());
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Erro ao configurar WhatsApp ${instanceId}:`, error);
    return false;
  }
}

// Função para remover WhatsApp
export async function removeWhatsApp(instanceId: string): Promise<boolean> {
  try {
    const instance = whatsappInstances.get(instanceId);
    if (instance) {
      if (instance.client) {
        await instance.client.destroy();
      }
      whatsappInstances.delete(instanceId);
      
      // Limpar dados de autenticação
      console.log(`WhatsApp removido para ${instanceId} - limpando dados de autenticação`);
      const authStrategy = new HybridAuthStrategy(instanceId);
      await authStrategy.deleteAuthInfo();
    }
    return true;
  } catch (error) {
    console.error('Erro ao remover WhatsApp:', error);
    return false;
  }
}

async function startBot(instanceId: string, number: string): Promise<void> {
  try {
    console.log(`Iniciando WhatsApp ${instanceId} (${number}) usando WhatsApp Web JS`);
    
    // Criar estratégia de autenticação híbrida
    const authStrategy = new HybridAuthStrategy(instanceId);
    
    const client = new Client({
      authStrategy: new LocalAuth({ 
        clientId: instanceId,
        dataPath: process.env.NODE_ENV === 'production' ? undefined : path.join(process.cwd(), '.wwebjs_auth')
      }),
      puppeteer: {
        headless: true,
        timeout: 60000, // 60 segundos de timeout
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
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

    // Handler para salvar dados de autenticação quando disponíveis
    client.on('authenticated', async () => {
      try {
        console.log(`WhatsApp ${instanceId} autenticado - dados salvos automaticamente`);
      } catch (error) {
        console.error('Erro ao processar autenticação:', error);
      }
    });

    // Evento QR Code
    client.on('qr', (qr: string) => {
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
      }, 45000); // 45 segundos
      
      // Emitir QR para frontend
      if (socketIO) {
        socketIO.emit('qr', { 
          qr, 
          instanceId, 
          number 
        });
      }
    });

    // Evento Ready (conectado)
    client.on('ready', () => {
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
        
        // Emitir atualização das instâncias
        socketIO.emit('whatsapp-instances-updated', getWhatsAppInstances());
      }
    });

    // Evento Disconnected
    client.on('disconnected', (reason: string) => {
      console.log(`WhatsApp ${number} desconectado: ${reason}`);
      instance.isConnected = false;
      instance.qrDisplayed = false;
      
      // Limpar timeout do QR quando desconectar
      if (instance.qrTimeout) {
        clearTimeout(instance.qrTimeout);
        instance.qrTimeout = undefined;
      }
      
      if (socketIO) {
        socketIO.emit('wpp-status', { 
          status: 'disconnected', 
          instanceId, 
          number 
        });
        
        // Emitir atualização das instâncias
        socketIO.emit('whatsapp-instances-updated', getWhatsAppInstances());
      }
      
      // Se foi logout, limpar dados de autenticação
      if (reason === 'NAVIGATION') {
        console.log(`Logout realizado para ${instanceId} - limpando dados de autenticação`);
        const authStrategy = new HybridAuthStrategy(instanceId);
        (async () => {
          try {
            await authStrategy.deleteAuthInfo();
          } catch (error) {
            console.error('Erro ao limpar dados de autenticação após logout:', error);
          }
        })();
      }
      
      if (socketIO) {
        socketIO.emit('wpp-status', { 
          status: 'close', 
          instanceId, 
          number 
        });
      }

      // Tentar reconectar se ainda estiver habilitado
      if (instance.enabled) {
        setTimeout(() => startBot(instanceId, number), 3000);
      }
    });

    // Evento de mensagem recebida
    client.on('message', async (message: Message) => {
      if (message.fromMe) return;

      const from = message.from;
      const text = message.body;

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
      if (instance.sdrMode.has(from.replace('@c.us', ''))) {
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

            // Envia resposta via WhatsApp
            await instance.client.sendMessage(from, resposta);

            // Emitir evento via Socket.IO para resposta da IA
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
        })();
      }, 15000);
    });

    // Inicializar o cliente
    await client.initialize();
  } catch (error) {
    console.error('Erro ao iniciar WhatsApp:', error);
  }
}

export async function initializeWhatsApp(): Promise<void> {
  console.log('Inicializando WhatsApp Web JS...');
  // Implementar inicialização se necessário
} 