import React, { useState } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import WhatsAppDashboard from './components/WhatsAppDashboard';
import MultiWhatsAppQR from './components/MultiWhatsAppQR';
import WhatsAppConfig from './components/WhatsAppConfig';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#25D366', // Verde WhatsApp
    },
    secondary: {
      main: '#128C7E', // Verde escuro WhatsApp
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

type ViewType = 'dashboard' | 'qr' | 'config';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const renderCurrentView = () => {
    switch (currentView) {
      case 'qr':
        return <MultiWhatsAppQR />;
      case 'config':
        return <WhatsAppConfig />;
      default:
        return <WhatsAppDashboard />;
    }
  };

  const getViewIcon = () => {
    switch (currentView) {
      case 'qr':
        return '💬';
      case 'config':
        return '⚙️';
      default:
        return '📱';
    }
  };

  const getNextView = (): ViewType => {
    switch (currentView) {
      case 'dashboard':
        return 'qr';
      case 'qr':
        return 'config';
      case 'config':
        return 'dashboard';
      default:
        return 'dashboard';
    }
  };

  const handleViewToggle = () => {
    setCurrentView(getNextView());
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {renderCurrentView()}
        
        {/* Botão flutuante para alternar entre views */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Box
            onClick={handleViewToggle}
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 3,
              '&:hover': {
                backgroundColor: 'primary.dark',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {getViewIcon()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App; 