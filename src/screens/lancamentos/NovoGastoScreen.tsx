import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Plus } from 'lucide-react'
import { useCategorias, useCriarCategoria } from '../../lib/queries/categorias'
import { useCartoes } from '../../lib/queries/cartoes'
import { useCriarCompra } from '../../lib/queries/lancamentos'
import { supabase } from '../../lib/supabase'
import { formatCentavos, parseCentavosInput } from '../../lib/money'
import { formatDataLonga, hojeISO, type ISODate } from '../../lib/calc/datas'
import { gerarPreviaParcelas, primeiraFatura, faturaSeguinte, type Cartao as CartaoCalc } from '../../lib/calc/parcelas'
import { mensagemDeErro } from '../../lib/queries/shared'
import type { FormaPagamento } from '../../types/database'
import { Button, Field, Input, Seg } from '../../components/ui'
import './NovoGastoScreen.css'

export function NovoGastoScreen() {
  const navigate = useNavigate()
  const categoriasQuery = useCategorias()
  const cartoesQuery = useCartoes()
  const criarCompra = useCriarCompra()
  const criarCategoria = useCriarCategoria()

  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState<ISODate>(hojeISO())
  const [valorTexto, setValorTexto] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [cartaoId, setCartaoId] = useState('')
  const [parcelas, setParcelas] = useState(1)
  const [ajustesFatura, setAjustesFatura] = useState(0)
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [criandoCategoria, setCriandoCategoria] = useState(false)
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState('')

  const categorias = (categoriasQuery.data ?? []).filter((c) => !c.arquivada)
  const cartoes = (cartoesQuery.data ?? []).filter((c) => !c.arquivado)
  const valorCentavos = parseCentavosInput(valorTexto)
  const cartaoSelecionado = cartoes.find((c) => c.id === cartaoId)

  const previa = useMemo(() => {
    if (forma !== 'credito' || !cartaoSelecionado || !valorCentavos || valorCentavos < parcelas) return []
    const cartaoCalc: CartaoCalc = { diaFechamento: cartaoSelecionado.dia_fechamento, diaVencimento: cartaoSelecionado.dia_vencimento }
    let referencia = primeiraFatura(cartaoCalc, data)
    for (let i = 0; i < ajustesFatura; i++) referencia = faturaSeguinte(cartaoCalc, referencia)
    try {
      return gerarPreviaParcelas(cartaoCalc, data, valorCentavos, parcelas, referencia)
    } catch {
      return []
    }
  }, [forma, cartaoSelecionado, valorCentavos, parcelas, data, ajustesFatura])

  async function resolverPrimeiraFaturaId(): Promise<string | null> {
    if (!cartaoId || ajustesFatura === 0) return null
    let { data: id, error } = await supabase.rpc('primeira_fatura', { p_cartao: cartaoId, p_data_compra: data })
    if (error) throw error
    for (let i = 0; i < ajustesFatura; i++) {
      const resultado = await supabase.rpc('fatura_seguinte', { p_cartao: cartaoId, p_fatura: id as string })
      if (resultado.error) throw resultado.error
      id = resultado.data
    }
    return id as string
  }

  async function aoCriarCategoria() {
    if (!nomeNovaCategoria.trim()) return
    try {
      const resultado = await criarCategoria.mutateAsync({ nome: nomeNovaCategoria, cor: '#8fa073' })
      setCategoriaId(resultado.categoria.id)
      setCriandoCategoria(false)
      setNomeNovaCategoria('')
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function aoSalvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!descricao.trim()) return setErro('Informe uma descrição.')
    if (!valorCentavos || valorCentavos <= 0) return setErro('Informe um valor maior que zero.')
    if (!categoriaId) return setErro('Selecione uma categoria.')
    if (forma === 'credito' && !cartaoId) return setErro('Selecione o cartão usado.')
    if (forma === 'credito' && (!Number.isInteger(parcelas) || parcelas < 1)) return setErro('Número de parcelas inválido.')

    try {
      const primeiraFaturaId = forma === 'credito' ? await resolverPrimeiraFaturaId() : null
      const compraId = await criarCompra.mutateAsync({
        descricao,
        dataCompra: data,
        valorTotalCentavos: valorCentavos,
        categoriaId,
        formaPagamento: forma,
        cartaoId: forma === 'credito' ? cartaoId : null,
        parcelas: forma === 'credito' ? parcelas : 1,
        primeiraFaturaId,
        observacoes: observacoes.trim() || null,
      })
      navigate(`/lancamentos/${compraId}`)
    } catch (e) {
      setErro(mensagemDeErro(e))
      // formulário preservado: nenhum campo é limpo em caso de falha (§4.4, CA26)
    }
  }

  const salvando = criarCompra.isPending

  return (
    <div className="novo-gasto-tela">
      <div className="novo-gasto-header">
        <button type="button" className="btn btn-icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={18} strokeWidth={2.75} />
        </button>
        <span className="lanc-titulo">Novo gasto</span>
      </div>

      <form onSubmit={aoSalvar} className="novo-gasto-form">
        <Field label="Valor">
          <input
            className="input novo-gasto-valor"
            inputMode="decimal"
            placeholder="R$ 0,00"
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
            autoFocus
          />
        </Field>

        <Field label="Descrição">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Mercado do bairro" />
        </Field>

        <Field label="Data da compra">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>

        <Field label="Categoria">
          {!criandoCategoria ? (
            <div className="novo-gasto-categoria-linha">
              <select className="input" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                <option value="">Selecione…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <Button type="button" onClick={() => setCriandoCategoria(true)}>
                <Plus size={15} strokeWidth={3} /> Nova
              </Button>
            </div>
          ) : (
            <div className="novo-gasto-categoria-linha">
              <Input
                placeholder="Nome da nova categoria"
                value={nomeNovaCategoria}
                onChange={(e) => setNomeNovaCategoria(e.target.value)}
                autoFocus
              />
              <Button type="button" variant="primary" onClick={aoCriarCategoria} disabled={criarCategoria.isPending}>
                Salvar
              </Button>
              <Button type="button" onClick={() => setCriandoCategoria(false)}>Cancelar</Button>
            </div>
          )}
        </Field>

        <Field label="Forma de pagamento">
          <Seg
            name="forma"
            value={forma}
            onChange={(v) => setForma(v)}
            options={[
              { value: 'pix', label: 'Pix' },
              { value: 'debito', label: 'Débito' },
              { value: 'credito', label: 'Crédito' },
            ]}
          />
        </Field>

        {forma === 'credito' && (
          <>
            <Field label="Cartão">
              <select className="input" value={cartaoId} onChange={(e) => { setCartaoId(e.target.value); setAjustesFatura(0) }}>
                <option value="">Selecione…</option>
                {cartoes.map((c) => (
                  <option key={c.id} value={c.id}>{c.apelido}</option>
                ))}
              </select>
            </Field>

            <Field label="Número de parcelas">
              <Input
                type="number"
                min={1}
                value={parcelas}
                onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 1))}
              />
            </Field>

            {previa.length > 0 && (
              <div className="novo-gasto-previa">
                <div className="novo-gasto-previa-header">
                  <CreditCard size={15} strokeWidth={2.75} />
                  <span>Prévia das parcelas</span>
                  <button type="button" className="btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setAjustesFatura((n) => n + 1)}>
                    Ajustar 1ª fatura
                  </button>
                </div>
                {previa.map((p) => (
                  <div key={p.numero} className="novo-gasto-previa-linha">
                    <span>{p.numero} de {p.totalParcelas}</span>
                    <span className="text-muted">vence {formatDataLonga(p.dataVencimento)}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-heading)' }}>{formatCentavos(p.valorCentavos)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Field label="Observações (opcional)">
          <textarea className="input" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </Field>

        {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

        <Button type="submit" variant="primary" block disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar gasto'}
        </Button>
      </form>
    </div>
  )
}
