export async function getSheetData(sheetId: string, tab: string): Promise<any[][]> {
  const res = await fetch(`/api/sheets/${sheetId}/${tab}`);
  if (!res.ok) throw new Error('Erro ao buscar dados do Google Sheets');
  const json = await res.json();
  return json.data;
} 