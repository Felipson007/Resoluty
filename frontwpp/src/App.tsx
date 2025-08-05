import React, { useState, useMemo } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import WhatsAppDashboard from './components/WhatsAppDashboard';
import WhatsAppOptimized from './components/WhatsAppOptimized';
import MultiWhatsAppQR from './components/MultiWhatsAppQR';
import WhatsAppConfig from './components/WhatsAppConfig';

// Tema personalizado otimizado
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
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

type ViewType = 'dashboard' | 'optimized' | 'qr' | 'config';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('optimized');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Memoizar view para evitar re-renders desnecessários
  const memoizedView = useMemo(() => currentView, [currentView]);

  // Escutar eventos de mudança de view
  React.useEffect(() => {
    const handleViewChange = (event: CustomEvent) => {
      setCurrentView(event.detail as ViewType);
    };

    const handleOpenWhatsAppConfig = () => {
      setCurrentView('config');
    };

    window.addEventListener('changeView', handleViewChange as EventListener);
    window.addEventListener('openWhatsAppConfig', handleOpenWhatsAppConfig as EventListener);
    
    return () => {
      window.removeEventListener('changeView', handleViewChange as EventListener);
      window.removeEventListener('openWhatsAppConfig', handleOpenWhatsAppConfig as EventListener);
    };
  }, []);

  const renderCurrentView = () => {
    switch (memoizedView) {
      case 'optimized':
        return <WhatsAppOptimized />;
      case 'dashboard':
        return <WhatsAppDashboard />;
      case 'qr':
        return <MultiWhatsAppQR />;
      case 'config':
        return <WhatsAppConfig />;
      default:
        return <WhatsAppOptimized />;
    }
  };

  const getViewIcon = () => {
    switch (memoizedView) {
      case 'optimized':
        return '⚡';
      case 'dashboard':
        return '📱';
      case 'qr':
        return '💬';
      case 'config':
        return '⚙️';
      default:
        return '⚡';
    }
  };

  const getNextView = (): ViewType => {
    switch (memoizedView) {
      case 'optimized':
        return 'dashboard';
      case 'dashboard':
        return 'qr';
      case 'qr':
        return 'config';
      case 'config':
        return 'optimized';
      default:
        return 'optimized';
    }
  };

  const handleViewToggle = () => {
    setCurrentView(getNextView());
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
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
              fontSize: '1.5rem',
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