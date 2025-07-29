import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
  Tooltip,
  Stack,
  Divider
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { ConnectivityTest } from '../utils/connectivityTest';

interface ConnectivityStatusProps {
  showDetails?: boolean;
}

export default function ConnectivityStatus({ showDetails = false }: ConnectivityStatusProps) {
  const [status, setStatus] = useState<'healthy' | 'warning' | 'critical' | 'loading'>('loading');
  const [lastTest, setLastTest] = useState<any>(null);
  const [expanded, setExpanded] = useState(showDetails);
  const [testing, setTesting] = useState(false);

  const connectivityTest = ConnectivityTest.getInstance();

  const runTest = async () => {
    setTesting(true);
    try {
      const result = await connectivityTest.runAllTests();
      setLastTest(result);
      setStatus(result.summary.overallStatus as 'healthy' | 'warning' | 'critical' | 'loading');
    } catch (error) {
      console.error('Erro ao testar conectividade:', error);
      setStatus('critical');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runTest();
    
    // Testar a cada 2 minutos
    const interval = setInterval(runTest, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon />;
      case 'warning': return <WarningIcon />;
      case 'critical': return <ErrorIcon />;
      default: return <WifiOffIcon />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'healthy': return 'Conectado';
      case 'warning': return 'Problemas';
      case 'critical': return 'Desconectado';
      default: return 'Testando...';
    }
  };

  const getStatusDescription = () => {
    if (!lastTest) return 'Testando conectividade...';
    
    const { summary } = lastTest;
    return `${summary.successfulTests}/${summary.totalTests} testes passaram (${summary.successRate}%)`;
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {testing ? (
              <CircularProgress size={20} />
            ) : (
              getStatusIcon()
            )}
            <Typography variant="h6" component="div">
              Status de Conectividade
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={getStatusText()}
              color={getStatusColor()}
              size="small"
              icon={getStatusIcon()}
            />
            
            <Tooltip title="Testar conectividade">
              <IconButton
                size="small"
                onClick={runTest}
                disabled={testing}
                sx={{ color: 'primary.main' }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={expanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {getStatusDescription()}
        </Typography>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            
            {lastTest && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Resultados dos Testes:
                </Typography>
                
                {lastTest.results.map((result: any, index: number) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {result.success ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" />
                    )}
                    
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {result.test === 'backend_health' && 'Backend'}
                      {result.test === 'socket_connection' && 'Socket.IO'}
                      {result.test === 'whatsapp_instances' && 'WhatsApp'}
                      {result.test === 'api_endpoints' && 'APIs'}
                    </Typography>
                    
                    <Chip
                      label={result.success ? 'OK' : 'Erro'}
                      color={result.success ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                ))}
                
                {lastTest.summary.issues.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Problemas detectados:</strong>
                    </Typography>
                    {lastTest.summary.issues.map((issue: any, index: number) => (
                      <Typography key={index} variant="body2" sx={{ mt: 0.5 }}>
                        • {issue.test}: {issue.details?.message || 'Erro desconhecido'}
                      </Typography>
                    ))}
                  </Alert>
                )}
                
                <Typography variant="caption" color="text.secondary">
                  Último teste: {new Date(lastTest.timestamp).toLocaleString()}
                </Typography>
              </Stack>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
} 