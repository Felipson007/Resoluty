// Configuração da API
export const API_CONFIG = {
  // URL do backend - forçar uso da URL correta
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:4000',
  
  // Endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    LEADS: '/api/leads',
    LEAD_MESSAGES: '/api/leads/:numero/messages',
    LEAD_STATUS: '/api/leads/:numero/status',
    LEADS_BY_STATUS: '/api/leads/status/:status',
    WHATSAPP_INSTANCES: '/api/whatsapp/instances',
    WHATSAPP_TOGGLE_SDR: '/api/whatsapp/toggle-sdr',
    WHATSAPP_CONFIGURE: '/api/whatsapp/configure',
  }
};

// Log para debug
console.log('API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);