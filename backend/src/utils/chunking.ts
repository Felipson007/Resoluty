export async function chunkText(text: string, maxTokens: number = 500): Promise<string[]> {
  // Implementação simples de chunking por caracteres
  const chunkSize = maxTokens * 4; // Aproximadamente 4 caracteres por token
  const chunks: string[] = [];
  
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }
  
  return chunks;
} 