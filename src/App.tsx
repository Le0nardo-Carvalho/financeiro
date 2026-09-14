import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AppLayout } from './layouts/AppLayout'
import { rotas } from './router/rotas'

import { AcessoScreen } from './screens/auth/AcessoScreen'
import { DashboardScreen } from './screens/dashboard/DashboardScreen'
import { LancamentosScreen } from './screens/lancamentos/LancamentosScreen'
import { NovoGastoScreen } from './screens/lancamentos/NovoGastoScreen'
import { DetalheLancamentoScreen } from './screens/lancamentos/DetalheLancamentoScreen'
import { CategoriasScreen } from './screens/categorias/CategoriasScreen'
import { CategoriaDetalheScreen } from './screens/categorias/CategoriaDetalheScreen'
import { CartoesScreen } from './screens/cartoes/CartoesScreen'
import { NovoCartaoScreen } from './screens/cartoes/NovoCartaoScreen'
import { FaturaCartaoScreen } from './screens/cartoes/FaturaCartaoScreen'
import { MercadoScreen } from './screens/mercado/MercadoScreen'
import { ListaMercadoDetalheScreen } from './screens/mercado/ListaMercadoDetalheScreen'
import { ObjetivosScreen } from './screens/objetivos/ObjetivosScreen'
import { ObjetivoDetalheScreen } from './screens/objetivos/ObjetivoDetalheScreen'
import { AjustesScreen } from './screens/ajustes/AjustesScreen'

function ProtegidoOuAcesso({ children }: { children: React.ReactNode }) {
  const { session, carregando } = useAuth()
  if (carregando) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--color-neutral-600)' }}>
        Carregando…
      </div>
    )
  }
  if (!session) return <Navigate to={rotas.acesso} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path={rotas.acesso} element={<AcessoScreen />} />
      <Route
        path="/"
        element={
          <ProtegidoOuAcesso>
            <AppLayout />
          </ProtegidoOuAcesso>
        }
      >
        <Route index element={<DashboardScreen />} />
        <Route path="lancamentos" element={<LancamentosScreen />} />
        <Route path="lancamentos/novo" element={<NovoGastoScreen />} />
        <Route path="lancamentos/:id" element={<DetalheLancamentoScreen />} />
        <Route path="categorias" element={<CategoriasScreen />} />
        <Route path="categorias/:id" element={<CategoriaDetalheScreen />} />
        <Route path="cartoes" element={<CartoesScreen />} />
        <Route path="cartoes/novo" element={<NovoCartaoScreen />} />
        <Route path="cartoes/:id" element={<FaturaCartaoScreen />} />
        <Route path="mercado" element={<MercadoScreen />} />
        <Route path="mercado/:id" element={<ListaMercadoDetalheScreen />} />
        <Route path="objetivos" element={<ObjetivosScreen />} />
        <Route path="objetivos/:id" element={<ObjetivoDetalheScreen />} />
        <Route path="ajustes" element={<AjustesScreen />} />
      </Route>
      <Route path="*" element={<Navigate to={rotas.dashboard} replace />} />
    </Routes>
  )
}
