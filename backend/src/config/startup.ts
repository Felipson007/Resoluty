import { EventEmitter } from 'events';

// Configurações de inicialização
export const STARTUP_CONFIG = {
  // Delays em milissegundos
  INITIAL_DELAY: 5000,
  STATUS_CHECK_INTERVAL: 60000, // Aumentado para 1 minuto
  HEALTH_CHECK_INTERVAL: 120000, // Aumentado para 2 minutos
  RECONNECT_DELAY: 10000,
  
  // Tentativas de reconexão
  MAX_RECONNECT_ATTEMPTS: 3,
  
  // Timeouts
  WHATSAPP_INIT_TIMEOUT: 60000,
  HEALTH_CHECK_TIMEOUT: 10000,
  
  // Configurações de log
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development'
};

// Event emitter para controle de inicialização
export const startupEvents = new EventEmitter();

// Estados de inicialização
export enum StartupState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

let currentState = StartupState.INITIALIZING;

export function setStartupState(state: StartupState) {
  currentState = state;
  startupEvents.emit('stateChange', state);
  
  if (STARTUP_CONFIG.ENABLE_DEBUG_LOGS) {
    console.log(`🚀 Estado de inicialização mudou para: ${state}`);
  }
}

export function getStartupState(): StartupState {
  return currentState;
}

// Função para aguardar inicialização
export function waitForReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (currentState === StartupState.READY) {
      resolve();
      return;
    }
    
    const timeout = setTimeout(() => {
      startupEvents.removeAllListeners('stateChange');
      reject(new Error('Timeout aguardando inicialização'));
    }, STARTUP_CONFIG.WHATSAPP_INIT_TIMEOUT);
    
    startupEvents.once('stateChange', (state: StartupState) => {
      clearTimeout(timeout);
      if (state === StartupState.READY) {
        resolve();
      } else if (state === StartupState.ERROR) {
        reject(new Error('Erro durante inicialização'));
      }
    });
  });
}

// Função para verificar se o sistema está saudável
export function isSystemHealthy(): boolean {
  return currentState === StartupState.READY;
}

// Função para reinicializar o sistema
export function restartSystem(): void {
  setStartupState(StartupState.INITIALIZING);
  startupEvents.emit('restart');
}

// Configurações de monitoramento otimizadas para baixo uso de memória
export const MONITORING_CONFIG = {
  STATUS_CHECK_INTERVAL: 120000, // Aumentado para 2 minutos
  HEALTH_CHECK_INTERVAL: 300000, // Aumentado para 5 minutos
  ENABLE_PERFORMANCE_LOGS: false, // Desabilitado para economizar memória
  ENABLE_CONNECTION_LOGS: false, // Desabilitado para economizar memória
  MAX_MEMORY_USAGE: 0.5, // Reduzido para 50%
  MAX_CPU_USAGE: 0.7, // Reduzido para 70%
  MAX_CONNECTION_ATTEMPTS: 2, // Reduzido para 2 tentativas
  MEMORY_CLEANUP_INTERVAL: 120000, // 2 minutos
  LOG_CLEANUP_INTERVAL: 300000, // 5 minutos
  MAX_LOG_ENTRIES: 50 // Reduzido para 50 logs
};

// Cache para logs (limitado)
let logCache: string[] = [];
let lastMemoryCheck = 0;
const MEMORY_CHECK_INTERVAL = 300000; // 5 minutos

// Função para monitorar recursos do sistema (otimizada)
export function monitorSystemResources() {
  try {
    const memUsage = process.memoryUsage();
    const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    
    if (MONITORING_CONFIG.ENABLE_PERFORMANCE_LOGS) {
      console.log(`📊 Uso de memória: ${(memUsagePercent * 100).toFixed(2)}%`);
    }
    
    // Se o uso de memória estiver alto, fazer limpeza agressiva
    if (memUsagePercent > MONITORING_CONFIG.MAX_MEMORY_USAGE) {
      console.log(`⚠️ Uso de memória alto: ${(memUsagePercent * 100).toFixed(2)}%`);
      aggressiveMemoryCleanup();
      
      // Se ainda estiver alto após limpeza, reiniciar
      const newMemUsage = process.memoryUsage();
      const newMemUsagePercent = newMemUsage.heapUsed / newMemUsage.heapTotal;
      
      if (newMemUsagePercent > MONITORING_CONFIG.MAX_MEMORY_USAGE) {
        console.log(`🚨 Memória ainda alta após limpeza: ${(newMemUsagePercent * 100).toFixed(2)}%`);
        console.log('🔄 Reiniciando sistema devido ao alto uso de memória...');
        restartSystem();
      }
    }
  } catch (error) {
    console.error('❌ Erro no monitoramento de recursos:', error);
  }
}

// Função para limpar logs antigos
export function cleanupLogs(): void {
  if (logCache.length > MONITORING_CONFIG.MAX_LOG_ENTRIES) {
    logCache = logCache.slice(-MONITORING_CONFIG.MAX_LOG_ENTRIES);
  }
}

// Função para adicionar log com controle de memória
export function addLog(message: string): void {
  logCache.push(`${new Date().toISOString()}: ${message}`);
  cleanupLogs();
}

// Inicializar monitoramento com intervalos maiores
setInterval(monitorSystemResources, MONITORING_CONFIG.MEMORY_CLEANUP_INTERVAL);
setInterval(cleanupLogs, MONITORING_CONFIG.LOG_CLEANUP_INTERVAL); 

// Função para limpeza agressiva de memória
export function aggressiveMemoryCleanup() {
  try {
    // Forçar garbage collection
    if (global.gc) {
      global.gc();
      console.log('🗑️ Garbage collection forçado (agressivo)');
    }
    
    // Limpar logs antigos
    cleanupLogs();
    
    // Limpar cache de conversas antigas
    if ((global as any).conversationCache) {
      const cacheSize = Object.keys((global as any).conversationCache).length;
      if (cacheSize > 20) {
        const keys = Object.keys((global as any).conversationCache);
        const keysToDelete = keys.slice(0, Math.floor(cacheSize * 0.5)); // Remover 50% mais antigas
        keysToDelete.forEach(key => delete (global as any).conversationCache[key]);
        console.log(`🗑️ Cache de conversas limpo: ${cacheSize} -> ${Object.keys((global as any).conversationCache).length}`);
      }
    }
    
    // Limpar variáveis não utilizadas
    if ((global as any).whatsappInstances) {
      const instanceCount = Object.keys((global as any).whatsappInstances).length;
      if (instanceCount > 5) {
        console.log(`🗑️ Instâncias WhatsApp ativas: ${instanceCount}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na limpeza agressiva de memória:', error);
  }
}

// Monitoramento de recursos com limpeza agressiva 