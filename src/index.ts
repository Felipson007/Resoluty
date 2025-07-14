import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import indexarConversaRouter from './routes/indexarConversa';
import consultarContextoRouter from './routes/consultarContexto';
import path from 'path';

// Configurações iniciais
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Rotas principais
app.use('/indexar-conversa', indexarConversaRouter);
app.use('/consultar-contexto', consultarContextoRouter);

// Health check
app.get('/health', (_, res) => res.send('OK'));

// Servir logs para debug (opcional)
app.use('/logs', express.static(path.join(__dirname, 'logs')));

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 