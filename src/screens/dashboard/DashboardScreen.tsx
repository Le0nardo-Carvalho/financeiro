import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, CreditCard, Info, Plus, Receipt, ShoppingCart, Tag, Target,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { useLancamentosDoMes, useTotaisUltimosMeses, type LancamentoDetalhado } from '../../lib/queries/lancamentos'
import { useCategorias } from '../../lib/queries/categorias'
import { useObjetivos } from '../../lib/queries/objetivos'
import { useCartoes } from '../../lib/queries/cartoes'
import { useFaturasResumoDoMes, usePagamentosDasFaturas } from '../../lib/queries/faturas'
import { useSaidasPorConta } from '../../lib/queries/saidas'
import { usePerfil } from '../../lib/queries/perfil'
import { supabase } from '../../lib/supabase'
import { formatCentavos } from '../../lib/money'
import {
  formatDataCurta, formatMesAno, formatMesCurto, formatMesExtenso, mesAnterior, parseISO, toISO, ultimosMeses, type ISODate,
} from '../../lib/calc/datas'
import {
  comparativoComAnterior, mediaCentavos, totaisDoMes, totaisPorMes, totalPorCategoriaNoMes,
  type LancamentoMensal as LancamentoCalc,
} from '../../lib/calc/agregacao'
import { CONTA_NAO_INFORMADA, type SaidasDaConta } from '../../lib/calc/pagamentos'
import { acumuladoCentavos, progressoPercentual } from '../../lib/calc/objetivos'
import { descreverMeios, formatValorCurto, ROTULO_FORMA, ROTULO_SITUACAO_FATURA } from '../../lib/rotulos'
import { useEhComputador } from '../../lib/useEhComputador'
import type { Categoria, FaturaResumo, SituacaoFatura } from '../../types/database'
import { StatusSyncBadge } from '../../components/StatusSyncBadge'
import { SeletorMes } from '../../components/SeletorMes'
import { DonutChart } from '../../components/DonutChart'
import { Button, Card, EmptyState } from '../../components/ui'
import { rotas } from '../../router/rotas'
import { SaudeDoMesPainel } from './SaudeDoMesPainel'
import './DashboardScreen.css'

type FaturaDoMes = FaturaResumo & { cartao: { apelido: string; cor: string } }

// Situação somada das faturas do mês, para o cartão "Crédito" (tela 1b):
// lilás + check quando todas estão pagas; "parcial" com o saldo; neutro
// quando aberta. Vem de faturas_resumo — não altera nenhum total de gasto.
function situacaoDoCredito(faturas: FaturaDoMes[]): { situacao: SituacaoFatura; saldoCentavos: number } | null {
  if (faturas.length === 0) return null
  const saldoCentavos = faturas.reduce((s, f) => s + f.saldo_centavos, 0)
  if (faturas.every((f) => f.situacao === 'paga')) return { situacao: 'paga', saldoCentavos: 0 }
  if (faturas.some((f) => f.pago_centavos > 0)) return { situacao: 'parcial', saldoCentavos }
  return { situacao: 'aberta', saldoCentavos }
}

function mesAnteriorDe(mes: ISODate): ISODate {
  const { ano, mes: m } = parseISO(mes)
  const anterior = mesAnterior(ano, m)
  return toISO({ ano: anterior.ano, mes: anterior.mes, dia: 1 })
}

export function DashboardScreen() {
  const { mes } = useMesSelecionado()
  const navigate = useNavigate()
  const ehComputador = useEhComputador()

  const lancamentosQuery = useLancamentosDoMes(mes)
  const categoriasQuery = useCategorias()
  const ultimosQuery = useTotaisUltimosMeses(mes, 6)
  const faturasQuery = useFaturasResumoDoMes(mes)
  const cartoesQuery = useCartoes()
  const faturas: FaturaDoMes[] = (faturasQuery.data ?? [])
    .filter((f) => f.total_centavos > 0 || f.pago_centavos > 0)
    .map((f) => {
      const cartao = cartoesQuery.data?.find((c) => c.id === f.cartao_id)
      return { ...f, cartao: { apelido: cartao?.apelido ?? 'Cartão', cor: cartao?.cor ?? 'var(--color-card-fill)' } }
    })
  const pagamentosQuery = usePagamentosDasFaturas(faturas.map((f) => f.id))
  const saidasQuery = useSaidasPorConta(mes)

  const lancamentos = lancamentosQuery.data ?? []
  const categorias = categoriasQuery.data ?? []

  const paraCalc: LancamentoCalc[] = lancamentos.map((l) => ({
    valorCentavos: l.valor_centavos,
    mesCompetencia: l.mes_competencia,
    formaPagamento: l.compra.forma_pagamento,
    categoriaId: l.categoria_id,
  }))
  const totais = totaisDoMes(paraCalc, mes)

  const segmentos = Array.from(totalPorCategoriaNoMes(paraCalc, mes).entries())
    .map(([categoriaId, valorCentavos]) => {
      const cat = categorias.find((c) => c.id === categoriaId)
      return { id: categoriaId, nome: cat?.nome ?? 'Categoria removida', cor: cat?.cor ?? 'var(--cat-outros)', valorCentavos }
    })
    .sort((a, b) => b.valorCentavos - a.valorCentavos)

  const meses = ultimosMeses(mes, 6)
  const porMes = totaisPorMes(ultimosQuery.data ?? [], meses)
  const anterior = porMes.find((m) => m.mes === mesAnteriorDe(mes))?.totalCentavos ?? 0
  const comparativo = comparativoComAnterior(totais.totalCentavos, anterior)
  // A média considera só os meses com algum gasto, para um app recém-começado
  // não puxar a média para baixo com meses vazios.
  const mesesComGasto = porMes.filter((m) => m.totalCentavos > 0).map((m) => m.totalCentavos)
  const media = mediaCentavos(mesesComGasto)

  const credito = situacaoDoCredito(faturas)
  const meiosPorFatura = new Map<string, string>()
  for (const f of faturas) {
    const meios = (pagamentosQuery.data ?? []).filter((p) => p.fatura_id === f.id).map((p) => p.meio)
    if (meios.length > 0) meiosPorFatura.set(f.id, descreverMeios(meios))
  }

  const recentes = [...lancamentos].sort((a, b) =>
    a.compra.data_compra === b.compra.data_compra
      ? (a.criado_em < b.criado_em ? 1 : -1)
      : a.compra.data_compra < b.compra.data_compra ? 1 : -1,
  )

  const carregando = lancamentosQuery.isLoading || categoriasQuery.isLoading
  const semGastos = !carregando && lancamentos.length === 0

  const dados: DadosPainel = {
    mes, totais, segmentos, porMes, anterior, comparativo, media, credito, faturas, meiosPorFatura,
    saidas: saidasQuery.data ?? [], recentes, categorias,
  }

  if (ehComputador) return <PainelComputador dados={dados} semGastos={semGastos} />

  return (
    <div className="dash">
      <CabecalhoCelular />
      <SaudeDoMesPainel mes={mes} />
      {semGastos ? (
        <PrimeiroMesVazio onNovo={() => navigate(rotas.novoLancamento)} />
      ) : (
        <PainelCelular dados={dados} />
      )}
    </div>
  )
}

interface DadosPainel {
  mes: ISODate
  totais: ReturnType<typeof totaisDoMes>
  segmentos: { id: string; nome: string; cor: string; valorCentavos: number }[]
  porMes: { mes: ISODate; totalCentavos: number }[]
  anterior: number
  comparativo: ReturnType<typeof comparativoComAnterior>
  media: number
  credito: ReturnType<typeof situacaoDoCredito>
  faturas: FaturaDoMes[]
  meiosPorFatura: Map<string, string>
  saidas: SaidasDaConta[]
  recentes: LancamentoDetalhado[]
  categorias: Categoria[]
}

// ------------------------------------------------------------- celular ---

function CabecalhoCelular() {
  const perfilQuery = usePerfil()
  const nome = perfilQuery.data?.nome || 'Ágata'
  return (
    <div className="dash-cabecalho">
      <span className="dash-avatar" aria-hidden>{nome.charAt(0).toUpperCase()}</span>
      <span className="dash-saudacao">
        <span className="dash-saudacao-ola">Olá,</span>
        <span className="dash-saudacao-nome">{nome}</span>
      </span>
      <SeletorMes />
    </div>
  )
}

function ChipComparativo({ comparativo }: { comparativo: DadosPainel['comparativo'] }) {
  if (comparativo.percentual === null || comparativo.diferencaCentavos === 0) return null
  const Seta = comparativo.menor ? ArrowDown : ArrowUp
  return (
    <span className={`chip-comp ${comparativo.menor ? 'chip-comp-menor' : 'chip-comp-maior'}`}>
      <Seta size={13} strokeWidth={3} />{comparativo.percentual}%
    </span>
  )
}

function TextoComparativo({ dados }: { dados: DadosPainel }) {
  const { comparativo, anterior, mes } = dados
  const nomeAnterior = formatMesExtenso(mesAnteriorDe(mes))
  if (anterior === 0) return <span className="dash-comp-texto">sem gastos em {nomeAnterior} para comparar</span>
  if (comparativo.diferencaCentavos === 0) return <span className="dash-comp-texto">igual a {nomeAnterior}</span>
  return (
    <span className="dash-comp-texto">
      {formatCentavos(Math.abs(comparativo.diferencaCentavos))} {comparativo.menor ? 'a menos' : 'a mais'} que {nomeAnterior}
    </span>
  )
}

function PainelCelular({ dados }: { dados: DadosPainel }) {
  const { totais, credito } = dados
  return (
    <>
      {/* A sobra, o alerta e o mínimo (3a) ocupam o topo; o total de gastos
          desce para cá, como cabeçalho do detalhamento por forma. */}
      <div>
        <div className="dash-secao-cabecalho">
          <span className="secao-titulo">Gastos de {formatMesExtenso(dados.mes)}</span>
          <StatusSyncBadge />
        </div>
        <div className="valor dash-total-compacto">{formatCentavos(totais.totalCentavos)}</div>
        <div className="dash-comp">
          <ChipComparativo comparativo={dados.comparativo} />
          <TextoComparativo dados={dados} />
        </div>
      </div>

      <div>
        <BarraFormas segmentos={[
          [totais.pixCentavos, 'var(--color-accent-700)'],
          [totais.debitoCentavos, 'var(--color-accent)'],
          [totais.creditoCentavos, 'var(--color-accent-2-600)'],
        ]} />
        <div className="dash-formas-legenda">
          <FormaLegenda rotulo="Pix" cor="var(--color-accent-700)" valor={totais.pixCentavos} />
          <FormaLegenda rotulo="Débito" cor="var(--color-accent)" valor={totais.debitoCentavos} />
          <FormaLegenda
            rotulo="Crédito"
            cor="var(--color-accent-2-600)"
            valor={totais.creditoCentavos}
            fim
            situacao={credito}
          />
        </div>
      </div>

      <UltimosMeses porMes={dados.porMes} media={dados.media} mesAtual={dados.mes} />

      {dados.faturas.map((f) => (
        <LinhaFatura key={f.id} fatura={f} meios={dados.meiosPorFatura.get(f.id)} />
      ))}

      <SaiuDasContas saidas={dados.saidas} faturas={dados.faturas} meiosPorFatura={dados.meiosPorFatura} />

      {dados.segmentos.length > 0 && (
        <div>
          <div className="dash-secao-cabecalho">
            <span className="secao-titulo">Por categoria</span>
            <Link to={rotas.categorias} className="link-acao">Ver todas</Link>
          </div>
          <div className="dash-categorias">
            {dados.segmentos.slice(0, 3).map((s) => (
              <Link key={s.id} to={rotas.categoria(s.id)} className="dash-categoria">
                <span className="dash-categoria-nome"><span className="dash-ponto" style={{ background: s.cor }} />{s.nome}</span>
                <span className="valor dash-categoria-valor">{formatValorCurto(s.valorCentavos)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="dash-secao-cabecalho">
          <span className="secao-titulo">Recentes</span>
          <Link to={rotas.lancamentos} className="link-acao">Ver todos</Link>
        </div>
        {dados.recentes.slice(0, 2).map((l) => <LinhaRecente key={l.id} lancamento={l} categorias={dados.categorias} />)}
      </div>
    </>
  )
}

// Barra empilhada: segmentos zerados saem para não sobrar o espaço do gap.
function BarraFormas({ segmentos, className = '' }: { segmentos: [number, string][]; className?: string }) {
  return (
    <div className={`dash-formas-barra ${className}`} aria-hidden>
      {segmentos.filter(([valor]) => valor > 0).map(([valor, cor]) => (
        <span key={cor} style={{ flex: valor, background: cor }} />
      ))}
    </div>
  )
}

function FormaLegenda({ rotulo, cor, valor, fim, situacao }: {
  rotulo: string; cor: string; valor: number; fim?: boolean; situacao?: DadosPainel['credito']
}) {
  return (
    <span className={`dash-forma ${fim ? 'dash-forma-fim' : ''} ${situacao?.situacao === 'paga' ? 'dash-forma-paga' : ''}`}>
      <span className="dash-forma-rotulo"><span className="dash-ponto" style={{ background: cor }} />{rotulo}</span>
      <span className="valor dash-forma-valor">{formatValorCurto(valor)}</span>
      {situacao?.situacao === 'paga' && <span className="dash-forma-situacao"><Check size={11} strokeWidth={3} /> fatura paga</span>}
      {situacao?.situacao === 'parcial' && <span className="dash-forma-situacao dash-forma-situacao-parcial">parcial · falta {formatValorCurto(situacao.saldoCentavos)}</span>}
    </span>
  )
}

function UltimosMeses({ porMes, media, mesAtual }: { porMes: DadosPainel['porMes']; media: number; mesAtual: ISODate }) {
  const maximo = Math.max(...porMes.map((m) => m.totalCentavos), 1)
  return (
    <div className="dash-meses">
      <div className="dash-secao-cabecalho">
        <span className="secao-titulo">Últimos 6 meses</span>
        {media > 0 && <span className="dash-meses-media">média {formatCentavos(Math.round(media / 100) * 100).replace(/,00$/, '')}</span>}
      </div>
      <div className="dash-meses-barras" role="list">
        {porMes.map((m) => {
          const atual = m.mes === mesAtual
          return (
            <span key={m.mes} className="dash-meses-coluna" role="listitem" aria-label={`${formatMesAno(m.mes)}: ${formatCentavos(m.totalCentavos)}`}>
              <span
                className={`dash-meses-barra ${atual ? 'dash-meses-barra-atual' : ''}`}
                style={{ height: Math.max(Math.round((m.totalCentavos / maximo) * 68), 6) }}
              />
              <span className={`dash-meses-rotulo ${atual ? 'dash-meses-rotulo-atual' : ''}`}>{formatMesCurto(m.mes)}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function SeloSituacaoCurto({ situacao }: { situacao: SituacaoFatura }) {
  if (situacao === 'paga') return <span className="dash-fatura-selo dash-fatura-selo-paga"><Check size={11} strokeWidth={3} />Paga</span>
  if (situacao === 'parcial') return <span className="dash-fatura-selo dash-fatura-selo-parcial">Parcial</span>
  return <span className="dash-fatura-selo">Aberta</span>
}

function LinhaFatura({ fatura, meios }: { fatura: FaturaDoMes; meios?: string }) {
  const detalhe = fatura.situacao === 'parcial'
    ? `falta ${formatCentavos(fatura.saldo_centavos)}`
    : meios ?? (fatura.situacao === 'aberta' ? 'em aberto' : '')
  return (
    <Link to={rotas.cartao(fatura.cartao_id)} className="dash-fatura">
      <span className="dash-fatura-icone"><CreditCard size={18} strokeWidth={2.75} /></span>
      <span className="dash-fatura-corpo">
        <span className="dash-fatura-nome">Fatura {fatura.cartao.apelido}</span>
        <span className="dash-fatura-meta">vence {formatDataCurta(fatura.data_vencimento)}{detalhe ? ` · ${detalhe}` : ''}</span>
      </span>
      <span className="dash-fatura-fim">
        <span className="valor dash-fatura-valor">{formatValorCurto(fatura.total_centavos)}</span>
        <SeloSituacaoCurto situacao={fatura.situacao} />
      </span>
    </Link>
  )
}

// "Saiu das contas" (tela 1b): conferência com o extrato. Mostra Pix e
// débito em compras mais os pagamentos de fatura, por conta — e deixa claro
// que o pagamento não soma de novo aos gastos (CA34, CA35).
function SaiuDasContas({ saidas, faturas, meiosPorFatura }: {
  saidas: SaidasDaConta[]; faturas: FaturaDoMes[]; meiosPorFatura: Map<string, string>
}) {
  if (saidas.length === 0) return null
  const totalFaturas = saidas.reduce((s, c) => s + c.pagamentoFaturaCentavos, 0)
  const nomeFatura = faturas.length === 1 ? `Fatura ${faturas[0].cartao.apelido}` : 'Faturas do cartão'
  const meios = faturas.length === 1 ? meiosPorFatura.get(faturas[0].id) : undefined
  return (
    <div className="dash-saidas">
      <div className="dash-secao-cabecalho">
        <span className="secao-titulo dash-saidas-titulo">Saiu das contas</span>
        <span className="dash-saidas-sub">para conferir o extrato</span>
      </div>
      {saidas.map((c) => (
        <div key={c.conta} className="dash-saidas-conta">
          <div className="dash-saidas-conta-topo">
            <span className="dash-saidas-sigla" aria-hidden>{siglaDaConta(c.conta)}</span>
            <span className="dash-saidas-nome">{c.conta}</span>
            <span className="valor dash-saidas-total">{formatValorCurto(c.totalCentavos)}</span>
          </div>
          <div className="dash-saidas-linhas">
            {c.pixCentavos > 0 && <span><span>Pix em compras</span><span className="valor-tab">{formatValorCurto(c.pixCentavos)}</span></span>}
            {c.debitoCentavos > 0 && <span><span>Débito em compras</span><span className="valor-tab">{formatValorCurto(c.debitoCentavos)}</span></span>}
            {c.pagamentoFaturaCentavos > 0 && (
              <span>
                <span>{nomeFatura} {meios && <span className="text-muted">{meios}</span>}</span>
                <span className="valor-tab">{formatValorCurto(c.pagamentoFaturaCentavos)}</span>
              </span>
            )}
          </div>
        </div>
      ))}
      {totalFaturas > 0 && (
        <div className="sheet-aviso">
          <Info size={16} strokeWidth={2.75} style={{ flex: 'none', marginTop: 1 }} />
          <span>
            Os {formatCentavos(totalFaturas)} da fatura aparecem aqui como saída, mas <strong>não somam de novo</strong> aos
            gastos: são as compras do crédito já contadas acima.
          </span>
        </div>
      )}
    </div>
  )
}

function siglaDaConta(conta: string): string {
  if (conta === CONTA_NAO_INFORMADA) return '?'
  const palavras = conta.split(/\s+/).filter((p) => p.length > 2 || /^[A-Z]/.test(p))
  const iniciais = palavras.filter((p) => /^[A-ZÀ-Ý]/.test(p)).map((p) => p[0])
  return (iniciais.length >= 2 ? iniciais.slice(0, 2).join('') : conta.slice(0, 2)).toUpperCase()
}

function descricaoPagamento(l: LancamentoDetalhado): string {
  if (l.compra.forma_pagamento !== 'credito') return ROTULO_FORMA[l.compra.forma_pagamento]
  return l.total_parcelas > 1 ? `Crédito ${l.numero_parcela} de ${l.total_parcelas}` : 'Crédito à vista'
}

function LinhaRecente({ lancamento: l, categorias }: { lancamento: LancamentoDetalhado; categorias: Categoria[] }) {
  const cat = categorias.find((c) => c.id === l.categoria_id)
  const Icone = l.compra.origem === 'mercado' ? ShoppingCart : Receipt
  return (
    <Link to={rotas.lancamento(l.compra_id)} className="dash-recente">
      <span className="dash-recente-icone"><Icone size={18} strokeWidth={2.75} color={cat?.cor ?? 'var(--cat-outros)'} /></span>
      <span className="dash-recente-corpo">
        <span className="dash-recente-desc">{l.compra.descricao}</span>
        <span className="dash-recente-meta">
          {cat?.nome ?? '—'} · {descricaoPagamento(l)} · {formatDataCurta(l.compra.data_compra)}
        </span>
      </span>
      <span className="valor dash-recente-valor">−{formatValorCurto(l.valor_centavos)}</span>
    </Link>
  )
}

function PrimeiroMesVazio({ onNovo }: { onNovo: () => void }) {
  return (
    <EmptyState
      icon={<Plus size={34} strokeWidth={2.75} color="var(--color-accent)" />}
      title="Nenhum gasto ainda"
      description="Registre a primeira despesa e o painel do mês começa a se montar sozinho — totais, categorias e faturas."
      action={
        <Button variant="primary" onClick={onNovo}>
          <Plus size={17} strokeWidth={3} /> Registrar primeiro gasto
        </Button>
      }
      secondary={
        <div className="dash-atalhos">
          <span className="kicker" style={{ textAlign: 'left' }}>Ou comece por aqui</span>
          <Link className="atalho-card" to={rotas.cartoes}>
            <span className="atalho-icone atalho-icone-lilas"><CreditCard size={18} strokeWidth={2.75} /></span>
            <span>
              <span className="atalho-titulo">Cadastrar um cartão</span>
              <span className="atalho-desc">para acompanhar faturas e parcelas</span>
            </span>
          </Link>
          <Link className="atalho-card" to={rotas.mercado}>
            <span className="atalho-icone atalho-icone-coral"><ShoppingCart size={18} strokeWidth={2.75} /></span>
            <span>
              <span className="atalho-titulo">Montar a lista de mercado</span>
              <span className="atalho-desc">vira um gasto ao finalizar a compra</span>
            </span>
          </Link>
          <Link className="atalho-card" to={rotas.categorias}>
            <span className="atalho-icone atalho-icone-neutro"><Tag size={18} strokeWidth={2.75} /></span>
            <span>
              <span className="atalho-titulo">Ajustar as categorias</span>
              <span className="atalho-desc">categorias sugeridas, todas editáveis</span>
            </span>
          </Link>
        </div>
      }
    />
  )
}

// ---------------------------------------------------------- computador ---

function PainelComputador({ dados, semGastos }: { dados: DadosPainel; semGastos: boolean }) {
  const { irParaMesAnterior, irParaProximoMes } = useMesSelecionado()
  const navigate = useNavigate()
  const objetivosQuery = useObjetivos()
  const { totais } = dados

  return (
    <div className="dash">
      <div className="dash-pc-cabecalho">
        <span className="dash-pc-titulo">{formatMesAno(dados.mes)}</span>
        <StatusSyncBadge />
        <Button onClick={irParaMesAnterior}><ChevronLeft size={16} strokeWidth={2.75} /> Mês anterior</Button>
        <Button onClick={irParaProximoMes} aria-label="Próximo mês"><ChevronRight size={16} strokeWidth={2.75} /></Button>
        <Button onClick={() => navigate(rotas.novaEntrada)}><Plus size={16} strokeWidth={3} /> Nova entrada</Button>
        <Button variant="primary" onClick={() => navigate(rotas.novoLancamento)}><Plus size={16} strokeWidth={3} /> Novo gasto</Button>
      </div>

      <SaudeDoMesPainel mes={dados.mes} layout="computador" />

      {semGastos ? (
        <PrimeiroMesVazio onNovo={() => navigate(rotas.novoLancamento)} />
      ) : (
        <>
          <div className="dash-pc-topo">
            <Card destaque className="dash-pc-total">
              <span className="kicker dash-pc-total-kicker">Gastos do mês</span>
              <span className="valor-destaque dash-pc-total-valor">{formatCentavos(totais.totalCentavos)}</span>
              <BarraFormas className="dash-pc-total-barra" segmentos={[
                [totais.pixCentavos, 'var(--cat-lazer)'],
                [totais.debitoCentavos, 'var(--color-accent-600)'],
                [totais.creditoCentavos, 'color-mix(in srgb, var(--color-bg) 50%, transparent)'],
              ]} />
              <div className="dash-pc-total-legenda">
                <span>Pix {formatValorCurto(totais.pixCentavos)}</span>
                <span>Débito {formatValorCurto(totais.debitoCentavos)}</span>
                <span>Crédito {formatValorCurto(totais.creditoCentavos)}</span>
              </div>
              <div className="dash-comp">
                <ChipComparativo comparativo={dados.comparativo} />
                <span className="dash-pc-total-comp"><TextoComparativo dados={dados} /></span>
              </div>
            </Card>

            {dados.faturas.slice(0, 1).map((f) => (
              <Card key={f.id} className="dash-pc-cartao">
                <span className="dash-pc-cartao-topo"><CreditCard size={15} strokeWidth={2.75} /> Fatura · vence {formatDataCurta(f.data_vencimento)}</span>
                <div>
                  <div className="valor-destaque dash-pc-cartao-valor">{formatCentavos(f.total_centavos)}</div>
                  <div className="dash-pc-cartao-meta">
                    <span className={`selo selo-${f.situacao}`}>{ROTULO_SITUACAO_FATURA[f.situacao]}</span>
                    {f.situacao === 'parcial' && <span>falta {formatCentavos(f.saldo_centavos)}</span>}
                  </div>
                </div>
                <Link to={rotas.cartao(f.cartao_id)} className="link-acao">Ver composição</Link>
              </Card>
            ))}

            {objetivosQuery.data && objetivosQuery.data[0] && (
              <ObjetivoResumoCard
                objetivoId={objetivosQuery.data[0].id}
                nome={objetivosQuery.data[0].nome}
                metaCentavos={objetivosQuery.data[0].meta_centavos}
              />
            )}
          </div>

          <div className="dash-pc-meio">
            <Card className="dash-pc-bloco">
              <span className="dash-pc-bloco-titulo">Gastos por categoria</span>
              {dados.segmentos.length > 0 ? (
                <DonutChart segmentos={dados.segmentos} onSelecionar={(id) => navigate(rotas.categoria(id))} />
              ) : (
                <p className="text-muted">Nenhum gasto categorizado neste mês.</p>
              )}
              <span className="dash-pc-nota">Clique numa categoria para abrir mês, histórico e previsão.</span>
            </Card>

            <Card className="dash-pc-bloco">
              <div className="dash-secao-cabecalho">
                <span className="dash-pc-bloco-titulo">Lançamentos recentes</span>
                <Link to={rotas.lancamentos} className="link-acao">Ver todos</Link>
              </div>
              <div className="dash-pc-tabela-cabecalho">
                <span className="dash-pc-col-data">Data</span>
                <span className="dash-pc-col-desc">Descrição</span>
                <span className="dash-pc-col-cat">Categoria</span>
                <span className="dash-pc-col-pag">Pagamento</span>
                <span className="dash-pc-col-valor">Valor</span>
              </div>
              <div className="dash-pc-tabela">
                {dados.recentes.slice(0, 8).map((l) => {
                  const cat = dados.categorias.find((c) => c.id === l.categoria_id)
                  return (
                    <Link key={l.id} to={rotas.lancamento(l.compra_id)} className="dash-pc-linha">
                      <span className="dash-pc-col-data text-muted">{formatDataCurta(l.compra.data_compra)}</span>
                      <span className="dash-pc-col-desc">{l.compra.descricao}</span>
                      <span className="dash-pc-col-cat"><span className="donut-cor" style={{ background: cat?.cor ?? 'var(--cat-outros)' }} />{cat?.nome ?? '—'}</span>
                      <span className="dash-pc-col-pag text-muted">{descricaoPagamento(l).replace('Crédito ', 'Crédito · ')}</span>
                      <span className="dash-pc-col-valor valor">{formatValorCurto(l.valor_centavos)}</span>
                    </Link>
                  )
                })}
              </div>
            </Card>
          </div>

          <div className="dash-pc-rodape">
            <UltimosMeses porMes={dados.porMes} media={dados.media} mesAtual={dados.mes} />
            <SaiuDasContas saidas={dados.saidas} faturas={dados.faturas} meiosPorFatura={dados.meiosPorFatura} />
          </div>
        </>
      )}
    </div>
  )
}

function ObjetivoResumoCard({ objetivoId, nome, metaCentavos }: { objetivoId: string; nome: string; metaCentavos: number }) {
  // O acumulado depende das movimentações — busca dedicada e barata.
  const { data } = useObjetivoResumo(objetivoId)
  const acumulado = data ?? 0
  const progresso = progressoPercentual(metaCentavos, acumulado)

  return (
    <Card className="dash-pc-cartao">
      <span className="dash-pc-cartao-topo"><Target size={15} strokeWidth={2.75} /> Objetivo {nome}</span>
      <div>
        <div className="valor-destaque dash-pc-cartao-valor">{Math.min(Math.round(progresso), 100)}%</div>
        <div className="progress-bar-track" style={{ marginTop: 8, height: 6 }}>
          <div className="progress-bar-fill" style={{ width: `${Math.min(progresso, 100)}%` }} />
        </div>
      </div>
      <span className="dash-pc-cartao-meta">{formatCentavos(acumulado)} de {formatCentavos(metaCentavos)}</span>
    </Card>
  )
}

// Hook local e enxuto: só o acumulado, sem duplicar a lógica de useObjetivo.
function useObjetivoResumo(objetivoId: string) {
  return useQuery({
    queryKey: ['objetivo-resumo', objetivoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentos_objetivo')
        .select('valor_centavos, tipo')
        .eq('objetivo_id', objetivoId)
      if (error) throw error
      return acumuladoCentavos(
        (data as { valor_centavos: number; tipo: 'aporte' | 'retirada' }[]).map((m) => ({
          valorCentavos: m.valor_centavos,
          tipo: m.tipo,
        })),
      )
    },
  })
}
