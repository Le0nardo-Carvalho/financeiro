import { useFaturasResumoDoMes } from '../../lib/queries/faturas'
import { useCartoes } from '../../lib/queries/cartoes'
import { formatDataCurta, formatMesCurto, parseISO, proximoMes, toISO, type ISODate } from '../../lib/calc/datas'
import { mesesFechadosAntes, type Saude } from '../../lib/calc/minimo'
import { formatValorCurto } from '../../lib/rotulos'
import type { MinimoDoMesLinha, SaudeDoMes } from '../../types/database'

// "jul–set": os meses fechados que formam a média.
export function rotuloJanela(mes: ISODate, meses: number): string {
  const janela = mesesFechadosAntes(mes, meses)
  if (janela.length === 1) return formatMesCurto(janela[0])
  return `${formatMesCurto(janela[0])}–${formatMesCurto(janela[janela.length - 1])}`
}

export function saudeDoServidor(s: SaudeDoMes): Saude {
  return {
    disponivelCentavos: s.entradas_centavos + s.previstas_centavos - s.gastos_centavos,
    sobraCentavos: s.sobra_centavos,
    nivel: s.nivel,
  }
}

export function subtituloItem(linha: MinimoDoMesLinha, mes: ISODate, mesesMedia: number | undefined): string {
  if (linha.tipo === 'media_categoria') {
    return `média ${rotuloJanela(mes, mesesMedia ?? 3)} · ${formatValorCurto(linha.previsto_centavos)}`
  }
  const previsto = `previsto ${formatValorCurto(linha.previsto_centavos)}`
  if (linha.gasto_centavos > 0 && linha.ultimo_lancamento) return `${previsto} · pago ${formatDataCurta(linha.ultimo_lancamento)}`
  return `${previsto} · ainda não lançado`
}

// Fatura(s) do mês seguinte: "já comprometido" (3a e 3b). Só leitura de
// faturas_resumo; não altera nenhum total de gasto.
export function useComprometidoNoMesSeguinte(mes: ISODate) {
  const { ano, mes: m } = parseISO(mes)
  const seguinte = proximoMes(ano, m)
  const mesSeguinte = toISO({ ano: seguinte.ano, mes: seguinte.mes, dia: 1 })
  const faturasQuery = useFaturasResumoDoMes(mesSeguinte)
  const cartoesQuery = useCartoes()
  const faturas = (faturasQuery.data ?? []).filter((f) => f.total_centavos > 0)
  const totalCentavos = faturas.reduce((s, f) => s + f.total_centavos, 0)
  const nomes = faturas.map((f) => cartoesQuery.data?.find((c) => c.id === f.cartao_id)?.apelido ?? 'cartão')
  const fechamento = faturas.map((f) => f.data_fechamento).sort()[0] ?? null
  return { mesSeguinte, totalCentavos, nomes, fechamento }
}
