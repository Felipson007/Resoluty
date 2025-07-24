import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Chip,
  Badge,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Contact } from './WhatsAppDashboard';

interface ConversationSidebarProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onContactSelect: (contactId: string) => void;
}

const statusConfig = {
  bot: { label: 'Bot', color: '#25D366' as const, icon: BotIcon },
  humano: { label: 'SDR', color: '#ff9800' as const, icon: PersonIcon },
  aguardando: { label: 'Aguardando', color: '#f44336' as const, icon: ScheduleIcon },
  finalizado: { label: 'Finalizado', color: '#4caf50' as const, icon: CheckCircleIcon },
};

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  contacts,
  selectedContactId,
  onContactSelect,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Central de Atendimento
        </Typography>
        
        {/* Campo de Busca */}
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar conversa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
        />
      </Box>

      {/* Lista de Conversas */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ p: 0 }}>
          {filteredContacts.map((contact, index) => {
            const StatusIcon = statusConfig[contact.status].icon;
            const isSelected = contact.id === selectedContactId;
            
            return (
              <React.Fragment key={contact.id}>
                <ListItem
                  button
                  onClick={() => onContactSelect(contact.id)}
                  sx={{
                    py: 2,
                    px: 2,
                    backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                    borderLeft: isSelected ? '4px solid #25D366' : '4px solid transparent',
                    '&:hover': {
                      backgroundColor: isSelected ? '#e3f2fd' : '#f5f5f5',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={contact.unreadCount}
                      color="error"
                      invisible={!contact.unreadCount}
                    >
                      <Avatar
                        sx={{
                          backgroundColor: contact.avatar ? 'transparent' : '#25D366',
                          width: 50,
                          height: 50,
                        }}
                        src={contact.avatar}
                      >
                        {!contact.avatar && getInitials(contact.name)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {contact.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {contact.lastMessageTime}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mb: 1,
                          }}
                        >
                          {contact.lastMessage}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Chip
                            icon={<StatusIcon sx={{ fontSize: '16px !important' }} />}
                            label={statusConfig[contact.status].label}
                            size="small"
                            sx={{
                              backgroundColor: `${statusConfig[contact.status].color}20`,
                              color: statusConfig[contact.status].color,
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                          
                          <Typography variant="caption" color="text.secondary">
                            {contact.phone}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                
                {index < filteredContacts.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default ConversationSidebar; 