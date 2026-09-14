// Datas de calendário puras (sem hora, sem fuso) representadas como string ISO
// "YYYY-MM-DD" — o mesmo formato de <input type="date"> e das colunas `date`
// do Postgres. Evita os bugs de fuso horário de usar `Date` para aritmética
// de calendário.

export type ISODate = string

export interface CalendarParts {
  ano: number
  mes: number // 1-12
  dia: number
}

export function parseISO(data: ISODate): CalendarParts {
  const [ano, mes, dia] = data.split('-').map(Number)
  return { ano, mes, dia }
}

export function toISO({ ano, mes, dia }: CalendarParts): ISODate {
  const mm = String(mes).padStart(2, '0')
  const dd = String(dia).padStart(2, '0')
  return `${ano}-${mm}-${dd}`
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  // Dia 0 do mês seguinte = último dia do mês atual.
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

// Espelha dia_seguro() do banco: se o dia não existir no mês, usa o último dia.
export function diaSeguro(ano: number, mes: number, dia: number): ISODate {
  const ultimo = ultimoDiaDoMes(ano, mes)
  return toISO({ ano, mes, dia: Math.min(dia, ultimo) })
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function proximoMes(ano: number, mes: number): { ano: number; mes: number } {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 }
}

export function mesAnterior(ano: number, mes: number): { ano: number; mes: number } {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }
}

// Primeiro dia do mês da data informada, como ISO — usado como mes_competencia.
export function primeiroDiaDoMes(data: ISODate): ISODate {
  const { ano, mes } = parseISO(data)
  return toISO({ ano, mes, dia: 1 })
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function formatMesAno(data: ISODate): string {
  const { ano, mes } = parseISO(data)
  return `${NOMES_MES[mes - 1]} ${ano}`
}

export function formatDataCurta(data: ISODate): string {
  const { dia, mes } = parseISO(data)
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

export function formatDataLonga(data: ISODate): string {
  const { dia, mes, ano } = parseISO(data)
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
}

export function hojeISO(): ISODate {
  const agora = new Date()
  return toISO({ ano: agora.getFullYear(), mes: agora.getMonth() + 1, dia: agora.getDate() })
}
