import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { rotas } from '../../router/rotas'
import { Button, Field, Input } from '../../components/ui'
import './AcessoScreen.css'

// Tela 4c, variante do caminho A de 04-publicacao-github-pages.md: link
// mágico por e-mail, sem campo de senha e sem "esqueci minha senha".
export function AcessoScreen() {
  const { session, carregando, configurado, entrarComLinkMagico } = useAuth()
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (!carregando && session) return <Navigate to={rotas.dashboard} replace />

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const { erro: erroEnvio } = await entrarComLinkMagico(email.trim())
    setEnviando(false)
    if (erroEnvio) {
      setErro(erroEnvio)
      return
    }
    setEnviado(true)
  }

  return (
    <div className="acesso-tela">
      <div className="acesso-bolha acesso-bolha-1" aria-hidden />
      <div className="acesso-bolha acesso-bolha-2" aria-hidden />

      <div className="acesso-conteudo">
        <div>
          <span className="acesso-simbolo" aria-hidden />
          <h1 className="acesso-titulo">
            Minhas
            <br />
            finanças
          </h1>
          <p className="acesso-subtitulo">
            Seus gastos, faturas e listas em um lugar só — no celular e no computador.
          </p>
        </div>

        {!configurado && (
          <div className="acesso-aviso-config">
            Configuração pendente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o acesso.
            Veja o README do projeto.
          </div>
        )}

        {enviado ? (
          <div className="acesso-confirmacao">
            <Mail size={22} strokeWidth={2.75} />
            <div>
              <strong>Confira seu e-mail</strong>
              <p>Enviamos um link de acesso para {email}. Abra-o neste dispositivo para entrar.</p>
            </div>
            <Button type="button" onClick={() => setEnviado(false)}>
              Usar outro e-mail
            </Button>
          </div>
        ) : (
          <form onSubmit={aoEnviar} className="acesso-form">
            <Field label="E-mail" error={erro}>
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="agata@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!configurado}
              />
            </Field>
            <Button type="submit" variant="primary" block disabled={!configurado || enviando}>
              {enviando ? 'Enviando…' : 'Enviar link de acesso'}
            </Button>
          </form>
        )}

        <div className="acesso-rodape">
          <Lock size={18} strokeWidth={2.75} style={{ flex: 'none', marginTop: 1 }} />
          <span>Conta pessoal: só você enxerga seus lançamentos. O app nunca pede dados bancários.</span>
        </div>
      </div>
    </div>
  )
}
