import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Categoria } from '../../types/database'
import { Button, Field, Input, BottomSheet } from '../../components/ui'
import { mensagemDeErro } from '../../lib/queries/shared'

// Paleta de seis cores da tela 1e (README.md, "Tokens de design").
const PALETA = ['#8fa073', '#d67f48', '#8c491a', '#ffc6a5', '#a19786', '#56633f']

interface CategoriaEditorSheetProps {
  categoriaExistente?: Categoria
  qtdLancamentosAfetados?: number
  onClose: () => void
  onSalvar: (dados: { nome: string; cor: string; descricao: string }) => Promise<unknown>
  salvando: boolean
}

export function CategoriaEditorSheet({ categoriaExistente, qtdLancamentosAfetados, onClose, onSalvar, salvando }: CategoriaEditorSheetProps) {
  const [nome, setNome] = useState(categoriaExistente?.nome ?? '')
  const [cor, setCor] = useState(categoriaExistente?.cor ?? PALETA[0])
  const [descricao, setDescricao] = useState(categoriaExistente?.descricao ?? '')
  const [erro, setErro] = useState<string | null>(null)

  async function aoSalvar() {
    setErro(null)
    try {
      await onSalvar({ nome, cor, descricao })
      onClose()
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <BottomSheet
      title={categoriaExistente ? 'Editar categoria' : 'Nova categoria'}
      onClose={onClose}
      avisoAlcance={
        categoriaExistente && (
          <span>
            Nome anterior: <strong>{categoriaExistente.nome}</strong>.{' '}
            {qtdLancamentosAfetados !== undefined
              ? `${qtdLancamentosAfetados} lançamento(s) serão atualizados.`
              : 'Lançamentos vinculados serão atualizados.'}{' '}
            Valores, datas e parcelas não mudam.
          </span>
        )
      }
    >
      <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus /></Field>

      <Field label="Cor de identificação">
        <div className="categoria-paleta">
          {PALETA.map((c) => (
            <button
              key={c}
              type="button"
              className="categoria-swatch"
              style={{ background: c }}
              onClick={() => setCor(c)}
              aria-label={`Cor ${c}`}
              aria-pressed={cor === c}
            >
              {cor === c && <Check size={16} strokeWidth={3} color="#fff" />}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Descrição (opcional)">
        <textarea className="input" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </Field>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      <div className="sheet-actions">
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={aoSalvar} disabled={salvando || !nome.trim()}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </BottomSheet>
  )
}
