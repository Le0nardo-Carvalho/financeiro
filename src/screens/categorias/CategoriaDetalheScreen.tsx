import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCategorias } from '../../lib/queries/categorias'
import { useLancamentosDaCategoria } from '../../lib/queries/lancamentos'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { formatCentavos } from '../../lib/money'
import { formatDataCurta, formatMesAno } from '../../lib/calc/datas'
import { previsaoFuturaCategoria, totalHistoricoCategoria, totalPorCategoriaNoMes, type LancamentoMensal as LancamentoCalc } from '../../lib/calc/agregacao'
import './CategoriaDetalheScreen.css'

export function CategoriaDetalheScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const categoriasQuery = useCategorias()
  const lancamentosQuery = useLancamentosDaCategoria(id)
  const { mes } = useMesSelecionado()

  const categoria = categoriasQuery.data?.find((c) => c.id === id)
  const lancamentos = lancamentosQuery.data ?? []

  const paraCalc: LancamentoCalc[] = lancamentos.map((l) => ({
    valorCentavos: l.valor_centavos,
    mesCompetencia: l.mes_competencia,
    formaPagamento: l.compra.forma_pagamento,
    categoriaId: l.categoria_id,
  }))

  const totalMes = id ? (totalPorCategoriaNoMes(paraCalc, mes).get(id) ?? 0) : 0
  const historico = id ? totalHistoricoCategoria(paraCalc, id, mes) : 0
  const previsao = id ? previsaoFuturaCategoria(paraCalc, id, mes) : 0

  const evolucao = useMemo(() => {
    const porMes = new Map<string, number>()
    for (const l of paraCalc) {
      if (l.mesCompetencia > mes) continue
      porMes.set(l.mesCompetencia, (porMes.get(l.mesCompetencia) ?? 0) + l.valorCentavos)
    }
    return [...porMes.entries()].sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 6)
  }, [paraCalc, mes])

  const lancamentosPassados = lancamentos.filter((l) => l.mes_competencia <= mes)
  const lancamentosFuturos = lancamentos.filter((l) => l.mes_competencia > mes)

  if (!categoria) return <p className="text-muted">Categoria não encontrada.</p>

  return (
    <div className="cat-detalhe-tela">
      <div className="novo-gasto-header">
        <button type="button" className="btn btn-icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={18} strokeWidth={2.75} />
        </button>
        <span className="lanc-item-cor" style={{ background: categoria.cor, width: 14, height: 14 }} />
        <span className="lanc-titulo">{categoria.nome}</span>
      </div>

      <div className="cat-detalhe-totais">
        <div className="cat-detalhe-total-card">
          <span className="kicker">Neste mês</span>
          <span className="cat-detalhe-total-valor">{formatCentavos(totalMes)}</span>
        </div>
        <div className="cat-detalhe-total-card">
          <span className="kicker">Histórico acumulado</span>
          <span className="cat-detalhe-total-valor">{formatCentavos(historico)}</span>
        </div>
      </div>

      {evolucao.length > 0 && (
        <div>
          <span className="kicker">Evolução mensal</span>
          <div className="cat-detalhe-evolucao">
            {evolucao.map(([m, valor]) => (
              <div key={m} className="cat-detalhe-evolucao-linha">
                <span className="text-muted">{formatMesAno(m)}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-heading)' }}>{formatCentavos(valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="kicker">Lançamentos</span>
        <div className="categorias-lista">
          {lancamentosPassados.map((l) => (
            <div key={l.id} className="categoria-linha">
              <span>{formatDataCurta(l.compra.data_compra)}</span>
              <span style={{ flex: 1 }}>{l.compra.descricao}</span>
              <span style={{ fontFamily: 'var(--font-heading)' }}>{formatCentavos(l.valor_centavos)}</span>
            </div>
          ))}
        </div>
      </div>

      {lancamentosFuturos.length > 0 && (
        <div>
          <span className="kicker">Compromissos futuros ({formatCentavos(previsao)})</span>
          <div className="categorias-lista">
            {lancamentosFuturos.map((l) => (
              <div key={l.id} className="categoria-linha" style={{ opacity: 0.75 }}>
                <span>{formatMesAno(l.mes_competencia)}</span>
                <span style={{ flex: 1 }}>{l.compra.descricao}</span>
                <span style={{ fontFamily: 'var(--font-heading)' }}>{formatCentavos(l.valor_centavos)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
