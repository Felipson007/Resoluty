import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000'); // ajuste a URL se necessário

export default function WhatsAppQR() {
  const [qr, setQr] = useState('');

  useEffect(() => {
    socket.on('qr', (data) => {
      setQr(data.qr);
    });
    return () => {
      socket.off('qr');
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <h2>Escaneie o QR Code para conectar o WhatsApp</h2>
      {qr ? <QRCode value={qr} size={256} /> : <p>Aguardando QR Code...</p>}
    </div>
  );
} 