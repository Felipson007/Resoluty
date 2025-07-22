import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
// Adicione esta linha no topo do arquivo para ignorar o erro de tipagem do qrcode-terminal
// @ts-ignore
import qrcode from 'qrcode-terminal';
import axios from 'axios';

async function startBot(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { qr, connection } = update;
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'close') {
      console.log('Conexão fechada. Reconectando...');
      startBot();
    }
  });

  // Mapa para acumular mensagens por usuário
  const mensagensPorUsuario: Record<string, string[]> = {};
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

    // Acumula mensagens por usuário
    if (!mensagensPorUsuario[from!]) mensagensPorUsuario[from!] = [];
    mensagensPorUsuario[from!].push(text);

    // Se já existe um timeout, limpa para reiniciar a contagem
    if (timeoutsPorUsuario[from!]) clearTimeout(timeoutsPorUsuario[from!]);

    // Inicia/reinicia o timeout de 30 segundos
    timeoutsPorUsuario[from!] = setTimeout(async () => {
      const contexto = mensagensPorUsuario[from!].join('\n');
      let resposta = 'Desculpe, não consegui responder.';
      try {
        console.log('Chamando IA em http://localhost:4000/webhook/ia com:', contexto);
        const iaResp = await axios.post('http://localhost:4000/webhook/ia', { message: contexto });
        console.log('Resposta recebida da IA:', iaResp.data);
        resposta = iaResp.data.resposta || resposta;
      } catch (e: any) {
        console.error('Erro ao chamar IA:', e.message);
      }
      await sock.sendMessage(from!, { text: resposta });
      // Limpa o contexto após responder
      mensagensPorUsuario[from!] = [];
      delete timeoutsPorUsuario[from!];
    }, 30000); // 30 segundos
  });
}

startBot(); 