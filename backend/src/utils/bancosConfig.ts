export interface Banco {
  nome: string;
  status: 'aceito' | 'nao_aceito';
  observacoes?: string;
}

export const BANCOS_ACEITOS: Banco[] = [
  { nome: 'Banco do Brasil', status: 'aceito' },
  { nome: 'Itaú', status: 'aceito' },
  { nome: 'Bradesco', status: 'aceito' },
  { nome: 'Santander', status: 'aceito' },
  { nome: 'Caixa Econômica Federal', status: 'aceito' },
  { nome: 'Banco Inter', status: 'aceito' },
  { nome: 'Nubank', status: 'aceito' },
  { nome: 'C6 Bank', status: 'aceito' },
  { nome: 'PagSeguro', status: 'aceito' },
  { nome: 'Mercado Pago', status: 'aceito' },
  { nome: 'PicPay', status: 'aceito' },
  { nome: 'Stone', status: 'aceito' },
  { nome: 'GetNet', status: 'aceito' },
  { nome: 'Rede', status: 'aceito' },
  { nome: 'Cielo', status: 'aceito' },
  { nome: 'Safra', status: 'aceito' },
  { nome: 'Banrisul', status: 'aceito' },
  { nome: 'Sicredi', status: 'aceito' },
  { nome: 'Sicoob', status: 'aceito' },
  { nome: 'Bancoob', status: 'aceito' }
];

export const BANCOS_NAO_ACEITOS: Banco[] = [
  { nome: 'Banco Pan', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' },
  { nome: 'Banco BMG', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' },
  { nome: 'Banco Original', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' },
  { nome: 'Banco Neon', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' },
  { nome: 'Banco Next', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' },
  { nome: 'Banco Modal', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' },
  { nome: 'Banco Sofisa', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' },
  { nome: 'Banco Daycoval', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' },
  { nome: 'Banco ABC Brasil', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' },
  { nome: 'Banco Indusval', status: 'nao_aceito', observacoes: 'Não aceitamos operações com este banco' }
];

export function verificarBanco(nomeBanco: string): Banco | null {
  const bancoNormalizado = nomeBanco.toLowerCase().trim();
  
  // Verificar bancos aceitos
  const bancoAceito = BANCOS_ACEITOS.find(banco => 
    banco.nome.toLowerCase().includes(bancoNormalizado) ||
    bancoNormalizado.includes(banco.nome.toLowerCase())
  );
  
  if (bancoAceito) return bancoAceito;
  
  // Verificar bancos não aceitos
  const bancoNaoAceito = BANCOS_NAO_ACEITOS.find(banco => 
    banco.nome.toLowerCase().includes(bancoNormalizado) ||
    bancoNormalizado.includes(banco.nome.toLowerCase())
  );
  
  if (bancoNaoAceito) return bancoNaoAceito;
  
  return null;
}

export function gerarRespostaBanco(banco: Banco | null): string {
  if (!banco) {
    return '"Desculpe, não reconheci esse banco. Poderia me informar qual banco você utiliza para que eu possa verificar se aceitamos?"';
  }
  
  if (banco.status === 'aceito') {
    return `"Perfeito! Aceitamos o ${banco.nome}. Posso ajudá-lo com suas necessidades. Qual é sua situação específica?"`;
  } else {
    return `"Infelizmente não aceitamos operações com o ${banco.nome}. ${banco.observacoes || 'Trabalhamos apenas com bancos parceiros.'}"`;
  }
}

export function obterListaBancosAceitos(): string {
  return BANCOS_ACEITOS.map(banco => banco.nome).join(', ');
}

export function obterListaBancosNaoAceitos(): string {
  return BANCOS_NAO_ACEITOS.map(banco => banco.nome).join(', ');
} 