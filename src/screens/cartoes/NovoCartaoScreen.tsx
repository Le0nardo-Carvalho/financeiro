import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useCriarCartao } from '../../lib/queries/cartoes'
import { mensagemDeErro } from '../../lib/queries/shared'
import { Button, Field, Input } from '../../components/ui'
import { rotas } from '../../router/rotas'

const PALETA = ['#8fa073', '#d67f48', '#8c491a', '#ffc6a5', '#a19786', '#56633f']

export function NovoCartaoScreen() {
  const navigate = useNavigate()
  const criar = useCriarCartao()
  const [apelido, setApelido] = useState('')
  const [diaFechamento, setDiaFechamento] = useState(5)
  const [diaVencimento, setDiaVencimento] = useState(12)
  const [cor, setCor] = useState(PALETA[0])
  const [erro, setErro] = useState<string | null>(null)

  async function aoSalvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!apelido.trim()) return setErro('Informe um nome ou apelido para o cartão.')
    try {
      const cartao = await criar.mutateAsync({ apelido, diaFechamento, diaVencimento, cor })
      navigate(rotas.cartao(cartao.id))
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="novo-gasto-tela">
      <div className="novo-gasto-header">
        <button type="button" className="btn btn-icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={18} strokeWidth={2.75} />
        </button>
        <span className="lanc-titulo">Novo cartão</span>
      </div>

      <form onSubmit={aoSalvar} className="novo-gasto-form">
        <Field label="Apelido"><Input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Ex.: Nubank" autoFocus /></Field>
        <Field label="Dia de fechamento">
          <Input type="number" min={1} max={31} value={diaFechamento} onChange={(e) => setDiaFechamento(Number(e.target.value))} />
        </Field>
        <Field label="Dia de vencimento">
          <Input type="number" min={1} max={31} value={diaVencimento} onChange={(e) => setDiaVencimento(Number(e.target.value))} />
        </Field>
        <Field label="Cor de identificação">
          <div className="categoria-paleta">
            {PALETA.map((c) => (
              <button key={c} type="button" className="categoria-swatch" style={{ background: c }} onClick={() => setCor(c)} aria-pressed={cor === c}>
                {cor === c && <Check size={16} strokeWidth={3} color="#fff" />}
              </button>
            ))}
          </div>
        </Field>

        {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

        <Button type="submit" variant="primary" block disabled={criar.isPending}>
          {criar.isPending ? 'Salvando…' : 'Salvar cartão'}
        </Button>
      </form>
    </div>
  )
}
