import { EventEmitter } from 'events';

// Configurações de inicialização
export const STARTUP_CONFIG = {
  // Delays em milissegundos
  INITIAL_DELAY: 5000,
  STATUS_CHECK_INTERVAL: 30000,
  HEALTH_CHECK_INTERVAL: 60000,
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

// Configurações de monitoramento
export const MONITORING_CONFIG = {
  // Intervalos de verificação
  STATUS_CHECK_INTERVAL: 30000,
  HEALTH_CHECK_INTERVAL: 60000,
  
  // Configurações de log
  ENABLE_PERFORMANCE_LOGS: true,
  ENABLE_CONNECTION_LOGS: true,
  
  // Thresholds
  MAX_MEMORY_USAGE: 0.8, // 80% da memória
  MAX_CPU_USAGE: 0.9, // 90% da CPU
  MAX_CONNECTION_ATTEMPTS: 5
};

// Função para monitorar recursos do sistema
export function monitorSystemResources(): void {
  if (!MONITORING_CONFIG.ENABLE_PERFORMANCE_LOGS) return;
  
  const usage = process.memoryUsage();
  const memoryUsagePercent = usage.heapUsed / usage.heapTotal;
  
  if (memoryUsagePercent > MONITORING_CONFIG.MAX_MEMORY_USAGE) {
    console.warn(`⚠️ Uso de memória alto: ${(memoryUsagePercent * 100).toFixed(2)}%`);
  }
  
  if (MONITORING_CONFIG.ENABLE_PERFORMANCE_LOGS) {
    console.log(`📊 Uso de memória: ${(memoryUsagePercent * 100).toFixed(2)}%`);
  }
}

// Inicializar monitoramento
setInterval(monitorSystemResources, 60000); // Verificar a cada minuto 