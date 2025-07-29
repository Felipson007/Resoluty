import express from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Instância do modelo OpenAI/Assistant
console.log('[IA] OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '***' : 'NÃO DEFINIDA');
console.log('[IA] OPENAI_ASSISTANT_ID:', process.env.OPENAI_ASSISTANT_ID);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function askAssistant(message: string) {
  // Cria um novo thread para cada conversa
  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: message,
  });
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: process.env.OPENAI_ASSISTANT_ID!,
  });

  // Poll até o run ser completado
  let runStatus = run.status;
  while (runStatus !== 'completed' && runStatus !== 'failed') {
    await new Promise((r) => setTimeout(r, 2000));
    const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    runStatus = updatedRun.status;
  }

  const messages = await openai.beta.threads.messages.list(thread.id);
  const lastMessage = messages.data.find((msg) => msg.role === 'assistant');
  // Busca o primeiro bloco de texto do conteúdo
  let resposta = 'Desculpe, não consegui responder.';
  if (lastMessage && Array.isArray(lastMessage.content)) {
    const textBlock = (lastMessage.content as any[]).find((c) => c.type === 'text' && c.text && typeof c.text.value === 'string');
    if (textBlock) {
      resposta = textBlock.text.value;
    }
  }
  return resposta;
}

// Webhook para receber mensagens do WhatsApp Business API (Meta)
router.post('/webhook/whatsapp', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    const from = message?.from; // número do usuário
    const text = message?.text?.body;

    if (from && text) {
      // Processa a mensagem com a IA
      const resposta = await askAssistant(text);

      // Envia a resposta de volta usando a API oficial do WhatsApp
      await axios.post(
        `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: from,
          text: { body: resposta }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error('Erro no Webhook WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para integração local com o bot Baileys
router.post('/webhook/ia', async (req, res) => {
  try {
    console.log('[IA] Body recebido:', req.body);
    const { message } = req.body;
    if (!message) {
      console.log('[IA] Nenhuma mensagem fornecida.');
      return res.status(400).json({ error: 'Mensagem não fornecida.' });
    }
    console.log('[IA] Chamando askAssistant com:', message);
    const resposta = await askAssistant(message);
    console.log('[IA] Resposta da IA:', resposta);
    res.json({ resposta });
  } catch (error: any) {
    console.error('[IA] Erro no Webhook IA:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 