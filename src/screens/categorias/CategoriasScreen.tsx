import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import { useArquivarCategoria, useAtualizarCategoria, useCategorias, useCriarCategoria, useExcluirCategoria } from '../../lib/queries/categorias'
import { mensagemDeErro } from '../../lib/queries/shared'
import type { Categoria } from '../../types/database'
import { Button, Dialog } from '../../components/ui'
import { rotas } from '../../router/rotas'
import { CategoriaEditorSheet } from './CategoriaEditorSheet'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { useLancamentosDoMes } from '../../lib/queries/lancamentos'
import { usePerfil } from '../../lib/queries/perfil'
import { formatMesAno } from '../../lib/calc/datas'
import { formatValorCurto } from '../../lib/rotulos'
import './CategoriasScreen.css'

export function CategoriasScreen() {
  const categoriasQuery = useCategorias()
  const criar = useCriarCategoria()
  const atualizar = useAtualizarCategoria()
  const arquivar = useArquivarCategoria()
  const excluir = useExcluirCategoria()
  const { mes } = useMesSelecionado()
  const lancamentosQuery = useLancamentosDoMes(mes)
  const perfilQuery = usePerfil()

  const [editorAberto, setEditorAberto] = useState<'nova' | Categoria | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<Categoria | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const categorias = categoriasQuery.data ?? []
  const ativas = categorias.filter((c) => !c.arquivada)
  const arquivadas = categorias.filter((c) => c.arquivada)

  // Total e quantidade do mês selecionado por categoria (tela 1j) — só
  // lancamentos_mensais, como todo gasto.
  const porCategoria = new Map<string, { total: number; qtd: number }>()
  for (const l of lancamentosQuery.data ?? []) {
    const atual = porCategoria.get(l.categoria_id) ?? { total: 0, qtd: 0 }
    atual.total += l.valor_centavos
    atual.qtd += 1
    porCategoria.set(l.categoria_id, atual)
  }
  const ativasOrdenadas = [...ativas].sort((a, b) => (porCategoria.get(b.id)?.total ?? 0) - (porCategoria.get(a.id)?.total ?? 0))

  async function aoAlternarArquivamento(categoria: Categoria) {
    setErro(null)
    try {
      await arquivar.mutateAsync({ id: categoria.id, versao: categoria.versao, arquivar: !categoria.arquivada })
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function aoExcluir() {
    if (!confirmandoExclusao) return
    setErro(null)
    try {
      await excluir.mutateAsync(confirmandoExclusao.id)
      setConfirmandoExclusao(null)
    } catch (e) {
      setErro(mensagemDeErro(e))
      setConfirmandoExclusao(null)
    }
  }

  return (
    <div className="categorias-tela">
      <div className="lanc-header">
        <span className="lanc-titulo">Categorias</span>
        <Button variant="primary" onClick={() => setEditorAberto('nova')}>
          <Plus size={16} strokeWidth={3} /> Nova
        </Button>
      </div>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      <div>
        <span className="text-muted" style={{ fontSize: 12 }}>{formatMesAno(mes)} · toque para ver o histórico</span>
        <div className="categorias-lista">
          {ativasOrdenadas.map((c) => (
            <div key={c.id} className="categoria-linha">
              <span className="lanc-item-cor" style={{ background: c.cor }} />
              <Link to={rotas.categoria(c.id)} className="categoria-nome-link">
                <span style={{ display: 'block' }}>{c.nome}</span>
                <span className="categoria-meta">
                  {(porCategoria.get(c.id)?.qtd ?? 0) === 0
                    ? 'sem gastos neste mês'
                    : `${porCategoria.get(c.id)?.qtd} ${porCategoria.get(c.id)?.qtd === 1 ? 'lançamento' : 'lançamentos'}`}
                  {c.id === perfilQuery.data?.categoria_mercado_id ? ' · padrão do Mercado' : ''}
                </span>
              </Link>
              <span className="valor categoria-valor">{formatValorCurto(porCategoria.get(c.id)?.total ?? 0)}</span>
              <button type="button" className="btn btn-icon" onClick={() => setEditorAberto(c)} aria-label="Editar">
                <Pencil size={16} strokeWidth={2.75} />
              </button>
              <button type="button" className="btn btn-icon" onClick={() => aoAlternarArquivamento(c)} aria-label="Arquivar">
                <Archive size={16} strokeWidth={2.75} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {arquivadas.length > 0 && (
        <div>
          <span className="kicker">Arquivadas</span>
          <div className="categorias-lista">
            {arquivadas.map((c) => (
              <div key={c.id} className="categoria-linha categoria-linha-arquivada">
                <span className="lanc-item-cor" style={{ background: c.cor }} />
                <Link to={rotas.categoria(c.id)} className="categoria-nome-link">{c.nome}</Link>
                <button type="button" className="btn btn-icon" onClick={() => aoAlternarArquivamento(c)} aria-label="Reativar">
                  <ArchiveRestore size={16} strokeWidth={2.75} />
                </button>
                <button type="button" className="btn btn-icon" onClick={() => setConfirmandoExclusao(c)} aria-label="Excluir">
                  <Trash2 size={16} strokeWidth={2.75} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editorAberto && (
        <CategoriaEditorSheet
          categoriaExistente={editorAberto === 'nova' ? undefined : editorAberto}
          onClose={() => setEditorAberto(null)}
          salvando={criar.isPending || atualizar.isPending}
          onSalvar={async (dados) => {
            if (editorAberto === 'nova') {
              await criar.mutateAsync(dados)
            } else {
              await atualizar.mutateAsync({ id: editorAberto.id, versao: editorAberto.versao, ...dados })
            }
          }}
        />
      )}

      {confirmandoExclusao && (
        <Dialog
          title="Excluir categoria?"
          onClose={() => setConfirmandoExclusao(null)}
          actions={
            <>
              <Button onClick={() => setConfirmandoExclusao(null)}>Cancelar</Button>
              <Button className="btn-danger" variant="primary" onClick={aoExcluir}>Excluir</Button>
            </>
          }
        >
          Só é possível excluir "{confirmandoExclusao.nome}" se ela não tiver lançamentos vinculados.
        </Dialog>
      )}
    </div>
  )
}
