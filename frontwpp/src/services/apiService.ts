import axios from 'axios';

const API_BASE_URL = 'https://resoluty.onrender.com';

class ApiService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('❌ Erro no health check:', error);
      return false;
    }
  }

  // WhatsApp status
  async getWhatsAppStatus() {
    try {
      const response = await this.api.get('/api/whatsapp/status');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar status do WhatsApp:', error);
      throw error;
    }
  }

  // WhatsApp instances
  async getWhatsAppInstances() {
    try {
      const response = await this.api.get('/api/whatsapp/instances');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar instâncias do WhatsApp:', error);
      return [];
    }
  }

  // Leads
  async getLeads() {
    try {
      console.log('📋 Buscando leads via API...');
      const response = await this.api.get('/api/leads');
      console.log('📋 Resposta da API de leads:', response.data);
      console.log('📋 Número de leads recebidos:', response.data.length);
      
      const leads = response.data.map((lead: any) => {
        console.log('📋 Lead bruto:', lead);
        const contact = {
          id: lead.numero,
          name: `Cliente ${lead.numero}`,
          phone: lead.numero,
          lastMessage: 'Nenhuma mensagem',
          lastMessageTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          status: lead.metadata?.status === 'lead_novo' ? 'bot' : 
                 lead.metadata?.status === 'lead_avancado' ? 'humano' : 
                 lead.metadata?.status === 'lead_sem_interesse' ? 'finalizado' : 'bot',
          unreadCount: 0
        };
        console.log('📋 Lead convertido:', contact);
        return contact;
      });
      
      console.log('📋 Total de leads convertidos:', leads.length);
      return leads;
    } catch (error) {
      console.error('❌ Erro ao buscar leads:', error);
      return [];
    }
  }

  // Get leads by status
  async getLeadsByStatus(status: string) {
    try {
      const response = await this.api.get(`/api/leads/status/${status}`);
      return response.data.map((lead: any) => ({
        id: lead.numero,
        name: `Cliente ${lead.numero}`,
        phone: lead.numero,
        lastMessage: 'Nenhuma mensagem',
        lastMessageTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: lead.metadata?.status === 'lead_novo' ? 'bot' : 
               lead.metadata?.status === 'lead_avancado' ? 'humano' : 
               lead.metadata?.status === 'lead_sem_interesse' ? 'finalizado' : 'bot',
        unreadCount: 0
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar leads por status:', error);
      return [];
    }
  }

  // Update lead status
  async updateLeadStatus(numero: string, status: string) {
    try {
      // Remover @c.us se presente para o endpoint de leads
      const cleanNumero = numero.replace('@c.us', '');
      
      const response = await this.api.put(`/api/leads/${cleanNumero}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar status do lead:', error);
      return false;
    }
  }

  // Get contact messages
  async getContactMessages(contactId: string) {
    try {
      // Garantir que o contactId tenha o formato correto para WhatsApp
      const formattedContactId = contactId.includes('@c.us') ? contactId : `${contactId}@c.us`;
      
      const response = await this.api.get(`/api/conversations/${formattedContactId}/messages`);
      return response.data.map((msg: any) => ({
        id: msg.id,
        texto: msg.texto || msg.body || 'Mensagem sem texto',
        timestamp: msg.timestamp,
        autor: msg.autor || (msg.isFromMe ? 'sistema' : 'usuario'),
        contactId: contactId
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens do contato:', error);
      return [];
    }
  }

  // Send message
  async sendMessage(contactId: string, message: string) {
    try {
      // Garantir que o contactId tenha o formato correto para WhatsApp
      const formattedContactId = contactId.includes('@c.us') ? contactId : `${contactId}@c.us`;
      
      const response = await this.api.post('/api/whatsapp/send', {
        to: formattedContactId,
        message: message
      });
      return response.data.success;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  // Test connection
  async testConnection() {
    try {
      const response = await this.api.get('/api/test');
      return response.data;
    } catch (error) {
      console.error('❌ Erro no teste de conexão:', error);
      throw error;
    }
  }

  // Toggle SDR mode
  async toggleSdr(contactId: string, instanceId: string) {
    try {
      const response = await this.api.post('/api/whatsapp/toggle-sdr', {
        contactId,
        instanceId
      });
      return response.data.success;
    } catch (error) {
      console.error('❌ Erro ao alternar modo SDR:', error);
      return false;
    }
  }

  // Remove WhatsApp instance
  async removeWhatsApp(instanceId: string) {
    try {
      const response = await this.api.delete(`/api/whatsapp/instances/${instanceId}`);
      return response.data.success;
    } catch (error) {
      console.error('❌ Erro ao remover WhatsApp:', error);
      return false;
    }
  }

  // Configure WhatsApp instance
  async configureWhatsApp(instanceId: string, number: string, enabled: boolean) {
    try {
      const response = await this.api.post(`/api/whatsapp/instances/${instanceId}`, {
        number,
        enabled
      });
      return response.data.success;
    } catch (error) {
      console.error('❌ Erro ao configurar WhatsApp:', error);
      return false;
    }
  }
}

export default new ApiService(); 