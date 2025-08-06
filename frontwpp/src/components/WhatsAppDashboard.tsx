import React, { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Alert, Snackbar, Typography, Paper, Chip, Button, Tabs, Tab } from '@mui/material';
import { WhatsApp as WhatsAppIcon, Settings as SettingsIcon } from '@mui/icons-material';
import ConversationSidebar from './ConversationSidebar';
import ChatArea from './ChatArea';
import MessageInput from './MessageInput';
import FilterTabs from './FilterTabs';
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
  const [selectedFilter, setSelectedFilter] = useState<string>('bot-ativo');
  
  // Estados para WhatsApp
  const [qrCode, setQrCode] = useState<string>('');
  const [whatsappStatus, setWhatsappStatus] = useState({
    connected: false,
    number: ''
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Estados para transparência no carregamento
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const checkWhatsAppStatus = useCallback(async () => {
    try {
      console.log('🔍 Verificando status do WhatsApp...');
      const instances = await ApiService.getWhatsAppInstances();
      console.log('📱 Instâncias encontradas:', instances);
      
      const hasConnected = instances.some((instance: any) => instance.isConnected);
      console.log('✅ WhatsApp conectado:', hasConnected);
      
      // Atualizar status local
      const newStatus = {
        connected: hasConnected,
        number: instances.find((i: any) => i.isConnected)?.number || ''
      };
      
      console.log('📊 Novo status:', newStatus);
      setWhatsappStatus(newStatus);
      
      return hasConnected;
    } catch (error) {
      console.error('❌ Erro ao verificar status do WhatsApp:', error);
      return false;
    }
  }, []);

  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar saúde do backend
      const isHealthy = await ApiService.checkHealth();
      if (!isHealthy) {
        throw new Error('Backend não está respondendo.');
      }
      
      // Verificar status do WhatsApp primeiro
      const whatsappConnected = await checkWhatsAppStatus();
      
      // Buscar leads apenas se WhatsApp estiver conectado
      if (whatsappConnected) {
        console.log('📋 Buscando leads...');
        const leads = await ApiService.getLeads();
        console.log('📋 Leads recebidos:', leads);
        
        // Converter leads para formato do frontend
        const formattedContacts = leads.map((lead: any) => ({
          id: lead.numero,
          name: `Cliente ${lead.numero}`,
          phone: lead.numero,
          lastMessage: lead.metadata?.ultima_mensagem || 'Nenhuma mensagem',
          lastMessageTime: lead.updated_at ? new Date(lead.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
          status: lead.metadata?.status === 'lead_novo' ? 'bot' : 
                 lead.metadata?.status === 'lead_avancado' ? 'humano' : 
                 lead.metadata?.status === 'lead_sem_interesse' ? 'finalizado' : 'bot',
          unreadCount: 0
        }));
        
        console.log('📋 Contatos formatados:', formattedContacts);
        setContacts(formattedContacts);
      }
      
    } catch (err: any) {
      console.error('❌ Erro ao inicializar app:', err);
      setError(err.message || 'Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  }, [checkWhatsAppStatus]);

  // Inicialização
  useEffect(() => {
    initializeApp();
    
    // Verificar status do WhatsApp periodicamente
    const statusInterval = setInterval(async () => {
      await checkWhatsAppStatus();
    }, 10000); // Verificar a cada 10 segundos
    
    return () => {
      socketService.disconnect();
      clearInterval(statusInterval);
    };
  }, [initializeApp, checkWhatsAppStatus]);

  // Configurar Socket.IO com otimizações
  useEffect(() => {
    socketService.connect();

    const handleSocketConnected = () => {
      setSocketConnected(true);
      setError(null);
    };

    const handleSocketDisconnected = () => {
      setSocketConnected(false);
    };

    const handleNewMessage = (data: { contactId: string; message: any; lead?: any; instanceId?: string; number?: string }) => {
      if (!data.message || !data.message.texto) return;

      const messageId = data.message.id || `${data.contactId}-${Date.now()}-${Math.random()}`;
      const frontendMessage: Message = {
        id: messageId,
        texto: data.message.texto || data.message.body || 'Mensagem sem texto',
        timestamp: data.message.timestamp || new Date().toISOString(),
        autor: data.message.autor || (data.message.isFromMe ? 'sistema' : 'usuario'),
        contactId: data.contactId,
        instanceId: data.instanceId,
        number: data.number
      };
      
      // Adicionar mensagem sem reload
      setMessages(prev => {
        const messageExists = prev.some(msg => 
          msg.id === frontendMessage.id || 
          (msg.texto === frontendMessage.texto && msg.timestamp === frontendMessage.timestamp)
        );
        if (messageExists) return prev;
        
        const newMessages = [...prev, frontendMessage];
        
        // Scroll automático se for o contato selecionado
        if (data.contactId === selectedContactId) {
          setTimeout(() => {
            const chatContainer = document.querySelector('.chat-messages-container');
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }, 100);
        }
        
        return newMessages;
      });

      // Atualizar contatos sem reload
      setContacts(prev => {
        const existingContactIndex = prev.findIndex(c => c.id === data.contactId);
        
        if (existingContactIndex >= 0) {
          const updatedContacts = [...prev];
          updatedContacts[existingContactIndex] = {
            ...updatedContacts[existingContactIndex],
            lastMessage: frontendMessage.texto,
            lastMessageTime: new Date(frontendMessage.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            unreadCount: data.contactId === selectedContactId ? 0 : (updatedContacts[existingContactIndex].unreadCount || 0) + 1,
            instanceId: data.instanceId,
            number: data.number,
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
          const newContact: Contact = {
            id: data.contactId,
            name: data.lead ? `Cliente ${data.lead.numero}` : `Cliente ${data.contactId}`,
            phone: data.lead ? data.lead.numero : data.contactId,
            lastMessage: frontendMessage.texto,
            lastMessageTime: new Date(frontendMessage.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: data.lead ? 
              (data.lead.status === 'lead_novo' ? 'bot' : 
               data.lead.status === 'lead_avancado' ? 'humano' : 
               data.lead.status === 'lead_sem_interesse' ? 'finalizado' : 'bot') : 'bot',
            unreadCount: data.contactId === selectedContactId ? 0 : 1,
            instanceId: data.instanceId,
            number: data.number
          };
          
          return [newContact, ...prev];
        }
      });
    };

    const handleStatusUpdated = (data: { contactId: string; status: string }) => {
      setContacts(prev => prev.map(contact => 
        contact.id === data.contactId
          ? { ...contact, status: data.status as any }
          : contact
      ));
    };

    const handleWhatsAppStatus = (status: { connected: boolean; number: string }) => {
      setWhatsappStatus(status);
      
      if (status.connected) {
        setIsConnecting(false);
        // Carregar dados automaticamente após conexão
        setIsLoadingData(true);
        setLoadingMessage('Carregando dados...');
        initializeApp().finally(() => {
          setIsLoadingData(false);
          setLoadingMessage('');
        });
      } else {
        setIsConnecting(true);
      }
    };

    const handleQRCode = (data: { qr: string }) => {
      setQrCode(data.qr);
    };

    socketService.on('socket-connected', handleSocketConnected);
    socketService.on('socket-disconnected', handleSocketDisconnected);
    socketService.on('new-message', handleNewMessage);
    socketService.on('status-updated', handleStatusUpdated);
    socketService.on('whatsapp-status', handleWhatsAppStatus);
    socketService.on('qr', handleQRCode);

    return () => {
      socketService.off('socket-connected', handleSocketConnected);
      socketService.off('socket-disconnected', handleSocketDisconnected);
      socketService.off('new-message', handleNewMessage);
      socketService.off('status-updated', handleStatusUpdated);
      socketService.off('whatsapp-status', handleWhatsAppStatus);
      socketService.off('qr', handleQRCode);
    };
  }, [selectedContactId, initializeApp]);

  const handleContactSelect = async (contactId: string) => {
    setSelectedContactId(contactId);
    setLoadingMessages(true);
    socketService.joinRoom(contactId);

    // Marcar mensagens como lidas
    setContacts(prev => prev.map(contact => 
      contact.id === contactId
        ? { ...contact, unreadCount: 0 }
        : contact
    ));

    try {
      const contactMessages = await ApiService.getContactMessages(contactId);
      const formattedMessages = contactMessages.map((msg: any) => ({
        id: msg.id,
        texto: msg.texto || msg.body || 'Mensagem sem texto',
        timestamp: msg.timestamp,
        autor: msg.autor || 'usuario',
        contactId: contactId
      }));
      
      setMessages(formattedMessages);
    } catch (err) {
      console.error('❌ Erro ao carregar mensagens:', err);
      setError('Erro ao carregar mensagens do contato');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedContactId) return;

    try {
      const success = await ApiService.sendMessage(selectedContactId, message);
      
      if (success) {
        const newMessage: Message = {
          id: `local-${Date.now()}`,
          texto: message,
          timestamp: new Date().toISOString(),
          autor: 'sistema',
          contactId: selectedContactId,
        };

        setMessages(prev => [...prev, newMessage]);
        
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
    try {
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

      const numero = contactId.replace('@s.whatsapp.net', '');
      const success = await ApiService.updateLeadStatus(numero, leadStatus);
      
      if (success) {
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

  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    setSelectedContactId(null);
    setMessages([]);
  };

  const handleContactsUpdate = (newContacts: Contact[]) => {
    setContacts(newContacts);
  };

  const handleAddWhatsApp = () => {
    // Disparar evento para abrir modal de configuração
    window.dispatchEvent(new CustomEvent('openWhatsAppConfig'));
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const contactMessages = messages.filter(m => m.contactId === selectedContactId);

  // Tela de loading inicial
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
      </Box>
    );
  }

  // Tela de erro com retry automático
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
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Reconectando automaticamente...
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Aguarde enquanto tentamos conectar novamente
        </Typography>
      </Box>
    );
  }

  // Tela de conexão WhatsApp - apenas se realmente não estiver conectado
  if (!whatsappStatus.connected && !loading && !isLoadingData) {
    console.log('🚨 Mostrando tela de conexão WhatsApp');
    console.log('📊 Status atual:', { whatsappStatus, loading, isLoadingData });
    
    return (
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        p: 4,
        textAlign: 'center'
      }}>
        <Box sx={{ 
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 4,
          p: 6,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          maxWidth: 500,
          width: '100%'
        }}>
          {/* Ícone WhatsApp */}
          <Box sx={{ 
            width: 100, 
            height: 100, 
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            mx: 'auto',
            boxShadow: '0 10px 30px rgba(37, 211, 102, 0.3)'
          }}>
            <Typography variant="h1" sx={{ color: 'white', fontSize: '3rem' }}>
              📱
            </Typography>
          </Box>

          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            mb: 2,
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Conecte o WhatsApp
          </Typography>

          <Typography variant="body1" sx={{ 
            color: 'text.secondary', 
            mb: 4,
            lineHeight: 1.6
          }}>
            Para começar a usar o sistema, você precisa<br />
            conectar o WhatsApp.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handleAddWhatsApp}
            sx={{
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              color: 'white',
              py: 2,
              px: 4,
              borderRadius: 3,
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 8px 25px rgba(37, 211, 102, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #128C7E 0%, #25D366 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 35px rgba(37, 211, 102, 0.4)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            Adicionar WhatsApp
          </Button>

          <Typography variant="body2" sx={{ 
            color: 'text.secondary', 
            mt: 3,
            opacity: 0.8
          }}>
            Após conectar o WhatsApp, você poderá ver e gerenciar seus<br />
            contatos aqui.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Dashboard principal
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
        {/* Header com tabs */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid #e0e0e0',
          flexShrink: 0,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Central de Atendimento
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: 'config' }))}
              sx={{ minWidth: 'auto' }}
            >
              Config
            </Button>
          </Box>
          
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

      {/* Overlay de carregamento transparente */}
      {isLoadingData && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <Box sx={{
            background: 'white',
            borderRadius: 2,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              {loadingMessage}
            </Typography>
          </Box>
        </Box>
      )}

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
    </Box>
  );
};

export default WhatsAppDashboard; 