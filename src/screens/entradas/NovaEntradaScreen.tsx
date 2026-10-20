import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Trash2, X } from 'lucide-react'
import { useAtualizarEntrada, useCriarEntrada, useEntrada, useExcluirEntrada } from '../../lib/queries/entradas'
import { mensagemDeErro } from '../../lib/queries/shared'
import { parseCentavosInput } from '../../lib/money'
import { formatMesExtenso, hojeISO, parseISO, proximoMes, toISO, type ISODate } from '../../lib/calc/datas'
import type { Entrada, TipoEntrada } from '../../types/database'
import { Button, Dialog, Field, Input } from '../../components/ui'
import { rotas } from '../../router/rotas'
import { CONTAS_ENTRADA, ROTULO_TIPO_ENTRADA, TIPOS_ENTRADA } from './rotulosEntrada'
import './NovaEntradaScreen.css'

// Preenchimento vindo de "confirmar quando cair" numa prevista (3f).
export interface EntradaPrefill {
  descricao: string
  valorCentavos: number
  tipo: TipoEntrada
  conta: string | null
  recorrente: boolean
  diaPrevisto: number | null
  data: ISODate
}

function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Telas 3e (nova) e edição de uma entrada existente.
export function NovaEntradaScreen() {
  const { id } = useParams<{ id: string }>()
  const entradaQuery = useEntrada(id)

  if (id && entradaQuery.isLoading) return <p className="text-muted">Carregando…</p>
  if (id && !entradaQuery.data) return <p className="text-muted">Entrada não encontrada.</p>
  return <FormularioEntrada key={id ?? 'nova'} entrada={entradaQuery.data ?? null} />
}

function FormularioEntrada({ entrada }: { entrada: Entrada | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as { prefill?: EntradaPrefill } | null)?.prefill
  const criar = useCriarEntrada()
  const atualizar = useAtualizarEntrada()
  const excluir = useExcluirEntrada()

  const [valorTexto, setValorTexto] = useState(() => {
    const centavos = entrada?.valor_centavos ?? prefill?.valorCentavos
    return centavos ? centavosParaTexto(centavos) : ''
  })
  const [descricao, setDescricao] = useState(entrada?.descricao ?? prefill?.descricao ?? '')
  const [data, setData] = useState<ISODate>(entrada?.data ?? prefill?.data ?? hojeISO())
  const [tipo, setTipo] = useState<TipoEntrada>(entrada?.tipo ?? prefill?.tipo ?? 'renda')
  const [conta, setConta] = useState<string | null>(entrada ? entrada.conta : prefill?.conta ?? CONTAS_ENTRADA[0])
  const [recorrente, setRecorrente] = useState(entrada?.recorrente ?? prefill?.recorrente ?? false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const valorCentavos = parseCentavosInput(valorTexto)
  const { ano, mes, dia } = parseISO(data || hojeISO())
  const seguinte = proximoMes(ano, mes)
  const nomeSeguinte = formatMesExtenso(toISO({ ano: seguinte.ano, mes: seguinte.mes, dia: 1 }))
  const salvando = criar.isPending || atualizar.isPending

  async function aoSalvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!valorCentavos || valorCentavos <= 0) return setErro('Informe um valor maior que zero.')
    if (!descricao.trim()) return setErro('Informe de onde veio a entrada.')
    if (!data) return setErro('Informe a data.')

    const dados = {
      descricao,
      data,
      valorCentavos,
      tipo,
      conta,
      recorrente,
      diaPrevisto: recorrente ? dia : null,
      observacoes: entrada?.observacoes ?? null,
    }
    try {
      if (entrada) await atualizar.mutateAsync({ ...dados, id: entrada.id, versao: entrada.versao })
      else await criar.mutateAsync(dados)
      navigate(rotas.entradas, { replace: true })
    } catch (e) {
      // Formulário preservado: nada é limpo quando a gravação falha (1x).
      setErro(mensagemDeErro(e))
    }
  }

  async function aoExcluir() {
    if (!entrada) return
    setErro(null)
    try {
      await excluir.mutateAsync({ id: entrada.id, versao: entrada.versao })
      navigate(rotas.entradas, { replace: true })
    } catch (e) {
      setConfirmandoExclusao(false)
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="entrada-form-tela">
      <div className="entrada-form-cabecalho">
        <button type="button" className="btn-voltar" onClick={() => navigate(-1)} aria-label="Fechar">
          <X size={18} strokeWidth={2.75} />
        </button>
        <span className="entrada-form-titulo">{entrada ? 'Editar entrada' : 'Nova entrada'}</span>
        {entrada && (
          <button type="button" className="btn-voltar" onClick={() => setConfirmandoExclusao(true)} aria-label="Excluir entrada">
            <Trash2 size={17} strokeWidth={2.75} />
          </button>
        )}
      </div>

      <form onSubmit={aoSalvar} className="entrada-form">
        <Field label="Valor" htmlFor="entrada-valor">
          <span className="entrada-valor">
            <span className="entrada-valor-moeda">R$</span>
            <input
              id="entrada-valor"
              className="entrada-valor-input"
              inputMode="decimal"
              placeholder="0,00"
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              autoFocus={!entrada}
            />
          </span>
        </Field>

        <Field label="De onde veio" htmlFor="entrada-descricao">
          <Input id="entrada-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: M Dumont Bordados" />
        </Field>

        <Field label="Data" htmlFor="entrada-data">
          <Input id="entrada-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>

        <div className="field">
          <span className="entrada-rotulo">Tipo</span>
          <div className="chips" role="radiogroup" aria-label="Tipo">
            {TIPOS_ENTRADA.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipo === t}
                className={`chip-opcao chip-lilas ${tipo === t ? 'chip-lilas-ativo' : ''}`}
                onClick={() => setTipo(t)}
              >
                {ROTULO_TIPO_ENTRADA[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="entrada-rotulo">Entrou em</span>
          <div className="chips" role="radiogroup" aria-label="Entrou em">
            {CONTAS_ENTRADA.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={conta === c}
                className={`chip-opcao chip-lilas ${conta === c ? 'chip-lilas-ativo' : ''}`}
                onClick={() => setConta(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="entrada-repete">
          <span className="entrada-repete-texto">
            <span className="entrada-repete-titulo" id="entrada-repete-rotulo">Repete todo mês</span>
            <span className="entrada-repete-desc">
              {recorrente ? `Aparece como prevista em ${nomeSeguinte}, dia ${dia}` : 'Marque para ver a próxima como prevista'}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            className="interruptor"
            aria-checked={recorrente}
            aria-labelledby="entrada-repete-rotulo"
            onClick={() => setRecorrente((v) => !v)}
          />
        </div>

        {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

        <Button type="submit" variant="primary" block disabled={salvando} className="entrada-salvar">
          {salvando ? 'Salvando…' : 'Salvar entrada'}
        </Button>
      </form>

      {confirmandoExclusao && (
        <Dialog
          title="Excluir entrada?"
          onClose={() => setConfirmandoExclusao(false)}
          actions={
            <>
              <Button onClick={() => setConfirmandoExclusao(false)}>Cancelar</Button>
              <Button variant="perigo" onClick={aoExcluir} disabled={excluir.isPending}>
                {excluir.isPending ? 'Excluindo…' : 'Excluir'}
              </Button>
            </>
          }
        >
          A entrada sai do total do mês e do balancete. Os gastos não mudam.
        </Dialog>
      )}
    </div>
  )
}
