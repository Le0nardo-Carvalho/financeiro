import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from '../lib/supabase'

interface AuthState {
  session: Session | null
  carregando: boolean
  configurado: boolean
  entrarComLinkMagico: (email: string) => Promise<{ erro: string | null }>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCarregando(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      setSession(novaSessao)
      if (evento === 'SIGNED_IN') {
        // Ao primeiro login, cria as categorias e o cartão iniciais.
        // Idempotente: se já existirem categorias, semear_perfil() não faz nada.
        supabase.rpc('semear_perfil').then(({ error }) => {
          if (error) console.error('Falha ao semear perfil inicial:', error.message)
        })
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function entrarComLinkMagico(email: string) {
    if (!supabaseConfigurado) {
      return { erro: 'Supabase não configurado. Veja as instruções de configuração no README.' }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    return { erro: error?.message ?? null }
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ session, carregando, configurado: supabaseConfigurado, entrarComLinkMagico, sair }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
