import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowLeft, Plus } from 'lucide-react'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { useEntradasDoPeriodo } from '../../lib/queries/entradas'
import { formatCentavos } from '../../lib/money'
import {
  formatDataCurta, formatMesExtenso, hojeISO, mesAnterior, parseISO, primeiroDiaDoMes, proximoMes, toISO, type ISODate,
} from '../../lib/calc/datas'
import { entradasDoMes, previstasDoMes, totalPorTipo, totalRecebidoCentavos, type EntradaCalc, type EntradaPrevista } from '../../lib/calc/entradas'
import { comparativoComAnterior } from '../../lib/calc/agregacao'
import { formatValorCurto } from '../../lib/rotulos'
import type { Entrada, TipoEntrada } from '../../types/database'
import { Button, EmptyState, Tag } from '../../components/ui'
import { SeletorMes } from '../../components/SeletorMes'
import { rotas } from '../../router/rotas'
import { COR_TIPO_ENTRADA, ROTULO_TIPO_ENTRADA, TIPOS_ENTRADA } from './rotulosEntrada'
import type { EntradaPrefill } from './NovaEntradaScreen'
import './EntradasScreen.css'

type EntradaComCalc = EntradaCalc & { entrada: Entrada }

function deslocarMes(mes: ISODate, delta: -1 | 1): ISODate {
  const { ano, mes: m } = parseISO(mes)
  const r = delta === 1 ? proximoMes(ano, m) : mesAnterior(ano, m)
  return toISO({ ano: r.ano, mes: r.mes, dia: 1 })
}

function paraCalc(e: Entrada): EntradaComCalc {
  return {
    descricao: e.descricao, data: e.data, valorCentavos: e.valor_centavos, tipo: e.tipo,
    recorrente: e.recorrente, diaPrevisto: e.dia_previsto, entrada: e,
  }
}

// Tela 3f: entradas recebidas no mês e as previstas (recorrentes do mês
// anterior que ainda não chegaram). Prevista não soma no total recebido.
export function EntradasScreen() {
  const navigate = useNavigate()
  const { mes } = useMesSelecionado()
  const mesAtual = primeiroDiaDoMes(hojeISO())
  const anterior = deslocarMes(mes, -1)
  const seguinte = deslocarMes(mes, 1)
  // Mês anterior (comparativo e previstas do mês) até o seguinte (previstas do seguinte).
  const query = useEntradasDoPeriodo(anterior, deslocarMes(seguinte, 1))
  const todas = (query.data ?? []).map(paraCalc)

  const recebidas = entradasDoMes(todas, mes)
  const total = totalRecebidoCentavos(todas, mes)
  const totalAnterior = totalRecebidoCentavos(todas, anterior)
  const comparativo = comparativoComAnterior(total, totalAnterior)
  const porTipo = totalPorTipo(recebidas)
  const tipos = TIPOS_ENTRADA.filter((t) => (porTipo.get(t) ?? 0) > 0)

  const previstasDoMesSel = previstasDoMes(todas, mes, mesAtual)
  const previstasDoSeguinte = previstasDoMes(todas, seguinte, mesAtual)

  function confirmar(p: EntradaPrevista<EntradaComCalc>) {
    const origem = p.origem.entrada
    const prefill: EntradaPrefill = {
      descricao: origem.descricao,
      valorCentavos: p.valorCentavos,
      tipo: origem.tipo,
      conta: origem.conta,
      recorrente: true,
      diaPrevisto: origem.dia_previsto,
      data: p.dataPrevista,
    }
    navigate(rotas.novaEntrada, { state: { prefill } })
  }

  return (
    <div className="entradas-tela">
      <div className="entradas-cabecalho">
        <button type="button" className="btn-voltar" onClick={() => navigate(-1)} aria-label="Voltar"><ArrowLeft size={18} strokeWidth={2.75} /></button>
        <span className="entradas-titulo">Entradas</span>
        <SeletorMes />
      </div>

      {query.isLoading ? (
        <p className="text-muted">Carregando…</p>
      ) : query.isError ? (
        <div className="erro-banner" role="alert">Não foi possível carregar as entradas. Verifique a conexão e tente de novo.</div>
      ) : (
        <>
          <div>
            <span className="entradas-total-rotulo">Entrou em {formatMesExtenso(mes)}</span>
            <span className="valor-destaque entradas-total-valor">{formatCentavos(total)}</span>
            {totalAnterior > 0 && comparativo.diferencaCentavos !== 0 && (
              <span className="entradas-comp">
                <span className="entradas-comp-chip">{comparativo.menor ? '−' : '+'}{comparativo.percentual}%</span>
                <span>
                  {formatCentavos(Math.abs(comparativo.diferencaCentavos))} {comparativo.menor ? 'a menos' : 'a mais'} que {formatMesExtenso(anterior)}
                </span>
              </span>
            )}
          </div>

          {tipos.length > 0 && (
            <div>
              <div className="entradas-barra" aria-hidden>
                {tipos.map((t) => <span key={t} style={{ flex: porTipo.get(t), background: COR_TIPO_ENTRADA[t] }} />)}
              </div>
              <div className="entradas-legenda">
                {tipos.map((t) => (
                  <span key={t} className="entradas-legenda-item">
                    <span className="entradas-legenda-rotulo"><span className="entradas-ponto" style={{ background: COR_TIPO_ENTRADA[t] }} />{ROTULO_TIPO_ENTRADA[t as TipoEntrada]}</span>
                    <span className="valor entradas-legenda-valor">{formatValorCurto(porTipo.get(t) ?? 0)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {recebidas.length === 0 && previstasDoMesSel.length === 0 ? (
            <EmptyState
              icon={<ArrowDownLeft size={30} strokeWidth={2.75} color="var(--color-accent-2-600)" />}
              title="Nenhuma entrada neste mês"
              description="Registre renda, Pix recebido ou reembolso. Entrada não é gasto: não muda categorias nem faturas."
            />
          ) : (
            recebidas.length > 0 && (
              <div className="entradas-secao">
                <span className="secao-titulo">Recebidas</span>
                {recebidas.map(({ entrada: e }) => (
                  <button key={e.id} type="button" className="entradas-linha" onClick={() => navigate(rotas.entrada(e.id))}>
                    <span className="entradas-icone"><ArrowDownLeft size={17} strokeWidth={2.75} /></span>
                    <span className="entradas-corpo">
                      <span className="entradas-desc">{e.descricao}{e.id_externo && <Tag>Importada</Tag>}</span>
                      <span className="entradas-meta">
                        {[ROTULO_TIPO_ENTRADA[e.tipo], e.conta, formatDataCurta(e.data), e.recorrente ? 'todo mês' : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="valor entradas-valor">+{formatValorCurto(e.valor_centavos)}</span>
                  </button>
                ))}
              </div>
            )
          )}

          <Previstas titulo={`Previstas para ${formatMesExtenso(mes)}`} previstas={previstasDoMesSel} onConfirmar={confirmar} />
          <Previstas titulo={`Previstas para ${formatMesExtenso(seguinte)}`} previstas={previstasDoSeguinte} onConfirmar={confirmar} />
        </>
      )}

      <Button variant="primary" block className="entradas-nova" onClick={() => navigate(rotas.novaEntrada)}>
        <Plus size={16} strokeWidth={3} /> Nova entrada
      </Button>
    </div>
  )
}

function Previstas({ titulo, previstas, onConfirmar }: {
  titulo: string
  previstas: EntradaPrevista<EntradaComCalc>[]
  onConfirmar: (p: EntradaPrevista<EntradaComCalc>) => void
}) {
  if (previstas.length === 0) return null
  return (
    <div className="entradas-secao">
      <span className="secao-titulo">{titulo}</span>
      {previstas.map((p) => (
        <button key={p.origem.entrada.id} type="button" className="entradas-prevista" onClick={() => onConfirmar(p)}>
          <span className="entradas-corpo">
            <span className="entradas-desc">{p.origem.descricao}</span>
            <span className="entradas-meta">
              {ROTULO_TIPO_ENTRADA[p.origem.entrada.tipo]} · dia {parseISO(p.dataPrevista).dia} · confirmar quando cair
            </span>
          </span>
          <span className="valor entradas-prevista-valor">+{formatValorCurto(p.valorCentavos)}</span>
        </button>
      ))}
    </div>
  )
}
