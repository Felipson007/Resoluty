import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import axios from 'axios';

async function startBot() {
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

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message?.conversation) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation;

    console.log(`Mensagem recebida de ${from}: ${text}`);

    // Chama o endpoint de IA do backend
    let resposta = 'Desculpe, não consegui responder.';
    try {
      const iaResp = await axios.post('http://localhost:3000/webhook/ia', { message: text });
      resposta = iaResp.data.resposta || resposta;
    } catch (e: any) {
      console.error('Erro ao chamar IA:', e.message);
    }

    // Envia a resposta de volta
    await sock.sendMessage(from!, { text: resposta });
  });
}

startBot(); 