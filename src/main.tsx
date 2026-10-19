import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SyncStatusProvider } from './context/SyncStatusContext'
import { MesSelecionadoProvider } from './context/MesSelecionadoContext'
// Estilos base antes de App: o CSS de cada tela (importado pelas telas) vem
// depois e pode refinar as primitivas sem precisar de seletor mais forte.
import './styles/tokens.css'
import './styles/components.css'
import App from './App'

// Uma consulta por tela, com revalidação ao voltar o foco da janela ou a
// conexão (README.md, "Busca de dados").
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 15_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <SyncStatusProvider>
            <MesSelecionadoProvider>
              <App />
            </MesSelecionadoProvider>
          </SyncStatusProvider>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
)
