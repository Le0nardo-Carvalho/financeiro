import { createClient } from '@supabase/supabase-js'

// Sem o genérico Database: a tipagem completa do schema do postgrest-js é
// frágil de manter à mão (embeddings, funções, views) e este projeto não
// tem acesso a um projeto Supabase real para gerar os tipos automaticamente
// (`supabase gen types typescript`). Os tipos de domínio em
// src/types/database.ts documentam o formato das linhas e são usados via
// `as X` nos hooks de src/lib/queries — a fonte de verdade do schema é
// supabase/migrations/0001_initial.sql.
// Secrets do GitHub Actions que não existem viram string vazia ("") na
// action, não `undefined` — por isso o fallback abaixo usa `||`, não `??`:
// `?? padrao` não cai no padrão para "", só para null/undefined, e
// createClient("", "") lança "supabaseUrl is required" e derruba o app
// inteiro (tela em branco) antes do React conseguir renderizar qualquer coisa.
const url = (import.meta.env.VITE_SUPABASE_URL as string) || undefined
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || undefined

// Configuração pendente fora do repositório (04-publicacao-github-pages.md):
// URL do projeto e chave publicável (anon) precisam vir de variáveis de
// ambiente — nunca hardcoded, nunca a chave "service_role".
export const supabaseConfigurado = Boolean(url && anonKey)

if (!supabaseConfigurado) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (.env.local). ' +
      'O app não consegue autenticar nem sincronizar dados até isso ser feito.',
  )
}

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
