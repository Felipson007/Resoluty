import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';

// Configuração de autenticação
let auth: any = null;
let sheets: any = null;

async function initializeAuth() {
  if (auth) return auth;
  
  try {
    // Verificar se arquivo de credenciais existe
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.log('⚠️ Arquivo credentials.json não encontrado. Google Sheets desabilitado.');
      return null;
    }
    
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    sheets = google.sheets({ version: 'v4', auth });
    
    console.log('✅ Google Sheets autenticação inicializada');
    return auth;
  } catch (error: any) {
    console.error('❌ Erro ao inicializar Google Sheets:', error.message);
    return null;
  }
}

export const googleSheetsService = {
  async testConnection() {
    try {
      await initializeAuth();
      
      if (!auth || !SHEET_ID) {
        return { status: 'disabled', message: 'Google Sheets não configurado' };
      }
      
      // Tentar ler uma célula para testar
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'A1:A1',
      });
      
      return { 
        status: 'connected', 
        message: 'Google Sheets conectado com sucesso',
        sheetId: SHEET_ID
      };
    } catch (error: any) {
      console.error('❌ Erro ao testar Google Sheets:', error);
      return { 
        status: 'error', 
        message: error.message 
      };
    }
  },

  async writeData(range: string, values: any[][]) {
    try {
      await initializeAuth();
      
      if (!auth || !SHEET_ID) {
        console.log('⚠️ Google Sheets não configurado, pulando escrita');
        return { status: 'skipped' };
      }
      
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });
      
      console.log(`📊 Dados escritos no Sheets: ${range}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao escrever no Sheets:', error);
      throw error;
    }
  },

  async appendData(range: string, values: any[][]) {
    try {
      await initializeAuth();
      
      if (!auth || !SHEET_ID) {
        console.log('⚠️ Google Sheets não configurado, pulando append');
        return { status: 'skipped' };
      }
      
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: values
        }
      });
      
      console.log(`📊 Dados adicionados no Sheets: ${range}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao adicionar no Sheets:', error);
      throw error;
    }
  },

  async readData(range: string) {
    try {
      await initializeAuth();
      
      if (!auth || !SHEET_ID) {
        console.log('⚠️ Google Sheets não configurado, retornando vazio');
        return [];
      }
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: range,
      });
      
      return response.data.values || [];
    } catch (error: any) {
      console.error('❌ Erro ao ler do Sheets:', error);
      throw error;
    }
  },

  async logUserAction(action: string, details: any, userId: string = 'frontend-user') {
    try {
      const timestamp = new Date().toISOString();
      const formattedDate = new Date().toLocaleString('pt-BR');
      
      const row = [
        formattedDate,
        userId,
        action,
        JSON.stringify(details).substring(0, 500), // Limitar tamanho
        timestamp
      ];
      
      await this.appendData('UserActions!A:E', [row]);
      console.log(`📝 Ação do usuário logada: ${action}`);
    } catch (error: any) {
      console.error('❌ Erro ao logar ação do usuário:', error);
      // Não propagar erro para não quebrar fluxo principal
    }
  },

  async logFrontendEvent(event: string, details: any) {
    try {
      const timestamp = new Date().toISOString();
      const formattedDate = new Date().toLocaleString('pt-BR');
      
      const row = [
        formattedDate,
        event,
        JSON.stringify(details).substring(0, 500), // Limitar tamanho
        timestamp
      ];
      
      await this.appendData('FrontendEvents!A:D', [row]);
      console.log(`📊 Evento do frontend logado: ${event}`);
    } catch (error: any) {
      console.error('❌ Erro ao logar evento do frontend:', error);
      // Não propagar erro para não quebrar fluxo principal
    }
  },

  async getStats() {
    try {
      await initializeAuth();
      
      if (!auth || !SHEET_ID) {
        return { status: 'disabled', message: 'Google Sheets não configurado' };
      }

      // Buscar dados das últimas 24h de UserActions
      const userActionsData = await this.readData('UserActions!A:E');
      const frontendEventsData = await this.readData('FrontendEvents!A:D');
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Filtrar dados das últimas 24h (assumindo que a primeira coluna é a data)
      const recentUserActions = userActionsData.filter((row: any[]) => {
        if (row.length < 5) return false;
        const rowDate = new Date(row[4]); // timestamp está na coluna 5 (índice 4)
        return rowDate > yesterday;
      });
      
      const recentFrontendEvents = frontendEventsData.filter((row: any[]) => {
        if (row.length < 4) return false;
        const rowDate = new Date(row[3]); // timestamp está na coluna 4 (índice 3)
        return rowDate > yesterday;
      });

      return {
        userActions: {
          total: userActionsData.length,
          last24h: recentUserActions.length
        },
        frontendEvents: {
          total: frontendEventsData.length,
          last24h: recentFrontendEvents.length
        },
        lastUpdate: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return { 
        error: error.message,
        lastUpdate: new Date().toISOString()
      };
    }
  },

  async createHeaders() {
    try {
      // Headers para aba de Ações do Usuário
      const userActionHeaders = [
        ['Data/Hora', 'User ID', 'Ação', 'Detalhes', 'Timestamp']
      ];
      
      // Headers para aba de Eventos do Frontend
      const frontendEventHeaders = [
        ['Data/Hora', 'Evento', 'Detalhes', 'Timestamp']
      ];
      
      await this.writeData('UserActions!A1:E1', userActionHeaders);
      await this.writeData('FrontendEvents!A1:D1', frontendEventHeaders);
      
      console.log('✅ Headers criados no Google Sheets');
    } catch (error: any) {
      console.error('❌ Erro ao criar headers:', error);
    }
  }
}; 