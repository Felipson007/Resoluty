import { Client, LocalAuth } from 'whatsapp-web.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { gerarPromptCerebro } from './services/cerebroService';
import { buscarLead } from './services/leadService';
import { supabase } from './config/supabase';
import fs from 'fs';
import path from 'path';
const qrcode = require('qrcode-terminal');

dotenv.config();

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// WhatsApp Client
let whatsappClient: Client | null = null;
let isAIActive = true;
let socketIO: any = null;
let isInitializing = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 10000; // 10 segundos

// Histórico de mensagens (limitado para economizar memória)
const messageHistory: { [key: string]: any[] } = {};
const MAX_HISTORY_PER_CHAT = 50; // Limitar histórico por chat
const MAX_TOTAL_CHATS = 20; // Limitar número total de chats

// Controle de debounce para IA por número
const aiReplyTimeouts: { [key: string]: NodeJS.Timeout } = {};

// Função para configurar Socket.IO
export function setSocketIO(io: any) {
  socketIO = io;
}

// Funções para persistência da sessão WhatsApp
async function salvarSessaoWhatsApp() {
  try {
    const authPath = './.wwebjs_auth';
    if (fs.existsSync(authPath)) {
      const authData = fs.readdirSync(authPath);
      const sessionData = [];
      
      for (const file of authData) {
        const filePath = path.join(authPath, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            const content = fs.readFileSync(filePath).toString('base64');
            sessionData.push({
              filename: file,
              content: content
            });
          }
        } catch (fileError) {
          console.log(`⚠️ Ignorando arquivo/diretório: ${file}`);
        }
      }
      
      if (sessionData.length > 0) {
        // Salvar no Supabase
        await supabase.from('whatsapp_sessions').upsert({
          id: 'resoluty-ai',
          session_data: sessionData,
          updated_at: new Date().toISOString()
        });
        
        console.log(`💾 Sessão WhatsApp salva no banco (${sessionData.length} arquivos)`);
      } else {
        console.log('⚠️ Nenhum arquivo de sessão encontrado para salvar');
      }
    } else {
      console.log('⚠️ Diretório de autenticação não encontrado');
    }
  } catch (error) {
    console.error('❌ Erro ao salvar sessão WhatsApp:', error);
  }
}

async function carregarSessaoWhatsApp() {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', 'resoluty-ai')
      .single();
    
    if (data && data.session_data) {
      const authPath = './.wwebjs_auth';
      
      // Criar diretório se não existir
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
      }
      
      // Restaurar arquivos da sessão
      data.session_data.forEach((file: any) => {
        const filePath = path.join(authPath, file.filename);
        const content = Buffer.from(file.content, 'base64');
        fs.writeFileSync(filePath, content);
      });
      
      console.log('📱 Sessão WhatsApp carregada do banco');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao carregar sessão WhatsApp:', error);
  }
  return false;
}

// Função para limpar histórico antigo
function cleanupMessageHistory() {
  const chatIds = Object.keys(messageHistory);
  
  // Se exceder o limite de chats, remover os mais antigos
  if (chatIds.length > MAX_TOTAL_CHATS) {
    const chatsToRemove = chatIds.slice(0, chatIds.length - MAX_TOTAL_CHATS);
    chatsToRemove.forEach(chatId => {
      delete messageHistory[chatId];
      delete aiReplyTimeouts[chatId];
    });
    console.log(`🧹 Limpeza: ${chatsToRemove.length} chats removidos do histórico`);
  }
  
  // Limitar histórico por chat
  chatIds.forEach(chatId => {
    if (messageHistory[chatId].length > MAX_HISTORY_PER_CHAT) {
      messageHistory[chatId] = messageHistory[chatId].slice(-MAX_HISTORY_PER_CHAT);
    }
  });
}

// Limpeza automática a cada 10 minutos
setInterval(cleanupMessageHistory, 600000);

// Inicializar WhatsApp
async function initializeWhatsApp() {
  // Evitar inicializações simultâneas
  if (isInitializing) {
    console.log('🚀 Inicialização já em andamento, ignorando...');
    return;
  }
  
  // Verificar se já existe uma instância ativa
  if (whatsappClient && whatsappClient.info) {
    console.log('📱 WhatsApp já está conectado, mantendo conexão existente');
    return;
  }
  
  isInitializing = true;
  console.log('🚀 Iniciando WhatsApp Service...');
  
  try {
    // Tentar carregar sessão salva
    await carregarSessaoWhatsApp();
    
    whatsappClient = new Client({
      authStrategy: new LocalAuth({ 
        clientId: 'resoluty-ai',
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security'
        ]
      }
    });

    whatsappClient.on('qr', (qr) => {
      console.log('📱 QR Code disponível - escaneie no WhatsApp');
      qrcode.generate(qr, { small: true }); // Mostra QR no terminal
      if (socketIO) {
        socketIO.emit('qr', { qr });
        console.log('📱 QR Code emitido para frontend');
      }
    });

    whatsappClient.on('loading_screen', (percent, message) => {
      console.log('📱 Carregando WhatsApp:', percent, message);
    });

    whatsappClient.on('authenticated', () => {
      console.log('🔐 WhatsApp autenticado!');
      
      // Emitir status atualizado
      if (socketIO) {
        const status = getWhatsAppStatus();
        socketIO.emit('whatsapp-status', status);
        console.log('📱 Status atualizado após autenticação:', status);
      }
    });

    whatsappClient.on('ready', () => {
      console.log('✅ WhatsApp conectado!');
      
      // Salvar sessão após estar pronto
      setTimeout(() => {
        salvarSessaoWhatsApp();
      }, 2000);
      
      // Emitir status atualizado
      if (socketIO) {
        const status = getWhatsAppStatus();
        socketIO.emit('whatsapp-status', status);
        console.log('📱 Status atualizado após conexão:', status);
      }
    });

    whatsappClient.on('auth_failure', (msg) => {
      console.log('❌ Falha na autenticação WhatsApp:', msg);
    });

    whatsappClient.on('logout', () => {
      console.log('🚪 WhatsApp logout realizado');
    });

    whatsappClient.on('change_state', (state) => {
      console.log('🔄 Estado do WhatsApp mudou:', state);
    });

    // Processar mensagens
    whatsappClient.on('message', async (msg) => {
      console.log(`📨 Nova mensagem recebida de ${msg.from}: ${msg.body}`);
      
      const message = {
        id: msg.id._serialized,
        from: msg.from,
        body: msg.body,
        timestamp: new Date().toISOString(),
        isFromMe: false
      };

      // Salvar no histórico (limitado)
      if (!messageHistory[msg.from]) {
        messageHistory[msg.from] = [];
      }
      messageHistory[msg.from].push(message);
      
      // Limitar histórico por chat
      if (messageHistory[msg.from].length > MAX_HISTORY_PER_CHAT) {
        messageHistory[msg.from] = messageHistory[msg.from].slice(-MAX_HISTORY_PER_CHAT);
      }

      console.log(`💾 Mensagem salva no histórico. Total para ${msg.from}: ${messageHistory[msg.from].length}`);

      // Buscar dados do lead do banco
      const numeroCliente = msg.from.replace('@c.us', '');
      let leadData = null;
      try {
        leadData = await buscarLead(numeroCliente);
      } catch (error) {
        console.log('Lead não encontrado, será criado automaticamente');
      }

      // Salvar no Supabase
      try {
        await supabase.from('mensagens_leads').insert({
          mensagem: msg.body,
          autor: 'usuario',
          numero: msg.from,
          timestamp: message.timestamp
        });
        console.log('✅ Mensagem salva no Supabase');
      } catch (error) {
        console.error('❌ Erro ao salvar mensagem no Supabase:', error);
      }

      // IA responder automaticamente (com debounce de 30s) - apenas se status permitir
      if (isAIActive && !msg.fromMe) {
        // Verificar status do lead antes de responder
        const numeroCliente = msg.from.replace('@c.us', '');
        const lead = await buscarLead(numeroCliente);
        
        // Só responder se o lead não existir (novo) ou se o status for 'lead_novo'
        const podeResponder = !lead || lead.metadata.status === 'lead_novo';
        
        if (podeResponder) {
          if (aiReplyTimeouts[msg.from]) {
            clearTimeout(aiReplyTimeouts[msg.from]);
          }
          aiReplyTimeouts[msg.from] = setTimeout(async () => {
            await handleAIAutoReply(msg);
            delete aiReplyTimeouts[msg.from];
          }, 30000);
        } else {
          console.log(`🤖 IA não responderá para ${numeroCliente} - status: ${lead.metadata.status}`);
        }
      }
    });

    // Mensagens enviadas
    whatsappClient.on('message_create', async (msg) => {
      if (msg.fromMe) {
        console.log(`📤 Mensagem enviada para ${msg.to}: ${msg.body}`);
        
        const message = {
          id: msg.id._serialized,
          from: msg.to,
          body: msg.body,
          timestamp: new Date().toISOString(),
          isFromMe: true
        };

        if (!messageHistory[msg.to]) {
          messageHistory[msg.to] = [];
        }
        messageHistory[msg.to].push(message);
        
        // Limitar histórico por chat
        if (messageHistory[msg.to].length > MAX_HISTORY_PER_CHAT) {
          messageHistory[msg.to] = messageHistory[msg.to].slice(-MAX_HISTORY_PER_CHAT);
        }

        console.log(`💾 Mensagem enviada salva no histórico. Total para ${msg.to}: ${messageHistory[msg.to].length}`);

        // Salvar no Supabase
        try {
          await supabase.from('mensagens_leads').insert({
            mensagem: msg.body,
            autor: 'sistema',
            numero: msg.to,
            timestamp: message.timestamp
          });
          console.log('✅ Mensagem enviada salva no Supabase');
        } catch (error) {
          console.error('❌ Erro ao salvar mensagem enviada no Supabase:', error);
        }
      }
    });

    try {
      await whatsappClient.initialize();
      reconnectAttempts = 0; // Reset contador de tentativas
    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp:', error);
      handleReconnect();
    }
  } catch (error) {
    console.error('❌ Erro na configuração do WhatsApp:', error);
    handleReconnect();
  } finally {
    isInitializing = false;
  }
}

// Função para lidar com reconexão
function handleReconnect() {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(`🔄 Tentativa de reconexão ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} em ${RECONNECT_DELAY/1000} segundos...`);
    
    setTimeout(() => {
      initializeWhatsApp();
    }, RECONNECT_DELAY);
  } else {
    console.log('❌ Máximo de tentativas de reconexão atingido. Aguardando intervenção manual.');
  }
}

// IA responder automaticamente usando OpenAI Assistant com cérebro
async function handleAIAutoReply(msg: any) {
  try {
    console.log('🤖 IA processando mensagem...');

    const conversationHistory = messageHistory[msg.from] || [];
    
    // Converter histórico para formato do cérebro
    const historicoFormatado = conversationHistory.map(m => ({
      texto: m.body,
      autor: m.isFromMe ? 'sistema' as const : 'usuario' as const,
      timestamp: m.timestamp
    }));

    // Informações do cliente (extrair do número)
    const numeroCliente = msg.from.replace('@c.us', '');
    const clienteInfo = {
      numero: numeroCliente,
      nome: `Cliente ${numeroCliente}`,
      status: 'ativo'
    };

    // Gerar prompt usando o cérebro
    const promptCerebro = gerarPromptCerebro(
      historicoFormatado,
      clienteInfo,
      msg.body
    );

    console.log('🧠 Prompt gerado pelo cérebro:', promptCerebro.substring(0, 200) + '...');

    // Criar um novo thread para cada conversa
    const thread = await openai.beta.threads.create();
    
    // Adicionar mensagem ao thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: promptCerebro
    });

    // Executar o assistente
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!
    });

    // Aguardar conclusão
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'completed') {
      // Buscar a resposta
      const messages = await openai.beta.threads.messages.list(thread.id);
      const lastMessage = messages.data[0];
      
      if (lastMessage && lastMessage.content[0].type === 'text') {
        const aiResponse = lastMessage.content[0].text.value;
        console.log('🤖 Resposta da IA:', aiResponse);
        
        // Enviar resposta via WhatsApp
        await whatsappClient!.sendMessage(msg.from, aiResponse);
        
        // Salvar resposta no Supabase
        await supabase.from('mensagens_leads').insert({
          mensagem: aiResponse,
          autor: 'sistema',
          numero: msg.from,
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ Resposta da IA enviada e salva');
      }
    } else {
      console.error('❌ Erro na execução da IA:', runStatus.status);
    }
  } catch (error) {
    console.error('❌ Erro ao processar resposta da IA:', error);
  }
}

// Função para iniciar o serviço
export async function startWhatsAppService() {
  console.log('🚀 Iniciando WhatsApp Service...');
  await initializeWhatsApp();
}

// Função para parar o serviço
export async function stopWhatsAppService() {
  if (whatsappClient) {
    await whatsappClient.destroy();
    whatsappClient = null;
    console.log('🛑 WhatsApp Service parado');
  }
}

// Função para verificar status
export function getWhatsAppStatus() {
  const connected = whatsappClient && whatsappClient.info ? true : false;
  const number = whatsappClient?.info?.wid?.user || '';
  
  return {
    connected,
    number,
    aiActive: isAIActive
  };
}

// Função para alternar IA
export function toggleAI() {
  isAIActive = !isAIActive;
  console.log(`🤖 IA ${isAIActive ? 'ativada' : 'desativada'}`);
  return isAIActive;
}

// Função para enviar mensagem
export async function sendMessage(to: string, message: string) {
  if (!whatsappClient) {
    throw new Error('WhatsApp não está conectado');
  }
  
  try {
    await whatsappClient.sendMessage(to, message);
    console.log(`📤 Mensagem enviada para ${to}: ${message}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return false;
  }
}

// Função para verificar se o WhatsApp está saudável
function checkWhatsAppHealth() {
  if (!whatsappClient) {
    console.log('📱 WhatsApp não está inicializado');
    return false;
  }
  
  try {
    // Verificar se o cliente tem informações válidas
    if (!whatsappClient.info || !whatsappClient.info.wid) {
      console.log('📱 WhatsApp não está autenticado');
      return false;
    }
    
    // Verificar se o cliente está pronto
    if (!whatsappClient.pupPage || !whatsappClient.pupPage.url()) {
      console.log('📱 WhatsApp não está pronto');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('📱 Erro ao verificar saúde do WhatsApp:', error);
    return false;
  }
}

// Monitoramento de saúde periódico
setInterval(() => {
  if (!isInitializing && !checkWhatsAppHealth()) {
    console.log('📱 WhatsApp não está saudável, tentando reconectar...');
    handleReconnect();
  }
}, 60000); // Verificar a cada 1 minuto

// Iniciar o serviço se executado diretamente
if (require.main === module) {
  startWhatsAppService().catch(console.error);
} 