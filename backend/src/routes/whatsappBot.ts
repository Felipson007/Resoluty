import dotenv from 'dotenv';
dotenv.config();
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
// Adicione esta linha no topo do arquivo para ignorar o erro de tipagem do qrcode-terminal
// @ts-ignore
import qrcode from 'qrcode-terminal';
import axios from 'axios';
import { gerarPromptCerebro } from '../services/cerebroService';
import { Mensagem } from '../types/conversa';
import { salvarInteracaoHistorico, buscarHistoricoCliente } from '../services/historicoService';

let whatsappSocket: any = null;
let socketIO: any = null;

export function setSocketIO(io: any) {
  socketIO = io;
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!whatsappSocket) {
    console.error('WhatsApp socket não está conectado');
    return false;
  }
  
  try {
    await whatsappSocket.sendMessage(to, { text: message });
    
    // Salvar mensagem enviada no histórico
    await salvarInteracaoHistorico({
      cliente_id: to,
      mensagem_usuario: '',
      resposta_ia: message,
      data: new Date().toISOString(),
      canal: 'whatsapp',
    });
    
    // Emitir evento via Socket.IO para atualização em tempo real
    if (socketIO) {
      socketIO.emit('new-message', {
        contactId: to,
        message: {
          texto: message,
          timestamp: new Date().toISOString(),
          autor: 'sistema'
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
}

async function startBot(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    // printQRInTerminal: true, // Removido pois está depreciado
  });

  whatsappSocket = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { qr, connection } = update;
    if (qr) {
      console.clear(); // Limpa o terminal antes de exibir o novo QR
      qrcode.generate(qr, { small: true });
      console.log('Escaneie o QR Code acima para conectar o WhatsApp');
    }
    if (connection === 'close') {
      console.log('Conexão fechada. Reconectando...');
      startBot();
    }
  });

  // Mapa para acumular histórico estruturado por usuário
  const historicoPorUsuario: Record<string, Mensagem[]> = {};
  const timeoutsPorUsuario: Record<string, NodeJS.Timeout> = {};

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message?.conversation) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation;

    // Ignorar mensagens de grupos (terminam com '@g.us')
    if (from && from.endsWith('@g.us')) {
      console.log('Mensagem de grupo ignorada:', from, text);
      return;
    }

    console.log(`Mensagem recebida de ${from}: ${text}`);

    // Emitir evento via Socket.IO para nova mensagem recebida
    if (socketIO) {
      socketIO.emit('new-message', {
        contactId: from,
        message: {
          texto: text,
          timestamp: new Date().toISOString(),
          autor: 'usuario'
        }
      });
    }

    // Acumula histórico estruturado por usuário
    if (!historicoPorUsuario[from!]) historicoPorUsuario[from!] = [];
    historicoPorUsuario[from!].push({
      texto: text,
      timestamp: new Date().toISOString(),
      autor: 'usuario',
    });
    // Salva mensagem do usuário no banco
    await salvarInteracaoHistorico({
      cliente_id: from!,
      mensagem_usuario: text,
      resposta_ia: '',
      data: new Date().toISOString(),
      canal: 'whatsapp',
    });

    // Se já existe um timeout, limpa para reiniciar a contagem
    if (timeoutsPorUsuario[from!]) clearTimeout(timeoutsPorUsuario[from!]);

    // Inicia/reinicia o timeout de 15 segundos
    timeoutsPorUsuario[from!] = setTimeout(() => {
      (async () => {
        // Buscar histórico do banco antes de montar o prompt
        const { data: historicoDB } = await buscarHistoricoCliente(from!, 10);
        // Montar histórico estruturado para o cérebro
        const historicoEstruturado = (historicoDB || []).flatMap((item: any) => [
          { texto: item.mensagem_usuario, timestamp: item.data, autor: 'usuario' },
          item.resposta_ia ? { texto: item.resposta_ia, timestamp: item.data, autor: 'sistema' } : null
        ]).filter(Boolean);
        // Acrescenta mensagens não salvas ainda (caso existam)
        // Remove possíveis valores nulos do histórico estruturado antes de concatenar
        const historicoFinal = [
          ...historicoEstruturado.filter((msg): msg is Mensagem => msg !== null),
          ...(historicoPorUsuario[from!] || [])
        ];
        // Gera prompt usando o cérebro
        const promptCerebro = gerarPromptCerebro(historicoFinal);
        let resposta = 'Desculpe, não consegui responder.';
        try {
          console.log('Chamando IA em http://localhost:4000/webhook/ia com:', promptCerebro);
          const iaResp = await axios.post('http://localhost:4000/webhook/ia', { message: promptCerebro });
          console.log('Resposta recebida da IA:', iaResp.data);
          resposta = iaResp.data.resposta || resposta;
          // Adiciona resposta ao histórico em memória
          historicoPorUsuario[from!].push({
            texto: resposta,
            timestamp: new Date().toISOString(),
            autor: 'sistema',
          });
          // Salva resposta da IA no banco
          await salvarInteracaoHistorico({
            cliente_id: from!,
            mensagem_usuario: '',
            resposta_ia: resposta,
            data: new Date().toISOString(),
            canal: 'whatsapp',
          });
        } catch (e: any) {
          console.error('Erro ao chamar IA:', e.message);
        }
        await sock.sendMessage(from!, { text: resposta });
        
        // Emitir evento via Socket.IO para resposta do bot
        if (socketIO) {
          socketIO.emit('new-message', {
            contactId: from,
            message: {
              texto: resposta,
              timestamp: new Date().toISOString(),
              autor: 'sistema'
            }
          });
        }
        
        // Limpa o contexto textual após responder, mas mantém o histórico estruturado
        // Se quiser limpar tudo, use: historicoPorUsuario[from!] = [];
        delete timeoutsPorUsuario[from!];
      })();
    }, 15000); // 15 segundos
  });
}

startBot(); 