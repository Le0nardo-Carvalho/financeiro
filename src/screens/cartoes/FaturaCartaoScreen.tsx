import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useCartoes } from '../../lib/queries/cartoes'
import { useFatura, useMarcarFaturaPaga, useResumoFaturasCartao } from '../../lib/queries/faturas'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { formatCentavos } from '../../lib/money'
import { formatDataLonga, formatMesAno } from '../../lib/calc/datas'
import { mensagemDeErro } from '../../lib/queries/shared'
import { Button, Dialog, EmptyState } from '../../components/ui'
import './FaturaCartaoScreen.css'

export function FaturaCartaoScreen() {
  const { id: cartaoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mes } = useMesSelecionado()
  const cartoesQuery = useCartoes()
  const resumoQuery = useResumoFaturasCartao(cartaoId)
  const marcarPaga = useMarcarFaturaPaga()

  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const cartao = cartoesQuery.data?.find((c) => c.id === cartaoId)
  const resumos = resumoQuery.data ?? []
  const faturaDoMes = resumos.find((r) => r.fatura.mes_referencia === mes)
  const composicaoQuery = useFatura(faturaDoMes?.fatura.id)

  const proximas = resumos.filter((r) => r.fatura.mes_referencia > mes).slice(0, 3)
  const anteriorPaga = [...resumos].filter((r) => r.fatura.mes_referencia < mes && r.fatura.paga).pop()

  async function aoMarcarPaga() {
    if (!faturaDoMes) return
    setErro(null)
    try {
      await marcarPaga.mutateAsync(faturaDoMes.fatura.id)
      setConfirmandoPagamento(false)
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  if (!cartao) return <p className="text-muted">Cartão não encontrado.</p>

  return (
    <div className="fatura-tela">
      <div className="novo-gasto-header">
        <button type="button" className="btn btn-icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={18} strokeWidth={2.75} />
        </button>
        <span className="lanc-titulo">{cartao.apelido} · {formatMesAno(mes)}</span>
      </div>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      {!faturaDoMes ? (
        <EmptyState
          icon={<Check size={30} strokeWidth={2.75} color="#56633f" />}
          title="Nenhuma fatura neste mês"
          description="Este cartão ainda não tem compras com vencimento neste mês."
        />
      ) : (
        <>
          <div className="fatura-resumo-card">
            <div>
              <span className="kicker" style={{ color: 'inherit', opacity: 0.85 }}>
                Total · vence {formatDataLonga(faturaDoMes.fatura.data_vencimento)}
              </span>
              <div className="fatura-resumo-valor">{formatCentavos(faturaDoMes.totalCentavos)}</div>
            </div>
            <span className="tag" style={{ background: 'rgba(245,234,216,.22)', color: 'inherit' }}>
              {faturaDoMes.fatura.paga ? 'Paga' : 'Em formação'}
            </span>
          </div>

          <div>
            <span className="kicker">Composição da fatura</span>
            <div className="categorias-lista">
              {(composicaoQuery.data?.itens ?? []).map((item) => (
                <div key={item.lancamento.id} className="fatura-item-linha">
                  <span className="lanc-item-cor" style={{ background: item.categoria.cor }} />
                  <span style={{ flex: 1 }}>
                    <strong>{item.compra.descricao}</strong>{' '}
                    <span className="text-muted" style={{ fontSize: 11.5 }}>{formatDataLonga(item.compra.data_compra)}</span>
                  </span>
                  <span className="text-muted" style={{ fontSize: 12 }}>{item.categoria.nome}</span>
                  {item.lancamento.total_parcelas > 1 && (
                    <span className="tag tag-accent">{item.lancamento.numero_parcela} de {item.lancamento.total_parcelas}</span>
                  )}
                  <span style={{ fontFamily: 'var(--font-heading)' }}>{formatCentavos(item.lancamento.valor_centavos)}</span>
                </div>
              ))}
            </div>
          </div>

          {!faturaDoMes.fatura.paga && (
            <Button variant="primary" onClick={() => setConfirmandoPagamento(true)}>
              <Check size={16} strokeWidth={3} /> Marcar como paga
            </Button>
          )}
          <p className="text-muted" style={{ fontSize: 12 }}>Marcar como paga não cria um novo gasto.</p>
        </>
      )}

      {proximas.length > 0 && (
        <div>
          <span className="kicker">Próximas faturas</span>
          <div className="categorias-lista">
            {proximas.map((r) => (
              <div key={r.fatura.id} className="fatura-item-linha">
                <span style={{ flex: 1 }}>
                  <strong>{formatMesAno(r.fatura.mes_referencia)}</strong>{' '}
                  <span className="text-muted" style={{ fontSize: 11 }}>{r.quantidadeParcelas} parcela(s) previstas</span>
                </span>
                <span style={{ fontFamily: 'var(--font-heading)' }}>{formatCentavos(r.totalCentavos)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {anteriorPaga && (
        <div className="fatura-paga-anterior">
          <span style={{ fontWeight: 700 }}>{formatMesAno(anteriorPaga.fatura.mes_referencia)} · paga em {anteriorPaga.fatura.paga_em ? formatDataLonga(anteriorPaga.fatura.paga_em) : '—'}</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>{formatCentavos(anteriorPaga.totalCentavos)}</span>
          <span style={{ fontSize: 11.5 }}>Correções nesta fatura são destacadas antes de confirmar.</span>
          {anteriorPaga.fatura.corrigida_apos_pagamento && (
            <span style={{ fontSize: 11.5, fontWeight: 700 }}>Esta fatura foi corrigida após o pagamento.</span>
          )}
        </div>
      )}

      {confirmandoPagamento && faturaDoMes && (
        <Dialog
          title="Marcar fatura como paga?"
          onClose={() => setConfirmandoPagamento(false)}
          actions={
            <>
              <Button onClick={() => setConfirmandoPagamento(false)}>Cancelar</Button>
              <Button variant="primary" onClick={aoMarcarPaga} disabled={marcarPaga.isPending}>
                {marcarPaga.isPending ? 'Salvando…' : 'Confirmar'}
              </Button>
            </>
          }
        >
          Isso marca a fatura de {formatMesAno(faturaDoMes.fatura.mes_referencia)} ({formatCentavos(faturaDoMes.totalCentavos)}) como paga.
          Nenhum gasto novo é criado — as compras já foram contabilizadas.
        </Dialog>
      )}
    </div>
  )
}
