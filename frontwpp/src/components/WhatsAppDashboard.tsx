import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Snackbar, Typography, Button } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import ConversationSidebar from './ConversationSidebar';
import ChatArea from './ChatArea';
import MessageInput from './MessageInput';
import socketService from '../services/socketService';
import ApiService from '../services/apiService';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  avatar?: string;
  status: 'bot' | 'humano' | 'aguardando' | 'finalizado';
  unreadCount?: number;
}

export interface Message {
  id: string;
  texto: string;
  timestamp: string;
  autor: 'usuario' | 'sistema';
  contactId: string;
}

const WhatsAppDashboard: React.FC = () => {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Inicialização
  useEffect(() => {
    initializeApp();
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Configurar Socket.IO
  useEffect(() => {
    socketService.connect();

    const handleSocketConnected = () => {
      setSocketConnected(true);
      setError(null);
      console.log('✅ Socket.IO conectado');
    };

    const handleSocketDisconnected = () => {
      setSocketConnected(false);
      console.log('❌ Socket.IO desconectado');
    };

    const handleNewMessage = (data: { contactId: string; message: Message }) => {
      console.log('📨 Nova mensagem recebida:', data);
      
      // Adicionar mensagem à lista
      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === data.message.id);
        if (messageExists) return prev;
        return [...prev, { ...data.message, contactId: data.contactId }];
      });

      // Atualizar última mensagem do contato
      setContacts(prev => prev.map(contact => 
        contact.id === data.contactId
          ? { 
              ...contact, 
              lastMessage: data.message.texto, 
              lastMessageTime: new Date(data.message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              unreadCount: contact.id === selectedContactId ? 0 : (contact.unreadCount || 0) + 1
            }
          : contact
      ));
    };

    const handleStatusUpdated = (data: { contactId: string; status: string }) => {
      console.log('🔄 Status atualizado:', data);
      setContacts(prev => prev.map(contact => 
        contact.id === data.contactId
          ? { ...contact, status: data.status as any }
          : contact
      ));
    };

    socketService.on('socket-connected', handleSocketConnected);
    socketService.on('socket-disconnected', handleSocketDisconnected);
    socketService.on('new-message', handleNewMessage);
    socketService.on('status-updated', handleStatusUpdated);

    return () => {
      socketService.off('socket-connected', handleSocketConnected);
      socketService.off('socket-disconnected', handleSocketDisconnected);
      socketService.off('new-message', handleNewMessage);
      socketService.off('status-updated', handleStatusUpdated);
    };
  }, [selectedContactId]);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Inicializando aplicação...');
      
      // Verificar saúde do backend
      const isHealthy = await ApiService.checkHealth();
      if (!isHealthy) {
        throw new Error('Backend não está respondendo. Verifique se o servidor está rodando na porta 4000.');
      }

      console.log('✅ Backend está online');

      // Carregar contatos
      const contactsData = await ApiService.getContacts();
      console.log('📋 Contatos carregados:', contactsData.length);
      
      setContacts(contactsData);

      if (contactsData.length === 0) {
        console.log('ℹ️ Nenhum contato encontrado. Aguardando mensagens...');
      }

      setRetryCount(0);
    } catch (err: any) {
      console.error('❌ Erro ao inicializar app:', err);
      setError(err.message || 'Erro ao conectar com o servidor');
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = async (contactId: string) => {
    setSelectedContactId(contactId);
    setLoadingMessages(true);
    socketService.joinRoom(contactId);

    console.log('👤 Contato selecionado:', contactId);

    // Marcar mensagens como lidas
    setContacts(prev => prev.map(contact => 
      contact.id === contactId
        ? { ...contact, unreadCount: 0 }
        : contact
    ));

    try {
      // Carregar mensagens do contato
      const contactMessages = await ApiService.getContactMessages(contactId);
      console.log('💬 Mensagens carregadas:', contactMessages.length);
      setMessages(contactMessages);
    } catch (err) {
      console.error('❌ Erro ao carregar mensagens:', err);
      setError('Erro ao carregar mensagens do contato');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedContactId) return;

    console.log('📤 Enviando mensagem:', message);

    try {
      // Enviar via API
      const success = await ApiService.sendMessage(selectedContactId, message);
      
      if (success) {
        console.log('✅ Mensagem enviada com sucesso');
        
        // Adicionar mensagem otimisticamente
        const newMessage: Message = {
          id: `local-${Date.now()}`,
          texto: message,
          timestamp: new Date().toISOString(),
          autor: 'sistema',
          contactId: selectedContactId,
        };

        setMessages(prev => [...prev, newMessage]);
        
        // Atualizar última mensagem do contato
        setContacts(prev => prev.map(contact => 
          contact.id === selectedContactId
            ? { 
                ...contact, 
                lastMessage: message, 
                lastMessageTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
              }
            : contact
        ));
      } else {
        throw new Error('Falha ao enviar mensagem via API');
      }
    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
      setError('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const handleStatusChange = async (contactId: string, newStatus: 'bot' | 'humano' | 'aguardando' | 'finalizado') => {
    console.log('🔄 Alterando status:', contactId, newStatus);
    
    try {
      const success = await ApiService.updateContactStatus(contactId, newStatus);
      
      if (success) {
        console.log('✅ Status atualizado com sucesso');
        setContacts(prev => prev.map(contact => 
          contact.id === contactId
            ? { ...contact, status: newStatus }
            : contact
        ));
      } else {
        throw new Error('Falha ao atualizar status via API');
      }
    } catch (err) {
      console.error('❌ Erro ao atualizar status:', err);
      setError('Erro ao atualizar status. Tente novamente.');
    }
  };

  const handleRetry = () => {
    console.log('🔄 Tentando reconectar...');
    initializeApp();
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const contactMessages = messages.filter(m => m.contactId === selectedContactId);

  if (loading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Conectando ao servidor...
        </Typography>
        {retryCount > 0 && (
          <Typography variant="body2" color="text.secondary">
            Tentativa {retryCount}
          </Typography>
        )}
      </Box>
    );
  }

  if (error && contacts.length === 0) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 2,
        p: 3
      }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />}
          onClick={handleRetry}
        >
          Tentar Novamente
        </Button>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Certifique-se de que o backend está rodando na porta 4000
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Sidebar de Conversas */}
      <Box sx={{ width: '350px', borderRight: '1px solid #e0e0e0' }}>
        <ConversationSidebar
          contacts={contacts}
          selectedContactId={selectedContactId}
          onContactSelect={handleContactSelect}
        />
      </Box>

      {/* Área Principal */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedContact ? (
          <>
            {/* Área de Chat */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {loadingMessages ? (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%' 
                }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ChatArea
                  contact={selectedContact}
                  messages={contactMessages}
                  onStatusChange={handleStatusChange}
                />
              )}
            </Box>

            {/* Campo de Digitação */}
            <Box sx={{ borderTop: '1px solid #e0e0e0' }}>
              <MessageInput
                onSendMessage={handleSendMessage}
                contact={selectedContact}
                onStatusChange={handleStatusChange}
              />
            </Box>
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              gap: 2,
            }}
          >
            <Typography variant="h5">
              Central de Atendimento WhatsApp
            </Typography>
            <Typography variant="body1">
              {contacts.length === 0 
                ? 'Aguardando mensagens de clientes...' 
                : 'Selecione uma conversa para começar'
              }
            </Typography>
          </Box>
        )}
      </Box>

      {/* Snackbar para erros */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      {/* Indicador de conexão Socket.IO */}
      {!socketConnected && (
        <Snackbar 
          open={true}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert severity="warning">
            Desconectado do servidor em tempo real
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default WhatsAppDashboard; 