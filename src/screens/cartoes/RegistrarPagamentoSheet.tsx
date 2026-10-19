import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useEditarPagamento, useExcluirPagamento, useRegistrarPagamento } from '../../lib/queries/faturas'
import { mensagemDeErro } from '../../lib/queries/shared'
import { situacaoDaFatura } from '../../lib/calc/pagamentos'
import { formatCentavos, parseCentavosInput } from '../../lib/money'
import { formatDataCurta, formatMesExtenso, hojeISO, type ISODate } from '../../lib/calc/datas'
import { formatValorCurto, ROTULO_MEIO, tituloPagamento } from '../../lib/rotulos'
import type { FaturaResumo, MeioPagamentoFatura, PagamentoFatura } from '../../types/database'
import { BottomSheet, Button, Field, Input } from '../../components/ui'

const MEIOS: MeioPagamentoFatura[] = ['pix', 'boleto', 'debito_automatico', 'transferencia', 'outro']

interface Props {
  fatura: FaturaResumo
  cartaoApelido: string
  pagamentos: PagamentoFatura[]
  emEdicao?: PagamentoFatura | null
  onClose: () => void
}

function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

// Registrar pagamento (tela 1f) — e editar/excluir um pagamento já feito.
// Pagamento não é gasto: grava só em pagamentos_fatura; a situação da fatura
// é recalculada pelo banco (faturas_resumo).
export function RegistrarPagamentoSheet({ fatura, cartaoApelido, pagamentos, emEdicao, onClose }: Props) {
  const registrar = useRegistrarPagamento()
  const editar = useEditarPagamento()
  const excluir = useExcluirPagamento()

  // O pagamento em edição sai da conta do "já pago" para o saldo fazer sentido.
  const outros = pagamentos.filter((p) => p.id !== emEdicao?.id)
  const antes = situacaoDaFatura(fatura.total_centavos, outros.map((p) => ({ valorCentavos: p.valor_centavos })))

  const [valorTexto, setValorTexto] = useState(
    emEdicao ? centavosParaTexto(emEdicao.valor_centavos) : antes.saldoCentavos > 0 ? centavosParaTexto(antes.saldoCentavos) : '',
  )
  const [meio, setMeio] = useState<MeioPagamentoFatura>(emEdicao?.meio ?? 'pix')
  const [conta, setConta] = useState(emEdicao?.conta_origem ?? outros[outros.length - 1]?.conta_origem ?? '')
  const [data, setData] = useState<ISODate>(emEdicao?.data ?? hojeISO())
  const [observacao, setObservacao] = useState(emEdicao?.observacao ?? '')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const valorCentavos = parseCentavosInput(valorTexto)
  const excedente = valorCentavos ? Math.max(valorCentavos - antes.saldoCentavos, 0) : 0
  const depois = situacaoDaFatura(fatura.total_centavos, [
    ...outros.map((p) => ({ valorCentavos: p.valor_centavos })),
    ...(valorCentavos ? [{ valorCentavos }] : []),
  ])
  const progresso = fatura.total_centavos > 0 ? Math.min((antes.pagoCentavos / fatura.total_centavos) * 100, 100) : 0
  const contasConhecidas = [...new Set(pagamentos.map((p) => p.conta_origem).filter((c): c is string => Boolean(c)))]
  const salvando = registrar.isPending || editar.isPending || excluir.isPending

  async function aoSalvar() {
    setErro(null)
    if (!valorCentavos || valorCentavos <= 0) return setErro('Informe um valor maior que zero.')
    const dados = { valorCentavos, meio, contaOrigem: conta, data, observacao }
    try {
      if (emEdicao) await editar.mutateAsync({ id: emEdicao.id, ...dados })
      else await registrar.mutateAsync({ faturaId: fatura.id, ...dados })
      onClose()
    } catch (e) {
      setErro(mensagemDeErro(e)) // formulário preservado (1x)
    }
  }

  async function aoExcluir() {
    if (!emEdicao) return
    setErro(null)
    try {
      await excluir.mutateAsync(emEdicao)
      onClose()
    } catch (e) {
      setErro(mensagemDeErro(e))
      setConfirmandoExclusao(false)
    }
  }

  if (confirmandoExclusao && emEdicao) {
    return (
      <BottomSheet
        title="Excluir este pagamento?"
        subtitle={`${ROTULO_MEIO[emEdicao.meio]} · ${formatDataCurta(emEdicao.data)} · ${formatCentavos(emEdicao.valor_centavos)}`}
        onClose={() => setConfirmandoExclusao(false)}
      >
        <div className="sheet-aviso">
          <span>
            A fatura de {formatMesExtenso(fatura.mes_referencia)} passa a ficar <strong>{antes.situacao === 'aberta' ? 'aberta' : antes.situacao === 'parcial' ? 'parcialmente paga' : 'paga'}</strong>
            {antes.saldoCentavos > 0 && <>, com {formatCentavos(antes.saldoCentavos)} em aberto</>}. Nenhum gasto muda.
          </span>
        </div>
        {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}
        <div className="sheet-actions-lado">
          <Button variant="contorno" onClick={() => setConfirmandoExclusao(false)}>Voltar</Button>
          <Button variant="perigo" onClick={aoExcluir} disabled={salvando}>
            {excluir.isPending ? 'Salvando…' : 'Excluir pagamento'}
          </Button>
        </div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet
      title={emEdicao ? 'Editar pagamento' : 'Registrar pagamento'}
      subtitle={`Fatura ${cartaoApelido} · vence ${formatDataCurta(fatura.data_vencimento)} · ${formatCentavos(fatura.total_centavos)}`}
      onClose={onClose}
    >
      <div className="pag-resumo">
        <div className="pag-resumo-topo">
          <span>Pago <strong className="valor-destaque pag-resumo-valor">{formatCentavos(antes.pagoCentavos)}</strong></span>
          <span className="pag-resumo-falta">Falta <strong className="valor-destaque pag-resumo-valor">{formatCentavos(antes.saldoCentavos)}</strong></span>
        </div>
        <div className="pag-resumo-trilho"><div className="pag-resumo-preenchido" style={{ width: `${progresso}%` }} /></div>
        {outros.map((p) => (
          <div key={p.id} className="pag-resumo-linha">
            <span className="dash-ponto" style={{ background: 'var(--color-accent-2-600)' }} />
            <span style={{ flex: 1 }}>{tituloPagamento(p)} · {formatDataCurta(p.data)}</span>
            <span className="valor-tab" style={{ fontWeight: 600 }}>{formatValorCurto(p.valor_centavos)}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="pag-rotulo-linha">
          <label className="pag-rotulo" htmlFor="pag-valor">Valor deste pagamento</label>
          {antes.saldoCentavos > 0 && (
            <button type="button" className="pag-restante" onClick={() => setValorTexto(centavosParaTexto(antes.saldoCentavos))}>
              Pagar o restante
            </button>
          )}
        </div>
        <div className="pag-valor">
          <span className="pag-valor-moeda">R$</span>
          <input
            id="pag-valor"
            className="pag-valor-input valor-destaque"
            inputMode="decimal"
            placeholder="0,00"
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
          />
        </div>
        {excedente > 0 && (
          <span className="pag-excedente">
            Pagamento maior que a fatura — sobra {formatCentavos(excedente)} de crédito. O excedente não vira gasto.
          </span>
        )}
      </div>

      <div>
        <span className="pag-rotulo">Como pagou</span>
        <div className="chips" role="radiogroup" aria-label="Como pagou">
          {MEIOS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={meio === m}
              className={`chip-opcao ${meio === m ? 'chip-opcao-ativo' : ''}`}
              onClick={() => setMeio(m)}
            >
              {ROTULO_MEIO[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="pag-dupla">
        <Field label="Saiu da conta">
          <Input list="pag-contas" value={conta} onChange={(e) => setConta(e.target.value)} placeholder="Ex.: Banco do Brasil" />
          <datalist id="pag-contas">
            {contasConhecidas.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>
      </div>

      <Field label="Observação (opcional)">
        <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </Field>

      <div className="sheet-aviso">
        <span>
          <strong>Pagamento não é gasto.</strong> As compras desta fatura já estão contadas nos meses delas — registrar o
          pagamento só muda a situação da fatura{valorCentavos ? <> para <strong>{depois.situacao === 'paga' ? 'paga' : depois.situacao === 'parcial' ? 'parcialmente paga' : 'aberta'}</strong></> : null}.
        </span>
      </div>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      <Button variant="primary" block onClick={aoSalvar} disabled={salvando}>
        {registrar.isPending || editar.isPending
          ? 'Salvando…'
          : emEdicao
            ? 'Salvar pagamento'
            : `Registrar ${valorCentavos ? formatCentavos(valorCentavos) : 'pagamento'}`}
      </Button>
      {emEdicao && (
        <Button variant="ghost" onClick={() => setConfirmandoExclusao(true)} disabled={salvando}>
          <Trash2 size={15} strokeWidth={2.75} /> Excluir pagamento
        </Button>
      )}
    </BottomSheet>
  )
}
