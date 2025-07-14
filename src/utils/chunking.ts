import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export async function chunkText(text: string, maxTokens: number = 500): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxTokens,
    chunkOverlap: 50, // pode ajustar o overlap se quiser
  });
  const chunks = await splitter.splitText(text);
  return chunks;
} 