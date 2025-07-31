import { Mensagem } from '../types/conversa';
import { SCRIPT_SDR, identificarPassoConversa, gerarRespostaScript, obterInformacoesBancos } from '../utils/scriptSDR';

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
 * - Analisa o passo da conversa baseado no SCRIPT - SDR
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

  // Identificar o passo atual da conversa
  const historicoTextos = historicoFiltrado.map(msg => msg.texto);
  const passoAtual = identificarPassoConversa(historicoTextos, mensagemAtual || '');


  // Informações sobre bancos
  const infoBancos = obterInformacoesBancos();

  // Prompt com instrução clara para a IA baseado no SCRIPT - SDR
  return `Segundo o Documento "SCRIPT - SDR" analise em qual Passo a conversa se encontra e retorne a mensagem entre aspas seguindo sempre as instruções descritas entre as mensagens, se não conseguir identificar em qual passo a conversa se encontra retorne "Biscoito"'


SCRIPT - SDR DISPONÍVEL:
${SCRIPT_SDR.map(passo => 
  `PASSO ${passo.id}: ${passo.name}
   Triggers: ${passo.trigger.join(', ')}
   Resposta: ${passo.response || '[GERADA DINAMICAMENTE]'}
   Instruções: ${passo.instructions}
   ${passo.bankRelated ? 'RELACIONADO A BANCO: SIM' : ''}`
).join('\n\n')}

${infoBancos}

PASSO IDENTIFICADO: ${passoAtual ? passoAtual.name : 'NÃO IDENTIFICADO'}


${infoCliente}

HISTÓRICO COMPLETO DA CONVERSA:
${historicoFormatado}${mensagemCliente}

IMPORTANTE: Retorne APENAS a resposta do script. NÃO adicione explicações ou texto extra.`;
}