import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';
import ApiService from '../services/apiService';
import { API_CONFIG } from '../config/api';

// Configuração da URL do Socket e API
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000';
const API_BASE_URL = API_CONFIG.BASE_URL;

interface WhatsAppInstance {
  id: string;
  number: string;
  isConnected: boolean;
  enabled: boolean;
}

const WhatsAppConfig: React.FC = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    fetchInstances();
    setupSocket();
  }, []);

  const setupSocket = () => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('qr-code', (data: { qr: string }) => {
      console.log('📱 QR Code recebido:', data.qr);
      setQrCode(data.qr);
      setIsConnecting(false); // QR Code recebido, não está mais conectando
    });

    newSocket.on('whatsapp-status', (status: { connected: boolean; number: string }) => {
      console.log('📱 Status WhatsApp atualizado:', status);
      if (status.connected) {
        setIsConnecting(false);
        setQrCode('');
        setShowAddModal(false);
        setSuccess(`WhatsApp conectado com sucesso! Número: ${status.number}`);
        fetchInstances();
      }
    });

    return () => {
      newSocket.disconnect();
    };
  };

  const fetchInstances = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances`);
      const data = await response.json();
      setInstances(data);
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
      setError('Erro ao carregar instâncias do WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWhatsApp = () => {
    setShowAddModal(true);
    setQrCode('');
    setIsConnecting(false);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setQrCode('');
    setIsConnecting(false);
  };

  const handleRemoveWhatsApp = async (instanceId: string) => {
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
        console.error('Erro ao remover WhatsApp:', error);
        setError('Erro ao remover WhatsApp');
      }
    }
  };

  const handleRefresh = () => {
    fetchInstances();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WhatsAppIcon color="primary" />
          Configuração do WhatsApp
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddWhatsApp}
          sx={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
        >
          Adicionar WhatsApp
        </Button>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Lista de Instâncias */}
      <Grid container spacing={2}>
        {instances.map((instance) => (
          <Grid item xs={12} sm={6} md={4} key={instance.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WhatsAppIcon color={instance.isConnected ? 'success' : 'error'} />
                    <Typography variant="h6">
                      {instance.number || 'Número não disponível'}
                    </Typography>
                  </Box>
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveWhatsApp(instance.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={instance.isConnected ? 'Conectado' : 'Desconectado'}
                    color={instance.isConnected ? 'success' : 'error'}
                    size="small"
                  />
                  <Chip
                    label={instance.enabled ? 'Ativo' : 'Inativo'}
                    color={instance.enabled ? 'primary' : 'default'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {instances.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WhatsAppIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Nenhum WhatsApp configurado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Clique em "Adicionar WhatsApp" para começar
          </Typography>
        </Box>
      )}

      {/* Modal para Adicionar WhatsApp */}
      <Dialog open={showAddModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WhatsAppIcon color="primary" />
            Conectar WhatsApp
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {isConnecting && !qrCode && (
              <Box sx={{ mb: 2 }}>
                <CircularProgress size={40} sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Conectando WhatsApp...
                </Typography>
              </Box>
            )}

            {qrCode && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Escaneie o QR Code
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <QRCodeSVG value={qrCode} size={200} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Abra o WhatsApp no seu celular e escaneie o QR Code
                </Typography>
              </Box>
            )}

            {!qrCode && !isConnecting && (
              <Box sx={{ py: 4 }}>
                <CircularProgress size={60} />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Aguardando QR Code...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit">
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhatsAppConfig; 