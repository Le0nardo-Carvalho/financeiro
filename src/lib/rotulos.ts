import type { FormaPagamento, MeioPagamentoFatura, MotivoCancelamento, PagamentoFatura, SituacaoFatura } from '../types/database'

export const ROTULO_FORMA: Record<FormaPagamento, string> = { pix: 'Pix', debito: 'Débito', credito: 'Crédito' }

export const ROTULO_MEIO: Record<MeioPagamentoFatura, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  debito_automatico: 'Débito automático',
  transferencia: 'Transferência',
  outro: 'Outro',
}

export const ROTULO_MOTIVO: Record<MotivoCancelamento, string> = {
  nao_fui: 'Não fui ao mercado',
  comprei_em_outro_lugar: 'Comprei em outro lugar, já registrado',
  desisti: 'Desisti da compra',
  outro: 'Outro motivo',
}

export const ROTULO_SITUACAO_FATURA: Record<SituacaoFatura, string> = {
  aberta: 'Aberta',
  parcial: 'Parcialmente paga',
  paga: 'Paga',
}

// "Pix + boleto": meios distintos, na ordem em que foram usados.
export function descreverMeios(meios: MeioPagamentoFatura[]): string {
  const unicos = [...new Set(meios)]
  return unicos.map((m, i) => (i === 0 ? ROTULO_MEIO[m] : ROTULO_MEIO[m].toLowerCase())).join(' + ')
}

// Valor sem "R$" (listas e legendas: "72,08"); o sinal − marca gasto em Recentes.
export function formatValorCurto(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// "Pix · Banco do Brasil", "Boleto · Banco do Brasil", "Boleto". A prancheta
// escreve "Pix do Banco do Brasil"; o "·" evita errar o gênero do nome da conta.
export function tituloPagamento(p: Pick<PagamentoFatura, 'meio' | 'conta_origem'>): string {
  return p.conta_origem ? `${ROTULO_MEIO[p.meio]} · ${p.conta_origem}` : ROTULO_MEIO[p.meio]
}
