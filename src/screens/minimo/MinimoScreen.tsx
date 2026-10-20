import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CircleCheck, Info, Pencil } from 'lucide-react'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { useMinimoDoMes, useMinimoItens, useSaudeDoMes } from '../../lib/queries/minimo'
import { formatCentavos } from '../../lib/money'
import { formatMesExtenso, hojeISO, primeiroDiaDoMes } from '../../lib/calc/datas'
import { juntarNomes, TITULO_NIVEL } from '../../lib/calc/minimo'
import { formatValorCurto } from '../../lib/rotulos'
import type { NivelSaude } from '../../types/database'
import { Button, EmptyState } from '../../components/ui'
import { rotas } from '../../router/rotas'
import { BarraMinimo, IconeItemMinimo, SeloItemMinimo } from './minimoVisual'
import { subtituloItem, useComprometidoNoMesSeguinte } from './minimoDados'
import './MinimoScreen.css'

const CONCLUSAO: Record<NivelSaude, string> = {
  alto: 'O que entrou não cobre o resto do mínimo. Segure o que não é essencial até a próxima entrada.',
  atencao: 'O mínimo está coberto, mas sobra pouco. Vá com calma no que não é essencial.',
  tranquilo: 'O que entrou cobre o mínimo e ainda sobra uma folga.',
  sem_entradas: 'Registre as entradas do mês para ver se o mínimo está coberto.',
}

const ICONE: Record<NivelSaude, typeof AlertTriangle> = {
  alto: AlertTriangle, atencao: Info, tranquilo: CircleCheck, sem_entradas: Info,
}

// Tela 3b: o mínimo para atravessar o mês, item a item (minimo_do_mes) e a
// conta final (saude_do_mes). Números sempre do banco.
export function MinimoScreen() {
  const navigate = useNavigate()
  const { mes } = useMesSelecionado()
  const minimoQuery = useMinimoDoMes(mes)
  const saudeQuery = useSaudeDoMes(mes)
  const itensQuery = useMinimoItens()
  const comprometido = useComprometidoNoMesSeguinte(mes)

  const linhas = minimoQuery.data ?? []
  const saude = saudeQuery.data
  const nomeMes = formatMesExtenso(mes)
  const emAndamento = primeiroDiaDoMes(hojeISO()) === mes
  const mesesMedia = new Map((itensQuery.data ?? []).map((i) => [i.id, i.meses_media]))

  const cabecalho = (
    <div className="minimo-cabecalho">
      <button type="button" className="btn-voltar" onClick={() => navigate(-1)} aria-label="Voltar"><ArrowLeft size={18} strokeWidth={2.75} /></button>
      <span className="minimo-titulo">Mínimo do mês</span>
      <button type="button" className="btn-voltar" onClick={() => navigate(rotas.ajustarMinimo)} aria-label="Ajustar mínimo"><Pencil size={16} strokeWidth={2.75} /></button>
    </div>
  )

  if (minimoQuery.isLoading || saudeQuery.isLoading) return <div className="minimo-tela">{cabecalho}<p className="text-muted">Carregando…</p></div>
  if (minimoQuery.isError || saudeQuery.isError || !saude) {
    return (
      <div className="minimo-tela">
        {cabecalho}
        <div className="erro-banner" role="alert">Não foi possível calcular o mínimo agora. Verifique a conexão e tente de novo.</div>
      </div>
    )
  }
  if (linhas.length === 0) {
    return (
      <div className="minimo-tela">
        {cabecalho}
        <EmptyState
          icon={<Info size={30} strokeWidth={2.75} color="var(--color-accent)" />}
          title="Nenhum item no mínimo"
          description="Defina a média de mercado e as contas fixas que precisam ser pagas todo mês."
          action={<Button variant="primary" onClick={() => navigate(rotas.ajustarMinimo)}>Ajustar mínimo</Button>}
        />
      </div>
    )
  }

  const Icone = ICONE[saude.nivel]
  const cobertoCentavos = Math.max(saude.minimo_centavos - saude.falta_minimo_centavos, 0)

  return (
    <div className="minimo-tela">
      {cabecalho}

      <div>
        <span className="minimo-rotulo">Para atravessar {nomeMes}</span>
        <span className="valor-destaque minimo-total">{formatCentavos(saude.minimo_centavos)}</span>
        <div className="minimo-barra-bloco"><BarraMinimo cobertoCentavos={cobertoCentavos} faltaCentavos={saude.falta_minimo_centavos} /></div>
        <div className="minimo-legenda">
          <span>
            <span className="minimo-legenda-rotulo"><span className="minimo-ponto minimo-ponto-lilas" />Já gasto</span>
            <span className="valor minimo-legenda-valor">{formatValorCurto(saude.gasto_essencial_centavos)}</span>
          </span>
          <span className="minimo-legenda-fim">
            <span className="minimo-legenda-rotulo"><span className="minimo-ponto minimo-ponto-coral" />Falta</span>
            <span className="valor minimo-legenda-valor minimo-falta">{formatValorCurto(saude.falta_minimo_centavos)}</span>
          </span>
        </div>
      </div>

      <div className="minimo-lista">
        {linhas.map((l) => (
          <div key={l.item_id} className="minimo-item">
            <span className="minimo-item-icone"><IconeItemMinimo nome={l.nome} tipo={l.tipo} /></span>
            <span className="minimo-item-corpo">
              <span className="minimo-item-nome">{l.nome}</span>
              <span className="minimo-item-sub">{subtituloItem(l, mes, mesesMedia.get(l.item_id))}</span>
              {l.tipo === 'media_categoria' && l.previsto_centavos > 0 && (
                <span className="minimo-item-progresso">
                  <span style={{ width: `${Math.min((l.coberto_centavos / l.previsto_centavos) * 100, 100)}%` }} />
                </span>
              )}
            </span>
            <span className="minimo-item-fim">
              <span className="valor minimo-item-valor">{l.gasto_centavos > 0 ? formatValorCurto(l.gasto_centavos) : '—'}</span>
              <SeloItemMinimo linha={l} />
            </span>
          </div>
        ))}
      </div>

      <div className={`minimo-conta saude-${saude.nivel}`}>
        <div className="minimo-conta-linha"><span>Entrou em {nomeMes}</span><span className="valor">+{formatValorCurto(saude.entradas_centavos)}</span></div>
        {saude.previstas_centavos > 0 && (
          <div className="minimo-conta-linha"><span>Previsto para entrar</span><span className="valor">+{formatValorCurto(saude.previstas_centavos)}</span></div>
        )}
        <div className="minimo-conta-linha"><span>Gastou{emAndamento ? ' até hoje' : ''}</span><span className="valor">−{formatValorCurto(saude.gastos_centavos)}</span></div>
        <div className="minimo-conta-linha"><span>Falta do mínimo</span><span className="valor">−{formatValorCurto(saude.falta_minimo_centavos)}</span></div>
        <hr className="minimo-conta-divisor" />
        <div className="minimo-conta-resultado">
          <span className="minimo-conta-nivel"><Icone size={16} strokeWidth={2.75} />{TITULO_NIVEL[saude.nivel]}</span>
          {saude.nivel !== 'sem_entradas' && (
            <span className="valor-destaque minimo-conta-sobra">
              {saude.sobra_centavos < 0 ? '−' : ''}{formatCentavos(Math.abs(saude.sobra_centavos))}
            </span>
          )}
        </div>
        <span className="minimo-conta-texto">{CONCLUSAO[saude.nivel]}</span>
      </div>

      {comprometido.totalCentavos > 0 && (
        <p className="minimo-rodape">
          Já comprometido em {formatMesExtenso(comprometido.mesSeguinte)}: {formatCentavos(comprometido.totalCentavos)} na fatura do {juntarNomes(comprometido.nomes)}.
        </p>
      )}
    </div>
  )
}
