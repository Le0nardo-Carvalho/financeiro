import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Target } from 'lucide-react'
import { useCriarObjetivo, useObjetivos } from '../../lib/queries/objetivos'
import { mensagemDeErro } from '../../lib/queries/shared'
import { formatCentavos, parseCentavosInput } from '../../lib/money'
import { Button, EmptyState, Field, Input, BottomSheet } from '../../components/ui'
import { rotas } from '../../router/rotas'
import './ObjetivosScreen.css'

export function ObjetivosScreen() {
  const objetivosQuery = useObjetivos()
  const criar = useCriarObjetivo()
  const navigate = useNavigate()

  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [metaTexto, setMetaTexto] = useState('')
  const [valorInicialTexto, setValorInicialTexto] = useState('')
  const [prazo, setPrazo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const objetivos = objetivosQuery.data ?? []

  async function aoCriar() {
    setErro(null)
    const metaCentavos = parseCentavosInput(metaTexto)
    if (!metaCentavos || metaCentavos <= 0) return setErro('Informe um valor de meta maior que zero.')
    if (!nome.trim()) return setErro('Informe um nome para o objetivo.')
    try {
      const objetivo = await criar.mutateAsync({
        nome,
        metaCentavos,
        prazo: prazo || null,
        valorInicialCentavos: parseCentavosInput(valorInicialTexto) ?? 0,
      })
      setCriando(false)
      navigate(rotas.objetivo(objetivo.id))
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="objetivos-tela">
      <div className="lanc-header">
        <span className="lanc-titulo">Objetivos</span>
        <Button variant="primary" onClick={() => setCriando(true)}>
          <Plus size={16} strokeWidth={3} /> Novo
        </Button>
      </div>

      {objetivos.length === 0 ? (
        <EmptyState
          icon={<Target size={30} strokeWidth={2.75} color="#56633f" />}
          title="Nenhum objetivo ainda"
          description='Crie uma meta como "Viagem" e registre quanto já guardou.'
          action={<Button variant="primary" onClick={() => setCriando(true)}>Criar objetivo</Button>}
        />
      ) : (
        <div className="objetivos-lista">
          {objetivos.map((o) => (
            <button key={o.id} type="button" className="atalho-card" onClick={() => navigate(rotas.objetivo(o.id))}>
              <span className="atalho-icone" style={{ background: 'var(--color-accent-2-200)' }}>
                <Target size={18} strokeWidth={2.75} color="#56633f" />
              </span>
              <span>
                <span className="atalho-titulo">{o.nome}</span>
                <span className="atalho-desc">Meta: {formatCentavos(o.meta_centavos)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {criando && (
        <BottomSheet title="Novo objetivo" onClose={() => setCriando(false)}>
          <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Viagem" autoFocus /></Field>
          <Field label="Valor desejado"><Input value={metaTexto} onChange={(e) => setMetaTexto(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" /></Field>
          <Field label="Valor inicial já guardado (opcional)"><Input value={valorInicialTexto} onChange={(e) => setValorInicialTexto(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" /></Field>
          <Field label="Prazo desejado (opcional)"><Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></Field>
          {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}
          <div className="sheet-actions">
            <Button onClick={() => setCriando(false)}>Cancelar</Button>
            <Button variant="primary" onClick={aoCriar} disabled={criar.isPending}>Criar</Button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
