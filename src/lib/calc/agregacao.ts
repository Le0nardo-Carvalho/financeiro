// Regra de contabilização mensal (§7 da especificação, §2 das regras de
// cálculo). Toda agregação — dashboard, categoria, fatura — deve usar
// exclusivamente lancamentos_mensais, nunca o valor integral da compra.

import type { ISODate } from './datas'
import { primeiroDiaDoMes } from './datas'

export type FormaPagamento = 'pix' | 'debito' | 'credito'

export interface LancamentoMensal {
  valorCentavos: number
  mesCompetencia: ISODate // primeiro dia do mês
  formaPagamento: FormaPagamento
  categoriaId: string
}

// mes_competencia de um lançamento: Pix/débito usam o mês da compra;
// crédito usa o mês de vencimento da fatura (já calculado em primeiraFatura/
// faturaSeguinte — este helper só cobre o caso à vista/débito).
export function mesCompetenciaPixDebito(dataCompra: ISODate): ISODate {
  return primeiroDiaDoMes(dataCompra)
}

export interface TotaisMes {
  totalCentavos: number
  pixCentavos: number
  debitoCentavos: number
  creditoCentavos: number
}

// Gastos do mês = Pix do mês + débito do mês + parcelas de crédito atribuídas
// ao mês. Os totais por forma de pagamento são COMPONENTES do total, nunca
// somados novamente a ele.
export function totaisDoMes(lancamentos: LancamentoMensal[], mes: ISODate): TotaisMes {
  const doMes = lancamentos.filter((l) => l.mesCompetencia === mes)

  const somaPorForma = (forma: FormaPagamento) =>
    doMes.filter((l) => l.formaPagamento === forma).reduce((s, l) => s + l.valorCentavos, 0)

  const pixCentavos = somaPorForma('pix')
  const debitoCentavos = somaPorForma('debito')
  const creditoCentavos = somaPorForma('credito')

  return {
    totalCentavos: pixCentavos + debitoCentavos + creditoCentavos,
    pixCentavos,
    debitoCentavos,
    creditoCentavos,
  }
}

export function totalPorCategoriaNoMes(
  lancamentos: LancamentoMensal[],
  mes: ISODate,
): Map<string, number> {
  const totais = new Map<string, number>()
  for (const l of lancamentos) {
    if (l.mesCompetencia !== mes) continue
    totais.set(l.categoriaId, (totais.get(l.categoriaId) ?? 0) + l.valorCentavos)
  }
  return totais
}

// Histórico da categoria: soma até o mês atual (inclusive); parcelas de
// meses futuros ficam de fora e aparecem como previsão separada (§10.7, CA14).
export function totalHistoricoCategoria(
  lancamentos: LancamentoMensal[],
  categoriaId: string,
  mesAtual: ISODate,
): number {
  return lancamentos
    .filter((l) => l.categoriaId === categoriaId && l.mesCompetencia <= mesAtual)
    .reduce((s, l) => s + l.valorCentavos, 0)
}

export function previsaoFuturaCategoria(
  lancamentos: LancamentoMensal[],
  categoriaId: string,
  mesAtual: ISODate,
): number {
  return lancamentos
    .filter((l) => l.categoriaId === categoriaId && l.mesCompetencia > mesAtual)
    .reduce((s, l) => s + l.valorCentavos, 0)
}
