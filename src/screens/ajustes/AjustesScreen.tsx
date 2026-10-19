import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, CreditCard, Download, LogOut, Tag, Target } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePerfil } from '../../lib/queries/perfil'
import { useCategorias } from '../../lib/queries/categorias'
import { useCartoes } from '../../lib/queries/cartoes'
import { supabase } from '../../lib/supabase'
import { StatusSyncBadge } from '../../components/StatusSyncBadge'
import { Button } from '../../components/ui'
import { rotas } from '../../router/rotas'
import './AjustesScreen.css'

export function AjustesScreen() {
  const { session, sair } = useAuth()
  const navigate = useNavigate()
  const perfilQuery = usePerfil()
  const categoriasQuery = useCategorias()
  const cartoesQuery = useCartoes()
  const [exportando, setExportando] = useState(false)
  const [erroExportacao, setErroExportacao] = useState<string | null>(null)

  async function exportarDados() {
    setExportando(true)
    setErroExportacao(null)
    try {
      const [categorias, cartoes, compras, lancamentos, objetivos, movimentos, listas, itens, faturas, pagamentos] = await Promise.all([
        supabase.from('categorias').select('*'),
        supabase.from('cartoes').select('*'),
        supabase.from('compras').select('*'),
        supabase.from('lancamentos_mensais').select('*'),
        supabase.from('objetivos').select('*'),
        supabase.from('movimentos_objetivo').select('*'),
        supabase.from('listas_mercado').select('*'),
        supabase.from('itens_lista').select('*'),
        supabase.from('faturas').select('*'),
        supabase.from('pagamentos_fatura').select('*'),
      ])

      const pacote = {
        exportadoEm: new Date().toISOString(),
        categorias: categorias.data,
        cartoes: cartoes.data,
        compras: compras.data,
        lancamentos_mensais: lancamentos.data,
        objetivos: objetivos.data,
        movimentos_objetivo: movimentos.data,
        listas_mercado: listas.data,
        itens_lista: itens.data,
        faturas: faturas.data,
        // Pagamentos de fatura vão no arquivo para backup; não são gastos.
        pagamentos_fatura: pagamentos.data,
      }

      const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `minhas-financas-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setErroExportacao('Não foi possível exportar os dados agora. Tente novamente.')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="ajustes-tela">
      <span className="lanc-titulo">Ajustes</span>

      <div className="ajustes-conta-card">
        <span className="ajustes-avatar">Á</span>
        <div>
          <span style={{ display: 'block', fontWeight: 700 }}>{perfilQuery.data?.nome ?? 'Ágata'}</span>
          <span className="text-muted" style={{ fontSize: 12.5 }}>{session?.user.email}</span>
        </div>
      </div>

      <div className="ajustes-secao">
        <span className="kicker">Sincronização</span>
        <div className="ajustes-linha"><StatusSyncBadge /></div>
      </div>

      <div className="ajustes-secao">
        <span className="kicker">Gerenciar</span>
        <button type="button" className="atalho-card" onClick={() => navigate(rotas.cartoes)}>
          <span className="atalho-icone atalho-icone-lilas">
            <CreditCard size={18} strokeWidth={2.75} />
          </span>
          <span style={{ flex: 1 }}>
            <span className="atalho-titulo">Cartões e faturas</span>
            <span className="atalho-desc">{(cartoesQuery.data ?? []).filter((c) => !c.arquivado).length} ativo(s)</span>
          </span>
          <ChevronRight size={17} strokeWidth={2.75} color="var(--color-neutral-600)" />
        </button>
        <button type="button" className="atalho-card" onClick={() => navigate(rotas.categorias)}>
          <span className="atalho-icone atalho-icone-coral">
            <Tag size={18} strokeWidth={2.75} />
          </span>
          <span style={{ flex: 1 }}>
            <span className="atalho-titulo">Categorias</span>
            <span className="atalho-desc">{(categoriasQuery.data ?? []).filter((c) => !c.arquivada).length} ativa(s)</span>
          </span>
          <ChevronRight size={17} strokeWidth={2.75} color="var(--color-neutral-600)" />
        </button>
        <button type="button" className="atalho-card" onClick={() => navigate(rotas.objetivos)}>
          <span className="atalho-icone atalho-icone-lilas">
            <Target size={18} strokeWidth={2.75} />
          </span>
          <span style={{ flex: 1 }}>
            <span className="atalho-titulo">Objetivos</span>
            <span className="atalho-desc">metas e valores guardados</span>
          </span>
          <ChevronRight size={17} strokeWidth={2.75} color="var(--color-neutral-600)" />
        </button>
      </div>

      <div className="ajustes-secao">
        <span className="kicker">Dados</span>
        <Button onClick={exportarDados} disabled={exportando}>
          <Download size={16} strokeWidth={2.75} /> {exportando ? 'Exportando…' : 'Exportar meus dados (.json)'}
        </Button>
        {erroExportacao && <div className="novo-gasto-erro" role="alert">{erroExportacao}</div>}
        <p className="text-muted" style={{ fontSize: 11.5 }}>O arquivo é baixado no seu dispositivo — nunca fica no repositório do app.</p>
      </div>

      <Button className="btn-danger" onClick={sair}>
        <LogOut size={16} strokeWidth={2.75} /> Sair da conta
      </Button>
    </div>
  )
}
