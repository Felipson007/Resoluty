import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { EventEmitter } from 'events';

// Interface para instância WhatsApp otimizada
interface WhatsAppInstance {
  id: string;
  number: string;
  client: Client | null;
  isConnected: boolean;
  isConnecting: boolean;
  qrCode: string | null;
  qrExpiry: number | null;
  lastActivity: number;
  enabled: boolean;
  memoryUsage: number;
  errorCount: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

import { PERFORMANCE_CONFIG, getPuppeteerConfig } from '../config/performance';

class WhatsAppManager extends EventEmitter {
  private instances: Map<string, WhatsAppInstance> = new Map();
  private socketIO: any = null;
  private memoryMonitorInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    super();
    this.startMemoryMonitoring();
    this.startCleanupProcess();
  }

  setSocketIO(io: any) {
    this.socketIO = io;
  }

  // Criar nova instância
  async createInstance(instanceId: string, number: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar limite de instâncias
      if (this.instances.size >= PERFORMANCE_CONFIG.MAX_WHATSAPP_INSTANCES) {
        const oldestInstance = this.getOldestInstance();
        if (oldestInstance) {
          await this.destroyInstance(oldestInstance.id);
        }
      }

      // Verificar se a instância já existe
      if (this.instances.has(instanceId)) {
        return { success: true, message: 'Instância já existe' };
      }

      const instance: WhatsAppInstance = {
        id: instanceId,
        number,
        client: null,
        isConnected: false,
        isConnecting: false,
        qrCode: null,
        qrExpiry: null,
        lastActivity: Date.now(),
        enabled: true,
        memoryUsage: 0,
        errorCount: 0,
        reconnectAttempts: 0,
        maxReconnectAttempts: PERFORMANCE_CONFIG.MAX_RECONNECT_ATTEMPTS,
      };

      this.instances.set(instanceId, instance);
      
      // Emitir evento
      this.emit('instance-created', { instanceId, number });
      
      return { success: true, message: 'Instância criada com sucesso' };
    } catch (error) {
      console.error(`❌ Erro ao criar instância ${instanceId}:`, error);
      return { success: false, message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
    }
  }

  // Inicializar cliente
  async initializeClient(instanceId: string): Promise<{ success: boolean; message: string }> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return { success: false, message: 'Instância não encontrada' };
    }

    if (instance.isConnecting || instance.isConnected) {
      return { success: true, message: 'Cliente já está inicializado' };
    }

    try {
      instance.isConnecting = true;
      instance.lastActivity = Date.now();

      const client = new Client({
        authStrategy: new LocalAuth({ clientId: instanceId }),
        puppeteer: getPuppeteerConfig()
      });

      instance.client = client;
      this.setupClientEvents(instance);

      await client.initialize();
      
      instance.isConnecting = false;
      instance.lastActivity = Date.now();

      return { success: true, message: 'Cliente inicializado com sucesso' };
    } catch (error) {
      instance.isConnecting = false;
      instance.errorCount++;
      console.error(`❌ Erro ao inicializar cliente ${instanceId}:`, error);
      return { success: false, message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
    }
  }

  // Configurar eventos do cliente
  private setupClientEvents(instance: WhatsAppInstance) {
    if (!instance.client) return;

    const { client, id: instanceId, number } = instance;

    client.on('qr', (qr) => {
      console.log(`📱 QR Code gerado para ${number} (${instanceId})`);
      
      instance.qrCode = qr;
      instance.qrExpiry = Date.now() + PERFORMANCE_CONFIG.QR_EXPIRY_TIME;
      instance.lastActivity = Date.now();

      // Emitir QR para frontend
      if (this.socketIO) {
        this.socketIO.emit('qr', { 
          qr, 
          instanceId, 
          number 
        });
      }

      // Configurar timeout para expiração
      setTimeout(() => {
        if (instance.qrCode === qr) {
          instance.qrCode = null;
          instance.qrExpiry = null;
          
          if (this.socketIO) {
            this.socketIO.emit('qr-expired', { 
              instanceId, 
              number 
            });
          }
        }
      }, PERFORMANCE_CONFIG.QR_EXPIRY_TIME);
    });

    client.on('ready', async () => {
      try {
        const realNumber = client.info.wid.user;
        console.log(`✅ WhatsApp conectado! Número: ${realNumber} (${instanceId})`);
        
        instance.number = realNumber;
        instance.isConnected = true;
        instance.isConnecting = false;
        instance.qrCode = null;
        instance.qrExpiry = null;
        instance.lastActivity = Date.now();
        instance.errorCount = 0;
        instance.reconnectAttempts = 0;

        if (this.socketIO) {
          this.socketIO.emit('whatsapp-status', { 
            connected: true, 
            number: realNumber,
            aiActive: true,
            instanceId
          });
        }

        this.emit('instance-connected', { instanceId, number: realNumber });
      } catch (error) {
        console.error(`❌ Erro ao processar conexão ${instanceId}:`, error);
      }
    });

    client.on('disconnected', (reason) => {
      console.log(`📱 WhatsApp desconectado (${instanceId}): ${reason}`);
      
      instance.isConnected = false;
      instance.isConnecting = false;
      instance.qrCode = null;
      instance.qrExpiry = null;
      instance.lastActivity = Date.now();

      if (this.socketIO) {
        this.socketIO.emit('whatsapp-status', { 
          connected: false, 
          number: '',
          aiActive: true,
          instanceId
        });
      }

      this.emit('instance-disconnected', { instanceId, reason });
    });

    client.on('auth_failure', (message) => {
      console.error(`❌ Falha de autenticação (${instanceId}): ${message}`);
      instance.errorCount++;
      instance.lastActivity = Date.now();
      
      if (this.socketIO) {
        this.socketIO.emit('auth-failure', { instanceId, message });
      }
    });

    client.on('message', async (message) => {
      try {
        instance.lastActivity = Date.now();
        this.emit('message-received', { instanceId, message });
      } catch (error) {
        console.error(`❌ Erro ao processar mensagem ${instanceId}:`, error);
      }
    });
  }

  // Enviar mensagem
  async sendMessage(instanceId: string, to: string, message: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.client || !instance.isConnected) {
      return false;
    }

    try {
      await instance.client.sendMessage(to, message);
      instance.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem via ${instanceId}:`, error);
      instance.errorCount++;
      return false;
    }
  }

  // Destruir instância
  async destroyInstance(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    try {
      if (instance.client) {
        await instance.client.destroy();
      }
      
      this.instances.delete(instanceId);
      this.emit('instance-destroyed', { instanceId });
      
      return true;
    } catch (error) {
      console.error(`❌ Erro ao destruir instância ${instanceId}:`, error);
      return false;
    }
  }

  // Obter instâncias
  getInstances(): Array<{id: string, number: string, isConnected: boolean, enabled: boolean}> {
    return Array.from(this.instances.values()).map(instance => ({
      id: instance.id,
      number: instance.number,
      isConnected: instance.isConnected,
      enabled: instance.enabled
    }));
  }

  // Obter instância conectada
  getConnectedInstance(): WhatsAppInstance | null {
    return Array.from(this.instances.values()).find(i => i.isConnected) || null;
  }

  // Monitoramento de memória
  private startMemoryMonitoring() {
    this.memoryMonitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL);
  }

  private checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemoryUsage = memUsage.heapUsed + memUsage.external;
    
    // Atualizar uso de memória das instâncias
    this.instances.forEach(instance => {
      instance.memoryUsage = totalMemoryUsage / this.instances.size;
    });

    // Se uso de memória estiver alto, fazer limpeza
    if (totalMemoryUsage > 500 * 1024 * 1024) { // 500MB
      console.log('⚠️ Alto uso de memória detectado, iniciando limpeza...');
      this.performMemoryCleanup();
    }
  }

  private performMemoryCleanup() {
    // Forçar garbage collection
    if (global.gc) {
      global.gc();
    }

    // Remover instâncias inativas
    const now = Date.now();
    this.instances.forEach((instance, id) => {
      if (now - instance.lastActivity > PERFORMANCE_CONFIG.INACTIVITY_TIMEOUT) {
        console.log(`🗑️ Removendo instância inativa: ${id}`);
        this.destroyInstance(id);
      }
    });
  }

  // Processo de limpeza
  private startCleanupProcess() {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, PERFORMANCE_CONFIG.CLEANUP_INTERVAL);
  }

  private performCleanup() {
    const now = Date.now();

    // Limpar QR codes expirados
    this.instances.forEach(instance => {
      if (instance.qrExpiry && now > instance.qrExpiry) {
        instance.qrCode = null;
        instance.qrExpiry = null;
      }
    });

    // Remover instâncias com muitos erros
    this.instances.forEach((instance, id) => {
      if (instance.errorCount > PERFORMANCE_CONFIG.MAX_ERROR_COUNT) {
        console.log(`🗑️ Removendo instância com muitos erros: ${id}`);
        this.destroyInstance(id);
      }
    });
  }

  // Obter instância mais antiga
  private getOldestInstance(): WhatsAppInstance | null {
    let oldest: WhatsAppInstance | null = null;
    let oldestTime = Date.now();

    this.instances.forEach(instance => {
      if (instance.lastActivity < oldestTime) {
        oldest = instance;
        oldestTime = instance.lastActivity;
      }
    });

    return oldest;
  }

  // Shutdown
  async shutdown() {
    this.isShuttingDown = true;
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Destruir todas as instâncias
    const destroyPromises = Array.from(this.instances.keys()).map(id => 
      this.destroyInstance(id)
    );
    
    await Promise.all(destroyPromises);
    
    this.instances.clear();
    this.removeAllListeners();
  }

  // Health check
  getHealthStatus() {
    const connectedInstances = Array.from(this.instances.values()).filter(i => i.isConnected).length;
    const totalInstances = this.instances.size;
    const memUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      instances: {
        total: totalInstances,
        connected: connectedInstances,
        connecting: Array.from(this.instances.values()).filter(i => i.isConnecting).length
      },
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      },
      uptime: process.uptime()
    };
  }
}

// Singleton
const whatsappManager = new WhatsAppManager();
export default whatsappManager; 