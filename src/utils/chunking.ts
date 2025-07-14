// Função utilitária para dividir um texto em chunks de até 500 tokens
// (Tokenização real deve ser feita com LangChain ou OpenAI, aqui é um placeholder)

export function chunkText(text: string, maxTokens: number = 500): string[] {
  // TODO: Substituir por tokenização real
  const words = text.split(' ');
  const chunks: string[] = [];
  let chunk: string[] = [];

  for (const word of words) {
    chunk.push(word);
    if (chunk.length >= maxTokens) {
      chunks.push(chunk.join(' '));
      chunk = [];
    }
  }
  if (chunk.length > 0) {
    chunks.push(chunk.join(' '));
  }
  return chunks;
} 