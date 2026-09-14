import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { useObjetivo, useRegistrarMovimento } from '../../lib/queries/objetivos'
import { mensagemDeErro } from '../../lib/queries/shared'
import { formatCentavos, parseCentavosInput } from '../../lib/money'
import { formatDataLonga, hojeISO } from '../../lib/calc/datas'
import { acumuladoCentavos, objetivoAlcancado, progressoPercentual, restanteCentavos } from '../../lib/calc/objetivos'
import type { TipoMovimento } from '../../types/database'
import { Button, BottomSheet, Field, Input, ProgressBar } from '../../components/ui'
import './ObjetivoDetalheScreen.css'

export function ObjetivoDetalheScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const objetivoQuery = useObjetivo(id)
  const registrar = useRegistrarMovimento(id ?? '')

  const [movimentoAberto, setMovimentoAberto] = useState<TipoMovimento | null>(null)
  const [valorTexto, setValorTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  if (objetivoQuery.isLoading) return <p className="text-muted">Carregando…</p>
  if (!objetivoQuery.data) return <p className="text-muted">Objetivo não encontrado.</p>

  const { objetivo, movimentos } = objetivoQuery.data
  const acumulado = acumuladoCentavos(movimentos.map((m) => ({ valorCentavos: m.valor_centavos, tipo: m.tipo })))
  const progresso = progressoPercentual(objetivo.meta_centavos, acumulado)
  const restante = restanteCentavos(objetivo.meta_centavos, acumulado)
  const alcancado = objetivoAlcancado(objetivo.meta_centavos, acumulado)

  async function aoRegistrar() {
    if (!movimentoAberto) return
    setErro(null)
    const valor = parseCentavosInput(valorTexto)
    if (!valor || valor <= 0) return setErro('Informe um valor maior que zero.')
    try {
      await registrar.mutateAsync({ valorCentavos: valor, tipo: movimentoAberto, data: hojeISO(), movimentosAtuais: movimentos })
      setMovimentoAberto(null)
      setValorTexto('')
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="objetivo-detalhe-tela">
      <div className="novo-gasto-header">
        <button type="button" className="btn btn-icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={18} strokeWidth={2.75} />
        </button>
        <span className="lanc-titulo">{objetivo.nome}</span>
      </div>

      <div className="objetivo-progresso-card">
        <span className="objetivo-progresso-pct">{Math.min(Math.round(progresso), 100)}%{alcancado && ' · alcançado'}</span>
        <ProgressBar percentual={progresso} />
        <div className="objetivo-progresso-legenda">
          <span>{formatCentavos(acumulado)} de {formatCentavos(objetivo.meta_centavos)}</span>
          <span className="text-muted">{formatCentavos(restante)} restantes</span>
        </div>
      </div>

      <div className="objetivo-acoes">
        <Button variant="primary" onClick={() => setMovimentoAberto('aporte')}><Plus size={16} strokeWidth={3} /> Guardar</Button>
        <Button onClick={() => setMovimentoAberto('retirada')}><Minus size={16} strokeWidth={3} /> Retirar</Button>
      </div>

      <div>
        <span className="kicker">Movimentações</span>
        <div className="categorias-lista">
          {movimentos.map((m) => (
            <div key={m.id} className="categoria-linha">
              <span className="text-muted">{formatDataLonga(m.data)}</span>
              <span style={{ flex: 1 }}>{m.tipo === 'aporte' ? 'Guardado' : 'Retirado'}</span>
              <span style={{ fontFamily: 'var(--font-heading)', color: m.tipo === 'retirada' ? '#a3341f' : 'inherit' }}>
                {m.tipo === 'retirada' ? '-' : '+'} {formatCentavos(m.valor_centavos)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {movimentoAberto && (
        <BottomSheet title={movimentoAberto === 'aporte' ? 'Guardar valor' : 'Retirar valor'} onClose={() => setMovimentoAberto(null)}>
          <Field label="Valor"><Input value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" autoFocus /></Field>
          {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}
          <div className="sheet-actions">
            <Button onClick={() => setMovimentoAberto(null)}>Cancelar</Button>
            <Button variant="primary" onClick={aoRegistrar} disabled={registrar.isPending}>Confirmar</Button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
