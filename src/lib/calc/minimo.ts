// Mínimo mensal e saúde do mês (10, §3). Espelha minimo_do_mes() e
// saude_do_mes() do banco (0008): as telas mostram o que o banco devolve; estas
// funções existem para a prévia da tela 3c e para os testes CA29-E–CA32-E.

import { mesAnterior, parseISO, primeiroDiaDoMes, toISO, type ISODate } from './datas'
import type { NivelSaude } from '../../types/database'

// Os `quantidade` meses fechados antes de `mes`, do mais antigo ao mais novo.
export function mesesFechadosAntes(mes: ISODate, quantidade: number): ISODate[] {
  let { ano, mes: m } = parseISO(primeiroDiaDoMes(mes))
  const meses: ISODate[] = []
  for (let i = 0; i < quantidade; i++) {
    const anterior = mesAnterior(ano, m)
    ano = anterior.ano
    m = anterior.mes
    meses.unshift(toISO({ ano, mes: m, dia: 1 }))
  }
  return meses
}

// Média dos meses fechados da janela que tiveram lançamento (meses sem
// nenhum gasto na categoria não puxam a média para baixo), arredondada ao
// centavo. CA29-E: jul 687,10 · ago 620,49 · set 426,19 → 577,93.
export function mediaDosMesesFechados(
  totaisPorMes: { mes: ISODate; totalCentavos: number }[],
  mes: ISODate,
  quantidade: number,
): number {
  const janela = new Set(mesesFechadosAntes(mes, quantidade))
  const valores = totaisPorMes.filter((t) => janela.has(t.mes) && t.totalCentavos > 0).map((t) => t.totalCentavos)
  if (valores.length === 0) return 0
  return Math.round(valores.reduce((s, v) => s + v, 0) / valores.length)
}

export interface CoberturaItem {
  cobertoCentavos: number
  faltaCentavos: number
  excedenteCentavos: number
}

// coberto = menor(gasto, previsto); falta = maior(previsto − gasto, 0);
// excedente = maior(gasto − previsto, 0). O excedente de um item nunca
// reduz a falta de outro (CA30-E).
export function coberturaDoItem(previstoCentavos: number, gastoCentavos: number): CoberturaItem {
  return {
    cobertoCentavos: Math.min(gastoCentavos, previstoCentavos),
    faltaCentavos: Math.max(previstoCentavos - gastoCentavos, 0),
    excedenteCentavos: Math.max(gastoCentavos - previstoCentavos, 0),
  }
}

export function faltaTotalCentavos(itens: { previstoCentavos: number; gastoCentavos: number }[]): number {
  return itens.reduce((s, i) => s + coberturaDoItem(i.previstoCentavos, i.gastoCentavos).faltaCentavos, 0)
}

export interface EntradaSaude {
  entradasCentavos: number
  previstasCentavos: number
  gastosCentavos: number
  faltaMinimoCentavos: number
  margemCentavos: number
}

export interface Saude {
  disponivelCentavos: number // entradas (+ previstas) − gastos: "Sobra do mês"
  sobraCentavos: number // disponível − falta do mínimo
  nivel: NivelSaude
}

// Os gastos essenciais já estão em "gastos"; por isso só a FALTA do mínimo é
// descontada — nada é contado duas vezes.
export function saudeDoMes(e: EntradaSaude): Saude {
  const disponivelCentavos = e.entradasCentavos + e.previstasCentavos - e.gastosCentavos
  const sobraCentavos = disponivelCentavos - e.faltaMinimoCentavos
  let nivel: NivelSaude
  if (e.entradasCentavos + e.previstasCentavos === 0) nivel = 'sem_entradas'
  else if (sobraCentavos < 0) nivel = 'alto'
  else if (sobraCentavos < e.margemCentavos) nivel = 'atencao'
  else nivel = 'tranquilo'
  return { disponivelCentavos, sobraCentavos, nivel }
}

export const TITULO_NIVEL: Record<NivelSaude, string> = {
  alto: 'Gastos altos',
  atencao: 'Atenção',
  tranquilo: 'Tranquilo',
  sem_entradas: 'Sem entradas no mês',
}

// "Mercado e água", "mercado, água e luz".
export function juntarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join('')
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

// Primeira palavra do item, em minúscula: "Água Caesb" → "água".
export function nomeCurtoDoItem(nome: string): string {
  return (nome.trim().split(/\s+/)[0] ?? '').toLowerCase()
}

export interface PartesMensagem {
  texto: string // frase antes do destaque
  destaque: string | null // valor em negrito ("R$ 246,21")
}

// Mensagem do card de alerta (3a). CA31-E: sobra 75,18 e falta 321,39 →
// "… Faltam R$ 246,21."
export function mensagemDaSaude(
  saude: Saude,
  faltaMinimoCentavos: number,
  margemCentavos: number,
  itensEmFalta: string[],
  formatar: (centavos: number) => string,
): PartesMensagem {
  const quais = itensEmFalta.length > 0 ? ` (${juntarNomes(itensEmFalta)})` : ''
  switch (saude.nivel) {
    case 'sem_entradas':
      return { texto: 'Registre o que entrou no mês para ver quanto sobra depois do mínimo.', destaque: null }
    case 'alto': {
      const inicio = saude.disponivelCentavos >= 0
        ? faltaMinimoCentavos > 0
          ? `Ainda faltam ${formatar(faltaMinimoCentavos)} do mínimo${quais} e só sobraram ${formatar(saude.disponivelCentavos)}.`
          : `Só sobraram ${formatar(saude.disponivelCentavos)}.`
        : faltaMinimoCentavos > 0
          ? `Os gastos já passaram ${formatar(-saude.disponivelCentavos)} do que entrou e ainda faltam ${formatar(faltaMinimoCentavos)} do mínimo${quais}.`
          : `Os gastos já passaram ${formatar(-saude.disponivelCentavos)} do que entrou.`
      return { texto: `${inicio} Faltam `, destaque: formatar(-saude.sobraCentavos) }
    }
    case 'atencao':
      return {
        texto: `Depois do mínimo sobram ${formatar(saude.sobraCentavos)}, abaixo da margem de ${formatar(margemCentavos)}.`,
        destaque: null,
      }
    case 'tranquilo':
      return { texto: `Depois do mínimo ainda sobram ${formatar(saude.sobraCentavos)}.`, destaque: null }
  }
}
