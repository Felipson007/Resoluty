import { salvarConversaWhatsApp, recuperarConversasCliente } from '../config/supabase';

export async function salvarInteracaoHistorico(interacao: any) {
  // Seu código atual de salvar no banco
  
  // Adicione chamada para salvar conversa completa
  if (interacao.mensagem_usuario) {
    await salvarConversaWhatsApp(
      interacao.mensagem_usuario, 
      interacao.cliente_id,
      interacao // Adicionando o terceiro argumento conforme esperado
    );
  }
}

export async function buscarHistoricoCliente(clienteId: string, limite: number = 10) {
  // Seu código atual de buscar histórico

  // Adicione busca de conversas do Supabase
  const conversasSupabase = await recuperarConversasCliente(clienteId, limite.toString());

  return {
    data: conversasSupabase
  };
}