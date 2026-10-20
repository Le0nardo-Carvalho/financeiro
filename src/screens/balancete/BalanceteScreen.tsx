import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Scale } from 'lucide-react'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { useBalancete } from '../../lib/queries/minimo'
import { formatCentavos } from '../../lib/money'
import { formatMesCurto, formatMesExtenso, hojeISO, parseISO, primeiroDiaDoMes } from '../../lib/calc/datas'
import { balanceteAteMes, resumoDoBalancete, type MesBalancete } from '../../lib/calc/balancete'
import { formatValorCurto } from '../../lib/rotulos'
import { EmptyState } from '../../components/ui'
import { juntarNomes } from '../../lib/calc/minimo'
import './BalanceteScreen.css'

function comSinal(centavos: number): string {
  if (centavos === 0) return formatValorCurto(0)
  return `${centavos > 0 ? '+' : '−'}${formatValorCurto(Math.abs(centavos))}`
}

function classeResultado(centavos: number): string {
  return centavos < 0 ? 'bal-negativo' : centavos > 0 ? 'bal-positivo' : ''
}

// Tela 3g: por mês, entradas − gastos = resultado, com acumulado do ano.
// Vai só até o mês atual: meses futuros só têm parcelas (10, §2).
export function BalanceteScreen() {
  const navigate = useNavigate()
  const { mes } = useMesSelecionado()
  const [visao, setVisao] = useState<'mes' | 'ano'>('ano')
  const ano = parseISO(mes).ano
  const hoje = primeiroDiaDoMes(hojeISO())
  const query = useBalancete(ano)

  const linhas: MesBalancete[] = balanceteAteMes(
    (query.data ?? []).map((l) => ({
      mes: l.mes,
      entradasCentavos: l.entradas_centavos,
      gastosCentavos: l.gastos_centavos,
      resultadoCentavos: l.resultado_centavos,
      acumuladoAnoCentavos: l.acumulado_ano_centavos,
    })),
    ano,
    hoje,
  )
  const doMes = linhas.find((l) => l.mes === mes)
  const resumo = visao === 'mes' && doMes
    ? { entradasCentavos: doMes.entradasCentavos, gastosCentavos: doMes.gastosCentavos, resultadoCentavos: doMes.resultadoCentavos }
    : resumoDoBalancete(linhas)
  const titulo = visao === 'mes'
    ? `Resultado de ${formatMesExtenso(mes)}`
    : linhas.length > 1
      ? `Resultado de ${formatMesCurto(linhas[0].mes)} a ${formatMesCurto(linhas[linhas.length - 1].mes)}`
      : 'Resultado do ano'
  const maximo = Math.max(...linhas.flatMap((l) => [l.entradasCentavos, l.gastosCentavos]), 1)
  const noAzul = linhas.filter((l) => l.resultadoCentavos > 0).map((l) => formatMesCurto(l.mes))
  const ultimo = linhas[linhas.length - 1]

  return (
    <div className="bal-tela">
      <div className="bal-cabecalho">
        <button type="button" className="btn-voltar" onClick={() => navigate(-1)} aria-label="Voltar"><ArrowLeft size={18} strokeWidth={2.75} /></button>
        <span className="bal-titulo">Balancete</span>
        <div className="bal-seg" role="radiogroup" aria-label="Período">
          <button type="button" role="radio" aria-checked={visao === 'mes'} className={`bal-seg-opt ${visao === 'mes' ? 'bal-seg-ativo' : ''}`} onClick={() => setVisao('mes')}>Mês</button>
          <button type="button" role="radio" aria-checked={visao === 'ano'} className={`bal-seg-opt ${visao === 'ano' ? 'bal-seg-ativo' : ''}`} onClick={() => setVisao('ano')}>{ano}</button>
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-muted">Carregando…</p>
      ) : query.isError ? (
        <div className="erro-banner" role="alert">Não foi possível carregar o balancete. Verifique a conexão e tente de novo.</div>
      ) : linhas.length === 0 ? (
        <EmptyState
          icon={<Scale size={30} strokeWidth={2.75} color="var(--color-accent-2-600)" />}
          title={`Nada em ${ano} até agora`}
          description="O balancete compara o que entrou com o que foi gasto, mês a mês, até o mês atual."
        />
      ) : (
        <>
          <div>
            <span className="bal-rotulo">{titulo}</span>
            <span className={`valor-destaque bal-resultado ${classeResultado(resumo.resultadoCentavos)}`}>
              {resumo.resultadoCentavos < 0 ? '−' : resumo.resultadoCentavos > 0 ? '+' : ''}{formatCentavos(Math.abs(resumo.resultadoCentavos))}
            </span>
            <div className="bal-legenda">
              <span>
                <span className="bal-legenda-rotulo"><span className="bal-ponto bal-ponto-entrou" />Entrou</span>
                <span className="valor bal-legenda-valor">{formatValorCurto(resumo.entradasCentavos)}</span>
              </span>
              <span className="bal-legenda-fim">
                <span className="bal-legenda-rotulo"><span className="bal-ponto bal-ponto-gastou" />Gastou</span>
                <span className="valor bal-legenda-valor">{formatValorCurto(resumo.gastosCentavos)}</span>
              </span>
            </div>
          </div>

          <div className="bal-grafico" role="list" aria-label="Entradas e gastos por mês">
            {linhas.map((l) => {
              const destaque = visao === 'mes' ? l.mes === mes : l.mes === ultimo.mes
              return (
                <span
                  key={l.mes}
                  className="bal-coluna"
                  role="listitem"
                  aria-label={`${formatMesCurto(l.mes)}: entrou ${formatCentavos(l.entradasCentavos)}, gastou ${formatCentavos(l.gastosCentavos)}`}
                >
                  <span className="bal-barras">
                    <span className="bal-barra bal-barra-entrou" style={{ height: Math.max(Math.round((l.entradasCentavos / maximo) * 84), 3) }} />
                    <span className="bal-barra bal-barra-gastou" style={{ height: Math.max(Math.round((l.gastosCentavos / maximo) * 84), 3) }} />
                  </span>
                  <span className={`bal-coluna-rotulo ${destaque ? 'bal-coluna-rotulo-atual' : ''}`}>{formatMesCurto(l.mes)}</span>
                </span>
              )
            })}
          </div>

          <div className="bal-tabela" role="table" aria-label="Balancete mês a mês">
            <div className="bal-linha bal-linha-cabecalho" role="row">
              <span role="columnheader">Mês</span>
              <span role="columnheader">Entrou</span>
              <span role="columnheader">Gastou</span>
              <span role="columnheader">Result.</span>
              <span role="columnheader">Acum.</span>
            </div>
            {linhas.map((l) => (
              <div key={l.mes} className={`bal-linha ${visao === 'mes' && l.mes === mes ? 'bal-linha-selecionada' : ''}`} role="row">
                <span role="cell">{formatMesCurto(l.mes)}</span>
                <span role="cell" className="valor-tab">{formatValorCurto(l.entradasCentavos)}</span>
                <span role="cell" className="valor-tab">{formatValorCurto(l.gastosCentavos)}</span>
                <span role="cell" className={`valor bal-cel-resultado ${classeResultado(l.resultadoCentavos)}`}>{comSinal(l.resultadoCentavos)}</span>
                <span role="cell" className={`valor-tab bal-cel-acumulado ${classeResultado(l.acumuladoAnoCentavos)}`}>{comSinal(l.acumuladoAnoCentavos)}</span>
              </div>
            ))}
          </div>

          <p className="bal-nota">
            {ultimo.mes === hoje ? `${formatMesExtenso(ultimo.mes).replace(/^./, (c) => c.toUpperCase())} ainda em andamento. ` : ''}
            {noAzul.length > 0
              ? `${noAzul.length === 1 ? 'O mês' : `Os ${noAzul.length} meses`} no azul (${juntarNomes(noAzul)}) ${noAzul.length === 1 ? 'segurou' : 'seguraram'} o ano.`
              : 'Nenhum mês no azul até agora.'}
          </p>
        </>
      )}
    </div>
  )
}
