import { verificarBanco, gerarRespostaBanco, obterListaBancosAceitos } from './bancosConfig';

export function obterInformacoesBancos(): string {
  const bancosAceitos = obterListaBancosAceitos();
  return `BANCOS ACEITOS: ${bancosAceitos}`;
} 