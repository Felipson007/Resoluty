import { salvarConversaWhatsApp, recuperarConversasCliente, listarContatosRecentes as listarContatosRecentesSupabase } from '../config/supabase';
import { SessionStatus } from '../types/conversa';

// Map para armazenar status das sessões em memória (para prototipação)
// Em produção, isso deveria estar no banco de dados
const sessionStatusMap = new Map<string, SessionStatus>();

export async function salvarInteracaoHistorico(interacao: any) {
  try {
    // Salvar conversa completa no Supabase
    if (interacao.mensagem_usuario || interacao.resposta_ia) {
      const textoCompleto = interacao.mensagem_usuario || interacao.resposta_ia;
      await salvarConversaWhatsApp(
        textoCompleto, 
        interacao.cliente_id,
        'sistema' // userId padrão para agora
      );
    }
  } catch (error) {
    console.error('Erro ao salvar interação no histórico:', error);
  }
}

export async function buscarHistoricoCliente(clienteId: string, limite: number = 10) {
  try {
    // Buscar conversas do Supabase
    const conversasSupabase = await recuperarConversasCliente(clienteId, 'sistema', limite);
    
    // Converter para formato esperado pelo frontend
    const mensagensFormatadas = conversasSupabase.map((conversa: any, index: number) => {
      const metadata = conversa.metadata || {};
      return {
        id: conversa.id || index.toString(),
        texto: conversa.conversation_text || conversa.texto || '',
        timestamp: conversa.created_at || new Date().toISOString(),
        autor: metadata.autor || 'sistema',
        contactId: clienteId
      };
    });

    return {
      data: mensagensFormatadas
    };
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return {
      data: []
    };
  }
}

export async function listarContatosRecentes(limite: number = 50) {
  try {
    const contatos = await listarContatosRecentesSupabase(limite);
    
    // Adicionar status das sessões aos contatos
    return contatos.map((contato: any) => ({
      clienteId: contato.clienteId,
      userId: contato.userId,
      lastMessageAt: contato.lastMessageAt,
      status: sessionStatusMap.get(contato.clienteId)?.status || 'bot'
    }));
  } catch (error) {
    console.error('Erro ao listar contatos:', error);
    return [];
  }
}

export function updateSessionStatus(contactId: string, status: 'bot' | 'humano' | 'aguardando' | 'finalizado', attendantId?: string) {
  sessionStatusMap.set(contactId, {
    contactId,
    status,
    attendantId,
    lastActivity: new Date().toISOString()
  });
}

export function getSessionStatus(contactId: string): SessionStatus | null {
  return sessionStatusMap.get(contactId) || null;
}

export function getAllSessionStatuses(): SessionStatus[] {
  return Array.from(sessionStatusMap.values());
}