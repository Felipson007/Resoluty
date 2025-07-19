import express from 'express';
import axios from 'axios';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Instância do modelo OpenAI
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4-1106-preview',
});

// Recebe Webhook do GHL
router.post('/webhook/ghl', async (req, res) => {
  try {
    const { message, contactId, conversationId } = req.body;
    if (!message || !contactId) {
      return res.status(400).json({ error: 'Dados insuficientes.' });
    }

    // Envia mensagem ao ChatGPT
    const gptResponse = await model.invoke(message);
    const resposta = gptResponse.content || 'Desculpe, não consegui responder.';

    // Envia resposta ao WhatsApp via GHL API
    const ghlApiUrl = `${process.env.GHL_API_BASE}/conversations/messages`; // Exemplo de endpoint
    const ghlToken = process.env.GHL_API_KEY;
    await axios.post(
      ghlApiUrl,
      {
        contactId,
        conversationId,
        message: resposta,
        channel: 'whatsapp',
      },
      {
        headers: {
          Authorization: `Bearer ${ghlToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ success: true, resposta });
  } catch (error: any) {
    console.error('Erro no Webhook GHL:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 