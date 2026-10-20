// Balancete (10, §2): por mês, entradas − gastos = resultado, com acumulado
// do ano. Espelha a view balancete_mensal. Gastos pela mesma competência do
// dashboard (lancamentos_mensais); pagamento de fatura nunca entra.

import { parseISO, primeiroDiaDoMes, type ISODate } from './datas'

export interface MesBalancete {
  mes: ISODate
  entradasCentavos: number
  gastosCentavos: number
  resultadoCentavos: number
  acumuladoAnoCentavos: number
}

// Acumulado reinicia em janeiro (CA28-E).
export function montarBalancete(
  entradas: { data: ISODate; valorCentavos: number }[],
  gastos: { mesCompetencia: ISODate; valorCentavos: number }[],
): MesBalancete[] {
  const porMes = new Map<ISODate, { entradas: number; gastos: number }>()
  const linha = (mes: ISODate) => {
    let l = porMes.get(mes)
    if (!l) porMes.set(mes, (l = { entradas: 0, gastos: 0 }))
    return l
  }
  for (const e of entradas) linha(primeiroDiaDoMes(e.data)).entradas += e.valorCentavos
  for (const g of gastos) linha(primeiroDiaDoMes(g.mesCompetencia)).gastos += g.valorCentavos

  const meses = [...porMes.keys()].sort()
  const resultado: MesBalancete[] = []
  let ano = 0
  let acumulado = 0
  for (const mes of meses) {
    const { entradas: e, gastos: g } = porMes.get(mes)!
    if (parseISO(mes).ano !== ano) { ano = parseISO(mes).ano; acumulado = 0 }
    acumulado += e - g
    resultado.push({ mes, entradasCentavos: e, gastosCentavos: g, resultadoCentavos: e - g, acumuladoAnoCentavos: acumulado })
  }
  return resultado
}

// Só o ano pedido e só até o mês atual: meses futuros têm apenas parcelas
// e ficam fora (10, §2).
export function balanceteAteMes<T extends { mes: ISODate }>(linhas: T[], ano: number, mesAtual: ISODate): T[] {
  const limite = primeiroDiaDoMes(mesAtual)
  return linhas.filter((l) => parseISO(l.mes).ano === ano && l.mes <= limite).sort((a, b) => (a.mes < b.mes ? -1 : 1))
}

export function resumoDoBalancete(linhas: MesBalancete[]) {
  const entradasCentavos = linhas.reduce((s, l) => s + l.entradasCentavos, 0)
  const gastosCentavos = linhas.reduce((s, l) => s + l.gastosCentavos, 0)
  return { entradasCentavos, gastosCentavos, resultadoCentavos: entradasCentavos - gastosCentavos }
}
