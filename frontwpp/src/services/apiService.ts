import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  timeout: 10000,
});

export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  avatar?: string;
  status: 'bot' | 'humano' | 'aguardando' | 'finalizado';
  unreadCount?: number;
}

export interface Message {
  id: string;
  texto: string;
  timestamp: string;
  autor: 'usuario' | 'sistema';
  contactId: string;
}

export class ApiService {
  // Buscar todos os contatos
  static async getContacts(): Promise<Contact[]> {
    try {
      const response = await api.get('/contacts');
      
      if (!response.data.ok || !response.data.data) {
        console.warn('Resposta inválida da API de contatos:', response.data);
        return [];
      }

      return response.data.data.map((contact: any) => ({
        id: contact.id,
        name: contact.name || `Cliente ${contact.phone}`,
        phone: contact.phone,
        lastMessage: contact.lastMessage || 'Última mensagem...',
        lastMessageTime: contact.lastMessageTime || 'Agora',
        status: contact.status || 'bot',
        unreadCount: contact.unreadCount || 0,
      }));
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      return [];
    }
  }

  // Buscar mensagens de um contato
  static async getContactMessages(contactId: string, limit: number = 50): Promise<Message[]> {
    try {
      // Primeiro tentar buscar do endpoint de leads
      const response = await api.get(`/leads/${encodeURIComponent(contactId)}/messages?limit=${limit}`);
      
      if (response.data.ok && response.data.data) {
        return response.data.data.map((msg: any) => ({
          id: msg.id || `msg-${Date.now()}`,
          texto: msg.mensagem,
          timestamp: msg.timestamp,
          autor: msg.autor === 'usuario' ? 'usuario' : 'sistema',
          contactId: contactId,
        }));
      }

      // Fallback para o endpoint antigo
      const fallbackResponse = await api.get(`/contacts/${encodeURIComponent(contactId)}/messages?limit=${limit}`);
      
      if (fallbackResponse.data.ok && fallbackResponse.data.data) {
        return fallbackResponse.data.data.map((msg: any) => ({
          id: msg.id || `msg-${Date.now()}`,
          texto: msg.texto || msg.mensagem,
          timestamp: msg.timestamp,
          autor: msg.autor === 'usuario' ? 'usuario' : 'sistema',
          contactId: contactId,
        }));
      }

      return [];
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  // Enviar mensagem para um contato
  static async sendMessage(contactId: string, message: string): Promise<boolean> {
    try {
      const response = await api.post(`/contacts/${encodeURIComponent(contactId)}/send`, {
        message,
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

  // Buscar todos os leads
  static async getLeads(): Promise<any[]> {
    try {
      const response = await api.get('/leads');
      
      if (!response.data.ok || !response.data.data) {
        console.warn('Resposta inválida da API de leads:', response.data);
        return [];
      }

      return response.data.data.map((lead: any) => ({
        id: `${lead.numero}@s.whatsapp.net`,
        name: `Cliente ${lead.numero}`,
        phone: lead.numero,
        lastMessage: 'Última mensagem...',
        lastMessageTime: lead.updated_at 
          ? new Date(lead.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : 'Agora',
        status: lead.metadata?.status === 'lead_novo' ? 'bot' : 
               lead.metadata?.status === 'lead_avancado' ? 'humano' : 
               lead.metadata?.status === 'lead_sem_interesse' ? 'finalizado' : 'bot',
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      return [];
    }
  }

  // Buscar lead específico
  static async getLead(numero: string): Promise<any> {
    try {
      const response = await api.get(`/leads/${encodeURIComponent(numero)}`);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar lead:', error);
      return null;
    }
  }

  // Atualizar status de um lead
  static async updateLeadStatus(numero: string, status: 'lead_novo' | 'lead_avancado' | 'lead_sem_interesse'): Promise<boolean> {
    try {
      const response = await api.put(`/api/leads/${encodeURIComponent(numero)}/status`, {
        status,
      });
      return response.data.ok === true;
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      return false;
    }
  }

  // Buscar leads por status
  static async getLeadsByStatus(status: 'lead_novo' | 'lead_avancado' | 'lead_sem_interesse'): Promise<any[]> {
    try {
      const response = await api.get(`/api/leads/status/${status}`);
      
      if (!response.data.ok || !response.data.data) {
        console.warn('Resposta inválida da API de leads por status:', response.data);
        return [];
      }

      return response.data.data.map((lead: any) => ({
        id: `${lead.numero}@s.whatsapp.net`,
        name: `Cliente ${lead.numero}`,
        phone: lead.numero,
        lastMessage: 'Última mensagem...',
        lastMessageTime: lead.updated_at 
          ? new Date(lead.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : 'Agora',
        status: lead.metadata?.status === 'lead_novo' ? 'bot' : 
               lead.metadata?.status === 'lead_avancado' ? 'humano' : 
               lead.metadata?.status === 'lead_sem_interesse' ? 'finalizado' : 'bot',
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Erro ao buscar leads por status:', error);
      return [];
    }
  }

  // Buscar instâncias WhatsApp
  static async getWhatsAppInstances(): Promise<any[]> {
    try {
      const response = await api.get('/api/whatsapp/instances');
      
      if (!response.data.ok || !response.data.data) {
        console.warn('Resposta inválida da API de instâncias:', response.data);
        return [];
      }

      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar instâncias WhatsApp:', error);
      return [];
    }
  }

  // Alternar modo SDR
  static async toggleSDRMode(contactId: string, instanceId: string): Promise<boolean> {
    try {
      const response = await api.post('/api/whatsapp/toggle-sdr', {
        contactId,
        instanceId
      });
      
      return response.data.ok === true;
    } catch (error) {
      console.error('Erro ao alternar modo SDR:', error);
      return false;
    }
  }

  // Configurar WhatsApp
  static async configureWhatsApp(instanceId: string, number: string, enabled: boolean): Promise<boolean> {
    try {
      const response = await api.post('/api/whatsapp/configure', {
        instanceId,
        number,
        enabled
      });
      
      return response.data.ok === true;
    } catch (error) {
      console.error('Erro ao configurar WhatsApp:', error);
      return false;
    }
  }

  // Remover WhatsApp
  static async removeWhatsApp(instanceId: string): Promise<boolean> {
    try {
      const response = await api.delete(`/api/whatsapp/${instanceId}`);
      
      return response.data.ok === true;
    } catch (error) {
      console.error('Erro ao remover WhatsApp:', error);
      return false;
    }
  }
} 