import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { Contact, Message } from './WhatsAppDashboard';

interface ChatAreaProps {
  contact: Contact;
  messages: Message[];
  onStatusChange: (contactId: string, newStatus: 'bot' | 'humano' | 'aguardando' | 'finalizado') => void;
}

const statusConfig = {
  bot: { label: 'Bot Ativo', color: '#25D366', icon: BotIcon },
  humano: { label: 'SDR Atendendo', color: '#ff9800', icon: PersonIcon },
  aguardando: { label: 'Aguardando Cliente', color: '#f44336', icon: ScheduleIcon },
  finalizado: { label: 'Atendimento Finalizado', color: '#4caf50', icon: CheckCircleIcon },
};

const ChatArea: React.FC<ChatAreaProps> = ({ contact, messages, onStatusChange }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = (newStatus: 'bot' | 'humano' | 'aguardando' | 'finalizado') => {
    onStatusChange(contact.id, newStatus);
    handleMenuClose();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatusIcon = statusConfig[contact.status].icon;

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header do Chat */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{
              backgroundColor: contact.avatar ? 'transparent' : '#25D366',
              width: 40,
              height: 40,
              mr: 2,
            }}
            src={contact.avatar}
          >
            {!contact.avatar && getInitials(contact.name)}
          </Avatar>
          
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {contact.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {contact.phone}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<StatusIcon sx={{ fontSize: '16px !important' }} />}
            label={statusConfig[contact.status].label}
            size="small"
            sx={{
              backgroundColor: `${statusConfig[contact.status].color}20`,
              color: statusConfig[contact.status].color,
              fontWeight: 500,
            }}
          />
          
          <IconButton onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => handleStatusChange('bot')}>
              <BotIcon sx={{ mr: 1 }} /> Passar para Bot
            </MenuItem>
            <MenuItem onClick={() => handleStatusChange('humano')}>
              <PersonIcon sx={{ mr: 1 }} /> Assumir SDR
            </MenuItem>
            <MenuItem onClick={() => handleStatusChange('aguardando')}>
              <ScheduleIcon sx={{ mr: 1 }} /> Aguardando Cliente
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => handleStatusChange('finalizado')}>
              <CheckCircleIcon sx={{ mr: 1 }} /> Finalizar Atendimento
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Área de Mensagens */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          backgroundColor: '#e5ddd5',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="a" patternUnits="userSpaceOnUse" width="100" height="100"%3E%3Cpath d="M0 0h100v100H0z" fill="%23e5ddd5"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100%25" height="100%25" fill="url(%23a)"/%3E%3C/svg%3E")',
          minHeight: 0,
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Typography>Nenhuma mensagem ainda</Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: message.autor === 'usuario' ? 'flex-start' : 'flex-end',
                mb: 1,
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  maxWidth: '70%',
                  p: 1.5,
                  backgroundColor:
                    message.autor === 'usuario' ? '#ffffff' : '#dcf8c6',
                  borderRadius: 2,
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 0,
                    height: 0,
                    border: '6px solid transparent',
                    ...(message.autor === 'usuario'
                      ? {
                          left: -12,
                          top: 8,
                          borderRightColor: '#ffffff',
                        }
                      : {
                          right: -12,
                          top: 8,
                          borderLeftColor: '#dcf8c6',
                        }),
                  },
                }}
              >
                <Typography variant="body1" sx={{ mb: 0.5 }}>
                  {message.texto}
                </Typography>
                
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    {formatTime(message.timestamp)}
                  </Typography>
                  
                  {message.autor === 'sistema' && (
                    <DoneAllIcon
                      sx={{
                        fontSize: '16px',
                        color: '#4fc3f7',
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>
    </Box>
  );
};

export default ChatArea; 