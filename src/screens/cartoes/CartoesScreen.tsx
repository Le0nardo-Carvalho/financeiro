import { Link, useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, CreditCard, Plus } from 'lucide-react'
import { useArquivarCartao, useCartoes } from '../../lib/queries/cartoes'
import { mensagemDeErro } from '../../lib/queries/shared'
import { Button, EmptyState } from '../../components/ui'
import { rotas } from '../../router/rotas'
import { useState } from 'react'
import './CartoesScreen.css'

export function CartoesScreen() {
  const cartoesQuery = useCartoes()
  const arquivar = useArquivarCartao()
  const navigate = useNavigate()
  const [erro, setErro] = useState<string | null>(null)

  const cartoes = cartoesQuery.data ?? []
  const ativos = cartoes.filter((c) => !c.arquivado)
  const arquivados = cartoes.filter((c) => c.arquivado)

  async function alternar(id: string, versao: number, arquivarAgora: boolean) {
    setErro(null)
    try {
      await arquivar.mutateAsync({ id, versao, arquivar: arquivarAgora })
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="cartoes-tela">
      <div className="lanc-header">
        <span className="lanc-titulo">Cartões e faturas</span>
        <Button variant="primary" onClick={() => navigate(rotas.novoCartao)}>
          <Plus size={16} strokeWidth={3} /> Novo
        </Button>
      </div>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      {ativos.length === 0 && arquivados.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={30} strokeWidth={2.75} color="#8c491a" />}
          title="Sem cartão cadastrado"
          description="Gastos no crédito ficam desabilitados até existir um cartão com ciclo definido."
          action={<Button variant="primary" onClick={() => navigate(rotas.novoCartao)}>Cadastrar cartão</Button>}
        />
      ) : (
        <div className="cartoes-lista">
          {ativos.map((c) => (
            <div key={c.id} className="cartao-card">
              <span className="cartao-cor" style={{ background: c.cor }} />
              <Link to={rotas.cartao(c.id)} className="cartao-info">
                <span className="cartao-apelido">{c.apelido}</span>
                <span className="text-muted">Fecha dia {c.dia_fechamento} · vence dia {c.dia_vencimento}</span>
              </Link>
              <button type="button" className="btn btn-icon" onClick={() => alternar(c.id, c.versao, true)} aria-label="Arquivar">
                <Archive size={16} strokeWidth={2.75} />
              </button>
            </div>
          ))}
          {arquivados.map((c) => (
            <div key={c.id} className="cartao-card cartao-card-arquivado">
              <span className="cartao-cor" style={{ background: c.cor }} />
              <span className="cartao-info">
                <span className="cartao-apelido">{c.apelido}</span>
                <span className="text-muted">Arquivado</span>
              </span>
              <button type="button" className="btn btn-icon" onClick={() => alternar(c.id, c.versao, false)} aria-label="Reativar">
                <ArchiveRestore size={16} strokeWidth={2.75} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
