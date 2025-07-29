import { io } from '../index';

export class Diagnostics {
  private static instance: Diagnostics;
  private connectionHistory: Array<{timestamp: string, event: string, details: any}> = [];
  private errorCount = 0;
  private reconnectCount = 0;

  static getInstance(): Diagnostics {
    if (!Diagnostics.instance) {
      Diagnostics.instance = new Diagnostics();
    }
    return Diagnostics.instance;
  }

  startDiagnostics() {
    console.log('🔍 Iniciando diagnósticos do sistema...');
    
    // Monitorar conexões Socket.IO
    this.monitorSocketConnections();
    
    // Monitorar erros
    this.monitorErrors();
    
    // Monitorar reconexões
    this.monitorReconnections();
    
    // Monitorar performance
    this.monitorPerformance();
  }

  private monitorSocketConnections() {
    io.on('connection', (socket) => {
      this.logEvent('connection', { clientId: socket.id });
      
      socket.on('disconnect', (reason) => {
        this.logEvent('disconnect', { clientId: socket.id, reason });
        
        if (reason === 'transport close' || reason === 'ping timeout') {
          console.warn('⚠️ Cliente desconectado por timeout - possível problema de rede');
        }
      });
      
      socket.on('error', (error) => {
        this.logEvent('socket_error', { clientId: socket.id, error: error.message });
        console.error('❌ Erro no socket:', error);
      });
    });
  }

  private monitorErrors() {
    process.on('uncaughtException', (error) => {
      this.errorCount++;
      this.logEvent('uncaught_exception', { error: error.message, stack: error.stack });
      console.error(`❌ Erro não capturado #${this.errorCount}:`, error);
      
      if (this.errorCount > 5) {
        console.error('🚨 Muitos erros detectados! Possível problema de estabilidade.');
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.errorCount++;
      this.logEvent('unhandled_rejection', { reason: String(reason) });
      console.error(`❌ Promise rejeitada #${this.errorCount}:`, reason);
      
      if (this.errorCount > 5) {
        console.error('🚨 Muitas promises rejeitadas! Possível problema de estabilidade.');
      }
    });
  }

  private monitorReconnections() {
    // Monitorar reconexões do WhatsApp
    setInterval(() => {
      const instances = Array.from((global as any).whatsappInstances?.values() || []);
      const disconnectedInstances = instances.filter((instance: any) => !instance.isConnected);
      
      if (disconnectedInstances.length > 0) {
        this.reconnectCount++;
        console.warn(`⚠️ ${disconnectedInstances.length} instâncias WhatsApp desconectadas`);
        this.logEvent('whatsapp_disconnected', { 
          count: disconnectedInstances.length,
          instances: disconnectedInstances.map((i: any) => i.id)
        });
      }
    }, 30000); // Verificar a cada 30 segundos
  }

  private monitorPerformance() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      this.logEvent('performance_check', {
        memory: { heapUsed, heapTotal },
        uptime: process.uptime(),
        clients: io.engine.clientsCount
      });
      
      // Alertar se uso de memória estiver alto
      if (heapUsed > 500) {
        console.warn(`⚠️ Alto uso de memória: ${heapUsed}MB`);
      }
    }, 60000); // A cada minuto
  }

  private logEvent(event: string, details: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details
    };
    
    this.connectionHistory.push(logEntry);
    
    // Manter apenas os últimos 100 eventos
    if (this.connectionHistory.length > 100) {
      this.connectionHistory = this.connectionHistory.slice(-100);
    }
  }

  getDiagnosticsReport() {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      },
      clients: io.engine.clientsCount,
      errors: this.errorCount,
      reconnections: this.reconnectCount,
      recentEvents: this.connectionHistory.slice(-10), // Últimos 10 eventos
      stability: this.calculateStabilityScore()
    };
  }

  private calculateStabilityScore(): number {
    const totalEvents = this.connectionHistory.length;
    const errorEvents = this.connectionHistory.filter(e => 
      e.event.includes('error') || e.event.includes('exception') || e.event.includes('rejection')
    ).length;
    
    if (totalEvents === 0) return 100;
    
    const errorRate = (errorEvents / totalEvents) * 100;
    return Math.max(0, 100 - errorRate);
  }

  // Função para testar conectividade
  async testConnectivity() {
    const tests = [
      this.testSocketIO(),
      this.testWhatsAppInstances(),
      this.testMemoryUsage(),
      this.testUptime()
    ];
    
    const results = await Promise.allSettled(tests);
    
    return {
      timestamp: new Date().toISOString(),
      tests: results.map((result, index) => ({
        test: ['socket_io', 'whatsapp_instances', 'memory_usage', 'uptime'][index],
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : result.reason
      }))
    };
  }

  private async testSocketIO() {
    return {
      connected: io.engine.clientsCount > 0,
      clientCount: io.engine.clientsCount,
      status: 'healthy'
    };
  }

  private async testWhatsAppInstances() {
    const instances = Array.from((global as any).whatsappInstances?.values() || []);
    const connectedInstances = instances.filter((i: any) => i.isConnected);
    
    return {
      total: instances.length,
      connected: connectedInstances.length,
      status: connectedInstances.length > 0 ? 'healthy' : 'warning'
    };
  }

  private async testMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    return {
      heapUsed: heapUsed + 'MB',
      status: heapUsed < 500 ? 'healthy' : 'warning'
    };
  }

  private async testUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    
    return {
      hours,
      status: hours > 1 ? 'healthy' : 'warning'
    };
  }
} 