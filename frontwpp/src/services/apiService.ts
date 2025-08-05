import { API_BASE_URL } from '../config/api';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro na requisição API:', error);
      throw error;
    }
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.request('/health');
      return response.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  // WhatsApp Instances
  async getWhatsAppInstances(): Promise<any[]> {
    try {
      const response = await this.request('/api/whatsapp/instances');
      return response.instances || [];
    } catch (error) {
      console.error('❌ Erro ao buscar instâncias WhatsApp:', error);
      return [];
    }
  }

  async addWhatsAppInstance(instanceId: string, number: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.request('/api/whatsapp/add', {
        method: 'POST',
        body: JSON.stringify({ instanceId, number }),
      });
      return response;
    } catch (error) {
      console.error('❌ Erro ao adicionar instância WhatsApp:', error);
      return { success: false, error: 'Erro ao adicionar instância' };
    }
  }

  async removeWhatsAppInstance(instanceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.request(`/api/whatsapp/instances/${instanceId}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('❌ Erro ao remover instância WhatsApp:', error);
      return { success: false, error: 'Erro ao remover instância' };
    }
  }

  async requestQRCode(instanceId: string, number: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.request('/api/whatsapp/request-qr', {
        method: 'POST',
        body: JSON.stringify({ instanceId, number }),
      });
      return response;
    } catch (error) {
      console.error('❌ Erro ao solicitar QR Code:', error);
      return { success: false, error: 'Erro ao solicitar QR Code' };
    }
  }

  // Leads
  async getLeads(): Promise<any[]> {
    try {
      const response = await this.request('/api/leads');
      return response || [];
    } catch (error) {
      console.error('❌ Erro ao buscar leads:', error);
      return [];
    }
  }

  async getLeadsByStatus(status: string): Promise<any[]> {
    try {
      const response = await this.request(`/api/leads/status/${status}`);
      return response || [];
    } catch (error) {
      console.error('❌ Erro ao buscar leads por status:', error);
      return [];
    }
  }

  async updateLeadStatus(numero: string, status: string): Promise<boolean> {
    try {
      const response = await this.request(`/api/leads/${numero}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      return response.success;
    } catch (error) {
      console.error('❌ Erro ao atualizar status do lead:', error);
      return false;
    }
  }

  // Conversations
  async getConversations(): Promise<any[]> {
    try {
      const response = await this.request('/api/conversations');
      return response || [];
    } catch (error) {
      console.error('❌ Erro ao buscar conversas:', error);
      return [];
    }
  }

  async getContactMessages(contactId: string): Promise<any[]> {
    try {
      const response = await this.request(`/api/conversations/${contactId}/messages`);
      return response || [];
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens do contato:', error);
      return [];
    }
  }

  // Send message
  async sendMessage(to: string, message: string, instanceId?: string): Promise<boolean> {
    try {
      const body: any = { to, message };
      if (instanceId) {
        body.instanceId = instanceId;
      }

      const response = await this.request('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return response.success;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  // AI Control
  async toggleAI(): Promise<boolean> {
    try {
      const response = await this.request('/api/ai/toggle', {
        method: 'POST',
      });
      return response.active;
    } catch (error) {
      console.error('❌ Erro ao alternar IA:', error);
      return false;
    }
  }

  // Test endpoints
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request('/api/test');
      return response.success;
    } catch (error) {
      return false;
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      const response = await this.request('/health');
      return response;
    } catch (error) {
      console.error('❌ Erro ao obter saúde do sistema:', error);
      return null;
    }
  }
}

export default new ApiService(); 