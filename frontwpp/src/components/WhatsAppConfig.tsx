import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import socketService from '../services/socketService';
import { API_CONFIG } from '../config/api';
import { ConnectivityTest } from '../utils/connectivityTest';

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
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Abrir modal automaticamente quando o componente for montado
  useEffect(() => {
    // Pequeno delay para garantir que o componente está renderizado
    const timer = setTimeout(() => {
      handleAddWhatsApp();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Monitorar mudanças no QR Code
  useEffect(() => {
    console.log('🔍 Estado do QR Code mudou:', { qrCode: qrCode ? 'Presente' : 'Ausente', isConnecting });
  }, [qrCode, isConnecting]);

  const setupSocket = useCallback(() => {
    console.log('🔌 Configurando Socket.IO para WhatsAppConfig...');
    
    // Garantir que o socket está conectado
    if (!socketService.isConnected()) {
      console.log('🔌 Socket não conectado, conectando...');
      socketService.connect();
    }

    // Listener para QR Code (evento principal)
    const handleQRCode = (data: { qr: string; instanceId?: string; number?: string }) => {
      console.log('🔍 WhatsAppConfig recebeu QR Code:', data);
      console.log('🔍 QR Code antes de setar:', qrCode);
      setQrCode(data.qr);
      setIsConnecting(false);
      console.log('🔍 QR Code após setar:', data.qr);
    };

    // Listener alternativo para QR Code
    const handleQRCodeAlt = (data: { qr: string }) => {
      console.log('🔍 WhatsAppConfig recebeu QR Code (alt):', data);
      console.log('🔍 QR Code antes de setar (alt):', qrCode);
      setQrCode(data.qr);
      setIsConnecting(false);
      console.log('🔍 QR Code após setar (alt):', data.qr);
    };

    // Listener para status do WhatsApp
    const handleWhatsAppStatus = (status: { connected: boolean; number: string }) => {
      console.log('📱 Status WhatsApp atualizado no WhatsAppConfig:', status);
      if (status.connected) {
        setIsConnecting(false);
        setQrCode('');
        setShowAddModal(false);
        setSuccess(`WhatsApp conectado com sucesso! Número: ${status.number}`);
        fetchInstances();
      }
    };

    // Listener para status de instâncias
    const handleInstancesUpdated = (instances: any[]) => {
      console.log('📱 Instâncias atualizadas no WhatsAppConfig:', instances);
      setInstances(instances);
    };

    // Adicionar listeners
    socketService.on('qr', handleQRCode);
    socketService.on('qr-code', handleQRCodeAlt);
    socketService.on('whatsapp-status', handleWhatsAppStatus);
    socketService.on('whatsapp-instances-updated', handleInstancesUpdated);

    // Log de debug
    setDebugInfo('Socket configurado, aguardando QR...');

    return () => {
      // Remover listeners
      socketService.off('qr', handleQRCode);
      socketService.off('qr-code', handleQRCodeAlt);
      socketService.off('whatsapp-status', handleWhatsAppStatus);
      socketService.off('whatsapp-instances-updated', handleInstancesUpdated);
    };
  }, []);

  useEffect(() => {
    fetchInstances();
    setupSocket();
  }, [setupSocket]);

  const fetchInstances = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/whatsapp/instances`);
      const data = await response.json();
      setInstances(data);
      console.log('📱 Instâncias carregadas:', data);
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
      setError('Erro ao carregar instâncias do WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWhatsApp = async () => {
    console.log('➕ Iniciando adição de WhatsApp...');
    setShowAddModal(true);
    setQrCode('');
    setIsConnecting(true);
    setError(null);
    setSuccess(null);
    setDebugInfo('Modal aberto, aguardando QR...');
    
    try {
      // Gerar um ID único para a instância
      const instanceId = `instance_${Date.now()}`;
      const number = '5511999999999'; // Número padrão, pode ser alterado depois
      
      console.log('📱 Solicitando QR code ao backend...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/whatsapp/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceId,
          number
        })
      });
      
      const data = await response.json();
      console.log('📱 Resposta do backend:', data);
      
      if (data.success) {
        setDebugInfo('WhatsApp iniciado, aguardando QR code...');
      } else {
        setError('Erro ao iniciar WhatsApp');
        setDebugInfo(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar WhatsApp:', error);
      setError('Erro ao conectar com o backend');
      setDebugInfo('Erro de conexão');
    }
  };

  const handleCloseModal = () => {
    console.log('❌ Fechando modal...');
    setShowAddModal(false);
    setQrCode('');
    setIsConnecting(false);
    setDebugInfo('');
  };

  const handleRemoveWhatsApp = async (instanceId: string) => {
    if (window.confirm('Tem certeza que deseja remover este WhatsApp?')) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/whatsapp/instances/${instanceId}`, {
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

  const handleTestQR = async () => {
    try {
      console.log('🧪 Testando QR Code...');
      setDebugInfo('Testando QR Code...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/test/qr`, {
        method: 'POST'
      });
      
      const data = await response.json();
      console.log('🧪 Resposta do teste:', data);
      
      if (data.success) {
        setDebugInfo(`Teste enviado: ${data.message}`);
      } else {
        setDebugInfo(`Erro no teste: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Erro no teste:', error);
      setDebugInfo('Erro no teste de QR Code');
    }
  };

  const handleTestConnectivity = async () => {
    try {
      console.log('🔍 Iniciando teste de conectividade...');
      setDebugInfo('Executando teste de conectividade...');
      
      const results = await ConnectivityTest.testFullConnection();
      console.log('📊 Resultados do teste:', results);
      
      const summary = `API: ${results.apiHealth ? '✅' : '❌'}, Socket: ${results.socketConnection ? '✅' : '❌'}, QR: ${results.qrTest ? '✅' : '❌'}`;
      setDebugInfo(`Teste completo: ${summary}`);
      
      if (results.errors.length > 0) {
        console.error('❌ Erros encontrados:', results.errors);
      }
    } catch (error) {
      console.error('❌ Erro no teste de conectividade:', error);
      setDebugInfo('Erro no teste de conectividade');
    }
  };

  const handleForceCheckStatus = async () => {
    try {
      console.log('🔍 Forçando verificação de status...');
      setDebugInfo('Verificando status do WhatsApp...');
      
      const apiService = await import('../services/apiService');
      const result = await apiService.default.forceCheckStatus();
      
      if (result.success) {
        setDebugInfo('Verificação executada com sucesso');
        setSuccess('Status verificado com sucesso!');
        // Recarregar instâncias após verificação
        fetchInstances();
      } else {
        setDebugInfo('Erro na verificação de status');
        setError('Erro ao verificar status');
      }
    } catch (error) {
      console.error('❌ Erro na verificação forçada:', error);
      setDebugInfo('Erro na verificação de status');
      setError('Erro ao verificar status');
    }
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
                  {qrCode && qrCode.length > 0 ? (
                    <QRCodeSVG 
                      value={qrCode} 
                      size={200}
                      onError={(error) => console.error('❌ Erro ao renderizar QR Code:', error)}
                    />
                  ) : (
                    <Typography color="error">
                      QR Code inválido
                    </Typography>
                  )}
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
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Verificando conexão com o servidor...
                </Typography>
              </Box>
            )}

            {/* Debug info */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Debug: isConnecting={isConnecting.toString()}, qrCode={qrCode ? 'Presente' : 'Ausente'}
              </Typography>
            </Box>
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