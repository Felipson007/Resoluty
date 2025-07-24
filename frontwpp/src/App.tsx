import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import WhatsAppDashboard from './components/WhatsAppDashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#25D366', // Verde WhatsApp
    },
    secondary: {
      main: '#128C7E', // Verde escuro WhatsApp
    },
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', overflow: 'hidden' }}>
        <WhatsAppDashboard />
      </Box>
    </ThemeProvider>
  );
}

export default App; 