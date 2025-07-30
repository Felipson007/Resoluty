import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';

// Configuração da URL do Socket
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000';

const socket = io(SOCKET_URL);

export default function WhatsAppQR() {
  const [qr, setQr] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    socket.on('qr', (data) => {
      setQr(data.qr);
    });
    socket.on('wpp-status', (data) => {
      setStatus(data.status);
    });
    return () => {
      socket.off('qr');
      socket.off('wpp-status');
    };
  }, []);

  if (status === 'open') {
    return null; // Não mostra nada se já está conectado
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <h2>Escaneie o QR Code para conectar o WhatsApp</h2>
      {qr ? <QRCodeSVG value={qr} size={256} /> : <p>Aguardando QR Code...</p>}
    </div>
  );
} 