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
  Switch,
  FormControlLabel,
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
  Support as SupportIcon,
} from '@mui/icons-material';
import { Contact } from './WhatsAppDashboard';
import ApiService from '../services/apiService';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  contact: Contact;
  onStatusChange: (contactId: string, newStatus: 'bot' | 'humano' | 'aguardando' | 'finalizado') => void;
  selectedInstanceId?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  contact,
  onStatusChange,
  selectedInstanceId,
}) => {
  const [message, setMessage] = useState('');
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [sdrMode, setSdrMode] = useState(false);

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

  const handleSDRToggle = async () => {
    if (!selectedInstanceId) return;
    
    try {
      const success = await ApiService.toggleSdr(contact.id, selectedInstanceId);
      if (success) {
        setSdrMode((prev) => !prev);
      }
    } catch (error) {
      console.error('Erro ao alternar modo SDR:', error);
    }
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
    <Paper elevation={1} sx={{ p: 1.5 }}>
      {/* Controles de Status */}
      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={contact.status === 'bot' ? 'contained' : 'outlined'}
            startIcon={<BotIcon />}
            onClick={() => handleStatusChange('bot')}
            sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}
          >
            Bot Ativo
          </Button>
          
          <Button
            size="small"
            variant={contact.status === 'humano' ? 'contained' : 'outlined'}
            startIcon={<PersonIcon />}
            onClick={() => handleStatusChange('humano')}
            sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}
          >
            Assumir SDR
          </Button>
          
          <Button
            size="small"
            variant={contact.status === 'finalizado' ? 'contained' : 'outlined'}
            startIcon={<CheckCircleIcon />}
            onClick={() => handleStatusChange('finalizado')}
            sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}
          >
            Finalizar
          </Button>
        </Box>

        {/* SDR Ativo Switch */}
        <FormControlLabel
          control={
            <Switch
              checked={sdrMode}
              onChange={handleSDRToggle}
              color="primary"
              size="small"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem' }}>
              <SupportIcon fontSize="small" />
              SDR Ativo
            </Box>
          }
          sx={{ ml: 0 }}
        />
      </Box>

      {/* Respostas Rápidas */}
      <Box sx={{ mb: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {quickResponses.map((response, index) => (
          <Button
            key={index}
            size="small"
            variant="outlined"
            onClick={() => sendQuickResponse(response)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.7rem',
              backgroundColor: '#f8f9fa',
              padding: '4px 8px',
              minHeight: '28px',
              '&:hover': {
                backgroundColor: '#e9ecef',
              },
            }}
          >
            {response.length > 25 ? `${response.substring(0, 25)}...` : response}
          </Button>
        ))}
      </Box>

      {/* Campo de Mensagem */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <IconButton size="small">
          <EmojiIcon />
        </IconButton>
        
        <TextField
          fullWidth
          multiline
          maxRows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua mensagem..."
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              fontSize: '0.875rem',
            },
          }}
        />
        
        <IconButton size="small">
          <AttachFileIcon />
        </IconButton>
        
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!message.trim()}
          sx={{
            backgroundColor: message.trim() ? 'primary.main' : 'grey.300',
            color: message.trim() ? 'white' : 'grey.500',
            '&:hover': {
              backgroundColor: message.trim() ? 'primary.dark' : 'grey.300',
            },
          }}
        >
          <SendIcon />
        </IconButton>
        
        <IconButton onClick={handleActionsMenuOpen} size="small">
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Menu de Ações */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={handleActionsMenuClose}
      >
        <MenuItem onClick={() => handleStatusChange('aguardando')}>
          <ScheduleIcon sx={{ mr: 1 }} />
          Aguardando
        </MenuItem>
        <Divider />
        <MenuItem>
          <TagIcon sx={{ mr: 1 }} />
          Adicionar Tag
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default MessageInput; 