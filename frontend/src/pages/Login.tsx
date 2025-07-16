import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Usuários definidos pelo desenvolvedor
const USERS = [
  { username: 'admin', password: 'admin123' },
  { username: 'user', password: 'user123' },
];

export default function Login() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = USERS.find(u => u.username === user && u.password === password);
    if (found) {
      setError('');
      navigate('/home');
    } else {
      setError('Usuário ou senha inválidos');
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f5f5f5">
      <Paper elevation={3} sx={{ p: 4, minWidth: 320 }}>
        <Typography variant="h5" mb={2}>Login</Typography>
        <form onSubmit={handleLogin}>
          <TextField label="Usuário" fullWidth margin="normal" value={user} onChange={e => setUser(e.target.value)} />
          <TextField label="Senha" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Entrar</Button>
        </form>
      </Paper>
    </Box>
  );
} 