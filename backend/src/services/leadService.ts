import { supabase } from '../config/supabase';
import logger from '../config/logger';

export type LeadStatus = 'lead_novo' | 'lead_avancado' | 'lead_sem_interesse';

export interface LeadMetadata {
  id: string;
  numero: string;
  status: LeadStatus;
  nome?: string;
  email?: string;
  tags?: string[];
  ultima_mensagem?: string;
  ultima_atividade?: string;
}

export interface Lead {
  id: string;
  numero: string;
  metadata: LeadMetadata;
  created_at: string;
  updated_at: string;
}

export interface MensagemLead {
  id: string;
  lead_id: string;
  numero: string;
  mensagem: string;
  autor: 'usuario' | 'sistema';
  timestamp: string;
  instance_id?: string;
  created_at: string;
}

// Criar ou atualizar lead
export async function criarOuAtualizarLead(numero: string, metadata?: Partial<LeadMetadata>): Promise<Lead | null> {
  try {
    const numeroLimpo = numero.replace('@s.whatsapp.net', '');
    console.log('📋 Criando/atualizando lead para número:', numero);
    console.log('📋 Número limpo:', numeroLimpo);
    console.log('📋 Metadata fornecida:', metadata);
    
    // Verificar se o lead já existe
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('numero', numeroLimpo)
      .maybeSingle();

    console.log('📋 Lead existente encontrado:', existingLead);

    if (existingLead) {
      // Atualizar lead existente
      console.log('📋 Atualizando lead existente');
      const { data, error } = await supabase
        .from('leads')
        .update({
          metadata: {
            ...existingLead.metadata,
            ...metadata,
            ultima_atividade: new Date().toISOString()
          }
        })
        .eq('numero', numeroLimpo)
        .select()
        .maybeSingle();

      if (error) {
        console.error('📋 Erro ao atualizar lead:', error);
        throw error;
      }
      console.log('📋 Lead atualizado:', data);
      return data;
    } else {
      // Criar novo lead
      console.log('📋 Criando novo lead');
      const novoMetadata: LeadMetadata = {
        id: crypto.randomUUID(),
        numero: numeroLimpo,
        status: 'lead_novo',
        tags: [`Numero ${numeroLimpo}`],
        ultima_atividade: new Date().toISOString(),
        ...metadata
      };

      console.log('📋 Novo metadata criado:', novoMetadata);

      const { data, error } = await supabase
        .from('leads')
        .insert({
          id: novoMetadata.id,
          numero: numeroLimpo,
          metadata: novoMetadata
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('📋 Erro ao criar lead:', error);
        throw error;
      }
      console.log('📋 Lead criado:', data);
      return data;
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar lead:', error);
    return null;
  }
}

// Atualizar status do lead
export async function atualizarStatusLead(numero: string, status: LeadStatus): Promise<boolean> {
  try {
    const numeroLimpo = numero.replace('@s.whatsapp.net', '');
    
    const { error } = await supabase
      .from('leads')
      .update({
        metadata: {
          status,
          ultima_atividade: new Date().toISOString()
        }
      })
      .eq('numero', numeroLimpo);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status do lead:', error);
    return false;
  }
}

// Buscar lead por número
export async function buscarLead(numero: string): Promise<Lead | null> {
  try {
    const numeroLimpo = numero.replace('@s.whatsapp.net', '');
    console.log('📋 Buscando lead para número:', numero);
    console.log('📋 Número limpo:', numeroLimpo);
    
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('numero', numeroLimpo)
      .maybeSingle();

    if (error) {
      logger.error(`Erro ao buscar lead: ${error.message}`);
      console.error('📋 Erro na consulta Supabase para buscarLead:', error);
      return null;
    }
    
    console.log('📋 Lead encontrado:', data);
    return data;
  } catch (error) {
    console.error('Erro ao buscar lead:', error);
    return null;
  }
}

// Listar todos os leads
export async function listarLeads(limite: number = 50) {
  try {
    console.log('📋 Função listarLeads chamada com limite:', limite);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) {
      logger.error(`Erro ao listar leads: ${error.message}`);
      console.error('📋 Erro na consulta Supabase:', error);
      return [];
    }

    console.log('📋 Dados brutos do Supabase:', data);
    console.log('📋 Número de leads retornados:', data?.length || 0);
    return data || [];
  } catch (error: any) {
    logger.error(`Erro ao listar leads: ${error.message}`);
    console.error('📋 Erro geral na listarLeads:', error);
    return [];
  }
}

// Buscar leads por status
export async function buscarLeadsPorStatus(status: LeadStatus): Promise<Lead[]> {
  try {
    console.log('📋 Função buscarLeadsPorStatus chamada com status:', status);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .contains('metadata', { status })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('📋 Erro na consulta Supabase por status:', error);
      throw error;
    }
    
    console.log('📋 Leads encontrados por status:', data?.length || 0);
    console.log('📋 Primeiros leads por status:', data?.slice(0, 3));
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar leads por status:', error);
    return [];
  }
}

// Salvar mensagem do lead
export async function salvarMensagemLead(
  numero: string, 
  mensagem: string, 
  autor: 'usuario' | 'sistema',
  instanceId?: string
): Promise<boolean> {
  try {
    const numeroLimpo = numero.replace('@s.whatsapp.net', '');
    console.log('📋 Salvando mensagem do lead');
    console.log('📋 Número:', numero);
    console.log('📋 Número limpo:', numeroLimpo);
    console.log('📋 Mensagem:', mensagem);
    console.log('📋 Autor:', autor);
    console.log('📋 InstanceId:', instanceId);
    
    // Buscar ou criar lead
    let lead = await buscarLead(numero);
    console.log('📋 Lead encontrado/criado:', lead);
    
    if (!lead) {
      console.log('📋 Lead não encontrado, criando novo...');
      try {
        lead = await criarOuAtualizarLead(numero);
        console.log('📋 Novo lead criado:', lead);
      } catch (leadError) {
        console.warn('⚠️ Erro ao criar lead (RLS), continuando sem salvar no banco:', leadError);
        // Continuar sem salvar no banco, mas não falhar o processo
        return true;
      }
    }

    if (!lead) {
      console.warn('⚠️ Não foi possível criar/buscar lead, continuando sem salvar no banco');
      return true; // Retornar true para não interromper o fluxo
    }

    // Salvar mensagem
    console.log('📋 Salvando mensagem no banco...');
    try {
      // Validar autor - a constraint só aceita 'usuario' e 'sistema'
      const autorValido = autor === 'usuario' ? 'usuario' : 'sistema';
      console.log('📋 Autor validado:', autorValido);
      
      const { error } = await supabase
        .from('mensagens_leads')
        .insert({
          lead_id: lead.id,
          numero: numeroLimpo,
          mensagem,
          autor: autorValido,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('📋 Erro ao salvar mensagem:', error);
        console.warn('⚠️ Continuando sem salvar no banco devido a erro de RLS');
        return true; // Retornar true para não interromper o fluxo
      }

      console.log('📋 Mensagem salva com sucesso');

      // Atualizar última mensagem no metadata do lead
      console.log('📋 Atualizando metadata do lead...');
      try {
        await supabase
          .from('leads')
          .update({
            metadata: {
              ...lead.metadata,
              ultima_mensagem: mensagem,
              ultima_atividade: new Date().toISOString()
            }
          })
          .eq('id', lead.id);
        console.log('📋 Metadata do lead atualizada');
      } catch (metadataError) {
        console.warn('⚠️ Erro ao atualizar metadata, mas mensagem foi salva:', metadataError);
      }

      return true;
    } catch (dbError) {
      console.error('📋 Erro ao salvar no banco:', dbError);
      console.warn('⚠️ Continuando sem salvar no banco devido a erro de RLS');
      return true; // Retornar true para não interromper o fluxo
    }
  } catch (error) {
    console.error('Erro ao salvar mensagem do lead:', error);
    console.warn('⚠️ Continuando sem salvar no banco');
    return true; // Retornar true para não interromper o fluxo
  }
}

// Buscar mensagens do lead
export async function buscarMensagensLead(numero: string, limite: number = 50) {
  try {
    const numeroLimpo = numero.replace('@s.whatsapp.net', '');
    
    const { data, error } = await supabase
      .from('mensagens_leads')
      .select('*')
      .eq('numero', numeroLimpo)
      .order('timestamp', { ascending: true })
      .limit(limite);

    if (error) {
      logger.error(`Erro ao buscar mensagens: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error: any) {
    logger.error(`Erro ao buscar mensagens: ${error.message}`);
    return [];
  }
} 

// Função para extrair informações do cliente das mensagens da IA
export async function extrairInformacoesCliente(numero: string, mensagemCliente: string, respostaIA: string): Promise<Partial<LeadMetadata> | null> {
  try {
    console.log('🔍 Extraindo informações do cliente...');
    console.log('🔍 Mensagem do cliente:', mensagemCliente);
    console.log('🔍 Resposta da IA:', respostaIA);
    
    const informacoes: Partial<LeadMetadata> = {};
    
    // Extrair nome do cliente
    // Padrões comuns para identificar nomes
    const padroesNome = [
      /meu nome é\s+([^\s,\.]+)/i,
      /sou\s+([^\s,\.]+)/i,
      /chamo\s+([^\s,\.]+)/i,
      /nome\s+([^\s,\.]+)/i,
      /sou\s+o\s+([^\s,\.]+)/i,
      /sou\s+a\s+([^\s,\.]+)/i
    ];
    
    // Procurar nome na mensagem do cliente
    for (const padrao of padroesNome) {
      const match = mensagemCliente.match(padrao);
      if (match && match[1]) {
        const nome = match[1].trim();
        if (nome.length > 2 && nome.length < 50) {
          informacoes.nome = nome;
          console.log('🔍 Nome extraído:', nome);
          break;
        }
      }
    }
    
    // Se não encontrou na mensagem do cliente, procurar na resposta da IA
    if (!informacoes.nome) {
      for (const padrao of padroesNome) {
        const match = respostaIA.match(padrao);
        if (match && match[1]) {
          const nome = match[1].trim();
          if (nome.length > 2 && nome.length < 50) {
            informacoes.nome = nome;
            console.log('🔍 Nome extraído da resposta da IA:', nome);
            break;
          }
        }
      }
    }
    
    // Extrair email se presente
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = mensagemCliente.match(emailRegex) || respostaIA.match(emailRegex);
    if (emailMatch) {
      informacoes.email = emailMatch[0];
      console.log('🔍 Email extraído:', emailMatch[0]);
    }
    
    // Se encontrou alguma informação, retornar
    if (Object.keys(informacoes).length > 0) {
      console.log('🔍 Informações extraídas:', informacoes);
      return informacoes;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erro ao extrair informações do cliente:', error);
    return null;
  }
} 