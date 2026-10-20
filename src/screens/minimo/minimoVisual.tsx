import { Link } from 'react-router-dom'
import { AlertTriangle, Check, CircleCheck, Droplet, Info, Receipt, ShoppingCart, Wifi, Zap } from 'lucide-react'
import { formatCentavos } from '../../lib/money'
import { mensagemDaSaude, nomeCurtoDoItem, TITULO_NIVEL } from '../../lib/calc/minimo'
import { saudeDoServidor } from './minimoDados'
import { formatValorCurto } from '../../lib/rotulos'
import type { MinimoDoMesLinha, NivelSaude, SaudeDoMes } from '../../types/database'
import { rotas } from '../../router/rotas'
import './minimo.css'

// Ícone do item pelo nome/termo: mercado, internet, energia, água; o resto
// fica com o recibo.
export function IconeItemMinimo({ nome, tipo, termo, size = 17 }: {
  nome: string; tipo: MinimoDoMesLinha['tipo']; termo?: string | null; size?: number
}) {
  const texto = `${nome} ${termo ?? ''}`.toLowerCase()
  const props = { size, strokeWidth: 2.75 }
  if (tipo === 'media_categoria') return <ShoppingCart {...props} color="var(--color-accent)" />
  if (/internet|claro|wi-?fi|vivo|tim\b|oi\b/.test(texto)) return <Wifi {...props} color="var(--color-accent-2-600)" />
  if (/energia|luz|neoenergia|ceb/.test(texto)) return <Zap {...props} color="var(--color-accent-700)" />
  if (/água|agua|caesb|saneamento/.test(texto)) return <Droplet {...props} color="var(--color-accent-2-700)" />
  return <Receipt {...props} color="var(--color-neutral-700)" />
}

export function SeloItemMinimo({ linha }: { linha: MinimoDoMesLinha }) {
  if (linha.falta_centavos > 0) return <span className="minimo-selo minimo-selo-falta">falta {formatValorCurto(linha.falta_centavos)}</span>
  if (linha.excedente_centavos > 0) return <span className="minimo-selo minimo-selo-acima">+{formatValorCurto(linha.excedente_centavos)} acima</span>
  return <span className="minimo-selo minimo-selo-pago">pago</span>
}

// Chips do card "Mínimo do mês" (3a): item com falta parcial mostra o
// percentual; item quitado ganha check; item sem nenhum gasto fica pendente.
export function ChipsMinimo({ linhas }: { linhas: MinimoDoMesLinha[] }) {
  return (
    <div className="minimo-chips">
      {linhas.map((l) => {
        const curto = nomeCurtoDoItem(l.nome)
        const rotulo = curto.charAt(0).toUpperCase() + curto.slice(1)
        if (l.falta_centavos === 0) {
          return <span key={l.item_id} className="minimo-chip minimo-chip-ok"><Check size={11} strokeWidth={2.75} />{rotulo}</span>
        }
        if (l.gasto_centavos === 0) {
          return <span key={l.item_id} className="minimo-chip minimo-chip-pendente">{rotulo} pendente</span>
        }
        // Arredonda, mas um item que ainda tem falta nunca aparece como 100%.
        const pct = l.previsto_centavos > 0 ? Math.min(Math.round((l.coberto_centavos / l.previsto_centavos) * 100), 99) : 0
        return (
          <span key={l.item_id} className="minimo-chip">
            <span className="minimo-chip-ponto" />{rotulo} {pct}%
          </span>
        )
      })}
    </div>
  )
}

// Barra "já gasto × falta" do mínimo.
export function BarraMinimo({ cobertoCentavos, faltaCentavos }: { cobertoCentavos: number; faltaCentavos: number }) {
  return (
    <div className="minimo-barra" aria-hidden>
      {cobertoCentavos > 0 && <span className="minimo-barra-coberto" style={{ flex: cobertoCentavos }} />}
      {faltaCentavos > 0 && <span className="minimo-barra-falta" style={{ flex: faltaCentavos }} />}
    </div>
  )
}

const ICONE_NIVEL: Record<NivelSaude, typeof AlertTriangle> = {
  alto: AlertTriangle,
  atencao: Info,
  tranquilo: CircleCheck,
  sem_entradas: Info,
}

// Card de alerta da saúde do mês (3a), na cor do nível.
export function CardAlertaSaude({ saude, linhas }: { saude: SaudeDoMes; linhas: MinimoDoMesLinha[] }) {
  const calc = saudeDoServidor(saude)
  const emFalta = linhas.filter((l) => l.falta_centavos > 0).map((l) => nomeCurtoDoItem(l.nome))
  const msg = mensagemDaSaude(calc, saude.falta_minimo_centavos, saude.margem_centavos, emFalta, formatCentavos)
  const Icone = ICONE_NIVEL[saude.nivel]
  return (
    <div className={`saude-alerta saude-${saude.nivel}`} role={saude.nivel === 'alto' ? 'alert' : undefined}>
      <span className="saude-alerta-icone"><Icone size={18} strokeWidth={2.75} /></span>
      <span className="saude-alerta-corpo">
        <span className="saude-alerta-titulo">{TITULO_NIVEL[saude.nivel]}</span>
        <span className="saude-alerta-texto">
          {msg.texto}{msg.destaque && <><strong>{msg.destaque}</strong>.</>}
        </span>
        {saude.nivel === 'sem_entradas' ? (
          <Link to={rotas.novaEntrada} className="saude-alerta-link">Registrar entrada</Link>
        ) : (
          <Link to={rotas.minimo} className="saude-alerta-link">Ver mínimo do mês</Link>
        )}
      </span>
    </div>
  )
}
