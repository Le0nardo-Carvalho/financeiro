import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CreditCard, Plus, ShoppingCart, Tag, Target } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { useLancamentosDoMes } from '../../lib/queries/lancamentos'
import { useCategorias } from '../../lib/queries/categorias'
import { useObjetivos } from '../../lib/queries/objetivos'
import { supabase } from '../../lib/supabase'
import { formatCentavos } from '../../lib/money'
import { formatDataCurta, formatMesAno } from '../../lib/calc/datas'
import { totaisDoMes, totalPorCategoriaNoMes, type LancamentoMensal as LancamentoCalc } from '../../lib/calc/agregacao'
import { acumuladoCentavos, progressoPercentual } from '../../lib/calc/objetivos'
import { StatusSyncBadge } from '../../components/StatusSyncBadge'
import { DonutChart } from '../../components/DonutChart'
import { Button, Card, EmptyState } from '../../components/ui'
import { rotas } from '../../router/rotas'
import './DashboardScreen.css'

const ROTULO_PAGAMENTO: Record<string, string> = { pix: 'Pix', debito: 'Débito' }

export function DashboardScreen() {
  const { mes, irParaMesAnterior, irParaProximoMes } = useMesSelecionado()
  const navigate = useNavigate()
  const lancamentosQuery = useLancamentosDoMes(mes)
  const categoriasQuery = useCategorias()
  const objetivosQuery = useObjetivos()

  const lancamentos = lancamentosQuery.data ?? []
  const categorias = categoriasQuery.data ?? []

  const paraCalc: LancamentoCalc[] = lancamentos.map((l) => ({
    valorCentavos: l.valor_centavos,
    mesCompetencia: l.mes_competencia,
    formaPagamento: l.compra.forma_pagamento,
    categoriaId: l.categoria_id,
  }))
  const totais = totaisDoMes(paraCalc, mes)
  const porCategoria = totalPorCategoriaNoMes(paraCalc, mes)

  const segmentos = Array.from(porCategoria.entries())
    .map(([categoriaId, valorCentavos]) => {
      const cat = categorias.find((c) => c.id === categoriaId)
      return { id: categoriaId, nome: cat?.nome ?? 'Categoria removida', cor: cat?.cor ?? '#a19786', valorCentavos }
    })
    .sort((a, b) => b.valorCentavos - a.valorCentavos)

  const faturasDoMes = new Map<string, { cartaoApelido: string; cartaoCor: string; vencimento: string; total: number; paga: boolean; cartaoId: string }>()
  for (const l of lancamentos) {
    if (!l.fatura) continue
    const existente = faturasDoMes.get(l.fatura.id)
    if (existente) {
      existente.total += l.valor_centavos
    } else {
      faturasDoMes.set(l.fatura.id, {
        cartaoApelido: l.fatura.cartao.apelido,
        cartaoCor: l.fatura.cartao.cor,
        vencimento: l.fatura.data_vencimento,
        total: l.valor_centavos,
        paga: l.fatura.paga,
        cartaoId: l.fatura.cartao_id,
      })
    }
  }

  const recentes = [...lancamentos]
    .sort((a, b) => (a.compra.data_compra < b.compra.data_compra ? 1 : -1))
    .slice(0, 6)

  const carregando = lancamentosQuery.isLoading || categoriasQuery.isLoading
  const semGastos = !carregando && lancamentos.length === 0

  return (
    <div className="dash">
      <div className="dash-header">
        <button type="button" className="dash-mes-seletor" onClick={irParaMesAnterior} aria-label="Mês anterior">
          <ChevronLeft size={16} strokeWidth={2.75} />
        </button>
        <span className="dash-mes-label">{formatMesAno(mes)}</span>
        <button type="button" className="dash-mes-seletor" onClick={irParaProximoMes} aria-label="Próximo mês">
          <ChevronRight size={16} strokeWidth={2.75} />
        </button>
        <div className="dash-header-fim">
          <StatusSyncBadge />
        </div>
      </div>

      {semGastos ? (
        <EmptyState
          icon={<Plus size={34} strokeWidth={2.75} color="var(--color-accent)" />}
          title="Nenhum gasto ainda"
          description="Registre a primeira despesa e o painel do mês começa a se montar sozinho — totais, categorias e faturas."
          action={
            <Button variant="primary" onClick={() => navigate(rotas.novoLancamento)}>
              <Plus size={17} strokeWidth={3} /> Registrar primeiro gasto
            </Button>
          }
          secondary={
            <div className="dash-atalhos">
              <Link className="atalho-card" to={rotas.cartoes}>
                <span className="atalho-icone" style={{ background: 'var(--color-accent-2-200)' }}>
                  <CreditCard size={18} strokeWidth={2.75} color="#56633f" />
                </span>
                <span>
                  <span className="atalho-titulo">Cadastrar um cartão</span>
                  <span className="atalho-desc">para acompanhar faturas e parcelas</span>
                </span>
              </Link>
              <Link className="atalho-card" to={rotas.mercado}>
                <span className="atalho-icone" style={{ background: 'var(--color-accent-200)' }}>
                  <ShoppingCart size={18} strokeWidth={2.75} color="#8c491a" />
                </span>
                <span>
                  <span className="atalho-titulo">Montar a lista de mercado</span>
                  <span className="atalho-desc">vira um gasto ao finalizar a compra</span>
                </span>
              </Link>
              <Link className="atalho-card" to={rotas.categorias}>
                <span className="atalho-icone" style={{ background: 'var(--color-neutral-200)' }}>
                  <Tag size={18} strokeWidth={2.75} color="#645c50" />
                </span>
                <span>
                  <span className="atalho-titulo">Ajustar as categorias</span>
                  <span className="atalho-desc">categorias sugeridas, todas editáveis</span>
                </span>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="dash-grid-topo">
            <Card destaque className="dash-total-card">
              <span className="kicker" style={{ opacity: 0.85, color: 'inherit' }}>Gastos do mês</span>
              <span className="dash-total-valor">{formatCentavos(totais.totalCentavos)}</span>
              <div className="dash-barra-composicao">
                <span style={{ flex: Math.max(totais.pixCentavos, 1), background: '#ffc6a5' }} />
                <span style={{ flex: Math.max(totais.debitoCentavos, 1), background: '#f6a06b' }} />
                <span style={{ flex: Math.max(totais.creditoCentavos, 1), background: 'rgba(245,234,216,.5)' }} />
              </div>
              <div className="dash-composicao-legenda">
                <span>Pix {formatCentavos(totais.pixCentavos)}</span>
                <span>Débito {formatCentavos(totais.debitoCentavos)}</span>
                <span>Crédito {formatCentavos(totais.creditoCentavos)}</span>
              </div>
            </Card>

            {[...faturasDoMes.entries()].slice(0, 1).map(([faturaId, f]) => (
              <Card key={faturaId} className="dash-fatura-card">
                <div className="dash-fatura-topo">
                  <CreditCard size={15} strokeWidth={2.75} />
                  <span>{f.cartaoApelido} · vence {formatDataCurta(f.vencimento)}</span>
                </div>
                <div>
                  <div className="dash-fatura-valor">{formatCentavos(f.total)}</div>
                  <div className="dash-fatura-situacao">{f.paga ? 'Paga' : 'Em formação'}</div>
                </div>
                <Link to={rotas.cartao(f.cartaoId)} className="dash-fatura-link">Ver composição</Link>
              </Card>
            ))}

            {objetivosQuery.data && objetivosQuery.data[0] && (
              <ObjetivoResumoCard objetivoId={objetivosQuery.data[0].id} nome={objetivosQuery.data[0].nome} metaCentavos={objetivosQuery.data[0].meta_centavos} />
            )}
          </div>

          <div className="dash-grid-meio">
            <Card className="dash-categorias-card">
              <span className="card-title" style={{ fontFamily: 'var(--font-heading)', fontSize: 19 }}>Gastos por categoria</span>
              {segmentos.length > 0 ? (
                <DonutChart segmentos={segmentos} onSelecionar={(id) => navigate(rotas.categoria(id))} />
              ) : (
                <p className="text-muted">Nenhum gasto categorizado neste mês.</p>
              )}
              <span className="text-muted" style={{ fontSize: 11.5, marginTop: 'auto' }}>
                Selecione uma categoria para abrir mês, histórico e previsão.
              </span>
            </Card>

            <Card className="dash-recentes-card">
              <div className="dash-recentes-header">
                <span className="card-title" style={{ fontFamily: 'var(--font-heading)', fontSize: 19 }}>Lançamentos recentes</span>
                <Link to={rotas.lancamentos} className="dash-fatura-link">Ver todos</Link>
              </div>
              <div className="dash-recentes-lista">
                {recentes.map((l) => {
                  const cat = categorias.find((c) => c.id === l.categoria_id)
                  return (
                    <div key={l.id} className="dash-recente-linha">
                      <span className="dash-recente-data">{formatDataCurta(l.compra.data_compra)}</span>
                      <span className="dash-recente-desc">{l.compra.descricao}</span>
                      <span className="dash-recente-cat">
                        <span className="donut-cor" style={{ background: cat?.cor ?? '#a19786' }} />
                        {cat?.nome ?? '—'}
                      </span>
                      <span className="dash-recente-pagamento">
                        {l.compra.forma_pagamento === 'credito'
                          ? l.total_parcelas > 1
                            ? `Crédito · ${l.numero_parcela} de ${l.total_parcelas}`
                            : 'Crédito · à vista'
                          : ROTULO_PAGAMENTO[l.compra.forma_pagamento]}
                      </span>
                      <span className="dash-recente-valor">{formatCentavos(l.valor_centavos)}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </>
      )}

      <button type="button" className="dash-fab" onClick={() => navigate(rotas.novoLancamento)}>
        <Plus size={20} strokeWidth={3} /> Novo gasto
      </button>
    </div>
  )
}

function ObjetivoResumoCard({ objetivoId, nome, metaCentavos }: { objetivoId: string; nome: string; metaCentavos: number }) {
  // Resumo simples a partir da lista já carregada evitaria consulta extra,
  // mas o acumulado depende das movimentações — busca dedicada e barata.
  const { data } = useObjetivoResumo(objetivoId)
  const acumulado = data ?? 0
  const progresso = progressoPercentual(metaCentavos, acumulado)

  return (
    <Card className="dash-objetivo-card">
      <div className="dash-fatura-topo">
        <Target size={15} strokeWidth={2.75} />
        <span>Objetivo {nome}</span>
      </div>
      <div>
        <div className="dash-objetivo-pct">{Math.min(Math.round(progresso), 100)}%</div>
        <div className="progress-bar-track" style={{ marginTop: 8 }}>
          <div className="progress-bar-fill" style={{ width: `${Math.min(progresso, 100)}%` }} />
        </div>
      </div>
      <span className="dash-fatura-situacao">
        {formatCentavos(acumulado)} de {formatCentavos(metaCentavos)}
      </span>
    </Card>
  )
}

// Hook local e enxuto: só o acumulado, sem duplicar a lógica de useObjetivo.
function useObjetivoResumo(objetivoId: string) {
  return useQuery({
    queryKey: ['objetivo-resumo', objetivoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentos_objetivo')
        .select('valor_centavos, tipo')
        .eq('objetivo_id', objetivoId)
      if (error) throw error
      return acumuladoCentavos(
        (data as { valor_centavos: number; tipo: 'aporte' | 'retirada' }[]).map((m) => ({
          valorCentavos: m.valor_centavos,
          tipo: m.tipo,
        })),
      )
    },
  })
}
