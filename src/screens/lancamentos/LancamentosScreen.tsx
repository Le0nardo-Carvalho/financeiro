import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Filter, Plus, Search } from 'lucide-react'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { useLancamentosDoMes } from '../../lib/queries/lancamentos'
import { useCategorias } from '../../lib/queries/categorias'
import { useCartoes } from '../../lib/queries/cartoes'
import { formatCentavos } from '../../lib/money'
import { formatDataCurta, formatMesAno } from '../../lib/calc/datas'
import type { FormaPagamento } from '../../types/database'
import { Button, EmptyState, Input } from '../../components/ui'
import { rotas } from '../../router/rotas'
import { SeletorMes } from '../../components/SeletorMes'
import { formatValorCurto } from '../../lib/rotulos'
import './LancamentosScreen.css'

const ROTULO_PAGAMENTO: Record<FormaPagamento, string> = { pix: 'Pix', debito: 'Débito', credito: 'Crédito' }

export function LancamentosScreen() {
  const { mes } = useMesSelecionado()
  const navigate = useNavigate()
  const lancamentosQuery = useLancamentosDoMes(mes)
  const categoriasQuery = useCategorias()
  const cartoesQuery = useCartoes()

  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroPagamento, setFiltroPagamento] = useState('')
  const [filtroCartao, setFiltroCartao] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const lancamentos = lancamentosQuery.data ?? []
  const categorias = categoriasQuery.data ?? []
  const cartoes = cartoesQuery.data ?? []

  const filtrados = useMemo(() => {
    const buscaNorm = busca.trim().toLowerCase()
    return lancamentos.filter((l) => {
      if (buscaNorm && !l.compra.descricao.toLowerCase().includes(buscaNorm)) return false
      if (filtroCategoria && l.categoria_id !== filtroCategoria) return false
      if (filtroPagamento && l.compra.forma_pagamento !== filtroPagamento) return false
      if (filtroCartao && l.compra.cartao_id !== filtroCartao) return false
      return true
    })
  }, [lancamentos, busca, filtroCategoria, filtroPagamento, filtroCartao])

  return (
    <div className="lanc-tela">
      <div className="lanc-header">
        <span className="lanc-titulo">Lançamentos</span>
        <span className="lanc-header-fim">
          <SeletorMes />
          <Button variant="primary" className="lanc-novo" onClick={() => navigate(rotas.novoLancamento)}>
            <Plus size={16} strokeWidth={3} /> Novo gasto
          </Button>
        </span>
      </div>

      <div className="lanc-busca-linha">
        <div className="lanc-busca-campo">
          <Search size={16} strokeWidth={2.75} className="lanc-busca-icone" />
          <Input placeholder="Buscar por descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button type="button" className="btn btn-icon btn-secondary" onClick={() => setMostrarFiltros((v) => !v)} aria-label="Filtros">
          <Filter size={17} strokeWidth={2.75} />
        </button>
      </div>

      {mostrarFiltros && (
        <div className="lanc-filtros">
          <select className="input" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}{c.arquivada ? ' (arquivada)' : ''}</option>
            ))}
          </select>
          <select className="input" value={filtroPagamento} onChange={(e) => setFiltroPagamento(e.target.value)}>
            <option value="">Todos os pagamentos</option>
            <option value="pix">Pix</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </select>
          <select className="input" value={filtroCartao} onChange={(e) => setFiltroCartao(e.target.value)}>
            <option value="">Todos os cartões</option>
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>{c.apelido}</option>
            ))}
          </select>
        </div>
      )}

      {filtrados.length > 0 && (
        <div className="lanc-resumo">
          <span>{filtrados.length} {filtrados.length === 1 ? 'lançamento' : 'lançamentos'}</span>
          <span className="valor">{formatCentavos(filtrados.reduce((s, l) => s + l.valor_centavos, 0))}</span>
        </div>
      )}

      {filtrados.length === 0 ? (
        <EmptyState
          icon={<Search size={30} strokeWidth={2.75} color="var(--color-neutral-600)" />}
          title="Nada encontrado"
          description={busca ? `Nenhum gasto com "${busca}" em ${formatMesAno(mes)}.` : `Nenhum lançamento em ${formatMesAno(mes)} com esses filtros.`}
        />
      ) : (
        <div className="lanc-lista">
          {filtrados.map((l) => {
            const cat = categorias.find((c) => c.id === l.categoria_id)
            return (
              <Link key={l.id} to={rotas.lancamento(l.compra_id)} className="lanc-item">
                <span className="lanc-item-cor" style={{ background: cat?.cor ?? 'var(--cat-outros)' }} />
                <span className="lanc-item-corpo">
                  <span className="lanc-item-desc">{l.compra.descricao}</span>
                  <span className="lanc-item-meta">
                    {formatDataCurta(l.compra.data_compra)} · {cat?.nome ?? '—'} ·{' '}
                    {l.compra.forma_pagamento === 'credito'
                      ? 'Crédito'
                      : ROTULO_PAGAMENTO[l.compra.forma_pagamento]}
                  </span>
                </span>
                <span className="lanc-item-fim">
                  <span className="lanc-item-valor">{formatValorCurto(l.valor_centavos)}</span>
                  {l.compra.forma_pagamento === 'credito' && (
                    <span className="tag tag-accent">{l.total_parcelas > 1 ? `${l.numero_parcela} de ${l.total_parcelas}` : 'à vista'}</span>
                  )}
                  {l.compra.origem === 'mercado' && <span className="tag tag-accent-2">Da lista de mercado</span>}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
