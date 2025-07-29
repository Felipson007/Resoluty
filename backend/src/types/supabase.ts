// Tipos para o Supabase
export interface Database {
  public: {
    Tables: {
      memoria_vetorial: {
        Row: {
          id: number;
          cliente_id: string;
          chunk: string;
          embedding: number[];
          metadata: any;
          data: string;
        };
        Insert: {
          id?: number;
          cliente_id: string;
          chunk: string;
          embedding: number[];
          metadata?: any;
          data?: string;
        };
        Update: {
          id?: number;
          cliente_id?: string;
          chunk?: string;
          embedding?: number[];
          metadata?: any;
          data?: string;
        };
      };
      feedback_ia: {
        Row: {
          id: number;
          cliente_id: string;
          mensagem_usuario: string;
          resposta_ia: string;
          feedback: 'positivo' | 'negativo';
          comentario?: string;
          data: string;
        };
        Insert: {
          id?: number;
          cliente_id: string;
          mensagem_usuario: string;
          resposta_ia: string;
          feedback: 'positivo' | 'negativo';
          comentario?: string;
          data?: string;
        };
        Update: {
          id?: number;
          cliente_id?: string;
          mensagem_usuario?: string;
          resposta_ia?: string;
          feedback?: 'positivo' | 'negativo';
          comentario?: string;
          data?: string;
        };
      };
    };
    Functions: {
      match_memoria_vetorial: {
        Args: {
          query_embedding: number[];
          match_count: number;
          cliente_id: string;
        };
        Returns: {
          id: number;
          cliente_id: string;
          chunk: string;
          embedding: number[];
          metadata: any;
          data: string;
        }[];
      };
    };
  };
}