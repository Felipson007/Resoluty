import { io, Socket } from 'socket.io-client';
import { Message } from '../components/WhatsAppDashboard';

// Configuração da URL do Socket
const SOCKET_URL = 'https://resoluty.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private eventCallbacks: { [event: string]: Function[] } = {};
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduzido de 5 para 3
  private reconnectInterval: NodeJS.Timeout | null = null;

  connect(url: string = SOCKET_URL) {
    if (this.socket && this.socket.connected) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      timeout: 30000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.clearReconnectInterval();
      // Emitir evento de conexão apenas se não estava conectado antes
      if (this.reconnectAttempts > 0) {
        this.emit('socket-connected');
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      
      // Só tentar reconectar se não foi uma desconexão intencional
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      // Não emitir erro para não causar desconforto visual
      // this.emit('socket-error', error);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });

    // Eventos do WhatsApp - Melhorados com logs detalhados
    this.socket.on('qr', (data: { qr: string; instanceId?: string; number?: string }) => {
      console.log('📱 Frontend recebeu evento QR:', data);
      this.emit('qr', data);
    });

    this.socket.on('qr-code', (data: { qr: string }) => {
      console.log('📱 Frontend recebeu evento QR-CODE:', data);
      this.emit('qr-code', data);
    });

    this.socket.on('whatsapp-status', (data: { connected: boolean; number: string }) => {
      console.log('📱 Frontend recebeu status WhatsApp:', data);
      this.emit('whatsapp-status', data);
    });

    this.socket.on('ai-status', (data: { active: boolean }) => {
      this.emit('ai-status', data);
    });

    this.socket.on('new-message', (data: { contactId: string; message: Message }) => {
      this.emit('new-message', data);
    });

    this.socket.on('status-updated', (data: { contactId: string; status: string; attendantId?: string; timestamp: string }) => {
      this.emit('status-updated', data);
    });

    this.socket.on('contact-typing', (data: { contactId: string; isTyping: boolean }) => {
      this.emit('contact-typing', data);
    });

    this.socket.on('qr-expired', (data: { instanceId: string; number: string }) => {
      console.log('⏰ Frontend recebeu QR expirado:', data);
      this.emit('qr-expired', data);
    });

    this.socket.on('wpp-status', (data: { status: string; instanceId: string; number: string }) => {
      console.log('📱 Frontend recebeu WPP-STATUS:', data);
      this.emit('wpp-status', data);
    });

    this.socket.on('whatsapp-instances-updated', (data: any[]) => {
      this.emit('whatsapp-instances-updated', data);
    });
  }

  private scheduleReconnect() {
    this.clearReconnectInterval();
    const delay = Math.min(2000 * this.reconnectAttempts, 10000);
    
    this.reconnectInterval = setTimeout(() => {
      if (!this.socket?.connected && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnect();
      }
    }, delay);
  }

  private clearReconnectInterval() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  disconnect() {
    this.clearReconnectInterval();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Reconectar manualmente
  reconnect() {
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  // Emitir eventos para o servidor
  joinRoom(roomId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-room', roomId);
    }
  }

  sendMessage(contactId: string, message: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send-message', { contactId, message });
    }
  }

  updateStatus(contactId: string, status: string, attendantId?: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update-status', { contactId, status, attendantId });
    }
  }

  // Sistema de eventos personalizado
  on(event: string, callback: Function) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data?: any) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Método para testar a conexão
  testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      if (this.socket.connected) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve(true);
      });

      this.socket.once('connect_error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }
}

// Singleton
const socketService = new SocketService();
export default socketService; 