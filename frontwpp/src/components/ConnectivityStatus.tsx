import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { Wifi as WifiIcon, WifiOff as WifiOffIcon } from '@mui/icons-material';
import { ConnectivityTest } from '../utils/connectivityTest';

const ConnectivityStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [testing, setTesting] = useState(false);

  const runConnectivityTest = async () => {
    try {
      setTesting(true);
      
      const results = await ConnectivityTest.testFullConnection();
      
      const allTestsPassed = results.apiHealth && results.socketConnection && results.qrTest;
      setIsConnected(allTestsPassed);
      
      // Só mostrar alerta se houver problemas persistentes
      if (!allTestsPassed && !showAlert) {
        setShowAlert(true);
        // Auto-hide após 10 segundos (reduzido)
        setTimeout(() => setShowAlert(false), 10000);
      } else if (allTestsPassed) {
        setShowAlert(false);
      }
    } catch (error) {
      setIsConnected(false);
      if (!showAlert) {
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 10000);
      }
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    // Executar teste inicial após 30 segundos (aumentado)
    const initialTest = setTimeout(runConnectivityTest, 30000);
    
    // Executar teste a cada 10 minutos (muito menos frequente)
    const interval = setInterval(runConnectivityTest, 600000);
    
    return () => {
      clearTimeout(initialTest);
      clearInterval(interval);
    };
  }, []);

  // Não mostrar nada se não há problemas
  if (!showAlert && isConnected !== false) {
    return null;
  }

  return (
    <Box sx={{ 
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 1000,
      maxWidth: 350
    }}>
      <Alert 
        severity="error"
        icon={<WifiOffIcon />}
        onClose={() => setShowAlert(false)}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={runConnectivityTest}
            disabled={testing}
          >
            {testing ? <CircularProgress size={16} /> : 'Testar'}
          </Button>
        }
      >
        <Typography variant="body2">
          Problemas de conectividade detectados
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          Verifique sua conexão com a internet
        </Typography>
      </Alert>
    </Box>
  );
};

export default ConnectivityStatus; 