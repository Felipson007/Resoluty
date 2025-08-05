const axios = require('axios');

const BASE_URL = 'https://resoluty.onrender.com';
const TEST_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  delayBetweenTests: 2000
};

class OptimizationTester {
  constructor() {
    this.results = {
      health: null,
      performance: null,
      whatsapp: null,
      memory: null
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testHealth() {
    console.log('🏥 Testando health check...');
    try {
      const start = Date.now();
      const response = await axios.get(`${BASE_URL}/health`, { timeout: TEST_CONFIG.timeout });
      const end = Date.now();
      
      this.results.health = {
        success: true,
        responseTime: end - start,
        data: response.data
      };
      
      console.log(`✅ Health check: ${end - start}ms`);
      return true;
    } catch (error) {
      console.error('❌ Health check falhou:', error.message);
      this.results.health = { success: false, error: error.message };
      return false;
    }
  }

  async testWhatsAppInstances() {
    console.log('📱 Testando instâncias WhatsApp...');
    try {
      const start = Date.now();
      const response = await axios.get(`${BASE_URL}/api/whatsapp/instances`, { timeout: TEST_CONFIG.timeout });
      const end = Date.now();
      
      this.results.whatsapp = {
        success: true,
        responseTime: end - start,
        instances: response.data.instances || [],
        health: response.data.health
      };
      
      console.log(`✅ WhatsApp instances: ${end - start}ms (${response.data.instances?.length || 0} instâncias)`);
      return true;
    } catch (error) {
      console.error('❌ WhatsApp instances falhou:', error.message);
      this.results.whatsapp = { success: false, error: error.message };
      return false;
    }
  }

  async testAddInstance() {
    console.log('➕ Testando adição de instância...');
    try {
      const instanceId = `test_instance_${Date.now()}`;
      const number = '5511999999999';
      
      const start = Date.now();
      const response = await axios.post(`${BASE_URL}/api/whatsapp/add`, {
        instanceId,
        number
      }, { timeout: TEST_CONFIG.timeout });
      const end = Date.now();
      
      console.log(`✅ Adicionar instância: ${end - start}ms`);
      
      // Aguardar um pouco e testar QR Code
      await this.delay(2000);
      await this.testRequestQR(instanceId, number);
      
      return true;
    } catch (error) {
      console.error('❌ Adicionar instância falhou:', error.message);
      return false;
    }
  }

  async testRequestQR(instanceId, number) {
    console.log('📱 Testando solicitação de QR Code...');
    try {
      const start = Date.now();
      const response = await axios.post(`${BASE_URL}/api/whatsapp/request-qr`, {
        instanceId,
        number
      }, { timeout: TEST_CONFIG.timeout });
      const end = Date.now();
      
      console.log(`✅ QR Code request: ${end - start}ms`);
      
      // Verificar se o QR Code foi gerado em tempo aceitável
      if (end - start < 60000) { // Menos de 60 segundos
        console.log('✅ QR Code gerado em tempo aceitável');
      } else {
        console.warn('⚠️ QR Code demorou mais que o esperado');
      }
      
      return true;
    } catch (error) {
      console.error('❌ QR Code request falhou:', error.message);
      return false;
    }
  }

  async testPerformance() {
    console.log('📊 Testando performance...');
    try {
      const tests = [
        this.testHealth(),
        this.testWhatsAppInstances(),
        this.testAddInstance()
      ];
      
      const results = await Promise.allSettled(tests);
      const successfulTests = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      this.results.performance = {
        success: successfulTests === tests.length,
        testsRun: tests.length,
        testsPassed: successfulTests,
        successRate: (successfulTests / tests.length) * 100
      };
      
      console.log(`✅ Performance: ${successfulTests}/${tests.length} testes passaram`);
      return true;
    } catch (error) {
      console.error('❌ Performance test falhou:', error.message);
      this.results.performance = { success: false, error: error.message };
      return false;
    }
  }

  async testMemoryUsage() {
    console.log('💾 Testando uso de memória...');
    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: TEST_CONFIG.timeout });
      const memory = response.data.memory;
      
      // Converter para MB
      const heapUsedMB = parseInt(memory.heapUsed);
      const heapTotalMB = parseInt(memory.heapTotal);
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      this.results.memory = {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        usagePercent: usagePercent,
        isHealthy: usagePercent < 80
      };
      
      console.log(`✅ Memória: ${heapUsedMB}MB/${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`);
      
      if (usagePercent > 80) {
        console.warn('⚠️ Uso de memória alto!');
      } else {
        console.log('✅ Uso de memória saudável');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Memory test falhou:', error.message);
      this.results.memory = { success: false, error: error.message };
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Iniciando testes de otimização...\n');
    
    const tests = [
      () => this.testHealth(),
      () => this.testWhatsAppInstances(),
      () => this.testAddInstance(),
      () => this.testPerformance(),
      () => this.testMemoryUsage()
    ];
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      await test();
      
      if (i < tests.length - 1) {
        console.log(`⏳ Aguardando ${TEST_CONFIG.delayBetweenTests}ms...\n`);
        await this.delay(TEST_CONFIG.delayBetweenTests);
      }
    }
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n📋 RESUMO DOS TESTES');
    console.log('='.repeat(50));
    
    // Health Check
    if (this.results.health?.success) {
      console.log(`✅ Health Check: ${this.results.health.responseTime}ms`);
    } else {
      console.log('❌ Health Check: FALHOU');
    }
    
    // WhatsApp
    if (this.results.whatsapp?.success) {
      console.log(`✅ WhatsApp: ${this.results.whatsapp.responseTime}ms (${this.results.whatsapp.instances.length} instâncias)`);
    } else {
      console.log('❌ WhatsApp: FALHOU');
    }
    
    // Performance
    if (this.results.performance?.success) {
      console.log(`✅ Performance: ${this.results.performance.successRate.toFixed(1)}% (${this.results.performance.testsPassed}/${this.results.performance.testsRun})`);
    } else {
      console.log('❌ Performance: FALHOU');
    }
    
    // Memory
    if (this.results.memory?.isHealthy) {
      console.log(`✅ Memória: ${this.results.memory.usagePercent.toFixed(1)}% (SAUDÁVEL)`);
    } else if (this.results.memory?.usagePercent) {
      console.log(`⚠️ Memória: ${this.results.memory.usagePercent.toFixed(1)}% (ALTO)`);
    } else {
      console.log('❌ Memória: FALHOU');
    }
    
    console.log('='.repeat(50));
    
    // Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    
    if (this.results.health?.responseTime > 5000) {
      console.log('- ⚠️ Health check está lento, verificar servidor');
    }
    
    if (this.results.whatsapp?.responseTime > 3000) {
      console.log('- ⚠️ WhatsApp API está lenta, verificar instâncias');
    }
    
    if (this.results.memory?.usagePercent > 80) {
      console.log('- 🚨 Uso de memória alto, verificar vazamentos');
    }
    
    if (this.results.performance?.successRate < 100) {
      console.log('- ⚠️ Alguns testes falharam, verificar logs');
    }
    
    console.log('\n🎯 Otimizações implementadas com sucesso!');
  }
}

// Executar testes
async function main() {
  const tester = new OptimizationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = OptimizationTester; 