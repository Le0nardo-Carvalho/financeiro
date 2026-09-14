import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useCompra, useCorrigirCompra, useExcluirCompra, useReclassificarCompra } from '../../lib/queries/lancamentos'
import { useCategorias } from '../../lib/queries/categorias'
import { useCartoes } from '../../lib/queries/cartoes'
import { formatCentavos, parseCentavosInput } from '../../lib/money'
import { formatDataLonga, formatMesAno, type ISODate } from '../../lib/calc/datas'
import { gerarPreviaParcelas, primeiraFatura, type Cartao as CartaoCalc } from '../../lib/calc/parcelas'
import { mensagemDeErro } from '../../lib/queries/shared'
import type { FormaPagamento } from '../../types/database'
import { Button, Dialog, Field, Input, Seg } from '../../components/ui'
import './DetalheLancamentoScreen.css'

const ROTULO_PAGAMENTO: Record<FormaPagamento, string> = { pix: 'Pix', debito: 'Débito', credito: 'Crédito' }

export function DetalheLancamentoScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const compraQuery = useCompra(id)
  const categoriasQuery = useCategorias()
  const cartoesQuery = useCartoes()
  const corrigirCompra = useCorrigirCompra()
  const reclassificar = useReclassificarCompra()
  const excluir = useExcluirCompra()

  const [editando, setEditando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const categorias = categoriasQuery.data ?? []
  const cartoes = cartoesQuery.data ?? []

  if (compraQuery.isLoading) return <p className="text-muted">Carregando…</p>
  if (compraQuery.isError || !compraQuery.data) return <p className="text-muted">Lançamento não encontrado.</p>

  const { compra, parcelas } = compraQuery.data
  const categoria = categorias.find((c) => c.id === compra.categoria_id)
  const faturasPagasAfetadas = false // sinalizado pelo servidor após confirmar (corrigida_apos_pagamento na fatura)

  async function aoReclassificar(novaCategoriaId: string) {
    setErro(null)
    try {
      await reclassificar.mutateAsync({ compraId: compra.id, categoriaId: novaCategoriaId })
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function aoExcluir() {
    setErro(null)
    try {
      await excluir.mutateAsync(compra.id)
      navigate('/lancamentos')
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="detalhe-lanc-tela">
      <div className="novo-gasto-header">
        <button type="button" className="btn btn-icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={18} strokeWidth={2.75} />
        </button>
        <span className="lanc-titulo">{compra.descricao}</span>
      </div>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      {!editando ? (
        <>
          <div className="detalhe-lanc-resumo">
            <span className="detalhe-lanc-valor">{formatCentavos(compra.valor_total_centavos)}</span>
            <span className="text-muted">{formatDataLonga(compra.data_compra)} · {ROTULO_PAGAMENTO[compra.forma_pagamento]}</span>
          </div>

          <Field label="Categoria">
            <select
              className="input"
              value={compra.categoria_id}
              onChange={(e) => aoReclassificar(e.target.value)}
              disabled={reclassificar.isPending}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
          {categoria?.arquivada && <p className="text-muted" style={{ fontSize: 12 }}>Categoria arquivada — mantida por ser o vínculo histórico deste lançamento.</p>}

          <div>
            <span className="kicker">Parcelas</span>
            <div className="detalhe-lanc-parcelas">
              {parcelas.map((p) => (
                <div key={p.id} className="detalhe-lanc-parcela-linha">
                  <span>{p.numero_parcela} de {p.total_parcelas}</span>
                  <span className="text-muted">{formatMesAno(p.mes_competencia)}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-heading)' }}>{formatCentavos(p.valor_centavos)}</span>
                </div>
              ))}
            </div>
          </div>

          {faturasPagasAfetadas && (
            <div className="sheet-aviso">Uma correção anterior afetou uma fatura já paga — o registro dela foi marcado como corrigido.</div>
          )}

          <div className="detalhe-lanc-acoes">
            <Button onClick={() => setEditando(true)}>Editar</Button>
            <Button className="btn-danger" onClick={() => setConfirmandoExclusao(true)}>
              <Trash2 size={16} strokeWidth={2.75} /> Excluir
            </Button>
          </div>
        </>
      ) : (
        <FormularioCorrecao
          compra={compra}
          cartoes={cartoes}
          onCancelar={() => setEditando(false)}
          onErro={setErro}
          onSalvo={() => setEditando(false)}
          corrigirCompra={corrigirCompra}
        />
      )}

      {confirmandoExclusao && (
        <Dialog
          title="Excluir lançamento?"
          onClose={() => setConfirmandoExclusao(false)}
          actions={
            <>
              <Button onClick={() => setConfirmandoExclusao(false)}>Cancelar</Button>
              <Button className="btn-danger" variant="primary" onClick={aoExcluir} disabled={excluir.isPending}>
                Excluir
              </Button>
            </>
          }
        >
          Isso remove a compra e todas as {parcelas.length} parcela(s) vinculadas dos totais mensais. Esta ação não pode ser desfeita.
        </Dialog>
      )}
    </div>
  )
}

function FormularioCorrecao({ compra, cartoes, onCancelar, onErro, onSalvo, corrigirCompra }: {
  compra: import('../../types/database').Compra
  cartoes: import('../../types/database').Cartao[]
  onCancelar: () => void
  onErro: (msg: string) => void
  onSalvo: () => void
  corrigirCompra: ReturnType<typeof useCorrigirCompra>
}) {
  const [descricao, setDescricao] = useState(compra.descricao)
  const [data, setData] = useState<ISODate>(compra.data_compra)
  const [valorTexto, setValorTexto] = useState((compra.valor_total_centavos / 100).toFixed(2).replace('.', ','))
  const [forma, setForma] = useState<FormaPagamento>(compra.forma_pagamento)
  const [cartaoId, setCartaoId] = useState(compra.cartao_id ?? '')
  const [parcelasQtd, setParcelasQtd] = useState(compra.parcelas)
  const [confirmando, setConfirmando] = useState(false)

  const valorCentavos = parseCentavosInput(valorTexto)
  const cartaoSelecionado = cartoes.find((c) => c.id === cartaoId)

  const novaPrevia = useMemo(() => {
    if (forma !== 'credito' || !cartaoSelecionado || !valorCentavos || valorCentavos < parcelasQtd) return []
    const cartaoCalc: CartaoCalc = { diaFechamento: cartaoSelecionado.dia_fechamento, diaVencimento: cartaoSelecionado.dia_vencimento }
    try {
      return gerarPreviaParcelas(cartaoCalc, data, valorCentavos, parcelasQtd, primeiraFatura(cartaoCalc, data))
    } catch {
      return []
    }
  }, [forma, cartaoSelecionado, valorCentavos, parcelasQtd, data])

  async function confirmar() {
    if (!valorCentavos || valorCentavos <= 0) return onErro('Informe um valor maior que zero.')
    try {
      await corrigirCompra.mutateAsync({
        compraId: compra.id,
        versaoLida: compra.versao,
        descricao,
        dataCompra: data,
        valorTotalCentavos: valorCentavos,
        categoriaId: compra.categoria_id,
        formaPagamento: forma,
        cartaoId: forma === 'credito' ? cartaoId : null,
        parcelas: forma === 'credito' ? parcelasQtd : 1,
      })
      onSalvo()
    } catch (e) {
      onErro(mensagemDeErro(e))
      setConfirmando(false)
    }
  }

  return (
    <div className="novo-gasto-form">
      <Field label="Descrição"><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
      <Field label="Data da compra"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>
      <Field label="Valor total"><Input value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} inputMode="decimal" /></Field>
      <Field label="Forma de pagamento">
        <Seg name="forma-edicao" value={forma} onChange={setForma} options={[
          { value: 'pix', label: 'Pix' }, { value: 'debito', label: 'Débito' }, { value: 'credito', label: 'Crédito' },
        ]} />
      </Field>
      {forma === 'credito' && (
        <>
          <Field label="Cartão">
            <select className="input" value={cartaoId} onChange={(e) => setCartaoId(e.target.value)}>
              <option value="">Selecione…</option>
              {cartoes.map((c) => <option key={c.id} value={c.id}>{c.apelido}</option>)}
            </select>
          </Field>
          <Field label="Número de parcelas">
            <Input type="number" min={1} value={parcelasQtd} onChange={(e) => setParcelasQtd(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        </>
      )}
      <div className="detalhe-lanc-acoes">
        <Button onClick={onCancelar}>Cancelar</Button>
        <Button variant="primary" onClick={() => setConfirmando(true)} disabled={corrigirCompra.isPending}>
          Revisar alterações
        </Button>
      </div>

      {confirmando && (
        <Dialog
          title="Confirmar correção"
          onClose={() => setConfirmando(false)}
          actions={
            <>
              <Button onClick={() => setConfirmando(false)}>Voltar a editar</Button>
              <Button variant="primary" onClick={confirmar} disabled={corrigirCompra.isPending}>
                {corrigirCompra.isPending ? 'Salvando…' : 'Confirmar'}
              </Button>
            </>
          }
        >
          <p>Isto atualiza a compra existente — nenhuma outra compra é criada.</p>
          {forma === 'credito' && novaPrevia.length > 0 && (
            <div className="detalhe-lanc-parcelas" style={{ marginTop: 10 }}>
              {novaPrevia.map((p) => (
                <div key={p.numero} className="detalhe-lanc-parcela-linha">
                  <span>{p.numero} de {p.totalParcelas}</span>
                  <span className="text-muted">{formatMesAno(p.mesReferencia)}</span>
                  <span style={{ marginLeft: 'auto' }}>{formatCentavos(p.valorCentavos)}</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: 10, fontSize: 12.5 }}>
            Se algum mês afetado pertencer a uma fatura já paga, ela será marcada como corrigida após confirmar.
          </p>
        </Dialog>
      )}
    </div>
  )
}
