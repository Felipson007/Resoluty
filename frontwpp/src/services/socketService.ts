import { io, Socket } from 'socket.io-client';
import { Message } from '../components/WhatsAppDashboard';

// Configuração da URL do Socket
const SOCKET_URL = 'https://resoluty.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private eventCallbacks: { [event: string]: Function[] } = {};
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string = SOCKET_URL) {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Socket já conectado');
      return;
    }

    if (this.isConnecting) {
      console.log('🔌 Já tentando conectar...');
      return;
    }

    this.isConnecting = true;
    console.log('🔌 Tentando conectar ao Socket.IO em:', url);

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ Conectado ao servidor Socket.IO');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.emit('socket-connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado do servidor Socket.IO:', reason);
      this.isConnecting = false;
      this.emit('socket-disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão Socket.IO:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;
      this.emit('socket-error', error);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`🔄 Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts} de reconexão...`);
        setTimeout(() => {
          this.reconnect();
        }, 2000 * this.reconnectAttempts);
      }
    });

    // Eventos do WhatsApp - Melhorados com logs detalhados
    this.socket.on('qr', (data: { qr: string; instanceId?: string; number?: string }) => {
      console.log('📱 QR Code recebido (qr):', data);
      console.log('📱 QR Code tamanho:', data.qr?.length || 0);
      this.emit('qr', data);
    });

    this.socket.on('qr-code', (data: { qr: string }) => {
      console.log('📱 QR Code recebido (qr-code):', data);
      console.log('📱 QR Code tamanho:', data.qr?.length || 0);
      this.emit('qr-code', data);
    });

    this.socket.on('whatsapp-status', (data: { connected: boolean; number: string }) => {
      console.log('📱 Status WhatsApp atualizado:', data);
      this.emit('whatsapp-status', data);
    });

    this.socket.on('ai-status', (data: { active: boolean }) => {
      console.log('🤖 Status IA atualizado:', data);
      this.emit('ai-status', data);
    });

    this.socket.on('new-message', (data: { contactId: string; message: Message }) => {
      console.log('📨 Nova mensagem recebida:', data);
      this.emit('new-message', data);
    });

    this.socket.on('status-updated', (data: { contactId: string; status: string; attendantId?: string; timestamp: string }) => {
      console.log('🔄 Status atualizado:', data);
      this.emit('status-updated', data);
    });

    this.socket.on('contact-typing', (data: { contactId: string; isTyping: boolean }) => {
      console.log('⌨️ Status de digitação:', data);
      this.emit('contact-typing', data);
    });

    this.socket.on('qr-expired', (data: { instanceId: string; number: string }) => {
      console.log('⏰ QR Code expirado para instância:', data.instanceId);
      this.emit('qr-expired', data);
    });

    this.socket.on('wpp-status', (data: { status: string; instanceId: string; number: string }) => {
      console.log('📱 Status WhatsApp:', data);
      this.emit('wpp-status', data);
    });

    this.socket.on('whatsapp-instances-updated', (data: any[]) => {
      console.log('📱 Instâncias WhatsApp atualizadas:', data);
      this.emit('whatsapp-instances-updated', data);
    });

    // Log de todos os eventos recebidos para debug
    // this.socket.onAny((eventName, ...args) => {
    //   console.log(`🔍 Evento recebido: ${eventName}`, args);
    // });
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando Socket.IO...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  // Reconectar manualmente
  reconnect() {
    console.log('🔄 Reconectando Socket.IO...');
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  // Emitir eventos para o servidor
  joinRoom(roomId: string) {
    if (this.socket && this.socket.connected) {
      console.log(`🔌 Entrando na sala: ${roomId}`);
      this.socket.emit('join-room', roomId);
    } else {
      console.warn('⚠️ Socket não conectado para entrar na sala');
    }
  }

  sendMessage(contactId: string, message: string) {
    if (this.socket && this.socket.connected) {
      console.log(`📤 Enviando mensagem para ${contactId}:`, message);
      this.socket.emit('send-message', { contactId, message });
    } else {
      console.warn('⚠️ Socket não conectado para enviar mensagem');
    }
  }

  updateStatus(contactId: string, status: string, attendantId?: string) {
    if (this.socket && this.socket.connected) {
      console.log(`🔄 Atualizando status para ${contactId}:`, status);
      this.socket.emit('update-status', { contactId, status, attendantId });
    } else {
      console.warn('⚠️ Socket não conectado para atualizar status');
    }
  }

  // Sistema de eventos personalizado
  on(event: string, callback: Function) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
    console.log(`📡 Listener adicionado para evento: ${event}`);
  }

  off(event: string, callback: Function) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
      console.log(`📡 Listener removido para evento: ${event}`);
    }
  }

  private emit(event: string, data?: any) {
    if (this.eventCallbacks[event]) {
      console.log(`📡 Emitindo evento interno: ${event}`, data);
      this.eventCallbacks[event].forEach(callback => callback(data));
    } else {
      console.log(`📡 Nenhum listener para evento: ${event}`);
    }
  }

  isConnected(): boolean {
    const connected = this.socket?.connected || false;
    console.log(`🔌 Status da conexão: ${connected}`);
    return connected;
  }

  // Método para testar a conexão
  testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        console.log('❌ Socket não inicializado');
        resolve(false);
        return;
      }

      if (this.socket.connected) {
        console.log('✅ Socket já conectado');
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        console.log('⏰ Timeout na verificação de conexão');
        resolve(false);
      }, 5000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        console.log('✅ Socket conectado com sucesso');
        resolve(true);
      });

      this.socket.once('connect_error', () => {
        clearTimeout(timeout);
        console.log('❌ Erro na conexão do socket');
        resolve(false);
      });
    });
  }
}

// Singleton
const socketService = new SocketService();
export default socketService; 