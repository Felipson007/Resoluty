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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle,
  Error,
  QrCode2,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';
import { ApiService } from '../services/apiService';

// Configuração da URL do Socket e API
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://resoluty.onrender.com';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://resoluty.onrender.com';

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
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [qrCodes, setQrCodes] = useState<Map<string, QRData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | null>(null);
  const [newConfig, setNewConfig] = useState<WhatsAppConfig>({
    instanceId: '',
    number: '',
    enabled: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
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
      setError('Erro ao carregar configurações');
    }
  };

  const handleAddNew = () => {
    setNewConfig({
      instanceId: `bot${instances.length + 1}`,
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
    try {
      const success = await ApiService.removeWhatsApp(instanceId);
      if (success) {
        setSuccess('WhatsApp removido com sucesso!');
        fetchInstances();
      } else {
        setError('Erro ao remover WhatsApp');
      }
    } catch (error) {
      setError('Erro ao remover WhatsApp');
    }
  };

  const handleSave = async () => {
    try {
      const config = editingConfig || newConfig;
      const success = await ApiService.configureWhatsApp(
        config.instanceId,
        config.number,
        config.enabled
      );
      
      if (success) {
        setSuccess(editingConfig ? 'WhatsApp atualizado!' : 'WhatsApp adicionado!');
        setDialogOpen(false);
        fetchInstances();
      } else {
        setError('Erro ao salvar configuração');
      }
    } catch (error) {
      setError('Erro ao salvar configuração');
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

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Carregando configurações...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Configuração de WhatsApp
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{ borderRadius: 2 }}
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

      {/* Lista de WhatsApp */}
      <Grid container spacing={3}>
        {instances.map((instance) => (
          <Grid item xs={12} sm={6} md={4} key={instance.id}>
            <Card 
              elevation={3}
              sx={{
                border: instance.isConnected ? '2px solid #4caf50' : '2px solid #f44336',
                position: 'relative',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WhatsAppIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    {instance.number || 'Número não configurado'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    ID: {instance.id}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Chip
                      icon={instance.isConnected ? <CheckCircle /> : <Error />}
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
                </Box>

                {/* QR Code se disponível */}
                {qrCodes.has(instance.id) && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <QrCode2 sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Escaneie o QR Code
                    </Typography>
                    <QRCodeSVG 
                      value={qrCodes.get(instance.id)!.qr} 
                      size={150} 
                      style={{ margin: '0 auto' }}
                    />
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(instance)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(instance.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {instances.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhum WhatsApp configurado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clique em "Adicionar WhatsApp" para começar
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Dialog para adicionar/editar */}
      <Dialog open={dialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingConfig ? 'Editar WhatsApp' : 'Adicionar WhatsApp'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="ID da Instância"
              value={newConfig.instanceId}
              onChange={(e) => setNewConfig({ ...newConfig, instanceId: e.target.value })}
              margin="normal"
              helperText="Ex: bot1, bot2, etc."
            />
            <TextField
              fullWidth
              label="Número do WhatsApp"
              value={newConfig.number}
              onChange={(e) => setNewConfig({ ...newConfig, number: e.target.value })}
              margin="normal"
              placeholder="5511999999999"
              helperText="Digite apenas números"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newConfig.enabled}
                  onChange={(e) => setNewConfig({ ...newConfig, enabled: e.target.checked })}
                  color="primary"
                />
              }
              label="Habilitar WhatsApp"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 