import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

export const openaiEmbeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
}); 