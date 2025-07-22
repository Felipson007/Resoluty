import React, { useState } from 'react';
import { Box, TextField, Button, Paper, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { resolutyPalette } from './CustomerSuccess';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulação de validação de login
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        // Login bem-sucedido
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify({ username, role: 'admin' }));
        navigate('/home');
      } else if (username === 'user' && password === 'user123') {
        // Login bem-sucedido para usuário comum
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify({ username, role: 'user' }));
        navigate('/home');
      } else {
        setError('Usuário ou senha incorretos. Tente: admin/admin123 ou user/user123');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Box sx={{ minHeight: '100vh', background: resolutyPalette.background, color: resolutyPalette.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ background: resolutyPalette.card, color: resolutyPalette.text, borderRadius: 3, boxShadow: 4, minWidth: { xs: 280, sm: 340 }, maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, p: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, textAlign: 'center', color: resolutyPalette.text }}>Login Resoluty</Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', fontSize: 14 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField 
            fullWidth 
            label="Usuário" 
            variant="outlined" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            sx={{ 
              input: { color: resolutyPalette.text }, 
              label: { color: resolutyPalette.text },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: resolutyPalette.text },
                '&:hover fieldset': { borderColor: resolutyPalette.activeSidebar },
                '&.Mui-focused fieldset': { borderColor: resolutyPalette.activeSidebar }
              }
            }} 
          />
          <TextField 
            fullWidth 
            label="Senha" 
            type="password" 
            variant="outlined" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            sx={{ 
              input: { color: resolutyPalette.text }, 
              label: { color: resolutyPalette.text },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: resolutyPalette.text },
                '&:hover fieldset': { borderColor: resolutyPalette.activeSidebar },
                '&.Mui-focused fieldset': { borderColor: resolutyPalette.activeSidebar }
              }
            }} 
          />
          <Button 
            fullWidth 
            variant="contained" 
            type="submit"
            disabled={isLoading || !username || !password}
            sx={{ 
              background: resolutyPalette.activeSidebar, 
              color: resolutyPalette.text, 
              fontWeight: 700, 
              fontSize: 18, 
              py: 1.5, 
              ':hover': { background: resolutyPalette.hoverSidebar },
              ':disabled': { background: resolutyPalette.sidebar, color: resolutyPalette.text }
            }}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </Box>

        {/* Removido: Dica de credenciais de teste */}
      </Paper>
    </Box>
  );
} 