import express from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { 
  verificarDisponibilidade, 
  obterProximasDatasDisponiveis, 
  agendarReuniao,
  obterDisponibilidadeFormatada,
  configurarCredenciaisGoogle,
  listarContasConfiguradas,
  alterarStatusConta
} from '../services/googleCalendarService';
import { supabase } from '../config/supabase';

const router = express.Router();

// Rota para obter disponibilidade de uma data específica
router.get('/disponibilidade/:data', async (req, res) => {
  try {
    const { data } = req.params;
    
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ 
        error: 'Data inválida. Use formato YYYY-MM-DD' 
      });
    }

    const disponibilidade = await verificarDisponibilidade(data);
    
    res.json({
      data: data,
      disponibilidade: disponibilidade,
      totalSlots: disponibilidade.length,
      slotsDisponiveis: disponibilidade.filter(slot => slot.disponivel).length
    });
  } catch (error) {
    console.error('❌ Erro ao obter disponibilidade:', error);
    res.status(500).json({ 
      error: 'Erro ao obter disponibilidade',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para obter próximas datas disponíveis
router.get('/proximas-datas', async (req, res) => {
  try {
    const dias = parseInt(req.query.dias as string) || 7;
    
    if (dias < 1 || dias > 30) {
      return res.status(400).json({ 
        error: 'Número de dias deve estar entre 1 e 30' 
      });
    }

    const datasDisponiveis = await obterProximasDatasDisponiveis(dias);
    
    res.json({
      datasDisponiveis: datasDisponiveis,
      totalDatas: datasDisponiveis.length,
      periodoDias: dias
    });
  } catch (error) {
    console.error('❌ Erro ao obter próximas datas:', error);
    res.status(500).json({ 
      error: 'Erro ao obter próximas datas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para agendar reunião
router.post('/agendar', async (req, res) => {
  try {
    const { 
      atendenteId, 
      data, 
      hora, 
      duracao = 60, 
      titulo = 'Reunião Resoluty',
      descricao,
      clienteNome,
      clienteTelefone 
    } = req.body;

    // Validações
    if (!atendenteId || !data || !hora) {
      return res.status(400).json({ 
        error: 'atendenteId, data e hora são obrigatórios' 
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ 
        error: 'Data inválida. Use formato YYYY-MM-DD' 
      });
    }

    if (!/^\d{2}:\d{2}$/.test(hora)) {
      return res.status(400).json({ 
        error: 'Hora inválida. Use formato HH:MM' 
      });
    }

    // Verificar se o slot está disponível
    const disponibilidade = await verificarDisponibilidade(data);
    const slotDisponivel = disponibilidade.find(slot => 
      slot.atendenteId === atendenteId && 
      slot.horaInicio === hora && 
      slot.disponivel
    );

    if (!slotDisponivel) {
      return res.status(400).json({ 
        error: 'Horário não disponível para agendamento' 
      });
    }

    // Criar descrição da reunião
    const descricaoCompleta = `${descricao || 'Reunião agendada via WhatsApp'}\n\nCliente: ${clienteNome || 'Não informado'}\nTelefone: ${clienteTelefone || 'Não informado'}`;

    // Agendar reunião
    const sucesso = await agendarReuniao(
      atendenteId,
      data,
      hora,
      duracao,
      titulo,
      descricaoCompleta
    );

    if (sucesso) {
      res.json({
        success: true,
        message: 'Reunião agendada com sucesso',
        data: {
          atendenteId,
          data,
          hora,
          duracao,
          titulo
        }
      });
    } else {
      res.status(500).json({ 
        error: 'Erro ao agendar reunião' 
      });
    }
  } catch (error) {
    console.error('❌ Erro ao agendar reunião:', error);
    res.status(500).json({ 
      error: 'Erro ao agendar reunião',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para obter disponibilidade formatada para IA
router.get('/disponibilidade-formatada/:data', async (req, res) => {
  try {
    const { data } = req.params;
    
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ 
        error: 'Data inválida. Use formato YYYY-MM-DD' 
      });
    }

    const disponibilidadeFormatada = await obterDisponibilidadeFormatada(data);
    
    res.json({
      data: data,
      disponibilidadeFormatada: disponibilidadeFormatada
    });
  } catch (error) {
    console.error('❌ Erro ao obter disponibilidade formatada:', error);
    res.status(500).json({ 
      error: 'Erro ao obter disponibilidade formatada',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para listar todas as contas configuradas
router.get('/contas', async (req, res) => {
  try {
    const contas = await listarContasConfiguradas();
    
    res.json({
      contas: contas,
      totalContas: contas.length,
      contasAtivas: contas.filter(conta => conta.ativo).length
    });
  } catch (error) {
    console.error('❌ Erro ao listar contas:', error);
    res.status(500).json({ 
      error: 'Erro ao listar contas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para configurar credenciais do Google para uma conta específica
router.post('/configurar-credenciais', async (req, res) => {
  try {
    const { 
      contaId, 
      nomeConta, 
      emailConta, 
      accessToken, 
      refreshToken, 
      scope,
      calendarId,
      timezone,
      horarioInicio,
      horarioFim,
      diasTrabalho
    } = req.body;

    if (!contaId || !nomeConta || !emailConta || !accessToken || !refreshToken || !scope) {
      return res.status(400).json({ 
        error: 'contaId, nomeConta, emailConta, accessToken, refreshToken e scope são obrigatórios' 
      });
    }

    const sucesso = await configurarCredenciaisGoogle(
      contaId,
      nomeConta,
      emailConta,
      accessToken,
      refreshToken,
      scope,
      calendarId,
      timezone,
      horarioInicio,
      horarioFim,
      diasTrabalho
    );

    if (sucesso) {
      res.json({
        success: true,
        message: `Credenciais do Google Calendar configuradas com sucesso para ${nomeConta}`,
        contaId: contaId
      });
    } else {
      res.status(500).json({ 
        error: 'Erro ao configurar credenciais' 
      });
    }
  } catch (error) {
    console.error('❌ Erro ao configurar credenciais:', error);
    res.status(500).json({ 
      error: 'Erro ao configurar credenciais',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para alterar status de uma conta (ativar/desativar)
router.put('/contas/:contaId/status', async (req, res) => {
  try {
    const { contaId } = req.params;
    const { ativo } = req.body;

    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ 
        error: 'ativo deve ser um valor booleano' 
      });
    }

    const sucesso = await alterarStatusConta(contaId, ativo);

    if (sucesso) {
      res.json({
        success: true,
        message: `Status da conta ${contaId} alterado para ${ativo ? 'ativo' : 'inativo'}`,
        contaId: contaId,
        ativo: ativo
      });
    } else {
      res.status(500).json({ 
        error: 'Erro ao alterar status da conta' 
      });
    }
  } catch (error) {
    console.error('❌ Erro ao alterar status da conta:', error);
    res.status(500).json({ 
      error: 'Erro ao alterar status da conta',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para obter URL de autorização do Google para uma conta específica
router.get('/auth-url/:contaId', (req, res) => {
  try {
    const { contaId } = req.params;
    
    if (!contaId) {
      return res.status(400).json({ 
        error: 'contaId é obrigatório' 
      });
    }

    // Determinar qual CLIENT_ID e CLIENT_SECRET usar baseado na conta
    let clientId: string;
    let clientSecret: string;
    let redirectUri: string;

    // Abordagem 1: Uma aplicação OAuth para todas as contas (padrão)
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      clientId = process.env.GOOGLE_CLIENT_ID;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://resoluty.onrender.com/api/calendar/auth/callback';
    }
    // Abordagem 2: Múltiplas aplicações OAuth (opcional)
    else if (contaId === 'atendente1' && process.env.GOOGLE_CLIENT_ID_1 && process.env.GOOGLE_CLIENT_SECRET_1) {
      clientId = process.env.GOOGLE_CLIENT_ID_1;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET_1;
      redirectUri = process.env.GOOGLE_REDIRECT_URI_1 || 'https://resoluty.onrender.com/api/calendar/auth/callback';
    }
    else if (contaId === 'atendente2' && process.env.GOOGLE_CLIENT_ID_2 && process.env.GOOGLE_CLIENT_SECRET_2) {
      clientId = process.env.GOOGLE_CLIENT_ID_2;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET_2;
      redirectUri = process.env.GOOGLE_REDIRECT_URI_2 || 'https://resoluty.onrender.com/api/calendar/auth/callback';
    }
    else if (contaId === 'atendente3' && process.env.GOOGLE_CLIENT_ID_3 && process.env.GOOGLE_CLIENT_SECRET_3) {
      clientId = process.env.GOOGLE_CLIENT_ID_3;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET_3;
      redirectUri = process.env.GOOGLE_REDIRECT_URI_3 || 'https://resoluty.onrender.com/api/calendar/auth/callback';
    }
    else {
      return res.status(400).json({ 
        error: `Credenciais OAuth não configuradas para conta: ${contaId}` 
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: contaId // Incluir contaId no state para identificar qual conta está sendo autorizada
    });

    res.json({
      authUrl: authUrl,
      scopes: scopes,
      contaId: contaId
    });
  } catch (error) {
    console.error('❌ Erro ao gerar URL de autorização:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar URL de autorização',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para processar callback do Google OAuth
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ 
        error: 'Código de autorização não fornecido' 
      });
    }

    if (!state) {
      return res.status(400).json({ 
        error: 'State não fornecido (contaId)' 
      });
    }

    const contaId = state as string;

    // Determinar qual CLIENT_ID e CLIENT_SECRET usar baseado na conta
    let clientId: string;
    let clientSecret: string;
    let redirectUri: string;

    // Abordagem 1: Uma aplicação OAuth para todas as contas (padrão)
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      clientId = process.env.GOOGLE_CLIENT_ID;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://resoluty.onrender.com/api/calendar/auth/callback';
    }
    // Abordagem 2: Múltiplas aplicações OAuth (opcional)
    else if (contaId === 'atendente1' && process.env.GOOGLE_CLIENT_ID_1 && process.env.GOOGLE_CLIENT_SECRET_1) {
      clientId = process.env.GOOGLE_CLIENT_ID_1;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET_1;
      redirectUri = process.env.GOOGLE_REDIRECT_URI_1 || 'https://resoluty.onrender.com/api/calendar/auth/callback';
    }
    else if (contaId === 'atendente2' && process.env.GOOGLE_CLIENT_ID_2 && process.env.GOOGLE_CLIENT_SECRET_2) {
      clientId = process.env.GOOGLE_CLIENT_ID_2;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET_2;
      redirectUri = process.env.GOOGLE_REDIRECT_URI_2 || 'https://resoluty.onrender.com/api/calendar/auth/callback';
    }
    else if (contaId === 'atendente3' && process.env.GOOGLE_CLIENT_ID_3 && process.env.GOOGLE_CLIENT_SECRET_3) {
      clientId = process.env.GOOGLE_CLIENT_ID_3;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET_3;
      redirectUri = process.env.GOOGLE_REDIRECT_URI_3 || 'https://resoluty.onrender.com/api/calendar/auth/callback';
    }
    else {
      return res.status(400).json({ 
        error: `Credenciais OAuth não configuradas para conta: ${contaId}` 
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code as string);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return res.status(400).json({ 
        error: 'Tokens de acesso não obtidos' 
      });
    }

    // Buscar informações da conta no banco
    const { data: conta, error: contaError } = await supabase
      .from('google_credentials')
      .select('nome_conta, email_conta')
      .eq('conta_id', contaId)
      .single();

    if (contaError || !conta) {
      return res.status(400).json({ 
        error: 'Conta não encontrada' 
      });
    }

    // Salvar credenciais no banco
    const sucesso = await configurarCredenciaisGoogle(
      contaId,
      conta.nome_conta,
      conta.email_conta,
      tokens.access_token,
      tokens.refresh_token,
      'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
    );

    if (sucesso) {
      res.json({
        success: true,
        message: `Autorização do Google Calendar concluída com sucesso para ${conta.nome_conta}`,
        contaId: contaId
      });
    } else {
      res.status(500).json({ 
        error: 'Erro ao salvar credenciais' 
      });
    }
  } catch (error) {
    console.error('❌ Erro no callback de autorização:', error);
    res.status(500).json({ 
      error: 'Erro no callback de autorização',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para verificar status das credenciais
router.get('/status', async (req, res) => {
  try {
    const { data: contas, error } = await supabase
      .from('google_credentials')
      .select('conta_id, nome_conta, email_conta, ativo, updated_at')
      .eq('tipo', 'calendar')
      .order('nome_conta');

    if (error) {
      return res.json({
        configured: false,
        message: 'Erro ao verificar credenciais',
        contas: []
      });
    }

    const contasAtivas = contas.filter(conta => conta.ativo);
    const totalContas = contas.length;

    res.json({
      configured: totalContas > 0,
      message: `${contasAtivas.length} de ${totalContas} contas ativas`,
      contas: contas,
      totalContas: totalContas,
      contasAtivas: contasAtivas.length
    });
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar status',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
