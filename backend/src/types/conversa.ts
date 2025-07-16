export interface Mensagem {
  id?: string;
  texto: string;
  timestamp: string; // ISO string
  autor: 'usuario' | 'sistema';
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