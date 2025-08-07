import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Save, Refresh, Close, ExpandMore } from '@mui/icons-material';
import ApiService from '../services/apiService';

interface CerebroEditorProps {
  open: boolean;
  onClose: () => void;
}

interface CerebroConfig {
  prompt: string;
  assistantId: string;
  maxAttempts: number;
  timeoutSeconds: number;
}

const CerebroEditor: React.FC<CerebroEditorProps> = ({ open, onClose }) => {
  const [config, setConfig] = useState<CerebroConfig>({
    prompt: '',
    assistantId: 'asst_rPvHoutBw01eSySqhtTK4Iv7',
    maxAttempts: 30,
    timeoutSeconds: 30
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar configurações atuais
  const carregarConfiguracoes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ApiService.getCerebroPrompt();
      if (response.success) {
        setConfig({
          prompt: response.prompt,
          assistantId: response.assistantId,
          maxAttempts: response.maxAttempts,
          timeoutSeconds: response.timeoutSeconds
        });
        if (response.isDefault) {
          setSuccess('✅ Carregadas configurações padrão (não há configuração salva)');
        } else {
          setSuccess('✅ Configurações carregadas do banco de dados');
        }
      } else {
        setError('❌ Erro ao carregar configurações');
      }
    } catch (err) {
      setError('❌ Erro ao carregar configurações');
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  // Salvar novas configurações
  const salvarConfiguracoes = async () => {
    if (!config.prompt.trim()) {
      setError('❌ Prompt não pode estar vazio');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await ApiService.saveCerebroPrompt(config);
      if (response.success) {
        setSuccess('✅ Configurações salvas com sucesso!');
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError('❌ Erro ao salvar configurações');
      }
    } catch (err) {
      setError('❌ Erro ao salvar configurações');
      console.error('Erro ao salvar configurações:', err);
    } finally {
      setSaving(false);
    }
  };

  // Carregar configurações quando abrir o modal
  useEffect(() => {
    if (open) {
      carregarConfiguracoes();
    }
  }, [open]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        style: {
          minHeight: '80vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            🧠 Editor do Cérebro - Configurações da IA
          </Typography>
          <Box>
            <Tooltip title="Recarregar configurações">
              <IconButton onClick={carregarConfiguracoes} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Configurações Avançadas */}
            <Accordion defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">⚙️ Configurações Avançadas</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Assistant ID</InputLabel>
                    <Select
                      value={config.assistantId}
                      onChange={(e) => setConfig(prev => ({ ...prev, assistantId: e.target.value }))}
                      label="Assistant ID"
                    >
                      <MenuItem value="asst_rPvHoutBw01eSySqhtTK4Iv7">asst_rPvHoutBw01eSySqhtTK4Iv7 (Padrão)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel>Máximo de Tentativas</InputLabel>
                    <Select
                      value={config.maxAttempts}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxAttempts: Number(e.target.value) }))}
                      label="Máximo de Tentativas"
                    >
                      <MenuItem value={15}>15 tentativas</MenuItem>
                      <MenuItem value={30}>30 tentativas</MenuItem>
                      <MenuItem value={45}>45 tentativas</MenuItem>
                      <MenuItem value={60}>60 tentativas</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel>Timeout (segundos)</InputLabel>
                    <Select
                      value={config.timeoutSeconds}
                      onChange={(e) => setConfig(prev => ({ ...prev, timeoutSeconds: Number(e.target.value) }))}
                      label="Timeout (segundos)"
                    >
                      <MenuItem value={15}>15 segundos</MenuItem>
                      <MenuItem value={30}>30 segundos</MenuItem>
                      <MenuItem value={45}>45 segundos</MenuItem>
                      <MenuItem value={60}>60 segundos</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Editor do Prompt */}
            <Box mt={2}>
              <Typography variant="h6" gutterBottom>
                📝 Prompt da IA
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Edite o prompt da IA. Use as variáveis:
              </Typography>
              <Typography variant="body2" color="primary" component="div" sx={{ mb: 2 }}>
                <code>
                  $&#123;historicoFormatado&#125; - Histórico da conversa<br/>
                  $&#123;mensagemCliente&#125; - Mensagem atual do cliente
                </code>
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                <strong>Dica:</strong> O prompt padrão contém apenas o contexto da conversa. 
                Adicione suas instruções específicas acima ou abaixo do contexto.
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={20}
                variant="outlined"
                value={config.prompt}
                onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Digite o prompt da IA aqui..."
                sx={{
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }
                }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={salvarConfiguracoes}
          variant="contained"
          startIcon={<Save />}
          disabled={saving || loading}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CerebroEditor; 