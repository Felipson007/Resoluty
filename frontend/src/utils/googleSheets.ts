// Utilitário para leitura de Google Sheets via backend (Service Account)

export async function getSheetData(spreadsheetId: string, sheetName: string): Promise<any[][]> {
  const url = `http://localhost:4000/api/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Erro ao buscar dados do backend');
  const data = await response.json();
  return data || [];
} 