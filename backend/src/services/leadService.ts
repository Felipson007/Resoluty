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
  autor: 'usuario' | 'ai';
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
  autor: 'usuario' | 'ai',
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
      lead = await criarOuAtualizarLead(numero);
      console.log('📋 Novo lead criado:', lead);
    }

    if (!lead) {
      console.error('Não foi possível criar/buscar lead para salvar mensagem');
      return false;
    }

    // Salvar mensagem
    console.log('📋 Salvando mensagem no banco...');
    const { error } = await supabase
      .from('mensagens_leads')
      .insert({
        lead_id: lead.id,
        numero: numeroLimpo,
        mensagem,
        autor,
        instance_id: instanceId,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('📋 Erro ao salvar mensagem:', error);
      throw error;
    }

    console.log('📋 Mensagem salva com sucesso');

    // Atualizar última mensagem no metadata do lead
    console.log('📋 Atualizando metadata do lead...');
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
    return true;
  } catch (error) {
    console.error('Erro ao salvar mensagem do lead:', error);
    return false;
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