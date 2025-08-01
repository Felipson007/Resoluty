// Configuração centralizada para URLs da API
export const API_CONFIG = {
  // URL base para chamadas internas da API
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://resoluty.onrender.com' 
    : 'http://localhost:4000',
  
  // URL para webhooks internos
  WEBHOOK_URL: process.env.NODE_ENV === 'production' 
    ? 'https://resoluty.onrender.com' 
    : 'http://localhost:4000',
  
  // Timeout para requisições
  TIMEOUT: 30000,
  
  // Headers padrão
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  }
};

// Função para obter URL completa do webhook
export function getWebhookUrl(endpoint: string): string {
  return `${API_CONFIG.WEBHOOK_URL}${endpoint}`;
}

// Função para fazer requisição para webhook interno
export async function callInternalWebhook(endpoint: string, data: any): Promise<any> {
  // Se o endpoint já começa com /webhook, usar diretamente
  const url = endpoint.startsWith('/webhook') 
    ? `${API_CONFIG.WEBHOOK_URL}${endpoint}`
    : `${API_CONFIG.WEBHOOK_URL}/webhook${endpoint}`;
    
  console.log(`🔗 Chamando webhook interno: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: API_CONFIG.DEFAULT_HEADERS,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Erro ao chamar webhook interno ${endpoint}:`, error);
    throw error;
  }
} 