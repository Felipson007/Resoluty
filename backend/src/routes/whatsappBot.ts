import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { Boom } from '@hapi/boom';
import { buscarHistoricoCliente, salvarInteracaoHistorico } from '../services/historicoService';
import { gerarPromptCerebro } from '../services/cerebroService';
import { salvarMensagemLead, buscarLead, extrairInformacoesCliente, criarOuAtualizarLead, atualizarStatusLead } from '../services/leadService';
import { supabase } from '../config/supabase';
import { callInternalWebhook } from '../config/api';
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
      
      // Limpar dados de autenticação do Supabase em produção
      if (process.env.NODE_ENV === 'production') {
        try {
          const { error } = await supabase
            .from('whatsapp_auth')
            .delete()
            .eq('instance_id', instanceId);

          if (error) {
            console.error('Erro ao deletar dados de autenticação do Supabase:', error);
          } else {
            console.log(`Dados de autenticação deletados do Supabase para ${instanceId}`);
          }
        } catch (error) {
          console.error('Erro ao deletar dados de autenticação do Supabase:', error);
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
    console.log(`🚀 Iniciando WhatsApp ${instanceId} (${number}) usando WhatsApp Web JS`);
    
    // Verificar se já existe uma instância e destruí-la
    if (whatsappInstances.has(instanceId)) {
      console.log(`🔌 Reconectando WhatsApp ${instanceId}`);
      const existingInstance = whatsappInstances.get(instanceId);
      if (existingInstance?.client) {
        try {
          await existingInstance.client.destroy();
          console.log(`✅ Cliente anterior ${instanceId} destruído com sucesso`);
        } catch (error) {
          console.warn(`⚠️ Erro ao destruir cliente anterior ${instanceId}:`, error);
        }
      }
    }
    
    // Em produção, tentar restaurar dados de autenticação do Supabase
    if (process.env.NODE_ENV === 'production') {
      try {
        const { data, error } = await supabase
          .from('whatsapp_auth')
          .select('data')
          .eq('instance_id', instanceId)
          .eq('file_name', 'session')
          .single();

        if (!error && data) {
          console.log(`📥 Restaurando dados de autenticação do Supabase para ${instanceId}`);
          
          // Criar diretório se não existir
          const authDir = path.join(process.cwd(), '.wwebjs_auth', instanceId);
          if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
          }
          
          // Salvar dados de sessão localmente
          const sessionPath = path.join(authDir, 'session.json');
          fs.writeFileSync(sessionPath, data.data);
          console.log(`✅ Dados de autenticação restaurados para ${instanceId}`);
        } else {
          console.log(`ℹ️ Nenhum dado de autenticação encontrado para ${instanceId}, será necessário novo QR`);
        }
      } catch (error) {
        console.log(`ℹ️ Erro ao restaurar dados de autenticação para ${instanceId}:`, error);
      }
    }
    
    // Criar estratégia de autenticação híbrida
    const authStrategy = new LocalAuth({ 
      clientId: instanceId,
      dataPath: process.env.NODE_ENV === 'production' ? undefined : path.join(process.cwd(), '.wwebjs_auth')
    });
    
    const client = new Client({
      authStrategy: authStrategy,
      puppeteer: {
        headless: true,
        timeout: 180000, // 3 minutos para dar mais tempo
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
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',
          '--disable-javascript',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          '--disable-component-extensions-with-background-pages',
          '--disable-ipc-flooding-protection',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--ignore-certificate-errors-spki-list',
          '--metrics-recording-only',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-software-rasterizer',
          '--disable-background-networking'
        ],
        ignoreHTTPSErrors: true
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

    // Evento de loading
    client.on('loading_screen', (percent, message) => {
      console.log(`📱 Loading WhatsApp ${instanceId}: ${percent}% - ${message}`);
    });

    // Handler para salvar dados de autenticação quando disponíveis
    client.on('authenticated', async () => {
      try {
        console.log(`✅ WhatsApp ${instanceId} autenticado - dados salvos automaticamente`);
        instance.isConnected = true;
        
        // Salvar dados de autenticação no Supabase em produção
        if (process.env.NODE_ENV === 'production') {
          try {
            // Tentar ler dados de sessão do LocalAuth
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth', instanceId, 'session.json');
            if (fs.existsSync(sessionPath)) {
              const sessionData = fs.readFileSync(sessionPath, 'utf8');
              
              // Salvar no Supabase
              const { error } = await supabase
                .from('whatsapp_auth')
                .upsert({
                  instance_id: instanceId,
                  file_name: 'session',
                  data: sessionData,
                  updated_at: new Date().toISOString()
                });

              if (error) {
                console.error('Erro ao salvar dados de autenticação no Supabase:', error);
              } else {
                console.log(`✅ Dados de autenticação salvos no Supabase para ${instanceId}`);
              }
            } else {
              console.log(`⚠️ Arquivo de sessão não encontrado para ${instanceId}`);
            }
          } catch (error) {
            console.error('Erro ao processar dados de autenticação:', error);
          }
        }
        
        // Emitir status atualizado
        if (socketIO) {
          socketIO.emit('whatsapp-status', {
            connected: true,
            number: number,
            instanceId: instanceId
          });
        }
      } catch (error) {
        console.error('Erro ao processar autenticação:', error);
      }
    });

    // Handler para quando a autenticação é necessária
    client.on('auth_failure', async (msg) => {
      console.log(`❌ Falha na autenticação do WhatsApp ${instanceId}:`, msg);
      instance.isConnected = false;
      
      // Emitir status atualizado
      if (socketIO) {
        socketIO.emit('whatsapp-status', {
          connected: false,
          number: number,
          instanceId: instanceId
        });
      }
    });

    // Handler para quando o cliente está pronto
    client.on('ready', async () => {
      try {
        // Obter informações do cliente para pegar o número real
        const realNumber = client.info.wid.user;
        
        console.log(`WhatsApp ${instanceId} conectado! Número real: ${realNumber}`);
        
        // Atualizar o número da instância com o número real
        instance.number = realNumber;
        instance.isConnected = true;
        
        // Salvar dados de autenticação no Supabase em produção (backup)
        if (process.env.NODE_ENV === 'production') {
          try {
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth', instanceId, 'session.json');
            if (fs.existsSync(sessionPath)) {
              const sessionData = fs.readFileSync(sessionPath, 'utf8');
              
              const { error } = await supabase
                .from('whatsapp_auth')
                .upsert({
                  instance_id: instanceId,
                  file_name: 'session',
                  data: sessionData,
                  updated_at: new Date().toISOString()
                });

              if (error) {
                console.error('Erro ao salvar dados de autenticação no Supabase (ready):', error);
              }
            }
          } catch (error) {
            console.error('Erro ao processar dados de autenticação (ready):', error);
          }
        }
        
        // Emitir status atualizado
        if (socketIO) {
          socketIO.emit('whatsapp-status', {
            connected: true,
            number: realNumber,
            instanceId: instanceId
          });
        }
      } catch (error) {
        console.log(`WhatsApp ${instanceId} conectado! (não foi possível obter número real)`);
        instance.isConnected = true;
        
        // Emitir status atualizado
        if (socketIO) {
          socketIO.emit('whatsapp-status', {
            connected: true,
            number: number,
            instanceId: instanceId
          });
        }
      }
    });

    // Handler para desconexão
    client.on('disconnected', async (reason) => {
      console.log(`❌ WhatsApp ${instanceId} desconectado: ${reason}`);
      instance.isConnected = false;
      
      // Emitir status atualizado
      if (socketIO) {
        socketIO.emit('whatsapp-status', {
          connected: false,
          number: number,
          instanceId: instanceId
        });
      }
      
      // Tentar reconectar após alguns segundos
      setTimeout(async () => {
        try {
          console.log(`🔄 Tentando reconectar WhatsApp ${instanceId}...`);
          await startBot(instanceId, number);
        } catch (error) {
          console.error(`❌ Erro na reconexão do WhatsApp ${instanceId}:`, error);
        }
      }, 5000);
    });

    // Evento QR Code
    client.on('qr', (qr: string) => {
      console.log(`QR Code disponível para ${number} (${instanceId})`);
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
      }
    });

    // Evento de mensagem recebida
    client.on('message', async (message: Message) => {
      if (message.fromMe) return;

      const from = message.from;
      const text = message.body;

      if (!from || !text) return;

      // Buscar informações do lead
      const lead = await buscarLead(from);

      // Salvar mensagem do usuário no sistema de leads
      await salvarMensagemLead(from, text, 'usuario');

      // Emitir evento via Socket.IO para mensagem do usuário
      if (socketIO) {
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
        
        socketIO.emit('new-message', eventData);
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
        cliente_id: from.replace('@c.us', ''),
        mensagem_usuario: text,
        resposta_ia: '',
        data: new Date().toISOString(),
        canal: 'whatsapp',
      });

      // Verificar se está em modo SDR
      if (instance.sdrMode.has(from.replace('@c.us', ''))) {
        return;
      }

      // Se já existe um timeout, limpa para reiniciar a contagem
      if (timeoutsPorUsuario[from]) clearTimeout(timeoutsPorUsuario[from]);

      // Inicia/reinicia o timeout de 15 segundos
      timeoutsPorUsuario[from] = setTimeout(() => {
        (async () => {
          try {
            // Extrair apenas o número do telefone do from (remover @c.us se presente)
            const numeroTelefone = from.replace('@c.us', '');
            // Buscar histórico do banco antes de montar o prompt
            const { data: historicoDB } = await buscarHistoricoCliente(numeroTelefone, 20);
            
            // Montar histórico estruturado para o cérebro
            const historicoEstruturado = (historicoDB || []).flatMap((item: any) => [
              { texto: item.mensagem_usuario, timestamp: item.data, autor: 'usuario' },
              item.resposta_ia ? { texto: item.resposta_ia, timestamp: item.data, autor: 'sistema' } : null
            ]).filter(Boolean);
            
            // Combinar histórico do banco com histórico em memória
            const historicoFinal = [
              ...historicoEstruturado.filter((msg: any) => msg !== null),
              ...(historicoPorUsuario[from] || [])
            ];
            
            // Buscar informações do lead para contexto
            const lead = await buscarLead(from);
            const clienteInfo = lead ? {
              nome: lead.metadata?.nome || 'Cliente',
              numero: lead.numero,
              status: lead.metadata?.status || 'lead_novo'
            } : undefined;
            
                         // Gera prompt usando o cérebro com a mensagem atual
             const resposta = await gerarPromptCerebro(historicoFinal, text, from);
             
             if (resposta) {
               // Verificar se a resposta indica erro do Google Calendar
               const googleCalendarError = resposta.toLowerCase().includes('erro_google_calendar') || 
                                          resposta.toLowerCase().includes('sistema de agendamento temporariamente indisponível') ||
                                          resposta.toLowerCase().includes('passará para atendente') ||
                                          resposta.toLowerCase().includes('atendente humano');
               
               // Adiciona resposta ao histórico em memória
               historicoPorUsuario[from].push({
                 texto: resposta,
                 timestamp: new Date().toISOString(),
                 autor: 'sistema',
               });

               // Extrair informações do cliente da conversa
               const informacoesCliente = await extrairInformacoesCliente(from, text, resposta);
               
               // Atualizar lead com informações extraídas
               if (informacoesCliente) {
                 await criarOuAtualizarLead(from, informacoesCliente);
               }

               // Salva resposta da IA no banco
               await salvarInteracaoHistorico({
                 cliente_id: from.replace('@c.us', ''),
                 mensagem_usuario: text,
                 resposta_ia: resposta,
                 data: new Date().toISOString(),
                 canal: 'whatsapp',
               });

               // Envia resposta via WhatsApp
               await instance.client.sendMessage(from, resposta);

               // Se houve erro do Google Calendar, marcar para SDR
               if (googleCalendarError) {
                 try {
                   const numeroCliente = from.replace('@c.us', '');
                   await atualizarStatusLead(numeroCliente, 'lead_avancado');
                   console.log('🚨 Conversa marcada para SDR devido a erro do Google Calendar');
                   
                   // Emitir evento para o frontend
                   if (socketIO) {
                     socketIO.emit('lead-status-changed', {
                       numero: numeroCliente,
                       status: 'lead_avancado',
                       motivo: 'Google Calendar Error',
                       instanceId,
                       number
                     });
                   }
                 } catch (error) {
                   console.error('❌ Erro ao marcar lead para SDR:', error);
                 }
               }

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
               
               console.log('✅ Resposta da IA enviada:', resposta);
             } else {
               console.error('❌ Erro: IA não retornou resposta válida');
             }
          } catch (error) {
            console.error('Erro ao processar timeout da mensagem:', error);
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

// Função para garantir que a tabela whatsapp_instances existe
async function ensureWhatsAppInstancesTable() {
  try {
    // Verificar se a tabela existe tentando fazer uma consulta
    const { error } = await supabase
      .from('whatsapp_instances')
      .select('count')
      .limit(1);

    if (error && error.code === '42P01') { // Tabela não existe
      console.log('📋 Criando tabela whatsapp_instances...');
      
      // Criar a tabela via SQL
      const { error: createError } = await supabase.rpc('create_whatsapp_instances_table');
      
      if (createError) {
        console.error('❌ Erro ao criar tabela whatsapp_instances:', createError);
      } else {
        console.log('✅ Tabela whatsapp_instances criada com sucesso');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar/criar tabela whatsapp_instances:', error);
  }
}

// Função para garantir que a tabela whatsapp_auth existe
async function ensureWhatsAppAuthTable() {
  try {
    // Verificar se a tabela existe tentando fazer uma consulta
    const { error } = await supabase
      .from('whatsapp_auth')
      .select('count')
      .limit(1);

    if (error && error.code === '42P01') { // Tabela não existe
      console.log('📋 Criando tabela whatsapp_auth...');
      
      // Criar a tabela via SQL
      const { error: createError } = await supabase.rpc('create_whatsapp_auth_table');
      
      if (createError) {
        console.error('❌ Erro ao criar tabela whatsapp_auth:', createError);
      } else {
        console.log('✅ Tabela whatsapp_auth criada com sucesso');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar/criar tabela whatsapp_auth:', error);
  }
}

export async function initializeWhatsApp(): Promise<void> {
  try {
    console.log('🚀 Inicializando WhatsApp Web JS...');
    
    // Garantir que as tabelas existem
    await ensureWhatsAppInstancesTable();
    await ensureWhatsAppAuthTable();
    
    // Buscar instâncias configuradas no banco
    const { data: instances, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('enabled', true);

    if (error) {
      console.error('❌ Erro ao buscar instâncias do WhatsApp:', error);
      return;
    }

    console.log(`📱 Encontradas ${instances?.length || 0} instâncias para inicializar`);

    // Inicializar cada instância
    for (const instance of instances || []) {
      try {
        console.log(`🚀 Inicializando instância ${instance.instance_id} (${instance.number})`);
        await startBot(instance.instance_id, instance.number);
      } catch (error) {
        console.error(`❌ Erro ao inicializar instância ${instance.instance_id}:`, error);
      }
    }

    console.log('✅ Inicialização do WhatsApp concluída');
  } catch (error) {
    console.error('❌ Erro na inicialização do WhatsApp:', error);
  }
} 