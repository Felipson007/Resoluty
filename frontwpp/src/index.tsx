import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CSS Global para otimizar o layout
const globalStyles = `
  * {
    box-sizing: border-box;
  }
  
  html, body, #root {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
  
  #root {
    display: flex;
    flex-direction: column;
  }
  
  body {
    font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  }
`;

// Injetar estilos globais
const styleSheet = document.createElement('style');
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 