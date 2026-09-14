import { formatCentavos } from '../lib/money'
import './DonutChart.css'

export interface SegmentoCategoria {
  id: string
  nome: string
  cor: string
  valorCentavos: number
}

interface DonutChartProps {
  segmentos: SegmentoCategoria[]
  onSelecionar?: (categoriaId: string) => void
}

// Gráfico de rosca + lista equivalente com valores, navegável por teclado
// (§9 da especificação: "deve possuir uma lista ou tabela equivalente").
export function DonutChart({ segmentos, onSelecionar }: DonutChartProps) {
  const total = segmentos.reduce((s, seg) => s + seg.valorCentavos, 0)

  let acumulado = 0
  const paradas = segmentos.map((seg) => {
    const inicio = total > 0 ? (acumulado / total) * 100 : 0
    acumulado += seg.valorCentavos
    const fim = total > 0 ? (acumulado / total) * 100 : 0
    return `${seg.cor} ${inicio}% ${fim}%`
  })

  const gradiente = total > 0 ? `conic-gradient(${paradas.join(', ')})` : 'conic-gradient(var(--color-neutral-300) 0 100%)'

  return (
    <div className="donut-wrap">
      <div className="donut-circulo" style={{ background: gradiente }}>
        <div className="donut-centro">
          <span className="donut-centro-numero">{segmentos.length}</span>
          <span className="donut-centro-legenda">{segmentos.length === 1 ? 'categoria' : 'categorias'}</span>
        </div>
      </div>
      <ul className="donut-lista">
        {segmentos.map((seg) => {
          const pct = total > 0 ? Math.round((seg.valorCentavos / total) * 100) : 0
          const conteudo = (
            <>
              <span className="donut-cor" style={{ background: seg.cor }} aria-hidden />
              <span className="donut-nome">{seg.nome}</span>
              <span className="donut-valor">{formatCentavos(seg.valorCentavos)}</span>
              <span className="donut-pct">{pct}%</span>
            </>
          )
          return (
            <li key={seg.id}>
              {onSelecionar ? (
                <button type="button" className="donut-linha donut-linha-botao" onClick={() => onSelecionar(seg.id)}>
                  {conteudo}
                </button>
              ) : (
                <span className="donut-linha">{conteudo}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
