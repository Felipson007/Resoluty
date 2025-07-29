import { io } from '../index';

export class BackendMonitor {
  private static instance: BackendMonitor;
  private healthChecks: Map<string, any> = new Map();
  private startTime: Date = new Date();

  static getInstance(): BackendMonitor {
    if (!BackendMonitor.instance) {
      BackendMonitor.instance = new BackendMonitor();
    }
    return BackendMonitor.instance;
  }

  startMonitoring() {
    console.log('🔍 Iniciando monitoramento do backend...');
    
    // Monitorar conexões Socket.IO
    this.monitorSocketConnections();
    
    // Monitorar uso de memória
    this.monitorMemoryUsage();
    
    // Monitorar uptime
    this.monitorUptime();
    
    // Monitorar erros
    this.monitorErrors();
  }

  private monitorSocketConnections() {
    setInterval(() => {
      const clientCount = io.engine.clientsCount;
      const timestamp = new Date().toISOString();
      
      console.log(`📊 Socket.IO - Clientes conectados: ${clientCount} - ${timestamp}`);
      
      // Alertar se muitos clientes desconectarem rapidamente
      if (clientCount === 0) {
        console.warn('⚠️ Nenhum cliente Socket.IO conectado!');
      }
    }, 30000); // A cada 30 segundos
  }

  private monitorMemoryUsage() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
      const external = Math.round(memUsage.external / 1024 / 1024);
      
      console.log(`💾 Memória - Heap: ${heapUsed}MB/${heapTotal}MB, External: ${external}MB`);
      
      // Alertar se uso de memória estiver alto
      if (heapUsed > 500) {
        console.warn(`⚠️ Alto uso de memória: ${heapUsed}MB`);
      }
      
      if (external > 100) {
        console.warn(`⚠️ Alto uso de memória externa: ${external}MB`);
      }
    }, 60000); // A cada minuto
  }

  private monitorUptime() {
    setInterval(() => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      
      console.log(`⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s`);
    }, 300000); // A cada 5 minutos
  }

  private monitorErrors() {
    let errorCount = 0;
    const errorThreshold = 10; // Alertar após 10 erros
    
    process.on('uncaughtException', (error) => {
      errorCount++;
      console.error(`❌ Erro não capturado #${errorCount}:`, error);
      
      if (errorCount >= errorThreshold) {
        console.error('🚨 Muitos erros detectados! Possível problema de estabilidade.');
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      errorCount++;
      console.error(`❌ Promise rejeitada #${errorCount}:`, reason);
      
      if (errorCount >= errorThreshold) {
        console.error('🚨 Muitas promises rejeitadas! Possível problema de estabilidade.');
      }
    });
  }

  getHealthStatus() {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      },
      clients: io.engine.clientsCount,
      startTime: this.startTime.toISOString()
    };
  }
} 