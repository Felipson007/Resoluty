import { ApiService } from '../services/apiService';

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
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://resoluty.onrender.com'}/health`);
      const data = await response.json();
      
      return {
        status: 'success',
        uptime: data.uptime,
        memory: data.memory,
        clients: data.clients
      };
    } catch (error) {
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
      const io = socket(process.env.REACT_APP_SOCKET_URL || 'https://resoluty.onrender.com');
      
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
      const instances = await ApiService.getWhatsAppInstances();
      
      return {
        status: 'success',
        instances: instances.length,
        connected: instances.filter((i: any) => i.isConnected).length,
        details: instances
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
      '/api/test',
      '/api/whatsapp/instances',
      '/api/leads'
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://resoluty.onrender.com'}${endpoint}`);
          const data = await response.json();
          
          return {
            endpoint,
            status: response.ok ? 'success' : 'error',
            data
          };
        } catch (error: any) {
          return {
            endpoint,
            status: 'error',
            error: error.message
          };
        }
      })
    );

    return {
      status: 'success',
      endpoints: results.map((result, index) => ({
        endpoint: endpoints[index],
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : result.reason
      }))
    };
  }

  private generateSummary(results: Array<{test: string, success: boolean, details: any}>) {
    const totalTests = results.length;
    const successfulTests = results.filter(r => r.success).length;
    const successRate = (successfulTests / totalTests) * 100;

    const issues = results
      .filter(r => !r.success)
      .map(r => ({ test: r.test, details: r.details }));

    return {
      totalTests,
      successfulTests,
      successRate: Math.round(successRate),
      issues,
      overallStatus: successRate >= 75 ? 'healthy' : successRate >= 50 ? 'warning' : 'critical'
    };
  }

  getTestHistory() {
    return this.testResults.slice(-20); // Últimos 20 testes
  }

  getLastTestResult() {
    return this.testResults[this.testResults.length - 1];
  }

  // Função para monitorar conectividade em tempo real
  startContinuousMonitoring() {
    console.log('🔍 Iniciando monitoramento contínuo de conectividade...');
    
    setInterval(async () => {
      try {
        const result = await this.runAllTests();
        console.log('📊 Resultado do monitoramento:', result.summary);
        
        if (result.summary.overallStatus === 'critical') {
          console.error('🚨 Problemas críticos de conectividade detectados!');
        } else if (result.summary.overallStatus === 'warning') {
          console.warn('⚠️ Problemas de conectividade detectados');
        }
      } catch (error) {
        console.error('❌ Erro no monitoramento de conectividade:', error);
      }
    }, 60000); // Testar a cada minuto
  }
} 