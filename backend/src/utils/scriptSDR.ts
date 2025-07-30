import { verificarBanco, gerarRespostaBanco, obterListaBancosAceitos } from './bancosConfig';

export interface ScriptStep {
  id: string;
  name: string;
  trigger: string[];
  response: string;
  instructions: string;
  bankRelated?: boolean;
}

export const SCRIPT_SDR: ScriptStep[] = [
  {
    id: 'passo1',
    name: 'Apresentação Inicial',
    trigger: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'ola'],
    response: '"Olá! 👋 Sou o assistente virtual da Resoluty. Como posso ajudá-lo hoje?"',
    instructions: 'Responda apenas com a mensagem de apresentação. Seja amigável e profissional.'
  },
  {
    id: 'passo2',
    name: 'Identificação do Cliente',
    trigger: ['quero', 'preciso', 'gostaria', 'estou interessado', 'interesse'],
    response: '"Perfeito! Para que eu possa ajudá-lo da melhor forma, poderia me informar seu nome e qual é sua necessidade específica?"',
    instructions: 'Solicite informações básicas do cliente de forma educada.'
  },
  {
    id: 'passo3',
    name: 'Coleta de Informações',
    trigger: ['me chamo', 'sou', 'nome é', 'preciso de', 'quero'],
    response: '"Obrigado! Agora me conte um pouco mais sobre sua situação para que eu possa direcioná-lo ao melhor atendimento."',
    instructions: 'Colete mais detalhes sobre a necessidade do cliente.'
  },
  {
    id: 'passo4',
    name: 'Verificação de Banco',
    trigger: ['banco', 'itau', 'bradesco', 'santander', 'caixa', 'nubank', 'inter', 'c6', 'pagseguro', 'mercado pago', 'picpay', 'stone', 'getnet', 'rede', 'cielo', 'safra', 'banrisul', 'sicredi', 'sicoob', 'bancoob', 'pan', 'bmg', 'original', 'neon', 'next', 'modal', 'sofisa', 'daycoval', 'abc', 'indusval'],
    response: '', // Será gerada dinamicamente
    instructions: 'Verifique se o banco mencionado é aceito ou não e responda adequadamente.',
    bankRelated: true
  },
  {
    id: 'passo5',
    name: 'Qualificação',
    trigger: ['problema', 'dificuldade', 'ajuda', 'suporte', 'assistência'],
    response: '"Entendo sua situação. Vou conectar você com um de nossos especialistas que poderá ajudá-lo melhor. Um momento, por favor."',
    instructions: 'Qualifique o lead e prepare para transferência.'
  },
  {
    id: 'passo6',
    name: 'Transferência',
    trigger: ['ok', 'certo', 'perfeito', 'obrigado', 'valeu'],
    response: '"Estou transferindo você agora. Obrigado por escolher a Resoluty! 🚀"',
    instructions: 'Confirme a transferência e agradeça.'
  }
];

export function identificarPassoConversa(historico: string[], mensagemAtual: string): ScriptStep | null {
  const conversaCompleta = [...historico, mensagemAtual].join(' ').toLowerCase();
  
  // Verificar cada passo do script
  for (const passo of SCRIPT_SDR) {
    for (const trigger of passo.trigger) {
      if (conversaCompleta.includes(trigger.toLowerCase())) {
        return passo;
      }
    }
  }
  
  return null;
}

export function gerarRespostaScript(passo: ScriptStep | null, mensagemAtual: string = ''): string {
  if (!passo) {
    return '"Biscoito"';
  }
  
  // Se for relacionado a banco, gerar resposta específica
  if (passo.bankRelated) {
    // Extrair nome do banco da mensagem
    const bancosMencionados = SCRIPT_SDR.find(p => p.id === 'passo4')?.trigger || [];
    const bancoEncontrado = bancosMencionados.find(banco => 
      mensagemAtual.toLowerCase().includes(banco.toLowerCase())
    );
    
    if (bancoEncontrado) {
      const banco = verificarBanco(bancoEncontrado);
      return gerarRespostaBanco(banco);
    } else {
      return '"Poderia me informar qual banco você utiliza para que eu possa verificar se aceitamos?"';
    }
  }
  
  return passo.response;
}

export function obterInformacoesBancos(): string {
  const bancosAceitos = obterListaBancosAceitos();
  return `BANCOS ACEITOS: ${bancosAceitos}`;
} 