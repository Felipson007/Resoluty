import { Mensagem } from '../types/conversa';

/**
 * Função do "cérebro" para pré-processar o histórico de mensagens e gerar um prompt claro e focado para a IA.
 * - Filtra mensagens irrelevantes
 * - Limita o histórico às últimas 10 mensagens
 * - Formata o prompt com instruções para a IA não fugir do escopo
 */
export function gerarPromptCerebro(historico: Mensagem[]): string {
  // Filtra mensagens muito curtas ou vazias
  const historicoFiltrado = historico.filter(msg => msg.texto && msg.texto.length > 2);
  // Limita para as últimas 10 mensagens
  const ultimas = historicoFiltrado.slice(-10);
  // Formata o histórico para o prompt
  const historicoFormatado = ultimas.map((msg) =>
    `${msg.autor === 'usuario' ? 'Cliente' : 'Sistema'}: ${msg.texto}`
  ).join('\n');

  // Prompt com instrução clara para a IA
  return `Você é um assistente de suporte. Responda apenas sobre o problema do cliente, sem fugir do escopo. Não invente informações. Seja objetivo e claro.\n\nHistórico da conversa:\n${historicoFormatado}\n\nResponda de forma assertiva e focada no problema apresentado.`;
} 