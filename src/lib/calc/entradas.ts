// Entradas (10, §1): dinheiro que entrou. Nunca é gasto, nunca abate fatura
// e nunca entra em categoria — por isso nada aqui toca em lançamentos.

import { diaSeguro, mesAnterior, parseISO, primeiroDiaDoMes, toISO, type ISODate } from './datas'

export interface EntradaCalc {
  descricao: string
  data: ISODate
  valorCentavos: number
  tipo: string
  recorrente: boolean
  diaPrevisto: number | null
}

export interface EntradaPrevista<T extends EntradaCalc = EntradaCalc> {
  origem: T // a recorrente do mês anterior
  dataPrevista: ISODate
  valorCentavos: number
}

// Mesma comparação de saude_do_mes(): lower(btrim(descricao)).
export function normalizarDescricao(descricao: string): string {
  return descricao.trim().toLowerCase()
}

function mesAnteriorDe(mes: ISODate): ISODate {
  const { ano, mes: m } = parseISO(mes)
  const anterior = mesAnterior(ano, m)
  return toISO({ ano: anterior.ano, mes: anterior.mes, dia: 1 })
}

// Recebidas = entradas com data dentro do mês. Previstas nunca entram aqui.
export function entradasDoMes<T extends EntradaCalc>(entradas: T[], mes: ISODate): T[] {
  const inicio = primeiroDiaDoMes(mes)
  return entradas.filter((e) => primeiroDiaDoMes(e.data) === inicio)
}

export function totalRecebidoCentavos(entradas: EntradaCalc[], mes: ISODate): number {
  return entradasDoMes(entradas, mes).reduce((s, e) => s + e.valorCentavos, 0)
}

// Espelha saude_do_mes(): as previstas de um mês são as recorrentes do mês
// anterior sem uma entrada de mesma descrição no mês. Só existem do mês atual
// em diante — um mês que já passou mostra só o que de fato entrou (CA33-E).
export function previstasDoMes<T extends EntradaCalc>(entradas: T[], mes: ISODate, mesAtual: ISODate): EntradaPrevista<T>[] {
  const inicio = primeiroDiaDoMes(mes)
  if (inicio < primeiroDiaDoMes(mesAtual)) return []

  const recebidas = new Set(entradasDoMes(entradas, inicio).map((e) => normalizarDescricao(e.descricao)))
  const { ano, mes: m } = parseISO(inicio)
  return entradasDoMes(entradas, mesAnteriorDe(inicio))
    .filter((e) => e.recorrente && !recebidas.has(normalizarDescricao(e.descricao)))
    .map((e) => ({
      origem: e,
      dataPrevista: diaSeguro(ano, m, e.diaPrevisto ?? parseISO(e.data).dia),
      valorCentavos: e.valorCentavos,
    }))
}

export function totalPorTipo(entradas: EntradaCalc[]): Map<string, number> {
  const totais = new Map<string, number>()
  for (const e of entradas) totais.set(e.tipo, (totais.get(e.tipo) ?? 0) + e.valorCentavos)
  return totais
}
