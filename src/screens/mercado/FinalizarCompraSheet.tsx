import { useEffect, useState } from 'react'
import { usePerfil } from '../../lib/queries/perfil'
import { useCategorias } from '../../lib/queries/categorias'
import { useCartoes } from '../../lib/queries/cartoes'
import { useFinalizarListaMercado } from '../../lib/queries/mercado'
import { formatCentavos } from '../../lib/money'
import { formatMesExtenso, hojeISO, type ISODate } from '../../lib/calc/datas'
import { mensagemDeErro } from '../../lib/queries/shared'
import type { FormaPagamento } from '../../types/database'
import { Button, BottomSheet, Field, Input, Seg } from '../../components/ui'

interface FinalizarCompraSheetProps {
  listaId: string
  totalConfirmadoCentavos: number
  quantidadeConfirmados: number
  quantidadeNaoConfirmados?: number
  onClose: () => void
  onFinalizado: (compraId: string) => void
}

export function FinalizarCompraSheet({ listaId, totalConfirmadoCentavos, quantidadeConfirmados, quantidadeNaoConfirmados = 0, onClose, onFinalizado }: FinalizarCompraSheetProps) {
  const perfilQuery = usePerfil()
  const categoriasQuery = useCategorias()
  const cartoesQuery = useCartoes()
  const finalizar = useFinalizarListaMercado()

  const categorias = (categoriasQuery.data ?? []).filter((c) => !c.arquivada)
  const cartoes = (cartoesQuery.data ?? []).filter((c) => !c.arquivado)

  const [data, setData] = useState<ISODate>(hojeISO())
  const [categoriaId, setCategoriaId] = useState('')
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [cartaoId, setCartaoId] = useState('')
  const [parcelas, setParcelas] = useState(1)
  const [estabelecimento, setEstabelecimento] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const categoriaMercadoId = perfilQuery.data?.categoria_mercado_id ?? null
  useEffect(() => {
    if (categoriaId) return
    const sugerida = categorias.find((c) => c.id === categoriaMercadoId)
    setCategoriaId(sugerida?.id ?? categorias[0]?.id ?? '')
  }, [categoriaMercadoId, categorias, categoriaId])

  const categoriaMercadoArquivada = categoriaMercadoId !== null && !categorias.some((c) => c.id === categoriaMercadoId)

  async function aoConfirmar() {
    setErro(null)
    if (quantidadeConfirmados === 0 || totalConfirmadoCentavos <= 0) {
      return setErro('É preciso ao menos um item confirmado e total maior que zero.')
    }
    if (!categoriaId) return setErro('Selecione uma categoria.')
    if (forma === 'credito' && !cartaoId) return setErro('Selecione o cartão usado.')

    try {
      const compraId = await finalizar.mutateAsync({
        listaId,
        data,
        categoriaId,
        formaPagamento: forma,
        cartaoId: forma === 'credito' ? cartaoId : null,
        parcelas: forma === 'credito' ? parcelas : 1,
        primeiraFaturaId: null, // usa a sugestão automática do servidor
        estabelecimento: estabelecimento.trim() || null,
      })
      onFinalizado(compraId)
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <BottomSheet
      title="Finalizar compra"
      subtitle={`${quantidadeConfirmados} ${quantidadeConfirmados === 1 ? 'item confirmado' : 'itens confirmados'}${estabelecimento.trim() ? ` · ${estabelecimento.trim()}` : ''}`}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="text-muted" style={{ fontSize: 12 }}>Total da compra</span>
        <span className="valor-destaque" style={{ fontSize: 34 }}>{formatCentavos(totalConfirmadoCentavos)}</span>
      </div>

      <Field label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>

      <Field label="Estabelecimento (opcional)">
        <Input value={estabelecimento} onChange={(e) => setEstabelecimento(e.target.value)} placeholder="Ex.: Mercado do Bairro" />
      </Field>

      <Field label="Categoria">
        <select className="input" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      {categoriaMercadoArquivada && (
        <p style={{ fontSize: 12 }} className="text-muted">
          A categoria sugerida de Mercado está arquivada — selecione uma categoria ativa.
        </p>
      )}

      <Field label="Forma de pagamento">
        <Seg name="forma-mercado" value={forma} onChange={setForma} options={[
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
            <Input type="number" min={1} value={parcelas} onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        </>
      )}

      <div className="sheet-aviso">
        <span>
          Isto cria <strong>um único gasto</strong> de {formatCentavos(totalConfirmadoCentavos)}{forma === 'credito' ? ', contado nos meses das faturas do cartão' : ` em ${formatMesExtenso(data)}`}.
          {quantidadeNaoConfirmados > 0 && ` Os ${quantidadeNaoConfirmados} itens não confirmados ficam guardados como não comprados.`}
        </span>
      </div>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      <div className="sheet-actions-lado">
        <Button variant="contorno" onClick={onClose}>Voltar</Button>
        <Button variant="primary" onClick={aoConfirmar} disabled={finalizar.isPending}>
          {finalizar.isPending ? 'Salvando…' : 'Confirmar e gerar gasto'}
        </Button>
      </div>
    </BottomSheet>
  )
}
