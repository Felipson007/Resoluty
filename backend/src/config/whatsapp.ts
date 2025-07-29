// Configuração para escolher entre Baileys e WhatsApp Web JS
export const WHATSAPP_ENGINE = process.env.WHATSAPP_ENGINE || 'baileys'; // 'baileys' ou 'whatsapp-web-js'

// Configurações específicas para cada engine
export const WHATSAPP_CONFIG = {
  baileys: {
    enabled: WHATSAPP_ENGINE === 'baileys',
    maxInstances: 4,
    qrTimeout: 45000, // 45 segundos
    reconnectDelay: 3000, // 3 segundos
  },
  'whatsapp-web-js': {
    enabled: WHATSAPP_ENGINE === 'whatsapp-web-js',
    maxInstances: 4,
    qrTimeout: 45000, // 45 segundos
    puppeteerArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  }
};

// Função para verificar qual engine está ativa
export function getActiveEngine() {
  return WHATSAPP_ENGINE;
}

// Função para verificar se o Baileys está ativo
export function isBaileysActive() {
  return WHATSAPP_ENGINE === 'baileys';
}

// Função para verificar se o WhatsApp Web JS está ativo
export function isWhatsAppWebJSActive() {
  return WHATSAPP_ENGINE === 'whatsapp-web-js';
} 