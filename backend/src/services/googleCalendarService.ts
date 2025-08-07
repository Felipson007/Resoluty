import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '../config/supabase';

// Interface para configurações dos atendentes
interface Atendente {
  conta_id: string;
  nome_conta: string;
  email_conta: string;
  calendar_id: string;
  timezone: string;
  horario_inicio: string; // "09:00"
  horario_fim: string;    // "18:00"
  dias_trabalho: number[]; // [1,2,3,4,5] (segunda a sexta)
  ativo: boolean;
}

// Interface para slot de disponibilidade
interface SlotDisponibilidade {
  atendenteId: string;
  atendenteNome: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  disponivel: boolean;
}

// Cache de disponibilidade (5 minutos)
const disponibilidadeCache: { [key: string]: { data: SlotDisponibilidade[], timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para obter todos os atendentes ativos do banco
async function obterAtendentesAtivos(): Promise<Atendente[]> {
  try {
    const { data: atendentes, error } = await supabase
      .from('google_credentials')
      .select('*')
      .eq('tipo', 'calendar')
      .eq('ativo', true);

    if (error) {
      console.error('❌ Erro ao buscar atendentes:', error);
      return [];
    }

    return atendentes.map(atendente => ({
      conta_id: atendente.conta_id,
      nome_conta: atendente.nome_conta,
      email_conta: atendente.email_conta,
      calendar_id: atendente.calendar_id || 'primary',
      timezone: atendente.timezone || 'America/Sao_Paulo',
      horario_inicio: atendente.horario_inicio || '09:00',
      horario_fim: atendente.horario_fim || '18:00',
      dias_trabalho: atendente.dias_trabalho || [1, 2, 3, 4, 5],
      ativo: atendente.ativo
    }));
  } catch (error) {
    console.error('❌ Erro ao obter atendentes:', error);
    return [];
  }
}

// Função para obter credenciais do Google para uma conta específica
async function getGoogleAuth(contaId: string): Promise<OAuth2Client> {
  try {
    // Buscar credenciais do banco para a conta específica
    const { data: credentials, error } = await supabase
      .from('google_credentials')
      .select('*')
      .eq('conta_id', contaId)
      .eq('tipo', 'calendar')
      .eq('ativo', true)
      .single();

    if (error || !credentials) {
      throw new Error(`Credenciais do Google Calendar não encontradas para conta: ${contaId}`);
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
      throw new Error(`Credenciais OAuth não configuradas para conta: ${contaId}`);
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      scope: credentials.scope
    });

    return oauth2Client;
  } catch (error) {
    console.error(`❌ Erro ao obter credenciais do Google para ${contaId}:`, error);
    throw error;
  }
}

// Função para verificar disponibilidade de um atendente
async function verificarDisponibilidadeAtendente(
  atendente: Atendente,
  data: string,
  oauth2Client: OAuth2Client
): Promise<SlotDisponibilidade[]> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Converter data para início e fim do dia
    const dataInicio = new Date(data);
    dataInicio.setHours(0, 0, 0, 0);
    
    const dataFim = new Date(data);
    dataFim.setHours(23, 59, 59, 999);

    // Verificar se é um dia de trabalho
    const diaSemana = dataInicio.getDay(); // 0 = domingo, 1 = segunda, etc.
    if (!atendente.dias_trabalho.includes(diaSemana)) {
      console.log(`📅 ${atendente.nome_conta} não trabalha no dia ${data}`);
      return [];
    }

    // Buscar eventos do calendário
    const response = await calendar.events.list({
      calendarId: atendente.calendar_id,
      timeMin: dataInicio.toISOString(),
      timeMax: dataFim.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const eventos = response.data.items || [];
    
    // Gerar slots de 1 hora
    const slots: SlotDisponibilidade[] = [];
    const [horaInicio, minutoInicio] = atendente.horario_inicio.split(':').map(Number);
    const [horaFim, minutoFim] = atendente.horario_fim.split(':').map(Number);
    
    for (let hora = horaInicio; hora < horaFim; hora++) {
      const slotInicio = new Date(data);
      slotInicio.setHours(hora, 0, 0, 0);
      
      const slotFim = new Date(data);
      slotFim.setHours(hora + 1, 0, 0, 0);
      
      // Verificar se há conflito com eventos
      const conflito = eventos.some(evento => {
        const eventoInicio = new Date(evento.start?.dateTime || evento.start?.date || '');
        const eventoFim = new Date(evento.end?.dateTime || evento.end?.date || '');
        
        return eventoInicio < slotFim && eventoFim > slotInicio;
      });
      
      slots.push({
        atendenteId: atendente.conta_id,
        atendenteNome: atendente.nome_conta,
        data: data,
        horaInicio: `${hora.toString().padStart(2, '0')}:00`,
        horaFim: `${(hora + 1).toString().padStart(2, '0')}:00`,
        disponivel: !conflito
      });
    }
    
    return slots;
  } catch (error) {
    console.error(`❌ Erro ao verificar disponibilidade de ${atendente.nome_conta}:`, error);
    return [];
  }
}

// Função principal para verificar disponibilidade
export async function verificarDisponibilidade(data: string): Promise<SlotDisponibilidade[]> {
  try {
    // Verificar cache
    const cacheKey = `disponibilidade_${data}`;
    const cached = disponibilidadeCache[cacheKey];
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('📅 Usando cache de disponibilidade');
      return cached.data;
    }

    console.log(`📅 Verificando disponibilidade para ${data}`);
    
    // Obter todos os atendentes ativos
    const atendentes = await obterAtendentesAtivos();
    
    if (atendentes.length === 0) {
      console.log('⚠️ Nenhum atendente ativo encontrado');
      return [];
    }
    
    const slotsDisponibilidade: SlotDisponibilidade[] = [];
    
    // Verificar disponibilidade de todos os atendentes
    for (const atendente of atendentes) {
      try {
        const oauth2Client = await getGoogleAuth(atendente.conta_id);
        const slots = await verificarDisponibilidadeAtendente(atendente, data, oauth2Client);
        slotsDisponibilidade.push(...slots);
      } catch (error) {
        console.error(`❌ Erro ao verificar disponibilidade de ${atendente.nome_conta}:`, error);
        // Continue com outros atendentes mesmo se um falhar
      }
    }
    
    // Salvar no cache
    disponibilidadeCache[cacheKey] = {
      data: slotsDisponibilidade,
      timestamp: Date.now()
    };
    
    console.log(`✅ Disponibilidade verificada: ${slotsDisponibilidade.length} slots de ${atendentes.length} atendentes`);
    return slotsDisponibilidade;
    
  } catch (error) {
    console.error('❌ Erro ao verificar disponibilidade:', error);
    return [];
  }
}

// Função para obter próximas datas disponíveis
export async function obterProximasDatasDisponiveis(dias: number = 7): Promise<string[]> {
  try {
    const datasDisponiveis: string[] = [];
    const hoje = new Date();
    
    for (let i = 0; i < dias; i++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() + i);
      
      const dataStr = data.toISOString().split('T')[0];
      const disponibilidade = await verificarDisponibilidade(dataStr);
      
      // Verificar se há pelo menos um slot disponível
      const temDisponibilidade = disponibilidade.some(slot => slot.disponivel);
      
      if (temDisponibilidade) {
        datasDisponiveis.push(dataStr);
      }
    }
    
    return datasDisponiveis;
  } catch (error) {
    console.error('❌ Erro ao obter próximas datas disponíveis:', error);
    return [];
  }
}

// Função para agendar reunião
export async function agendarReuniao(
  atendenteId: string,
  data: string,
  hora: string,
  duracao: number = 60,
  titulo: string = 'Reunião Resoluty',
  descricao?: string
): Promise<boolean> {
  try {
    // Buscar informações do atendente no banco
    const { data: atendente, error } = await supabase
      .from('google_credentials')
      .select('*')
      .eq('conta_id', atendenteId)
      .eq('tipo', 'calendar')
      .eq('ativo', true)
      .single();

    if (error || !atendente) {
      throw new Error('Atendente não encontrado ou inativo');
    }
    
    const oauth2Client = await getGoogleAuth(atendenteId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Criar evento
    const [horaInicio, minutoInicio] = hora.split(':').map(Number);
    const dataInicio = new Date(data);
    dataInicio.setHours(horaInicio, minutoInicio, 0, 0);
    
    const dataFim = new Date(dataInicio);
    dataFim.setMinutes(dataFim.getMinutes() + duracao);
    
    const evento = {
      summary: titulo,
      description: descricao || 'Reunião agendada via Resoluty',
      start: {
        dateTime: dataInicio.toISOString(),
        timeZone: atendente.timezone || 'America/Sao_Paulo'
      },
      end: {
        dateTime: dataFim.toISOString(),
        timeZone: atendente.timezone || 'America/Sao_Paulo'
      }
    };
    
    const response = await calendar.events.insert({
      calendarId: atendente.calendar_id || 'primary',
      requestBody: evento
    });
    
    console.log(`✅ Reunião agendada para ${atendente.nome_conta}: ${response.data.htmlLink}`);
    
    // Limpar cache para esta data
    const cacheKey = `disponibilidade_${data}`;
    delete disponibilidadeCache[cacheKey];
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao agendar reunião:', error);
    return false;
  }
}

// Função para obter informações de disponibilidade formatadas para IA
export async function obterDisponibilidadeFormatada(data: string): Promise<string> {
  try {
    const disponibilidade = await verificarDisponibilidade(data);
    
    if (disponibilidade.length === 0) {
      return `Não há informações de disponibilidade para ${data}`;
    }
    
    // Agrupar por atendente
    const porAtendente: { [key: string]: SlotDisponibilidade[] } = {};
    disponibilidade.forEach(slot => {
      if (!porAtendente[slot.atendenteId]) {
        porAtendente[slot.atendenteId] = [];
      }
      porAtendente[slot.atendenteId].push(slot);
    });
    
    let resultado = `Disponibilidade para ${data}:\n\n`;
    
    Object.values(porAtendente).forEach(slots => {
      if (slots.length > 0) {
        const atendente = slots[0];
        const slotsDisponiveis = slots.filter(s => s.disponivel);
        
        resultado += `${atendente.atendenteNome}:\n`;
        
        if (slotsDisponiveis.length > 0) {
          slotsDisponiveis.forEach(slot => {
            resultado += `  - ${slot.horaInicio} às ${slot.horaFim}\n`;
          });
        } else {
          resultado += `  - Nenhum horário disponível\n`;
        }
        resultado += '\n';
      }
    });
    
    return resultado;
  } catch (error) {
    console.error('❌ Erro ao formatar disponibilidade:', error);
    return 'Erro ao obter informações de disponibilidade';
  }
}

// Função para configurar credenciais do Google para uma conta específica
export async function configurarCredenciaisGoogle(
  contaId: string,
  nomeConta: string,
  emailConta: string,
  accessToken: string,
  refreshToken: string,
  scope: string,
  calendarId?: string,
  timezone?: string,
  horarioInicio?: string,
  horarioFim?: string,
  diasTrabalho?: number[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('google_credentials')
      .upsert({
        conta_id: contaId,
        nome_conta: nomeConta,
        email_conta: emailConta,
        tipo: 'calendar',
        access_token: accessToken,
        refresh_token: refreshToken,
        scope: scope,
        calendar_id: calendarId || 'primary',
        timezone: timezone || 'America/Sao_Paulo',
        horario_inicio: horarioInicio || '09:00',
        horario_fim: horarioFim || '18:00',
        dias_trabalho: diasTrabalho || [1, 2, 3, 4, 5],
        ativo: true,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Erro ao salvar credenciais:', error);
      return false;
    }

    console.log(`✅ Credenciais do Google Calendar configuradas para ${nomeConta}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao configurar credenciais:', error);
    return false;
  }
}

// Função para listar todas as contas configuradas
export async function listarContasConfiguradas(): Promise<Atendente[]> {
  try {
    const { data: contas, error } = await supabase
      .from('google_credentials')
      .select('*')
      .eq('tipo', 'calendar')
      .order('nome_conta');

    if (error) {
      console.error('❌ Erro ao listar contas:', error);
      return [];
    }

    return contas.map(conta => ({
      conta_id: conta.conta_id,
      nome_conta: conta.nome_conta,
      email_conta: conta.email_conta,
      calendar_id: conta.calendar_id || 'primary',
      timezone: conta.timezone || 'America/Sao_Paulo',
      horario_inicio: conta.horario_inicio || '09:00',
      horario_fim: conta.horario_fim || '18:00',
      dias_trabalho: conta.dias_trabalho || [1, 2, 3, 4, 5],
      ativo: conta.ativo
    }));
  } catch (error) {
    console.error('❌ Erro ao listar contas configuradas:', error);
    return [];
  }
}

// Função para ativar/desativar uma conta
export async function alterarStatusConta(contaId: string, ativo: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('google_credentials')
      .update({ ativo, updated_at: new Date().toISOString() })
      .eq('conta_id', contaId);

    if (error) {
      console.error('❌ Erro ao alterar status da conta:', error);
      return false;
    }

    console.log(`✅ Status da conta ${contaId} alterado para ${ativo ? 'ativo' : 'inativo'}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao alterar status da conta:', error);
    return false;
  }
}
