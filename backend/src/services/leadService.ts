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
    
    // Verificar se o lead já existe
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('numero', numeroLimpo)
      .single();

    if (existingLead) {
      // Atualizar lead existente
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
        .single();

      if (error) throw error;
      return data;
    } else {
      // Criar novo lead
      const novoMetadata: LeadMetadata = {
        id: crypto.randomUUID(),
        numero: numeroLimpo,
        status: 'lead_novo',
        tags: [`Numero ${numeroLimpo}`],
        ultima_atividade: new Date().toISOString(),
        ...metadata
      };

      const { data, error } = await supabase
        .from('leads')
        .insert({
          numero: numeroLimpo,
          metadata: novoMetadata
        })
        .select()
        .single();

      if (error) throw error;
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
    
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('numero', numeroLimpo)
      .single();

    if (error) {
      logger.error(`Erro ao buscar lead: ${error.message}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar lead:', error);
    return null;
  }
}

// Listar todos os leads
export async function listarLeads(limite: number = 50) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) {
      logger.error(`Erro ao listar leads: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error: any) {
    logger.error(`Erro ao listar leads: ${error.message}`);
    return [];
  }
}

// Buscar leads por status
export async function buscarLeadsPorStatus(status: LeadStatus): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .contains('metadata', { status })
      .order('updated_at', { ascending: false });

    if (error) throw error;
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
    
    // Buscar ou criar lead
    let lead = await buscarLead(numero);
    if (!lead) {
      lead = await criarOuAtualizarLead(numero);
    }

    if (!lead) {
      console.error('Não foi possível criar/buscar lead para salvar mensagem');
      return false;
    }

    // Salvar mensagem
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

    if (error) throw error;

    // Atualizar última mensagem no metadata do lead
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