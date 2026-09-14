import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ShoppingCart } from 'lucide-react'
import { useCriarListaMercado, useListasMercado } from '../../lib/queries/mercado'
import { mensagemDeErro } from '../../lib/queries/shared'
import { Button, EmptyState, Field, Input, BottomSheet } from '../../components/ui'
import { rotas } from '../../router/rotas'
import './MercadoScreen.css'

export function MercadoScreen() {
  const listasQuery = useListasMercado()
  const criar = useCriarListaMercado()
  const navigate = useNavigate()
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const listas = listasQuery.data ?? []
  const abertas = listas.filter((l) => l.situacao === 'aberta')
  const finalizadas = listas.filter((l) => l.situacao === 'finalizada')

  async function aoCriar() {
    setErro(null)
    try {
      const lista = await criar.mutateAsync(nome)
      setCriando(false)
      setNome('')
      navigate(rotas.listaMercado(lista.id))
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="mercado-tela">
      <div className="lanc-header">
        <span className="lanc-titulo">Mercado</span>
      </div>

      {abertas.length === 0 && finalizadas.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={30} strokeWidth={2.75} color="#8c491a" />}
          title="Nenhuma lista aberta"
          description="Monte a lista antes de ir ao mercado e preencha os preços no corredor. Ao finalizar, ela vira um gasto só."
          action={<Button variant="primary" onClick={() => setCriando(true)}><Plus size={16} strokeWidth={3} /> Criar lista</Button>}
        />
      ) : (
        <>
          <Button variant="primary" onClick={() => setCriando(true)} style={{ alignSelf: 'flex-start' }}>
            <Plus size={16} strokeWidth={3} /> Criar lista
          </Button>

          {abertas.length > 0 && (
            <div>
              <span className="kicker">Em andamento</span>
              <div className="mercado-lista-listas">
                {abertas.map((l) => (
                  <button key={l.id} type="button" className="atalho-card" onClick={() => navigate(rotas.listaMercado(l.id))}>
                    <span className="atalho-icone" style={{ background: 'var(--color-accent-200)' }}>
                      <ShoppingCart size={18} strokeWidth={2.75} color="#8c491a" />
                    </span>
                    <span>
                      <span className="atalho-titulo">{l.nome}</span>
                      <span className="atalho-desc">aberta</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {finalizadas.length > 0 && (
            <div>
              <span className="kicker">Finalizadas</span>
              <div className="mercado-lista-listas">
                {finalizadas.map((l) => (
                  <button key={l.id} type="button" className="atalho-card" onClick={() => navigate(rotas.listaMercado(l.id))}>
                    <span className="atalho-icone" style={{ background: 'var(--color-accent-2-200)' }}>
                      <ShoppingCart size={18} strokeWidth={2.75} color="#56633f" />
                    </span>
                    <span>
                      <span className="atalho-titulo">{l.nome}</span>
                      <span className="atalho-desc">finalizada</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {criando && (
        <BottomSheet title="Nova lista de mercado" onClose={() => setCriando(false)}>
          <Field label="Nome da lista">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Feira da semana" autoFocus />
          </Field>
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
