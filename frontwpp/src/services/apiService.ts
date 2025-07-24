import axios from 'axios';
import { Contact, Message } from '../components/WhatsAppDashboard';

const API_BASE_URL = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Interceptor para logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export class ApiService {
  // Buscar lista de contatos
  static async getContacts(): Promise<Contact[]> {
    try {
      const response = await api.get('/contacts');
      
      if (!response.data.ok || !response.data.data) {
        console.warn('Resposta inválida da API de contatos:', response.data);
        return [];
      }

      return response.data.data.map((contact: any) => {
        // Extrair número do telefone do ID do WhatsApp
        const phoneNumber = contact.clienteId?.replace('@s.whatsapp.net', '') || 'Desconhecido';
        const formattedPhone = phoneNumber.replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, '+$1 $2 $3-$4');
        
        return {
          id: contact.clienteId,
          name: phoneNumber.replace(/\D/g, '') || 'Contato',
          phone: formattedPhone,
          lastMessage: 'Última mensagem...',
          lastMessageTime: contact.lastMessageAt 
            ? new Date(contact.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : 'Agora',
          status: contact.status || 'bot',
          unreadCount: 0,
        } as Contact;
      });
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      return [];
    }
  }

  // Buscar mensagens de um contato
  static async getContactMessages(contactId: string, limit: number = 50): Promise<Message[]> {
    try {
      const response = await api.get(`/contacts/${encodeURIComponent(contactId)}/messages?limit=${limit}`);
      
      if (!response.data.ok || !response.data.data) {
        console.warn('Resposta inválida da API de mensagens:', response.data);
        return [];
      }

      return response.data.data.map((msg: any, index: number) => {
        // Determinar autor baseado nos dados disponíveis
        let autor: 'usuario' | 'sistema' = 'sistema';
        let texto = '';

        if (msg.mensagem_usuario) {
          autor = 'usuario';
          texto = msg.mensagem_usuario;
        } else if (msg.resposta_ia) {
          autor = 'sistema';
          texto = msg.resposta_ia;
        } else if (msg.texto) {
          texto = msg.texto;
          autor = msg.autor || 'sistema';
        } else if (msg.conversation_text) {
          texto = msg.conversation_text;
          // Tentar determinar autor pela metadata
          if (msg.metadata?.autor) {
            autor = msg.metadata.autor;
          }
        }

        return {
          id: msg.id || `${Date.now()}-${index}`,
          texto: texto || 'Mensagem sem conteúdo',
          timestamp: msg.data || msg.timestamp || msg.created_at || new Date().toISOString(),
          autor,
          contactId: contactId,
        } as Message;
      });
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  // Enviar mensagem para um contato
  static async sendMessage(contactId: string, message: string): Promise<boolean> {
    try {
      const response = await api.post(`/contacts/${encodeURIComponent(contactId)}/send`, {
        message: message,
      });
      
      return response.data.ok === true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }

  // Atualizar status de um contato
  static async updateContactStatus(
    contactId: string, 
    status: 'bot' | 'humano' | 'aguardando' | 'finalizado',
    attendantId: string = 'frontend-user'
  ): Promise<boolean> {
    try {
      const response = await api.post(`/contacts/${encodeURIComponent(contactId)}/status`, {
        status,
        attendantId,
      });
      
      return response.data.ok === true;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return false;
    }
  }

  // Buscar status de um contato
  static async getContactStatus(contactId: string): Promise<any> {
    try {
      const response = await api.get(`/contacts/${encodeURIComponent(contactId)}/status`);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      return null;
    }
  }

  // Buscar todos os status de sessões
  static async getAllSessionStatuses(): Promise<any[]> {
    try {
      const response = await api.get('/sessions/status');
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar status das sessões:', error);
      return [];
    }
  }

  // Verificar saúde do backend
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Backend não está respondendo:', error);
      return false;
    }
  }
}

export default ApiService; 