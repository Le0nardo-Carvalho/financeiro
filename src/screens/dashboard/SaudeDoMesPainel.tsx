import { Link } from 'react-router-dom'
import { useMinimoDoMes, useSaudeDoMes, useBalancete } from '../../lib/queries/minimo'
import { formatCentavos } from '../../lib/money'
import { formatDataCurta, formatMesCurto, formatMesExtenso, hojeISO, parseISO, primeiroDiaDoMes } from '../../lib/calc/datas'
import { balanceteAteMes } from '../../lib/calc/balancete'
import { formatValorCurto } from '../../lib/rotulos'
import { rotas } from '../../router/rotas'
import { BarraMinimo, CardAlertaSaude, ChipsMinimo } from '../minimo/minimoVisual'
import { saudeDoServidor, useComprometidoNoMesSeguinte } from '../minimo/minimoDados'
import './SaudeDoMesPainel.css'

// Topo do Início (3a): sobra do mês (entradas − gastos), alerta pelo nível de
// saude_do_mes(), card do mínimo e os atalhos para a próxima fatura e o
// balancete. Os gastos aqui são os mesmos do dashboard (lancamentos_mensais,
// via saude_do_mes); entrada e pagamento de fatura nunca viram gasto.
export function SaudeDoMesPainel({ mes, layout = 'celular' }: { mes: string; layout?: 'celular' | 'computador' }) {
  const saudeQuery = useSaudeDoMes(mes)
  const minimoQuery = useMinimoDoMes(mes)
  const ano = parseISO(mes).ano
  const balanceteQuery = useBalancete(ano)
  const comprometido = useComprometidoNoMesSeguinte(mes)
  const hoje = primeiroDiaDoMes(hojeISO())

  const saude = saudeQuery.data
  if (saudeQuery.isLoading) return <div className="saude-carregando" aria-hidden />
  if (saudeQuery.isError || !saude) return null

  const linhas = minimoQuery.data ?? []
  const calc = saudeDoServidor(saude)
  const entrou = saude.entradas_centavos + saude.previstas_centavos
  const negativo = calc.disponivelCentavos < 0
  const nomeMes = formatMesExtenso(mes)
  const cobertoCentavos = Math.max(saude.minimo_centavos - saude.falta_minimo_centavos, 0)

  const balancete = balanceteAteMes(
    (balanceteQuery.data ?? []).map((l) => ({ mes: l.mes, acumulado: l.acumulado_ano_centavos })),
    ano,
    mes < hoje ? mes : hoje,
  )
  const ultimoBalancete = balancete[balancete.length - 1]

  return (
    <div className={`saude-painel saude-painel-${layout}`}>
      <div className="saude-sobra">
        <span className="saude-sobra-rotulo">Sobra de {nomeMes}{mes === hoje ? ' até hoje' : ''}</span>
        <span className={`valor-destaque saude-sobra-valor ${negativo ? 'saude-negativo' : ''}`}>
          {negativo ? '−' : ''}{formatCentavos(Math.abs(calc.disponivelCentavos))}
        </span>
        <div className="saude-sobra-barra" aria-hidden>
          {saude.gastos_centavos > 0 && <span className="saude-sobra-gastou" style={{ flex: saude.gastos_centavos }} />}
          {!negativo && calc.disponivelCentavos > 0 && <span className="saude-sobra-resto" style={{ flex: calc.disponivelCentavos }} />}
        </div>
        <div className="saude-sobra-legenda">
          <Link to={rotas.entradas} className="saude-sobra-item">
            <span className="saude-sobra-item-rotulo"><span className="saude-ponto saude-ponto-entrou" />Entrou</span>
            <span className="valor saude-sobra-item-valor">{formatValorCurto(entrou)}</span>
            {saude.previstas_centavos > 0 && <span className="saude-sobra-previsto">inclui {formatValorCurto(saude.previstas_centavos)} previsto</span>}
          </Link>
          <Link to={rotas.lancamentos} className="saude-sobra-item saude-sobra-item-fim">
            <span className="saude-sobra-item-rotulo"><span className="saude-ponto saude-ponto-gastou" />Gastou</span>
            <span className="valor saude-sobra-item-valor">{formatValorCurto(saude.gastos_centavos)}</span>
          </Link>
        </div>
      </div>

      <CardAlertaSaude saude={saude} linhas={linhas} />

      {linhas.length > 0 ? (
        <Link to={rotas.minimo} className="saude-minimo">
          <span className="saude-minimo-topo">
            <span className="saude-minimo-titulo">Mínimo de {nomeMes}</span>
            <span className="valor saude-minimo-total">{formatValorCurto(saude.minimo_centavos)}</span>
          </span>
          <BarraMinimo cobertoCentavos={cobertoCentavos} faltaCentavos={saude.falta_minimo_centavos} />
          <span className="saude-minimo-legenda">
            <span>Já gasto <strong>{formatValorCurto(saude.gasto_essencial_centavos)}</strong></span>
            <span>Falta <strong className={saude.falta_minimo_centavos > 0 ? 'saude-negativo' : ''}>{formatValorCurto(saude.falta_minimo_centavos)}</strong></span>
          </span>
          <ChipsMinimo linhas={linhas} />
        </Link>
      ) : (
        <Link to={rotas.ajustarMinimo} className="saude-minimo">
          <span className="saude-minimo-titulo">Mínimo do mês</span>
          <span className="text-muted" style={{ fontSize: 12.5 }}>Defina a média de mercado e as contas fixas para ver o que falta.</span>
        </Link>
      )}

      <div className="saude-atalhos">
        <Link to={rotas.cartoes} className="saude-atalho">
          <span className="saude-atalho-rotulo">Fatura de {formatMesExtenso(comprometido.mesSeguinte)}</span>
          <span className="valor saude-atalho-valor">{formatValorCurto(comprometido.totalCentavos)}</span>
          <span className="saude-atalho-meta">
            {comprometido.fechamento ? `fecha ${formatDataCurta(comprometido.fechamento)} · ` : ''}já comprometido
          </span>
        </Link>
        <Link to={rotas.balancete} className="saude-atalho">
          <span className="saude-atalho-rotulo">Balancete {ano}</span>
          <span className={`valor saude-atalho-valor ${ultimoBalancete && ultimoBalancete.acumulado < 0 ? 'saude-negativo' : ''}`}>
            {ultimoBalancete ? `${ultimoBalancete.acumulado < 0 ? '−' : ultimoBalancete.acumulado > 0 ? '+' : ''}${formatValorCurto(Math.abs(ultimoBalancete.acumulado))}` : '—'}
          </span>
          <span className="saude-atalho-meta">
            {balancete.length > 1 ? `${formatMesCurto(balancete[0].mes)}–${formatMesCurto(ultimoBalancete.mes)} · ` : ''}ver meses
          </span>
        </Link>
      </div>
    </div>
  )
}
