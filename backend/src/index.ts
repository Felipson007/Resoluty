import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import webhookGHL from './routes/webhookGHL';
import { buscarHistoricoCliente } from './services/historicoService';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(webhookGHL);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Resoluty rodando!' });
});

// Google Sheets endpoint
app.get('/api/sheets/:sheetId/:tab', async (req, res) => {
  const { sheetId, tab } = req.params;
  try {
    // Caminho absoluto do arquivo de credenciais informado pelo usuário
    const keyPath = path.resolve(__dirname, './keyservice/deep-mile-466315-u4-1dec26cce0c6.json');
    if (!fs.existsSync(keyPath)) {
      return res.status(500).json({ error: 'Arquivo de credenciais do Google não encontrado.' });
    }
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: tab,
    });
    res.json(response.data.values || []);
  } catch (error: any) {
    console.error(error); // Para ver o erro detalhado no terminal
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de teste para Supabase
app.get('/api/test-supabase/:clienteId', async (req, res) => {
  const { clienteId } = req.params;
  try {
    const result = await buscarHistoricoCliente(clienteId, 5);
    res.json({ ok: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend Resoluty rodando na porta ${PORT}`);
}); 