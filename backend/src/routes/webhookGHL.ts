import express from 'express';
import axios from 'axios';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Instância do modelo OpenAI/Assistant
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  ...(process.env.OPENAI_ASSISTANT_ID ? { assistantId: process.env.OPENAI_ASSISTANT_ID } : {}),
});

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
      const gptResponse = await model.invoke(text);
      const resposta = gptResponse.content || 'Desculpe, não consegui responder.';

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
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensagem não fornecida.' });
    const gptResponse = await model.invoke(message);
    const resposta = gptResponse.content || 'Desculpe, não consegui responder.';
    res.json({ resposta });
  } catch (error: any) {
    console.error('Erro no Webhook IA:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 