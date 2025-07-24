import { io, Socket } from 'socket.io-client';
import { Message, Contact } from '../components/WhatsAppDashboard';

class SocketService {
  private socket: Socket | null = null;
  private eventCallbacks: { [event: string]: Function[] } = {};

  connect(url: string = 'http://localhost:4000') {
    if (this.socket) {
      return;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO');
      this.emit('socket-connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.IO');
      this.emit('socket-disconnected');
    });

    this.socket.on('new-message', (data: { contactId: string; message: Message }) => {
      console.log('Nova mensagem recebida:', data);
      this.emit('new-message', data);
    });

    this.socket.on('status-updated', (data: { contactId: string; status: string; attendantId?: string; timestamp: string }) => {
      console.log('Status atualizado:', data);
      this.emit('status-updated', data);
    });

    this.socket.on('contact-typing', (data: { contactId: string; isTyping: boolean }) => {
      console.log('Status de digitação:', data);
      this.emit('contact-typing', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Emitir eventos para o servidor
  joinRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('join-room', roomId);
    }
  }

  sendMessage(contactId: string, message: string) {
    if (this.socket) {
      this.socket.emit('send-message', { contactId, message });
    }
  }

  updateStatus(contactId: string, status: string, attendantId?: string) {
    if (this.socket) {
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
}

// Singleton
const socketService = new SocketService();
export default socketService; 