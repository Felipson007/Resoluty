import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { Wifi as WifiIcon, WifiOff as WifiOffIcon } from '@mui/icons-material';
import { ConnectivityTest } from '../utils/connectivityTest';

const ConnectivityStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastTest, setLastTest] = useState<string>('');
  const [testing, setTesting] = useState(false);

  const runConnectivityTest = async () => {
    try {
      setTesting(true);
      console.log('🔍 Executando teste de conectividade...');
      
      const results = await ConnectivityTest.testFullConnection();
      
      const allTestsPassed = results.apiHealth && results.socketConnection && results.qrTest;
      setIsConnected(allTestsPassed);
      
      const summary = `API: ${results.apiHealth ? '✅' : '❌'}, Socket: ${results.socketConnection ? '✅' : '❌'}, QR: ${results.qrTest ? '✅' : '❌'}`;
      setLastTest(summary);
      
      console.log('📊 Resultados do teste:', results);
    } catch (error) {
      console.error('❌ Erro no teste de conectividade:', error);
      setIsConnected(false);
      setLastTest('Erro no teste');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    // Executar teste inicial
    runConnectivityTest();
    
    // Executar teste a cada 30 segundos
    const interval = setInterval(runConnectivityTest, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (isConnected === null) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={20} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Verificando conectividade...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Alert 
        severity={isConnected ? 'success' : 'error'}
        icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
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
          {isConnected ? 'Conectado' : 'Desconectado'}
        </Typography>
        {lastTest && (
          <Typography variant="caption" display="block">
            {lastTest}
          </Typography>
        )}
      </Alert>
    </Box>
  );
};

export default ConnectivityStatus; 