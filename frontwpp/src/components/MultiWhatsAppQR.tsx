import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Typography, Grid, Paper, Chip } from '@mui/material';
import { CheckCircle, Error, QrCode2 } from '@mui/icons-material';
import io from 'socket.io-client';
import { API_CONFIG } from '../config/api';

// Configuração da URL do Socket e API
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://resoluty.onrender.com';
const API_BASE_URL = API_CONFIG.BASE_URL;

const socket = io(SOCKET_URL);

interface WhatsAppInstance {
  id: string;
  number: string;
  isConnected: boolean;
}

interface QRData {
  qr: string;
  instanceId: string;
  number: string;
}

export default function MultiWhatsAppQR() {
  const [qrCodes, setQrCodes] = useState<Map<string, QRData>>(new Map());
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar instâncias existentes
    fetchInstances();

    // Escutar QR codes
    socket.on('qr', (data: QRData) => {
      setQrCodes(prev => new Map(prev.set(data.instanceId, data)));
    });

    // Escutar status de conexão
    socket.on('wpp-status', (data: { status: string; instanceId: string; number: string }) => {
      if (data.status === 'open') {
        setQrCodes(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.instanceId);
          return newMap;
        });
        fetchInstances();
      }
    });

    return () => {
      socket.off('qr');
      socket.off('wpp-status');
    };
  }, []);

  const fetchInstances = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances`);
      const data = await response.json();
      if (data.ok) {
        setInstances(data.data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Carregando WhatsApp...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
        Status dos WhatsApp
      </Typography>
      
      <Grid container spacing={3}>
        {instances.map((instance) => (
          <Grid item xs={12} sm={6} md={4} key={instance.id}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                border: instance.isConnected ? '2px solid #4caf50' : '2px solid #f44336'
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                WhatsApp {instance.number}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                {instance.isConnected ? (
                  <Chip 
                    icon={<CheckCircle />} 
                    label="Conectado" 
                    color="success" 
                    variant="outlined"
                  />
                ) : (
                  <Chip 
                    icon={<Error />} 
                    label="Desconectado" 
                    color="error" 
                    variant="outlined"
                  />
                )}
              </Box>

              {qrCodes.has(instance.id) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <QrCode2 sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Escaneie o QR Code
                  </Typography>
                  <QRCodeSVG 
                    value={qrCodes.get(instance.id)!.qr} 
                    size={200} 
                    style={{ margin: '0 auto' }}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 