import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Divider,
  Fab,
  Modal,
  Backdrop,
  Fade,
  useTheme,
  useMediaQuery,
  Tooltip,
  CircularProgress,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle,
  Error,
  QrCode2,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Phone as PhoneIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';
import ApiService from '../services/apiService';
import { API_CONFIG } from '../config/api';

// Configuração da URL do Socket e API
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://resoluty.onrender.com';
const API_BASE_URL = API_CONFIG.BASE_URL;

const socket = io(SOCKET_URL);

interface WhatsAppInstance {
  id: string;
  number: string;
  isConnected: boolean;
  enabled: boolean;
}

interface QRData {
  qr: string;
  instanceId: string;
  number: string;
}

interface WhatsAppConfig {
  instanceId: string;
  number: string;
  enabled: boolean;
}

export default function WhatsAppConfig() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [qrCodes, setQrCodes] = useState<Map<string, QRData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRData | null>(null);
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | null>(null);
  const [newConfig, setNewConfig] = useState<WhatsAppConfig>({
    instanceId: '',
    number: '',
    enabled: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInstances();

    // Escutar QR codes
    socket.on('qr', (data: QRData) => {
      setQrCodes(prev => new Map(prev.set(data.instanceId, data)));
      // Abrir modal automaticamente quando QR code é gerado
      setSelectedQR(data);
      setQrModalOpen(true);
    });

    // Escutar status de conexão
    socket.on('wpp-status', (data: { status: string; instanceId: string; number: string }) => {
      if (data.status === 'open') {
        setQrCodes(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.instanceId);
          return newMap;
        });
        setQrModalOpen(false);
        setSelectedQR(null);
        fetchInstances();
      }
    });

    // Escutar QR expirado
    socket.on('qr-expired', (data: { instanceId: string; number: string }) => {
      console.log('⏰ QR Code expirado para:', data.instanceId);
      // Remover QR expirado e aguardar novo
      setQrCodes(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.instanceId);
        return newMap;
      });
      // Fechar modal se estiver aberto para este QR
      if (selectedQR && selectedQR.instanceId === data.instanceId) {
        setQrModalOpen(false);
        setSelectedQR(null);
      }
    });

    return () => {
      socket.off('qr');
      socket.off('wpp-status');
      socket.off('qr-expired');
    };
  }, []);

  const fetchInstances = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances`);
      const data = await response.json();
      if (data.ok) {
        setInstances(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    if (instances.length >= 4) {
      setError('Limite máximo de 4 WhatsApp atingido. Remova uma instância antes de adicionar outra.');
      return;
    }
    
    setNewConfig({
      instanceId: `whatsapp-${instances.length + 1}`,
      number: '',
      enabled: true,
    });
    setEditingConfig(null);
    setDialogOpen(true);
  };

  const handleEdit = (instance: WhatsAppInstance) => {
    setEditingConfig({
      instanceId: instance.id,
      number: instance.number,
      enabled: instance.enabled,
    });
    setNewConfig({
      instanceId: instance.id,
      number: instance.number,
      enabled: instance.enabled,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (instanceId: string) => {
    if (window.confirm('Tem certeza que deseja remover este WhatsApp?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances/${instanceId}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.ok) {
          setSuccess('WhatsApp removido com sucesso!');
          fetchInstances();
        } else {
          setError('Erro ao remover WhatsApp');
        }
      } catch (error) {
        setError('Erro ao remover WhatsApp');
      }
    }
  };

  const handleSave = async () => {
    if (!newConfig.instanceId.trim() || !newConfig.number.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const config = editingConfig || newConfig;
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances/${config.instanceId}`, {
        method: editingConfig ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: config.number,
          enabled: config.enabled,
        }),
      });
      const data = await response.json();
      const success = data.ok;
      
      if (success) {
        setSuccess(editingConfig ? 'WhatsApp atualizado!' : 'WhatsApp adicionado! Aguarde o QR code aparecer...');
        setDialogOpen(false);
        fetchInstances();
      } else {
        setError('Erro ao salvar configuração');
      }
    } catch (error) {
      setError('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setEditingConfig(null);
    setNewConfig({
      instanceId: '',
      number: '',
      enabled: true,
    });
  };

  const handleShowQR = (instanceId: string) => {
    const qrData = qrCodes.get(instanceId);
    if (qrData) {
      setSelectedQR(qrData);
      setQrModalOpen(true);
    }
  };

  const handleCloseQR = () => {
    setQrModalOpen(false);
    setSelectedQR(null);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Carregando configurações...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 }, 
      maxWidth: 1400, 
      mx: 'auto',
      minHeight: '100vh',
      backgroundColor: 'background.default'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        mb: 4,
        gap: 2
      }}>
        <Box>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1"
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Configuração de WhatsApp
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie suas instâncias do WhatsApp ({instances.length}/4)
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{ 
            borderRadius: 3,
            px: 3,
            py: 1.5,
            background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
            boxShadow: '0 3px 5px 2px rgba(37, 211, 102, .3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #128C7E 30%, #075E54 90%)',
            }
          }}
        >
          Adicionar WhatsApp
        </Button>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Lista de WhatsApp */}
      <Grid container spacing={3}>
        {instances.map((instance) => (
          <Grid item xs={12} sm={6} lg={4} key={instance.id}>
            <Card 
              elevation={4}
              sx={{
                height: '100%',
                border: instance.isConnected ? '2px solid #25D366' : '2px solid #f44336',
                borderRadius: 3,
                position: 'relative',
                overflow: 'visible',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: instance.isConnected ? '#25D366' : '#f44336',
                      mr: 2,
                      width: 48,
                      height: 48
                    }}
                  >
                    <WhatsAppIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                      {instance.number || 'Número não configurado'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {instance.id}
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    icon={instance.isConnected ? <CheckCircle /> : <Error />}
                    label={instance.isConnected ? 'Conectado' : 'Desconectado'}
                    color={instance.isConnected ? 'success' : 'error'}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  />
                  <Chip
                    label={instance.enabled ? 'Ativo' : 'Inativo'}
                    color={instance.enabled ? 'primary' : 'default'}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  />
                </Stack>

                {/* QR Code se disponível */}
                {qrCodes.has(instance.id) && (
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'grey.50', 
                    borderRadius: 2,
                    textAlign: 'center',
                    border: '2px dashed #25D366'
                  }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                      <QrCode2 sx={{ mr: 1, verticalAlign: 'middle', color: '#25D366' }} />
                      QR Code Disponível
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<QrCode2 />}
                      onClick={() => handleShowQR(instance.id)}
                      sx={{ 
                        borderRadius: 2,
                        borderColor: '#25D366',
                        color: '#25D366',
                        '&:hover': {
                          borderColor: '#128C7E',
                          backgroundColor: 'rgba(37, 211, 102, 0.1)'
                        }
                      }}
                    >
                      Ver QR Code
                    </Button>
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ 
                justifyContent: 'space-between', 
                px: 3, 
                pb: 3,
                pt: 0
              }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(instance)}
                      color="primary"
                      sx={{ 
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' }
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remover">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(instance.id)}
                      color="error"
                      sx={{ 
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                {qrCodes.has(instance.id) && (
                  <Tooltip title="Ver QR Code">
                    <IconButton
                      size="small"
                      onClick={() => handleShowQR(instance.id)}
                      sx={{ 
                        bgcolor: '#25D366',
                        color: 'white',
                        '&:hover': { bgcolor: '#128C7E' }
                      }}
                    >
                      <QrCode2 />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}

        {instances.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 6, 
              textAlign: 'center',
              borderRadius: 3,
              bgcolor: 'grey.50'
            }}>
              <WhatsAppIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>
                Nenhum WhatsApp configurado
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Comece adicionando sua primeira instância do WhatsApp
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddNew}
                sx={{ 
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
                }}
              >
                Adicionar Primeiro WhatsApp
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Dialog para adicionar/editar */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCancel} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WhatsAppIcon />
            {editingConfig ? 'Editar WhatsApp' : 'Adicionar WhatsApp'}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="ID da Instância"
              value={newConfig.instanceId}
              onChange={(e) => setNewConfig({ ...newConfig, instanceId: e.target.value })}
              helperText="Ex: whatsapp-1, whatsapp-2, etc."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              label="Número do WhatsApp"
              value={newConfig.number}
              onChange={(e) => setNewConfig({ ...newConfig, number: e.target.value })}
              placeholder="5511999999999"
              helperText="Digite apenas números (com código do país)"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newConfig.enabled}
                  onChange={(e) => setNewConfig({ ...newConfig, enabled: e.target.checked })}
                  color="primary"
                />
              }
              label="Habilitar WhatsApp automaticamente"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleCancel}
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : null}
            sx={{ 
              borderRadius: 2,
              background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal QR Code */}
      <Modal
        open={qrModalOpen}
        onClose={handleCloseQR}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={qrModalOpen}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 400 },
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 24,
            p: 4,
            textAlign: 'center',
          }}>
            <IconButton
              onClick={handleCloseQR}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: 'grey.500',
              }}
            >
              <CloseIcon />
            </IconButton>
            
            {selectedQR && (
              <>
                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                  Conectar WhatsApp
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Escaneie o QR Code com seu WhatsApp
                </Typography>
                
                <Box sx={{ 
                  p: 3, 
                  bgcolor: 'grey.50', 
                  borderRadius: 2,
                  mb: 3,
                  border: '2px dashed #25D366'
                }}>
                  <QRCodeSVG 
                    value={selectedQR.qr} 
                    size={200} 
                    style={{ margin: '0 auto' }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  <strong>Número:</strong> {selectedQR.number}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Instância:</strong> {selectedQR.instanceId}
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    📱 Abra o WhatsApp no seu celular
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ⚙️ Vá em Configurações → Dispositivos Vinculados
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📷 Escaneie o QR Code acima
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Fade>
      </Modal>

      {/* FAB para adicionar */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={handleAddNew}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #128C7E 30%, #075E54 90%)',
            }
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
} 