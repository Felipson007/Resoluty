import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Snackbar, 
  Typography, 
  Paper, 
  Chip, 
  Button, 
  Tabs, 
  Tab,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import { 
  WhatsApp as WhatsAppIcon, 
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import socketService from '../services/socketService';
import ApiService from '../services/apiService';
import CerebroEditor from './CerebroEditor';

interface WhatsAppInstance {
  id: string;
  number: string;
  isConnected: boolean;
  enabled: boolean;
}

interface SystemStatus {
  connected: boolean;
  number: string;
  aiActive: boolean;
  instances: WhatsAppInstance[];
  timestamp: number;
}

const WhatsAppOptimized: React.FC = () => {
  // Estados otimizados
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    connected: false,
    number: '',
    aiActive: true,
    instances: [],
    timestamp: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [isAddingInstance, setIsAddingInstance] = useState(false);
  const [showCerebroEditor, setShowCerebroEditor] = useState(false);

  // Configurações de performance
  const PERFORMANCE_CONFIG = {
    STATUS_UPDATE_INTERVAL: 30000, // 30 segundos
    QR_REFRESH_INTERVAL: 60000, // 60 segundos
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000,
  };

  // Memoizar status para evitar re-renders desnecessários
  const memoizedStatus = useMemo(() => systemStatus, [systemStatus]);

  // Função otimizada para verificar status
  const checkSystemStatus = useCallback(async () => {
    try {
      const instances = await ApiService.getWhatsAppInstances();
      const hasConnected = instances.some((instance: any) => instance.isConnected);
      
      const newStatus: SystemStatus = {
        connected: hasConnected,
        number: instances.find((i: any) => i.isConnected)?.number || '',
        aiActive: true,
        instances: instances,
        timestamp: Date.now()
      };

      setSystemStatus(newStatus);
      setError(null);
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      setError('Erro ao conectar com o servidor');
    }
  }, []);

  // Inicialização otimizada
  useEffect(() => {
    let statusInterval: NodeJS.Timeout;
    let retryCount = 0;

    const initializeSystem = async () => {
      try {
        setLoading(true);
        await checkSystemStatus();
        
        // Configurar verificação periódica
        statusInterval = setInterval(checkSystemStatus, PERFORMANCE_CONFIG.STATUS_UPDATE_INTERVAL);
        
      } catch (error) {
        retryCount++;
        if (retryCount < PERFORMANCE_CONFIG.MAX_RETRY_ATTEMPTS) {
          setTimeout(initializeSystem, PERFORMANCE_CONFIG.RETRY_DELAY);
        } else {
          setError('Falha ao inicializar sistema após múltiplas tentativas');
        }
      } finally {
        setLoading(false);
      }
    };

    initializeSystem();

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [checkSystemStatus]);

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

    const handleWhatsAppStatus = (status: any) => {
      setSystemStatus(prev => ({
        ...prev,
        ...status,
        timestamp: Date.now()
      }));
      
      // Navegar automaticamente para dashboard se conectado
      if (status.connected && status.number) {
        console.log('✅ WhatsApp conectado, navegando para dashboard...');
        try {
          // Disparar evento para mudar para dashboard
          window.dispatchEvent(new CustomEvent('changeView', { detail: 'dashboard' }));
          console.log('✅ Evento changeView disparado para dashboard');
        } catch (error) {
          console.error('❌ Erro ao navegar para dashboard:', error);
        }
      }
    };

    const handleQRCode = (data: { qr: string; instanceId?: string; number?: string }) => {
      setQrCode(data.qr);
      if (data.instanceId) {
        setSelectedInstance(data.instanceId);
      }
    };

    const handleQRExpired = () => {
      setQrCode('');
      setSelectedInstance(null);
    };

    const handleInstanceAdded = (data: { instanceId: string; number: string }) => {
      checkSystemStatus(); // Atualizar lista de instâncias
    };

    const handleInstanceConnected = (data: { instanceId: string; number: string }) => {
      console.log('✅ Instância conectada:', data);
      try {
        // Navegar automaticamente para dashboard quando uma instância se conectar
        window.dispatchEvent(new CustomEvent('changeView', { detail: 'dashboard' }));
        console.log('✅ Evento changeView disparado para dashboard (instance connected)');
      } catch (error) {
        console.error('❌ Erro ao navegar para dashboard (instance connected):', error);
      }
    };

    const handleInstanceReady = (data: { instanceId: string; number: string }) => {
      console.log('✅ Instância pronta:', data);
      try {
        // Navegar automaticamente para dashboard quando uma instância estiver pronta
        window.dispatchEvent(new CustomEvent('changeView', { detail: 'dashboard' }));
        console.log('✅ Evento changeView disparado para dashboard (instance ready)');
      } catch (error) {
        console.error('❌ Erro ao navegar para dashboard (instance ready):', error);
      }
    };

    const handleInstanceRemoved = (data: { instanceId: string }) => {
      checkSystemStatus(); // Atualizar lista de instâncias
    };

    socketService.on('socket-connected', handleSocketConnected);
    socketService.on('socket-disconnected', handleSocketDisconnected);
    socketService.on('whatsapp-status', handleWhatsAppStatus);
    socketService.on('qr', handleQRCode);
    socketService.on('qr-expired', handleQRExpired);
    socketService.on('whatsapp-instance-added', handleInstanceAdded);
    socketService.on('whatsapp-instance-connected', handleInstanceConnected);
    socketService.on('instance-connected', handleInstanceReady);
    socketService.on('whatsapp-instance-removed', handleInstanceRemoved);

    return () => {
      socketService.off('socket-connected', handleSocketConnected);
      socketService.off('socket-disconnected', handleSocketDisconnected);
      socketService.off('whatsapp-status', handleWhatsAppStatus);
      socketService.off('qr', handleQRCode);
      socketService.off('qr-expired', handleQRExpired);
      socketService.off('whatsapp-instance-added', handleInstanceAdded);
      socketService.off('whatsapp-instance-connected', handleInstanceConnected);
      socketService.off('instance-connected', handleInstanceReady);
      socketService.off('whatsapp-instance-removed', handleInstanceRemoved);
    };
  }, [checkSystemStatus]);

  // Função para navegar manualmente para dashboard
  const handleManualDashboardNavigation = () => {
    try {
      console.log('🔄 Navegação manual para dashboard...');
      window.dispatchEvent(new CustomEvent('changeView', { detail: 'dashboard' }));
      console.log('✅ Navegação manual executada');
    } catch (error) {
      console.error('❌ Erro na navegação manual:', error);
    }
  };

  // Função para adicionar nova instância
  const handleAddInstance = async () => {
    try {
      setIsAddingInstance(true);
      const instanceId = `instance_${Date.now()}`;
      const number = '5511999999999'; // Número padrão

      const response = await ApiService.addWhatsAppInstance(instanceId, number);
      
      if (response.success) {
        console.log('✅ Instância adicionada com sucesso');
      } else {
        throw new Error(response.error || 'Erro ao adicionar instância');
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar instância:', error);
      setError('Erro ao adicionar instância WhatsApp');
    } finally {
      setIsAddingInstance(false);
    }
  };

  // Função para remover instância
  const handleRemoveInstance = async (instanceId: string) => {
    try {
      const response = await ApiService.removeWhatsAppInstance(instanceId);
      
      if (response.success) {
        console.log('✅ Instância removida com sucesso');
      } else {
        throw new Error(response.error || 'Erro ao remover instância');
      }
    } catch (error) {
      console.error('❌ Erro ao remover instância:', error);
      setError('Erro ao remover instância WhatsApp');
    }
  };

  // Função para solicitar QR Code
  const handleRequestQR = async (instanceId: string, number: string) => {
    try {
      setLoading(true);
      const response = await ApiService.requestQRCode(instanceId, number);
      
      if (response.success) {
        console.log('✅ QR Code solicitado com sucesso');
      } else {
        throw new Error(response.error || 'Erro ao solicitar QR Code');
      }
    } catch (error) {
      console.error('❌ Erro ao solicitar QR Code:', error);
      setError('Erro ao solicitar QR Code');
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar status
  const handleRefreshStatus = () => {
    checkSystemStatus();
  };

  // Renderizar status de conexão
  const renderConnectionStatus = () => {
    const { connected, number } = memoizedStatus;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {connected ? (
          <CheckCircleIcon color="success" />
        ) : (
          <ErrorIcon color="error" />
        )}
        <Typography variant="body2">
          {connected ? `Conectado: ${number}` : 'Desconectado'}
        </Typography>
      </Box>
    );
  };

  // Renderizar instâncias
  const renderInstances = () => {
    return memoizedStatus.instances.map((instance) => (
      <Card key={instance.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WhatsAppIcon color={instance.isConnected ? 'success' : 'disabled'} />
              <Box>
                <Typography variant="h6">{instance.number}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {instance.isConnected ? 'Conectado' : 'Desconectado'}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!instance.isConnected && (
                <Tooltip title="Solicitar QR Code">
                  <IconButton
                    size="small"
                    onClick={() => handleRequestQR(instance.id, instance.number)}
                    disabled={loading}
                  >
                    <QrCodeIcon />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Remover instância">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveInstance(instance.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    ));
  };

  // Renderizar QR Code
  const renderQRCode = () => {
    if (!qrCode) return null;

    return (
      <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          QR Code para conexão
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Escaneie o QR Code com seu WhatsApp
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          p: 2,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          backgroundColor: '#f5f5f5'
        }}>
          <img 
            src={`data:image/png;base64,${qrCode}`} 
            alt="QR Code"
            style={{ maxWidth: '200px', height: 'auto' }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          QR Code expira em 60 segundos
        </Typography>
      </Paper>
    );
  };

  // Tela de loading
  if (loading && memoizedStatus.instances.length === 0) {
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

  return (
    <Box sx={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      p: 3,
      gap: 3,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WhatsAppIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              WhatsApp Manager
            </Typography>
            {renderConnectionStatus()}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Editar Cérebro da IA">
            <IconButton 
              onClick={() => setShowCerebroEditor(true)}
              sx={{ color: 'purple.main' }}
            >
              <PsychologyIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Atualizar status">
            <IconButton onClick={handleRefreshStatus} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          {memoizedStatus.connected && (
            <Tooltip title="Acessar Dashboard">
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleManualDashboardNavigation}
              >
                📱 Dashboard
              </Button>
            </Tooltip>
          )}
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddInstance}
            disabled={isAddingInstance}
          >
            {isAddingInstance ? 'Adicionando...' : 'Adicionar WhatsApp'}
          </Button>
        </Box>
      </Box>

      {/* QR Code */}
      {renderQRCode()}

      {/* Instâncias */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Instâncias WhatsApp ({memoizedStatus.instances.length})
        </Typography>
        
        {memoizedStatus.instances.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <WhatsAppIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma instância configurada
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clique em "Adicionar WhatsApp" para começar
            </Typography>
          </Paper>
        ) : (
          <Box>
            {renderInstances()}
          </Box>
        )}
      </Box>

      {/* Status do sistema */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 2,
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip 
            label={socketConnected ? 'Conectado' : 'Desconectado'}
            color={socketConnected ? 'success' : 'error'}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            {memoizedStatus.instances.filter(i => i.isConnected).length} de {memoizedStatus.instances.length} conectados
          </Typography>
        </Box>
        
        <Typography variant="caption" color="text.secondary">
          Última atualização: {new Date(memoizedStatus.timestamp).toLocaleTimeString()}
        </Typography>
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

      {/* Editor do Cérebro */}
      <CerebroEditor 
        open={showCerebroEditor}
        onClose={() => setShowCerebroEditor(false)}
      />
    </Box>
  );
};

export default WhatsAppOptimized; 