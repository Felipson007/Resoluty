import { Mensagem } from '../types/conversa';
import { obterInformacoesBancos } from '../utils/scriptSDR';

interface ClienteInfo {
  nome?: string;
  numero?: string;
  status?: string;
}

/**
 * Função do "cérebro" para pré-processar o histórico completo de mensagens e gerar um prompt claro e focado para a IA.
 * - Processa toda a conversa (não apenas últimas 10)
 * - Inclui informações do cliente quando disponível
 * - Formata o prompt com instruções para a IA não fugir do escopo
 * - Mantém contexto completo da conversa
 * - Verifica bancos aceitos e não aceitos
 */
export function gerarPromptCerebro(
  historico: Mensagem[], 
  clienteInfo?: ClienteInfo,
  mensagemAtual?: string
): string {
  // Filtra mensagens muito curtas ou vazias
  const historicoFiltrado = historico.filter(msg => msg.texto && msg.texto.length > 2);
  
  // Formata o histórico completo para o prompt
  const historicoFormatado = historicoFiltrado.map((msg) =>
    `${msg.autor === 'usuario' ? 'Cliente' : 'Sistema'}: ${msg.texto}`
  ).join('\n');

  // Informações do cliente
  const infoCliente = clienteInfo ? `
INFORMAÇÕES DO CLIENTE:
- Nome: ${clienteInfo.nome || 'Não informado'}
- Número: ${clienteInfo.numero || 'Não informado'}
- Status: ${clienteInfo.status || 'Não informado'}
` : '';

  // Mensagem atual do cliente
  const mensagemCliente = mensagemAtual ? `\nMENSAGEM ATUAL DO CLIENTE: ${mensagemAtual}` : '';

  // Informações sobre bancos
  const infoBancos = obterInformacoesBancos();

  // Prompt com instrução clara para a IA
  const prompt = `Responda somente com a mensagem que deve ser enviada

${infoBancos}

${infoCliente}

HISTÓRICO COMPLETO DA CONVERSA:
${historicoFormatado}${mensagemCliente}

Baseado na conversa acima, responda como a Clara da Resoluty Consultoria. Seja natural, amigável e siga o fluxo da conversa.`;

  console.log('🧠 Prompt gerado (primeiros 500 chars):', prompt.substring(0, 500) + '...');
  return prompt;
}