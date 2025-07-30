import ApiService from '../services/apiService';

export class ConnectivityTest {
  private static instance: ConnectivityTest;
  private testResults: Array<{timestamp: string, test: string, success: boolean, details: any}> = [];

  static getInstance(): ConnectivityTest {
    if (!ConnectivityTest.instance) {
      ConnectivityTest.instance = new ConnectivityTest();
    }
    return ConnectivityTest.instance;
  }

  async runAllTests() {
    console.log('🔍 Iniciando testes de conectividade...');
    
    const tests = [
      this.testBackendHealth(),
      this.testSocketConnection(),
      this.testWhatsAppInstances(),
      this.testApiEndpoints()
    ];

    const results = await Promise.allSettled(tests);
    
    const testResults = results.map((result, index) => {
      const testName = ['backend_health', 'socket_connection', 'whatsapp_instances', 'api_endpoints'][index];
      const success = result.status === 'fulfilled';
      const details = result.status === 'fulfilled' ? result.value : result.reason;
      
      this.testResults.push({
        timestamp: new Date().toISOString(),
        test: testName,
        success,
        details
      });

      return { test: testName, success, details };
    });

    return {
      timestamp: new Date().toISOString(),
      results: testResults,
      summary: this.generateSummary(testResults)
    };
  }

  private async testBackendHealth() {
    try {
      const response = await fetch('https://resoluty.onrender.com/health');
      const data = await response.json();
      
      return {
        status: 'success',
        uptime: data.uptime,
        memory: data.memory,
        clients: data.clients
      };
    } catch (error: any) {
      throw {
        status: 'error',
        message: 'Backend não está respondendo',
        error: error.message
      };
    }
  }

  private async testSocketConnection() {
    return new Promise((resolve, reject) => {
      const socket = require('socket.io-client');
      const io = socket('https://resoluty.onrender.com');
      
      const timeout = setTimeout(() => {
        io.disconnect();
        reject({
          status: 'error',
          message: 'Timeout ao conectar Socket.IO',
          timeout: true
        });
      }, 10000);

      io.on('connect', () => {
        clearTimeout(timeout);
        io.disconnect();
        resolve({
          status: 'success',
          message: 'Socket.IO conectado com sucesso',
          socketId: io.id
        });
      });

      io.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        io.disconnect();
        reject({
          status: 'error',
          message: 'Erro ao conectar Socket.IO',
          error: error.message
        });
      });
    });
  }

  private async testWhatsAppInstances() {
    try {
      const response = await fetch('https://resoluty.onrender.com/api/whatsapp/instances');
      const data = await response.json();
      
      return {
        status: 'success',
        instances: data,
        count: data.length
      };
    } catch (error: any) {
      throw {
        status: 'error',
        message: 'Erro ao buscar instâncias WhatsApp',
        error: error.message
      };
    }
  }

  private async testApiEndpoints() {
    const endpoints = [
      'https://resoluty.onrender.com/api/test',
      'https://resoluty.onrender.com/api/leads',
      'https://resoluty.onrender.com/api/whatsapp/status'
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (url) => {
        const response = await fetch(url);
        return {
          url,
          status: response.status,
          ok: response.ok
        };
      })
    );

    const endpointResults = results.map((result, index) => {
      const url = endpoints[index];
      const success = result.status === 'fulfilled' && result.value.ok;
      
      return {
        url,
        success,
        details: result.status === 'fulfilled' ? result.value : result.reason
      };
    });

    return {
      status: 'success',
      endpoints: endpointResults,
      working: endpointResults.filter(r => r.success).length
    };
  }

  private generateSummary(results: Array<{test: string, success: boolean, details: any}>) {
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = total - passed;

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100
    };
  }

  getTestHistory() {
    return this.testResults;
  }

  getLastTestResult() {
    return this.testResults[this.testResults.length - 1];
  }

  startContinuousMonitoring() {
    // Executar testes a cada minuto
    setInterval(() => {
      this.runAllTests().then(result => {
        console.log('📊 Resultado do monitoramento:', result.summary);
      }).catch(error => {
        console.error('❌ Erro no monitoramento:', error);
      });
    }, 60000); // Testar a cada minuto
  }
} 