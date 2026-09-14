import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react'
import {
  useAdicionarItem, useAtualizarItem, useListaMercado, useRemoverItem,
} from '../../lib/queries/mercado'
import { mensagemDeErro } from '../../lib/queries/shared'
import { podeConfirmarItem, subtotalItemCentavos, totalConfirmadoCentavos, totalForaCentavos } from '../../lib/calc/mercado'
import { formatCentavos, parseCentavosInput } from '../../lib/money'
import type { ItemLista } from '../../types/database'
import { Button, Input } from '../../components/ui'
import { rotas } from '../../router/rotas'
import { FinalizarCompraSheet } from './FinalizarCompraSheet'
import './ListaMercadoDetalheScreen.css'

export function ListaMercadoDetalheScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const listaQuery = useListaMercado(id)
  const adicionar = useAdicionarItem(id ?? '')
  const atualizar = useAtualizarItem(id ?? '')
  const remover = useRemoverItem(id ?? '')

  const [produto, setProduto] = useState('')
  const [finalizando, setFinalizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (listaQuery.isLoading) return <p className="text-muted">Carregando…</p>
  if (!listaQuery.data) return <p className="text-muted">Lista não encontrada.</p>

  const { lista, itens } = listaQuery.data

  const totalConfirmado = totalConfirmadoCentavos(
    itens.map((i) => ({ quantidade: i.quantidade, precoUnitarioCentavos: i.preco_unitario_centavos, confirmado: i.confirmado })),
  )
  const totalFora = totalForaCentavos(
    itens.map((i) => ({ quantidade: i.quantidade, precoUnitarioCentavos: i.preco_unitario_centavos, confirmado: i.confirmado })),
  )
  const qtdConfirmados = itens.filter((i) => i.confirmado).length

  async function aoAdicionarItem() {
    if (!produto.trim()) return
    setErro(null)
    try {
      await adicionar.mutateAsync({ produto, quantidade: 1, unidade: 'un', precoUnitarioCentavos: null })
      setProduto('')
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function aoAlternarConfirmado(item: ItemLista) {
    if (!item.confirmado && !podeConfirmarItem({ quantidade: item.quantidade, precoUnitarioCentavos: item.preco_unitario_centavos })) return
    setErro(null)
    try {
      await atualizar.mutateAsync({ id: item.id, confirmado: !item.confirmado })
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function aoAlterarPreco(item: ItemLista, texto: string) {
    const centavos = texto.trim() === '' ? null : parseCentavosInput(texto)
    setErro(null)
    try {
      await atualizar.mutateAsync({ id: item.id, precoUnitarioCentavos: centavos })
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function aoAlterarQuantidade(item: ItemLista, valor: number) {
    if (!(valor > 0)) return
    setErro(null)
    try {
      await atualizar.mutateAsync({ id: item.id, quantidade: valor })
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  const finalizada = lista.situacao === 'finalizada'

  return (
    <div className="lista-mercado-tela">
      <div className="novo-gasto-header">
        <button type="button" className="btn btn-icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={18} strokeWidth={2.75} />
        </button>
        <span className="lanc-titulo">{lista.nome}</span>
      </div>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      {finalizada && (
        <div className="sheet-aviso">
          Lista finalizada.{' '}
          {lista.compra_id && (
            <button type="button" className="btn-ghost" onClick={() => navigate(rotas.lancamento(lista.compra_id as string))}>
              Ver a despesa gerada
            </button>
          )}
        </div>
      )}

      {!finalizada && (
        <div className="lista-mercado-add">
          <Input placeholder="Adicionar produto" value={produto} onChange={(e) => setProduto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && aoAdicionarItem()} />
          <Button variant="primary" onClick={aoAdicionarItem}><Plus size={16} strokeWidth={3} /></Button>
        </div>
      )}

      <div className="lista-mercado-itens">
        {itens.map((item) => {
          const subtotal = subtotalItemCentavos({ quantidade: item.quantidade, precoUnitarioCentavos: item.preco_unitario_centavos })
          const podeConfirmar = podeConfirmarItem({ quantidade: item.quantidade, precoUnitarioCentavos: item.preco_unitario_centavos })
          return (
            <div key={item.id} className={`item-mercado ${item.confirmado ? 'item-mercado-confirmado' : ''}`}>
              <button
                type="button"
                className={`item-mercado-check ${!podeConfirmar ? 'item-mercado-check-tracejado' : ''}`}
                onClick={() => aoAlternarConfirmado(item)}
                disabled={finalizada || (!item.confirmado && !podeConfirmar)}
                aria-label={item.confirmado ? 'Desmarcar item' : 'Confirmar item'}
              >
                {item.confirmado && <Check size={15} strokeWidth={3} color="#fff" />}
              </button>

              <div className="item-mercado-corpo">
                <span className="item-mercado-nome">{item.produto}{item.marca ? ` · ${item.marca}` : ''}</span>
                <div className="item-mercado-linha-editavel">
                  <input
                    className="input item-mercado-qtd"
                    type="number"
                    step="0.001"
                    min={0}
                    defaultValue={item.quantidade}
                    disabled={finalizada}
                    onBlur={(e) => aoAlterarQuantidade(item, Number(e.target.value))}
                  />
                  <span className="text-muted">{item.unidade}</span>
                  <input
                    className={`input item-mercado-preco ${item.preco_unitario_centavos === null ? 'item-mercado-preco-vazio' : ''}`}
                    placeholder="R$ —"
                    defaultValue={item.preco_unitario_centavos !== null ? (item.preco_unitario_centavos / 100).toFixed(2).replace('.', ',') : ''}
                    disabled={finalizada}
                    onBlur={(e) => aoAlterarPreco(item, e.target.value)}
                  />
                </div>
              </div>

              <span className="item-mercado-subtotal">{subtotal !== null ? formatCentavos(subtotal) : 'R$ —'}</span>

              {!finalizada && (
                <button type="button" className="btn btn-icon" onClick={() => remover.mutate(item.id)} aria-label="Remover">
                  <Trash2 size={15} strokeWidth={2.75} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="lista-mercado-rodape">
        <div>
          <span className="kicker">Total confirmado · {qtdConfirmados} item(ns)</span>
          <div className="lista-mercado-total">{formatCentavos(totalConfirmado)}</div>
          {totalFora > 0 && <span className="text-muted" style={{ fontSize: 11.5 }}>{formatCentavos(totalFora)} ainda fora</span>}
        </div>
        {!finalizada && (
          <Button variant="primary" disabled={qtdConfirmados === 0} onClick={() => setFinalizando(true)}>
            Finalizar compra
          </Button>
        )}
      </div>

      {finalizando && id && (
        <FinalizarCompraSheet
          listaId={id}
          totalConfirmadoCentavos={totalConfirmado}
          quantidadeConfirmados={qtdConfirmados}
          onClose={() => setFinalizando(false)}
          onFinalizado={(compraId) => navigate(rotas.lancamento(compraId))}
        />
      )}
    </div>
  )
}
