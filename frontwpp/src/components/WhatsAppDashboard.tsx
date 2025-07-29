import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Snackbar, Typography, Button } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import ConversationSidebar from './ConversationSidebar';
import ChatArea from './ChatArea';
import MessageInput from './MessageInput';
import FilterTabs from './FilterTabs';
import socketService from '../services/socketService';
import { ApiService } from '../services/apiService';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  avatar?: string;
  status: 'bot' | 'humano' | 'aguardando' | 'finalizado';
  unreadCount?: number;
  instanceId?: string;
  number?: string;
}

export interface Message {
  id: string;
  texto: string;
  timestamp: string;
  autor: 'usuario' | 'sistema';
  contactId: string;
  instanceId?: string;
  number?: string;
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
  const [selectedFilter, setSelectedFilter] = useState<string>('bot-ativo');
  const [whatsappInstances, setWhatsappInstances] = useState<any[]>([]);
  const [hasConnectedWhatsApp, setHasConnectedWhatsApp] = useState(false);

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

    const handleNewMessage = (data: { contactId: string; message: Message; lead?: any; instanceId?: string; number?: string }) => {
      console.log('📨 Nova mensagem recebida:', data);
      
      // Adicionar mensagem à lista
      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === data.message.id);
        if (messageExists) return prev;
        return [...prev, { 
          ...data.message, 
          contactId: data.contactId,
          instanceId: data.instanceId,
          number: data.number
        }];
      });

      // Atualizar ou criar contato com informações do lead
      setContacts(prev => {
        const existingContactIndex = prev.findIndex(c => c.id === data.contactId);
        
        if (existingContactIndex >= 0) {
          // Atualizar contato existente
          const updatedContacts = [...prev];
          updatedContacts[existingContactIndex] = {
            ...updatedContacts[existingContactIndex],
            lastMessage: data.message.texto,
            lastMessageTime: new Date(data.message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            unreadCount: data.contactId === selectedContactId ? 0 : (updatedContacts[existingContactIndex].unreadCount || 0) + 1,
            instanceId: data.instanceId,
            number: data.number,
            // Atualizar com dados do lead se disponível
            ...(data.lead && {
              name: `Cliente ${data.lead.numero}`,
              phone: data.lead.numero,
              status: data.lead.status === 'lead_novo' ? 'bot' : 
                     data.lead.status === 'lead_avancado' ? 'humano' : 
                     data.lead.status === 'lead_sem_interesse' ? 'finalizado' : 'bot'
            })
          };
          return updatedContacts;
        } else {
          // Criar novo contato
          const newContact: Contact = {
            id: data.contactId,
            name: data.lead ? `Cliente ${data.lead.numero}` : `Cliente ${data.contactId}`,
            phone: data.lead ? data.lead.numero : data.contactId,
            lastMessage: data.message.texto,
            lastMessageTime: new Date(data.message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: data.lead ? 
              (data.lead.status === 'lead_novo' ? 'bot' : 
               data.lead.status === 'lead_avancado' ? 'humano' : 
               data.lead.status === 'lead_sem_interesse' ? 'finalizado' : 'bot') : 'bot',
            unreadCount: data.contactId === selectedContactId ? 0 : 1
          };
          return [newContact, ...prev];
        }
      });
    };

    const handleStatusUpdated = (data: { contactId: string; status: string }) => {
      console.log('🔄 Status atualizado:', data);
      setContacts(prev => prev.map(contact => 
        contact.id === data.contactId
          ? { ...contact, status: data.status as any }
          : contact
      ));
    };

    const handleWhatsAppStatusUpdate = (data: { status: string; instanceId: string; number: string }) => {
      console.log('📱 Status WhatsApp atualizado:', data);
      
      // Atualizar status do WhatsApp quando receber eventos
      if (data.status === 'open' || data.status === 'close') {
        checkWhatsAppStatus();
      }
    };

    const handleQRExpired = (data: { instanceId: string; number: string }) => {
      console.log('⏰ QR Code expirado, aguardando novo QR...');
      // O backend irá automaticamente gerar um novo QR Code
    };

    const handleWhatsAppInstancesUpdated = (instances: any[]) => {
      console.log('📱 Instâncias WhatsApp atualizadas:', instances);
      
      // Verificar se há instâncias conectadas
      const hasConnectedInstances = instances.some(instance => instance.isConnected && instance.enabled);
      
      if (hasConnectedInstances) {
        // Se há instâncias conectadas, carregar contatos
        loadContacts();
      }
    };

    socketService.on('socket-connected', handleSocketConnected);
    socketService.on('socket-disconnected', handleSocketDisconnected);
    socketService.on('new-message', handleNewMessage);
    socketService.on('status-updated', handleStatusUpdated);
    socketService.on('wpp-status', handleWhatsAppStatusUpdate);
    socketService.on('qr-expired', handleQRExpired);
    socketService.on('whatsapp-instances-updated', handleWhatsAppInstancesUpdated);

    return () => {
      socketService.off('socket-connected', handleSocketConnected);
      socketService.off('socket-disconnected', handleSocketDisconnected);
      socketService.off('new-message', handleNewMessage);
      socketService.off('status-updated', handleStatusUpdated);
      socketService.off('wpp-status', handleWhatsAppStatusUpdate);
      socketService.off('qr-expired', handleQRExpired);
    };
  }, [selectedContactId]);

  const checkWhatsAppStatus = async () => {
    try {
      const instances = await ApiService.getWhatsAppInstances();
      setWhatsappInstances(instances);
      
      // Verificar se há pelo menos um WhatsApp conectado
      const hasConnected = instances.some((instance: any) => instance.isConnected);
      setHasConnectedWhatsApp(hasConnected);
      
      return hasConnected;
    } catch (error) {
      console.error('Erro ao verificar status do WhatsApp:', error);
      return false;
    }
  };

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
      
      // Verificar status do WhatsApp
      const hasConnected = await checkWhatsAppStatus();
      
      if (hasConnected) {
        // Buscar leads apenas se há WhatsApp conectado
        const leads = await ApiService.getLeads();
        setContacts(leads);
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
      // Converter status do frontend para status do lead
      let leadStatus: 'lead_novo' | 'lead_avancado' | 'lead_sem_interesse';
      switch (newStatus) {
        case 'bot':
          leadStatus = 'lead_novo';
          break;
        case 'humano':
          leadStatus = 'lead_avancado';
          break;
        case 'finalizado':
          leadStatus = 'lead_sem_interesse';
          break;
        default:
          leadStatus = 'lead_novo';
      }

      // Extrair número do telefone do contactId
      const numero = contactId.replace('@s.whatsapp.net', '');
      
      // Atualizar status do lead
      const success = await ApiService.updateLeadStatus(numero, leadStatus);
      
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

  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    setSelectedContactId(null);
    setMessages([]);
  };

  const handleContactsUpdate = (newContacts: Contact[]) => {
    setContacts(newContacts);
  };

  const handleGoToWhatsAppConfig = () => {
    // Navegar para a página de configuração do WhatsApp
    // Como o App.tsx usa views internas, vou usar um evento customizado
    window.dispatchEvent(new CustomEvent('changeView', { detail: 'config' }));
  };

  const handleRefreshWhatsAppStatus = async () => {
    await checkWhatsAppStatus();
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

  // Verificar se há WhatsApp conectado
  if (!hasConnectedWhatsApp && !loading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 3,
        p: 3,
        textAlign: 'center'
      }}>
        {/* Ícone WhatsApp */}
        <Box sx={{ 
          width: 120, 
          height: 120, 
          borderRadius: '50%',
          backgroundColor: '#25D36620',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2
        }}>
          <Typography variant="h1" sx={{ color: '#25D366', fontSize: '4rem' }}>
            📱
          </Typography>
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Nenhum WhatsApp Conectado
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
          Para começar a usar o sistema, você precisa conectar pelo menos um número do WhatsApp.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            size="large"
            onClick={handleGoToWhatsAppConfig}
            sx={{ 
              backgroundColor: '#25D366',
              '&:hover': { backgroundColor: '#128C7E' },
              px: 4,
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            Conectar WhatsApp
          </Button>

          <Button 
            variant="outlined" 
            onClick={handleRefreshWhatsAppStatus}
            startIcon={<RefreshIcon />}
          >
            Verificar Novamente
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Após conectar o WhatsApp, você poderá ver e gerenciar seus contatos aqui.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw',
      display: 'flex',
      overflow: 'hidden',
      margin: 0,
      padding: 0,
    }}>
      {/* Sidebar de Conversas */}
      <Box sx={{ 
        width: '350px', 
        borderRight: '1px solid #e0e0e0', 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}>
        {/* Filtros */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid #e0e0e0',
          flexShrink: 0,
        }}>
          <FilterTabs
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
            onContactsUpdate={handleContactsUpdate}
          />
        </Box>
        
        {/* Lista de Contatos */}
        <Box sx={{ 
          flex: 1,
          overflow: 'hidden',
        }}>
          <ConversationSidebar
            contacts={contacts}
            selectedContactId={selectedContactId}
            onContactSelect={handleContactSelect}
          />
        </Box>
      </Box>

      {/* Área Principal */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}>
        {selectedContact ? (
          <>
            {/* Área de Chat */}
            <Box sx={{ 
              flex: 1, 
              overflow: 'hidden',
              minHeight: 0,
            }}>
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
            <Box sx={{ 
              borderTop: '1px solid #e0e0e0',
              flexShrink: 0,
            }}>
              <MessageInput
                onSendMessage={handleSendMessage}
                contact={selectedContact}
                onStatusChange={handleStatusChange}
                selectedInstanceId={selectedFilter.startsWith('whatsapp-') ? selectedFilter.replace('whatsapp-', '') : undefined}
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
              height: '100%',
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
            Desconectado do servidor
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default WhatsAppDashboard; 