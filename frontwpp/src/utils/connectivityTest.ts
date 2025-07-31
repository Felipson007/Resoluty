import socketService from '../services/socketService';
import ApiService from '../services/apiService';

export class ConnectivityTest {
  static async testFullConnection() {
    console.log('🧪 Iniciando teste completo de conectividade...');
    
    const results = {
      apiHealth: false,
      socketConnection: false,
      qrTest: false,
      errors: [] as string[]
    };

    try {
      // Teste 1: Health check da API
      console.log('1️⃣ Testando health check da API...');
      const healthCheck = await ApiService.checkHealth();
      results.apiHealth = healthCheck;
      console.log('✅ Health check:', healthCheck);

      // Teste 2: Conexão do Socket
      console.log('2️⃣ Testando conexão do Socket...');
      const socketTest = await socketService.testConnection();
      results.socketConnection = socketTest;
      console.log('✅ Socket connection:', socketTest);

      // Teste 3: Teste de QR Code
      console.log('3️⃣ Testando QR Code...');
      try {
        const response = await fetch('https://resoluty.onrender.com/api/test/qr', {
          method: 'POST'
        });
        const data = await response.json();
        results.qrTest = data.success;
        console.log('✅ QR test:', data.success);
      } catch (error) {
        console.error('❌ QR test error:', error);
        results.errors.push(`QR Test: ${error}`);
      }

    } catch (error) {
      console.error('❌ Erro no teste de conectividade:', error);
      results.errors.push(`General: ${error}`);
    }

    console.log('📊 Resultados do teste:', results);
    return results;
  }

  static async testSocketEvents() {
    console.log('🔍 Testando eventos do Socket...');
    
    return new Promise((resolve) => {
      let eventsReceived = 0;
      const expectedEvents = ['qr', 'qr-code', 'whatsapp-status'];
      
      const timeout = setTimeout(() => {
        console.log('⏰ Timeout no teste de eventos');
        resolve({ success: false, eventsReceived, expectedEvents: expectedEvents.length });
      }, 10000);

      // Adicionar listeners temporários
      expectedEvents.map(event => {
        const listener = (data: any) => {
          console.log(`📡 Evento recebido: ${event}`, data);
          eventsReceived++;
          
          if (eventsReceived >= expectedEvents.length) {
            clearTimeout(timeout);
            expectedEvents.forEach(evt => socketService.off(evt, listener));
            resolve({ success: true, eventsReceived, expectedEvents: expectedEvents.length });
          }
        };
        
        socketService.on(event, listener);
        return listener;
      });

      // Emitir teste de QR
      fetch('https://resoluty.onrender.com/api/test/qr', { method: 'POST' });
    });
  }
} 