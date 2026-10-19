import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Pencil, Plus } from 'lucide-react'
import { useCartoes } from '../../lib/queries/cartoes'
import { useFatura, usePagamentosFatura, useResumoFaturasCartao, type ResumoFatura } from '../../lib/queries/faturas'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { formatCentavos } from '../../lib/money'
import { formatDataCurta, formatDataLonga, formatMesExtenso } from '../../lib/calc/datas'
import { formatValorCurto, ROTULO_SITUACAO_FATURA, tituloPagamento } from '../../lib/rotulos'
import { useEhComputador } from '../../lib/useEhComputador'
import type { Cartao, MeioPagamentoFatura, PagamentoFatura, SituacaoFatura } from '../../types/database'
import { Button, EmptyState } from '../../components/ui'
import { SeletorMes } from '../../components/SeletorMes'
import { rotas } from '../../router/rotas'
import { RegistrarPagamentoSheet } from './RegistrarPagamentoSheet'
import './FaturaCartaoScreen.css'

// Ponto da linha do tempo "Como foi paga": Pix coral, boleto coral-700 (07).
const COR_MEIO: Record<MeioPagamentoFatura, string> = {
  pix: 'var(--color-accent)',
  boleto: 'var(--color-accent-700)',
  debito_automatico: 'var(--color-accent-600)',
  transferencia: 'var(--color-accent-800)',
  outro: 'var(--color-neutral-600)',
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function FaturaCartaoScreen() {
  const { id: cartaoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mes } = useMesSelecionado()
  const ehComputador = useEhComputador()
  const cartoesQuery = useCartoes()
  const resumoQuery = useResumoFaturasCartao(cartaoId)

  const cartao = cartoesQuery.data?.find((c) => c.id === cartaoId)
  const resumos = resumoQuery.data ?? []
  const faturaDoMes = resumos.find((r) => r.fatura.mes_referencia === mes)
  const composicaoQuery = useFatura(faturaDoMes?.fatura.id)
  const pagamentosQuery = usePagamentosFatura(faturaDoMes?.fatura.id)

  const [registrando, setRegistrando] = useState(false)
  const [editando, setEditando] = useState<PagamentoFatura | null>(null)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [mostrarCompras, setMostrarCompras] = useState(false)

  if (cartoesQuery.isLoading) return <p className="text-muted">Carregando…</p>
  if (!cartao) return <p className="text-muted">Cartão não encontrado.</p>

  const proximas = resumos.filter((r) => r.fatura.mes_referencia > mes).slice(0, 3)
  const anteriorPaga = [...resumos].filter((r) => r.fatura.mes_referencia < mes && r.fatura.situacao === 'paga').pop()
  const pagamentos = pagamentosQuery.data ?? []
  const composicao = composicaoQuery.data
  const quantidadeCompras = new Set((composicao?.itens ?? []).map((i) => i.compra.id)).size
  const quitada = faturaDoMes?.fatura.situacao === 'paga'

  const conteudo = !faturaDoMes ? (
    <EmptyState
      icon={<Check size={30} strokeWidth={2.75} color="var(--color-accent-2-600)" />}
      title="Nenhuma fatura neste mês"
      description="Este cartão ainda não tem compras com vencimento neste mês."
    />
  ) : null

  const folhas = faturaDoMes && (registrando || editando) && (
    <RegistrarPagamentoSheet
      fatura={faturaDoMes.fatura}
      cartaoApelido={cartao.apelido}
      pagamentos={pagamentos}
      emEdicao={editando}
      onClose={() => { setRegistrando(false); setEditando(null) }}
    />
  )

  const comoFoiPaga = faturaDoMes && pagamentos.length > 0 && (
    <ComoFoiPaga
      resumo={faturaDoMes}
      pagamentos={pagamentos}
      modoEdicao={modoEdicao}
      onAlternarEdicao={() => setModoEdicao((v) => !v)}
      onEditar={setEditando}
    />
  )

  const avisoCorrecao = faturaDoMes?.fatura.corrigida_apos_pagamento && (
    <div className="aviso-coral">
      <AlertTriangle size={16} strokeWidth={2.75} style={{ flex: 'none', marginTop: 1 }} />
      <span>Esta fatura foi <strong>corrigida</strong> depois de um pagamento. Confira se o valor pago ainda bate com o total.</span>
    </div>
  )

  const listaCompras = composicao && (
    <div className="fatura-compras">
      {composicao.itens.map((item) => (
        <button key={item.lancamento.id} type="button" className="fatura-compra" onClick={() => navigate(rotas.lancamento(item.compra.id))}>
          <span className="fatura-compra-desc">
            <strong>{item.compra.descricao}</strong> <span className="text-muted">{formatDataCurta(item.compra.data_compra)}</span>
          </span>
          <span className="fatura-compra-cat"><span className="donut-cor" style={{ background: item.categoria.cor }} />{item.categoria.nome}</span>
          <span className="fatura-compra-parcela">
            {item.lancamento.total_parcelas > 1
              ? <span className="tag tag-accent">{item.lancamento.numero_parcela} de {item.lancamento.total_parcelas}</span>
              : <span className="text-muted">à vista</span>}
          </span>
          <span className="valor fatura-compra-valor">{formatValorCurto(item.lancamento.valor_centavos)}</span>
        </button>
      ))}
    </div>
  )

  // ---------------------------------------------------------- computador (2b)
  if (ehComputador) {
    return (
      <div className="fatura-tela fatura-pc">
        <div className="fatura-pc-cabecalho">
          <button type="button" className="btn-voltar" onClick={() => navigate(-1)} aria-label="Voltar"><ArrowLeft size={18} strokeWidth={2.75} /></button>
          <span className="fatura-pc-titulo">{cartao.apelido} · {capitalizar(formatMesExtenso(mes))}</span>
          <SeletorMes />
          {faturaDoMes && !quitada && (
            <Button variant="primary" onClick={() => setRegistrando(true)}><Plus size={16} strokeWidth={3} /> Registrar pagamento</Button>
          )}
        </div>
        {conteudo ?? (faturaDoMes && (
          <div className="fatura-pc-grade">
            <div className="fatura-pc-coluna">
              <div className="fatura-pc-total">
                <span>
                  <span className="kicker" style={{ color: 'inherit', opacity: 0.85 }}>Total · vence {formatDataLonga(faturaDoMes.fatura.data_vencimento)}</span>
                  <span className="valor-destaque fatura-pc-total-valor">{formatCentavos(faturaDoMes.totalCentavos)}</span>
                </span>
                {composicao && (
                  <span className="fatura-pc-total-comp">
                    <span className="fatura-barra">
                      {composicao.parcelasAnterioresCentavos > 0 && <span style={{ flex: composicao.parcelasAnterioresCentavos, background: 'var(--color-accent-600)' }} />}
                      {composicao.desteCicloCentavos > 0 && <span style={{ flex: composicao.desteCicloCentavos, background: 'color-mix(in srgb, var(--color-bg) 50%, transparent)' }} />}
                    </span>
                    <span className="fatura-pc-total-legenda">
                      <span>Parcelas anteriores {formatCentavos(composicao.parcelasAnterioresCentavos)}</span>
                      <span>Deste ciclo {formatCentavos(composicao.desteCicloCentavos)}</span>
                    </span>
                  </span>
                )}
                <Selo situacao={faturaDoMes.fatura.situacao} />
              </div>
              {avisoCorrecao}
              <div className="fatura-bloco">
                <span className="fatura-bloco-titulo">Composição da fatura</span>
                <div className="fatura-compra fatura-compra-cabecalho">
                  <span className="fatura-compra-desc">Compra</span>
                  <span className="fatura-compra-cat">Categoria</span>
                  <span className="fatura-compra-parcela">Parcela</span>
                  <span className="fatura-compra-valor">Valor</span>
                </div>
                {listaCompras}
              </div>
            </div>
            <div className="fatura-pc-coluna">
              {comoFoiPaga}
              <ProximasFaturas proximas={proximas} />
              {anteriorPaga && <AnteriorPaga resumo={anteriorPaga} />}
              <div className="fatura-bloco">
                <span className="kicker">Cartão</span>
                <span className="fatura-pc-cartao"><span className="cartao-cor" style={{ background: cartao.cor }} />{cartao.apelido}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>Fecha dia {cartao.dia_fechamento} · vence dia {cartao.dia_vencimento}</span>
                <button type="button" className="link-acao" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(rotas.cartoes)}>Gerenciar cartões</button>
              </div>
            </div>
          </div>
        ))}
        {folhas}
      </div>
    )
  }

  // ------------------------------------------------------------- celular (1e)
  return (
    <div className="fatura-tela">
      <div className="fatura-cabecalho">
        <button type="button" className="btn-voltar" onClick={() => navigate(-1)} aria-label="Voltar"><ArrowLeft size={18} strokeWidth={2.75} /></button>
        <span className="fatura-titulo">Fatura</span>
        <SeletorMes />
      </div>

      <CartaoVisual cartao={cartao} />

      {conteudo ?? (faturaDoMes && (
        <>
          <div className="fatura-total">
            <span>
              <span className="fatura-total-rotulo">Fatura de {formatMesExtenso(mes)}</span>
              <span className="valor-destaque fatura-total-valor">{formatCentavos(faturaDoMes.totalCentavos)}</span>
            </span>
            <Selo situacao={faturaDoMes.fatura.situacao} />
          </div>

          {!quitada && (
            <Button variant="primary" block onClick={() => setRegistrando(true)}>
              <Plus size={16} strokeWidth={3} /> Registrar pagamento
            </Button>
          )}

          {avisoCorrecao}
          {comoFoiPaga}

          {composicao && composicao.itens.length > 0 && (
            <div>
              <div className="fatura-comp-topo"><span>Composição</span><span>{quantidadeCompras} {quantidadeCompras === 1 ? 'compra' : 'compras'}</span></div>
              <div className="fatura-barra">
                {composicao.parcelasAnterioresCentavos > 0 && <span style={{ flex: composicao.parcelasAnterioresCentavos, background: 'var(--color-accent)' }} />}
                {composicao.desteCicloCentavos > 0 && <span style={{ flex: composicao.desteCicloCentavos, background: 'var(--color-accent-700)' }} />}
              </div>
              <div className="fatura-comp-legenda">
                <span>Parcelas anteriores <strong className="valor-tab">{formatValorCurto(composicao.parcelasAnterioresCentavos)}</strong></span>
                <span>Deste ciclo <strong className="valor-tab">{formatValorCurto(composicao.desteCicloCentavos)}</strong></span>
              </div>
            </div>
          )}

          {composicao && composicao.itens.length > 0 && (
            <Button variant="contorno" block onClick={() => setMostrarCompras((v) => !v)} aria-expanded={mostrarCompras}>
              {mostrarCompras ? 'Esconder as compras' : `Ver as ${quantidadeCompras} ${quantidadeCompras === 1 ? 'compra' : 'compras'}`}
            </Button>
          )}
          {mostrarCompras && listaCompras}
        </>
      ))}

      <ProximasFaturas proximas={proximas} />
      {anteriorPaga && <AnteriorPaga resumo={anteriorPaga} />}

      {folhas}
    </div>
  )
}

function Selo({ situacao }: { situacao: SituacaoFatura }) {
  return (
    <span className={`selo selo-${situacao}`}>
      {situacao === 'paga' && <Check size={14} strokeWidth={3} />}
      {ROTULO_SITUACAO_FATURA[situacao]}
    </span>
  )
}

function CartaoVisual({ cartao }: { cartao: Cartao }) {
  return (
    <div className="cartao-visual">
      <span className="cartao-visual-bolha-1" aria-hidden />
      <span className="cartao-visual-bolha-2" aria-hidden />
      <div className="cartao-visual-topo">
        <span className="cartao-visual-nome">{cartao.apelido}</span>
        <span className="cartao-visual-tipo">Crédito</span>
      </div>
      <span className="cartao-visual-chip" aria-hidden />
      <div className="cartao-visual-rodape">
        <span className="cartao-visual-ciclo">Fecha dia {cartao.dia_fechamento} · vence dia {cartao.dia_vencimento}</span>
        <span className="cartao-visual-nota">nenhum número do cartão é guardado</span>
      </div>
    </div>
  )
}

function ComoFoiPaga({ resumo, pagamentos, modoEdicao, onAlternarEdicao, onEditar }: {
  resumo: ResumoFatura
  pagamentos: PagamentoFatura[]
  modoEdicao: boolean
  onAlternarEdicao: () => void
  onEditar: (p: PagamentoFatura) => void
}) {
  const { fatura } = resumo
  const excedente = Math.max(fatura.pago_centavos - fatura.total_centavos, 0)
  return (
    <div className="fatura-bloco">
      <div className="fatura-bloco-cabecalho">
        <span className="fatura-bloco-titulo">Como foi paga</span>
        <button type="button" className="link-acao" onClick={onAlternarEdicao}>{modoEdicao ? 'Concluir' : 'Editar pagamentos'}</button>
      </div>
      <div className="linha-tempo">
        {pagamentos.map((p) => (
          <div key={p.id} className="linha-tempo-item">
            <span className="linha-tempo-marca"><span className="linha-tempo-ponto" style={{ background: COR_MEIO[p.meio] }} /><span className="linha-tempo-traco" /></span>
            <span className="linha-tempo-corpo">
              <span>
                <span className="linha-tempo-titulo">{tituloPagamento(p)}</span>
                <span className="linha-tempo-data">{formatDataLonga(p.data)}{p.observacao ? ` · ${p.observacao}` : ''}</span>
              </span>
              <span className="valor linha-tempo-valor">{formatValorCurto(p.valor_centavos)}</span>
              {modoEdicao && (
                <button type="button" className="btn btn-icon" onClick={() => onEditar(p)} aria-label={`Editar pagamento de ${formatCentavos(p.valor_centavos)}`}>
                  <Pencil size={15} strokeWidth={2.75} />
                </button>
              )}
            </span>
          </div>
        ))}
        {fatura.situacao === 'paga' ? (
          <div className="linha-tempo-fim linha-tempo-fim-quitada">
            <span className="linha-tempo-check"><Check size={11} strokeWidth={3.5} /></span>
            <span className="linha-tempo-fim-texto">
              <span>Quitada</span>
              <span className="valor-tab">{formatValorCurto(fatura.pago_centavos)} de {formatValorCurto(fatura.total_centavos)}</span>
            </span>
          </div>
        ) : (
          <div className="linha-tempo-fim">
            <span className="linha-tempo-aberto" />
            <span className="linha-tempo-fim-texto">
              <span>Falta {formatCentavos(fatura.saldo_centavos)}</span>
              <span className="valor-tab">{formatValorCurto(fatura.pago_centavos)} de {formatValorCurto(fatura.total_centavos)}</span>
            </span>
          </div>
        )}
        {excedente > 0 && (
          <span className="text-muted" style={{ fontSize: 11.5 }}>
            Pago {formatCentavos(excedente)} a mais: fica como crédito no cartão e não entra nos gastos.
          </span>
        )}
      </div>
    </div>
  )
}

function ProximasFaturas({ proximas }: { proximas: ResumoFatura[] }) {
  if (proximas.length === 0) return null
  return (
    <div className="fatura-bloco">
      <span className="fatura-bloco-titulo">Próximas faturas</span>
      {proximas.map((r, i) => (
        <div key={r.fatura.id} className="fatura-proxima">
          <span style={{ flex: 1 }}>
            <strong>{capitalizar(formatMesExtenso(r.fatura.mes_referencia))}</strong>
            <span className={`fatura-proxima-meta ${i === 0 ? 'fatura-proxima-meta-formacao' : ''}`}>
              {i === 0 ? 'em formação · ' : ''}{r.quantidadeParcelas} {r.quantidadeParcelas === 1 ? 'parcela prevista' : 'parcelas previstas'}
            </span>
          </span>
          <span className="valor fatura-proxima-valor">{formatValorCurto(r.totalCentavos)}</span>
        </div>
      ))}
    </div>
  )
}

function AnteriorPaga({ resumo }: { resumo: ResumoFatura }) {
  return (
    <div className="fatura-paga-anterior">
      <span style={{ fontWeight: 700, fontSize: 13.5 }}>
        {capitalizar(formatMesExtenso(resumo.fatura.mes_referencia))} · paga{resumo.fatura.paga_em ? ` em ${formatDataCurta(resumo.fatura.paga_em)}` : ''}
      </span>
      <span className="valor-destaque" style={{ fontSize: 22 }}>{formatCentavos(resumo.totalCentavos)}</span>
      <span style={{ fontSize: 11.5 }}>Correções nesta fatura são destacadas antes de confirmar.</span>
      {resumo.fatura.corrigida_apos_pagamento && (
        <span style={{ fontSize: 11.5, fontWeight: 700 }}>Esta fatura foi corrigida após o pagamento.</span>
      )}
    </div>
  )
}
