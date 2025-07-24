import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocalOffer as TagIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { Contact } from './WhatsAppDashboard';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  contact: Contact;
  onStatusChange: (contactId: string, newStatus: 'bot' | 'humano' | 'aguardando' | 'finalizado') => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  contact,
  onStatusChange,
}) => {
  const [message, setMessage] = useState('');
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleActionsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setActionsMenuAnchor(event.currentTarget);
  };

  const handleActionsMenuClose = () => {
    setActionsMenuAnchor(null);
  };

  const handleStatusChange = (newStatus: 'bot' | 'humano' | 'aguardando' | 'finalizado') => {
    onStatusChange(contact.id, newStatus);
    handleActionsMenuClose();
  };

  const sendQuickResponse = (quickMessage: string) => {
    onSendMessage(quickMessage);
    handleActionsMenuClose();
  };

  const quickResponses = [
    'Obrigado por entrar em contato! Como posso ajudá-lo?',
    'Vou verificar essa informação para você.',
    'Aguarde um momento, por favor.',
    'Está tudo esclarecido? Precisa de mais alguma coisa?',
  ];

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      {/* Respostas Rápidas */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {quickResponses.map((response, index) => (
          <Button
            key={index}
            size="small"
            variant="outlined"
            onClick={() => sendQuickResponse(response)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.75rem',
              backgroundColor: '#f8f9fa',
              '&:hover': {
                backgroundColor: '#e9ecef',
              },
            }}
          >
            {response.length > 30 ? `${response.substring(0, 30)}...` : response}
          </Button>
        ))}
      </Box>

      {/* Campo de Digitação */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        {/* Botões de Ação Lateral */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Tooltip title="Anexar arquivo">
            <IconButton size="small" color="primary">
              <AttachFileIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Emojis">
            <IconButton size="small" color="primary">
              <EmojiIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Campo de Texto */}
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Digite sua mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              backgroundColor: '#f8f9fa',
            },
          }}
        />

        {/* Botão de Envio */}
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!message.trim()}
          sx={{
            backgroundColor: message.trim() ? '#25D366' : '#e0e0e0',
            color: 'white',
            '&:hover': {
              backgroundColor: message.trim() ? '#128C7E' : '#e0e0e0',
            },
            '&:disabled': {
              color: '#999',
            },
          }}
        >
          <SendIcon />
        </IconButton>

        {/* Menu de Ações */}
        <IconButton onClick={handleActionsMenuOpen}>
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Botões de Ação Rápida */}
      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          startIcon={<PersonIcon />}
          variant={contact.status === 'humano' ? 'contained' : 'outlined'}
          onClick={() => handleStatusChange('humano')}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            backgroundColor: contact.status === 'humano' ? '#ff9800' : 'transparent',
            borderColor: '#ff9800',
            color: contact.status === 'humano' ? 'white' : '#ff9800',
            '&:hover': {
              backgroundColor: contact.status === 'humano' ? '#f57c00' : '#fff3e0',
            },
          }}
        >
          {contact.status === 'humano' ? 'SDR Ativo' : 'Assumir SDR'}
        </Button>

        <Button
          size="small"
          startIcon={<BotIcon />}
          variant={contact.status === 'bot' ? 'contained' : 'outlined'}
          onClick={() => handleStatusChange('bot')}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            backgroundColor: contact.status === 'bot' ? '#25D366' : 'transparent',
            borderColor: '#25D366',
            color: contact.status === 'bot' ? 'white' : '#25D366',
            '&:hover': {
              backgroundColor: contact.status === 'bot' ? '#128C7E' : '#e8f5e8',
            },
          }}
        >
          {contact.status === 'bot' ? 'Bot Ativo' : 'Passar p/ Bot'}
        </Button>

        <Button
          size="small"
          startIcon={<TagIcon />}
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            borderColor: '#9c27b0',
            color: '#9c27b0',
            '&:hover': {
              backgroundColor: '#f3e5f5',
            },
          }}
        >
          Adicionar Tag
        </Button>

        <Button
          size="small"
          startIcon={<CheckCircleIcon />}
          variant="outlined"
          onClick={() => handleStatusChange('finalizado')}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            borderColor: '#4caf50',
            color: '#4caf50',
            '&:hover': {
              backgroundColor: '#e8f5e8',
            },
          }}
        >
          Finalizar
        </Button>
      </Box>

      {/* Menu de Ações Avançadas */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={handleActionsMenuClose}
      >
        <MenuItem onClick={() => handleStatusChange('aguardando')}>
          <ScheduleIcon sx={{ mr: 1 }} />
          Marcar como Aguardando
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleActionsMenuClose}>
          <TagIcon sx={{ mr: 1 }} />
          Gerenciar Tags
        </MenuItem>
        <MenuItem onClick={handleActionsMenuClose}>
          Ver Histórico Completo
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default MessageInput; 