import { NavLink, Outlet } from 'react-router-dom'
import {
  CreditCard, Home, Receipt, Settings2, ShoppingCart, Tag, Target,
} from 'lucide-react'
import { rotas } from '../router/rotas'
import { OfflineBanner } from '../components/OfflineBanner'
import './AppLayout.css'

const ICON_PROPS = { size: 21, strokeWidth: 2.75 }

const NAV_MOBILE = [
  { to: rotas.dashboard, label: 'Início', icon: <Home {...ICON_PROPS} />, end: true },
  { to: rotas.lancamentos, label: 'Gastos', icon: <Receipt {...ICON_PROPS} /> },
  { to: rotas.mercado, label: 'Mercado', icon: <ShoppingCart {...ICON_PROPS} /> },
  { to: rotas.categorias, label: 'Categorias', icon: <Tag {...ICON_PROPS} /> },
  { to: rotas.ajustes, label: 'Ajustes', icon: <Settings2 {...ICON_PROPS} /> },
]

const NAV_DESKTOP = [
  { to: rotas.dashboard, label: 'Início', icon: <Home size={18} strokeWidth={2.75} />, end: true },
  { to: rotas.lancamentos, label: 'Lançamentos', icon: <Receipt size={18} strokeWidth={2.75} /> },
  { to: rotas.cartoes, label: 'Cartões e faturas', icon: <CreditCard size={18} strokeWidth={2.75} /> },
  { to: rotas.categorias, label: 'Categorias', icon: <Tag size={18} strokeWidth={2.75} /> },
  { to: rotas.objetivos, label: 'Objetivos', icon: <Target size={18} strokeWidth={2.75} /> },
  { to: rotas.mercado, label: 'Mercado', icon: <ShoppingCart size={18} strokeWidth={2.75} /> },
  { to: rotas.ajustes, label: 'Ajustes', icon: <Settings2 size={18} strokeWidth={2.75} /> },
]

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <span className="app-brand-dot" />
          <span>Minhas finanças</span>
        </div>
        <nav className="app-sidebar-nav">
          {NAV_DESKTOP.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `app-sidebar-item ${isActive ? 'app-sidebar-item-ativo' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-perfil">
          <span className="app-sidebar-avatar">Á</span>
          <span>Ágata</span>
        </div>
      </aside>

      <div className="app-main">
        <OfflineBanner />
        <main className="app-content">
          <Outlet />
        </main>
        <nav className="app-bottom-nav" aria-label="Navegação principal">
          {NAV_MOBILE.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `app-bottom-nav-item ${isActive ? 'app-bottom-nav-item-ativo' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
