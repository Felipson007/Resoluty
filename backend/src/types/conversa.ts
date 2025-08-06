export interface Mensagem {
  id?: string;
  texto: string;
  timestamp: string; // ISO string
  autor: 'usuario' | 'ai';
}

export interface HistoricoConversa {
  clienteId: string;
  mensagens: Mensagem[];
  etapa?: string;
  tipo_interacao?: string;
}

export interface ConsultaContextoPayload {
  clienteId: string;
  mensagem: string;
  topK?: number;
}

export interface Contato {
  clienteId: string;
  userId?: string;
  lastMessageAt: string;
  status?: 'bot' | 'humano' | 'aguardando' | 'finalizado';
  nomeContato?: string;
  telefone?: string;
}

export interface SessionStatus {
  contactId: string;
  status: 'bot' | 'humano' | 'aguardando' | 'finalizado';
  attendantId?: string;
  lastActivity: string;
} 