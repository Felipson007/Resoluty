import { Mensagem } from '../types/conversa';

interface ClienteInfo {
  nome?: string;
  numero?: string;
  status?: string;
}

interface ConversaStatus {
  isPrimeiraInteracao: boolean;
  etapaProcesso?: string;
  totalMensagens: number;
  tempoConversa?: string;
}

/**
 * Fornece contexto da conversa e informações do cliente para a IA generativa.
 * A IA já foi treinada com o prompt específico da Resoluty, este serviço apenas
 * complementa com o contexto da conversa atual.
 */
export function gerarPromptCerebro(
  historico: Mensagem[], 
  clienteInfo?: ClienteInfo,
  mensagemAtual?: string
): string {
  // Filtra mensagens muito curtas ou vazias
  const historicoFiltrado = historico.filter(msg => msg.texto && msg.texto.length > 2);
  
  // Filtra mensagens muito antigas (mantém apenas últimas 50 mensagens)
  const historicoLimitado = historicoFiltrado.slice(-50);
  
  // Analisa status da conversa
  const statusConversa = analisarStatusConversa(historicoLimitado);
  
  // Formata o histórico com timestamps
  const historicoFormatado = historicoLimitado.map((msg) => {
    const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString('pt-BR') : 'Sem timestamp';
    return `[${timestamp}] ${msg.autor === 'usuario' ? 'Cliente' : 'Clara'}: ${msg.texto}`;
  }).join('\n');

  // Informações do cliente
  const infoCliente = clienteInfo ? `
=== INFORMAÇÕES DO CLIENTE ===
Nome: ${clienteInfo.nome || 'Não informado'}
Número: ${clienteInfo.numero || 'Não informado'}
Status: ${clienteInfo.status || 'Não informado'}
` : '';

  // Status da conversa
  const statusInfo = `
=== STATUS DA CONVERSA ===
Primeira interação: ${statusConversa.isPrimeiraInteracao ? 'Sim' : 'Não'}
Total de mensagens: ${statusConversa.totalMensagens}
${statusConversa.etapaProcesso ? `Etapa do processo: ${statusConversa.etapaProcesso}` : ''}
${statusConversa.tempoConversa ? `Tempo de conversa: ${statusConversa.tempoConversa}` : ''}
`;

  // Mensagem atual do cliente
  const mensagemCliente = mensagemAtual ? `
=== MENSAGEM ATUAL ===
Cliente: ${mensagemAtual}
` : '';

  // Prompt simplificado apenas com contexto
  const prompt = `${infoCliente}${statusInfo}${mensagemCliente}
=== HISTÓRICO DA CONVERSA ===
${historicoFormatado}`;

  console.log('🧠 Contexto fornecido (primeiros 500 chars):', prompt.substring(0, 500) + '...');
  return prompt;
}

/**
 * Analisa o status da conversa baseado no histórico
 */
function analisarStatusConversa(historico: Mensagem[]): ConversaStatus {
  const totalMensagens = historico.length;
  const isPrimeiraInteracao = totalMensagens <= 2; // Considera primeira se tem 2 ou menos mensagens
  
  // Calcula tempo de conversa se houver timestamps
  let tempoConversa: string | undefined;
  if (historico.length >= 2 && historico[0].timestamp && historico[historico.length - 1].timestamp) {
    const inicio = new Date(historico[0].timestamp);
    const fim = new Date(historico[historico.length - 1].timestamp);
    const diffMs = fim.getTime() - inicio.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMin / 60);
    
    if (diffHoras > 0) {
      tempoConversa = `${diffHoras}h ${diffMin % 60}min`;
    } else {
      tempoConversa = `${diffMin}min`;
    }
  }
  
  // Determina etapa do processo baseado no conteúdo das mensagens
  let etapaProcesso: string | undefined;
  const ultimasMensagens = historico.slice(-5).map(msg => msg.texto.toLowerCase());
  
  if (ultimasMensagens.some(msg => msg.includes('nome') || msg.includes('chama'))) {
    etapaProcesso = 'Coleta de informações iniciais';
  } else if (ultimasMensagens.some(msg => msg.includes('dívida') || msg.includes('banco') || msg.includes('fatura'))) {
    etapaProcesso = 'Análise de dívidas';
  } else if (ultimasMensagens.some(msg => msg.includes('agendar') || msg.includes('reunião') || msg.includes('consulta'))) {
    etapaProcesso = 'Agendamento';
  } else if (ultimasMensagens.some(msg => msg.includes('valor') || msg.includes('desconto') || msg.includes('negociação'))) {
    etapaProcesso = 'Negociação';
  } else if (ultimasMensagens.some(msg => msg.includes('obrigado') || msg.includes('tchau') || msg.includes('até'))) {
    etapaProcesso = 'Encerramento';
  }
  
  return {
    isPrimeiraInteracao,
    etapaProcesso,
    totalMensagens,
    tempoConversa
  };
}