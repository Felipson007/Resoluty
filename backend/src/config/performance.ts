// Configurações de performance otimizadas
export const PERFORMANCE_CONFIG = {
  // Limites de memória
  MAX_MEMORY_USAGE: 0.8, // 80%
  MAX_HEAP_SIZE: 512 * 1024 * 1024, // 512MB
  MEMORY_CLEANUP_THRESHOLD: 0.7, // 70%
  
  // Intervalos de verificação
  STATUS_CHECK_INTERVAL: 120000, // 2 minutos
  MEMORY_CHECK_INTERVAL: 300000, // 5 minutos
  HEALTH_CHECK_INTERVAL: 600000, // 10 minutos
  CLEANUP_INTERVAL: 300000, // 5 minutos
  
  // Limites de instâncias
  MAX_WHATSAPP_INSTANCES: 3,
  MAX_CLIENTS: 100,
  MAX_CONCURRENT_REQUESTS: 50,
  
  // Timeouts
  REQUEST_TIMEOUT: 30000, // 30 segundos
  QR_EXPIRY_TIME: 60000, // 60 segundos
  CONNECTION_TIMEOUT: 10000, // 10 segundos
  
  // Reconexão
  MAX_RECONNECT_ATTEMPTS: 2,
  RECONNECT_DELAY: 5000, // 5 segundos
  MAX_RECONNECT_DELAY: 30000, // 30 segundos
  
  // Logs
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_PERFORMANCE_LOGS: false,
  MAX_LOG_ENTRIES: 100,
  
  // Cache
  CACHE_TTL: 300000, // 5 minutos
  MAX_CACHE_SIZE: 50,
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minuto
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Socket.IO
  SOCKET_PING_TIMEOUT: 60000,
  SOCKET_PING_INTERVAL: 25000,
  SOCKET_MAX_HTTP_BUFFER_SIZE: 1e6, // 1MB
  
  // Puppeteer (WhatsApp Web)
  PUPPETEER_ARGS: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--memory-pressure-off',
    '--max_old_space_size=128'
  ],
  
  // Garbage Collection
  GC_INTERVAL: 300000, // 5 minutos
  FORCE_GC_THRESHOLD: 0.85, // 85%
  
  // Database
  DB_QUERY_TIMEOUT: 10000, // 10 segundos
  DB_MAX_CONNECTIONS: 10,
  DB_CONNECTION_TIMEOUT: 5000, // 5 segundos
  
  // API
  API_RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // limite por IP
  },
  
  // Monitoring
  MONITORING_INTERVAL: 60000, // 1 minuto
  ALERT_THRESHOLDS: {
    memory: 0.8,
    cpu: 0.7,
    connections: 0.9
  }
};

// Função para verificar se o sistema está saudável
export function isSystemHealthy(): boolean {
  const memUsage = process.memoryUsage();
  const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
  
  return memUsagePercent < PERFORMANCE_CONFIG.MAX_MEMORY_USAGE;
}

// Função para obter métricas de performance
export function getPerformanceMetrics() {
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      usagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100
    },
    uptime: process.uptime(),
    cpu: process.cpuUsage(),
    isHealthy: isSystemHealthy()
  };
}

// Função para limpeza de memória otimizada
export function performMemoryCleanup() {
  try {
    // Forçar garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Limpar cache se necessário
    if ((global as any).cache) {
      const cacheSize = Object.keys((global as any).cache).length;
      if (cacheSize > PERFORMANCE_CONFIG.MAX_CACHE_SIZE) {
        const keys = Object.keys((global as any).cache);
        const keysToDelete = keys.slice(0, Math.floor(cacheSize * 0.3)); // Remover 30% mais antigas
        keysToDelete.forEach(key => delete (global as any).cache[key]);
      }
    }
    
    // Limpar logs antigos
    if ((global as any).logCache && (global as any).logCache.length > PERFORMANCE_CONFIG.MAX_LOG_ENTRIES) {
      (global as any).logCache = (global as any).logCache.slice(-PERFORMANCE_CONFIG.MAX_LOG_ENTRIES);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro na limpeza de memória:', error);
    return false;
  }
}

// Função para monitoramento contínuo
export function startPerformanceMonitoring() {
  setInterval(() => {
    const metrics = getPerformanceMetrics();
    
    if (PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_LOGS) {
      console.log('📊 Métricas de performance:', metrics);
    }
    
    // Verificar se precisa fazer limpeza
    if (metrics.memory.usagePercent > PERFORMANCE_CONFIG.MEMORY_CLEANUP_THRESHOLD * 100) {
      console.log(`⚠️ Alto uso de memória: ${metrics.memory.usagePercent.toFixed(2)}%`);
      performMemoryCleanup();
    }
    
    // Verificar se está saudável
    if (!metrics.isHealthy) {
      console.warn('🚨 Sistema não está saudável');
    }
  }, PERFORMANCE_CONFIG.MONITORING_INTERVAL);
}

// Função para obter configurações do Puppeteer
export function getPuppeteerConfig() {
  return {
    headless: true,
    args: PERFORMANCE_CONFIG.PUPPETEER_ARGS,
    timeout: PERFORMANCE_CONFIG.REQUEST_TIMEOUT
  };
}

// Função para obter configurações do Socket.IO
export function getSocketIOConfig() {
  return {
    cors: {
      origin: ['http://localhost:3000', 'https://resoluty-frontend.onrender.com', 'https://resoluty.onrender.com'],
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: PERFORMANCE_CONFIG.SOCKET_PING_TIMEOUT,
    pingInterval: PERFORMANCE_CONFIG.SOCKET_PING_INTERVAL,
    maxHttpBufferSize: PERFORMANCE_CONFIG.SOCKET_MAX_HTTP_BUFFER_SIZE
  };
}

export default PERFORMANCE_CONFIG; 