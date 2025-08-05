import { Mensagem } from '../types/conversa';

/**
 * Gera prompt para o cérebro da IA com o contexto da conversa
 */
export function gerarPromptCerebro(
  historico: Mensagem[], 
  mensagemCliente: string
): string {
  // Filtra mensagens muito curtas ou vazias
  const historicoFiltrado = historico.filter(msg => msg.texto && msg.texto.length > 2);
  
  // Filtra mensagens muito antigas (mantém apenas últimas 50 mensagens)
  const historicoLimitado = historicoFiltrado.slice(-50);
  
  // Formata o histórico com timestamps
  const historicoFormatado = historicoLimitado.map((msg) => {
    const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString('pt-BR') : 'Sem timestamp';
    return `[${timestamp}] ${msg.autor === 'usuario' ? 'Cliente' : 'Clara'}: ${msg.texto}`;
  }).join('\n');

  // Prompt simplificado apenas com contexto
  const prompt = `Leia a seguinte mensagem do Cliente: ${mensagemCliente}

Baseado na mensagem recebida e no histórico das mensagens, detecte a intenção do cliente

Caso o Cliente tenha dito o valor total da divida, responda apenas o seguinte: "O Valor da Divida do Cliente é de" e adicione o valor da Divida

Caso o Cliente tenha sugerido claramente um horário para Reunião, responda apenas o seguinte: "Agendar Google Meet "

Caso o cliente tenha dito que recebe salário em conta responda apenas o seguinte: "Abrir para Atendente"

Caso não seja nenhuma das intenções citadas, apenas consulte o documento SCRIPT SDR PDE e mande a mensagem prevista, lembre se, mande somente a mensagem pronta, para que ela seja encaminhada diretamente para o cliente

=== HISTÓRICO DA CONVERSA ===
${historicoFormatado}`;

  console.log('🧠 Contexto fornecido (primeiros 500 chars):', prompt.substring(0, 500) + '...');
  return prompt;
}