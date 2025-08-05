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
  // Intervalos de verificação (aumentados para reduzir CPU)
  STATUS_CHECK_INTERVAL: 60000, // 1 minuto
  HEALTH_CHECK_INTERVAL: 120000, // 2 minutos
  
  // Configurações de log (reduzidas)
  ENABLE_PERFORMANCE_LOGS: false, // Desabilitado para economizar memória
  ENABLE_CONNECTION_LOGS: true,
  
  // Thresholds mais conservadores
  MAX_MEMORY_USAGE: 0.7, // Reduzido para 70%
  MAX_CPU_USAGE: 0.8, // Reduzido para 80%
  MAX_CONNECTION_ATTEMPTS: 3, // Reduzido para 3
  
  // Configurações de limpeza
  MEMORY_CLEANUP_INTERVAL: 300000, // 5 minutos
  LOG_CLEANUP_INTERVAL: 600000, // 10 minutos
  MAX_LOG_ENTRIES: 100 // Limitar logs em memória
};

// Cache para logs (limitado)
let logCache: string[] = [];
let lastMemoryCheck = 0;
const MEMORY_CHECK_INTERVAL = 300000; // 5 minutos

// Função para monitorar recursos do sistema (otimizada)
export function monitorSystemResources(): void {
  const now = Date.now();
  
  // Verificar apenas a cada 5 minutos para economizar recursos
  if (now - lastMemoryCheck < MEMORY_CHECK_INTERVAL) {
    return;
  }
  
  lastMemoryCheck = now;
  
  try {
    const usage = process.memoryUsage();
    const memoryUsagePercent = usage.heapUsed / usage.heapTotal;
    
    // Só alertar se realmente alto
    if (memoryUsagePercent > MONITORING_CONFIG.MAX_MEMORY_USAGE) {
      console.warn(`⚠️ Uso de memória alto: ${(memoryUsagePercent * 100).toFixed(2)}%`);
      
      // Forçar garbage collection se disponível
      if (global.gc) {
        global.gc();
        console.log('🗑️ Garbage collection forçado');
      }
    }
    
    // Log apenas se habilitado e em desenvolvimento
    if (MONITORING_CONFIG.ENABLE_PERFORMANCE_LOGS && STARTUP_CONFIG.ENABLE_DEBUG_LOGS) {
      console.log(`📊 Uso de memória: ${(memoryUsagePercent * 100).toFixed(2)}%`);
    }
  } catch (error) {
    // Silenciar erros de monitoramento para não poluir logs
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