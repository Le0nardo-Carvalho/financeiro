import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react'
import { useMesSelecionado } from '../../context/MesSelecionadoContext'
import { useHistoricoDaCategoria, useMinimoItens, useSalvarMinimo, type ItemMinimoRascunho } from '../../lib/queries/minimo'
import { useCategorias } from '../../lib/queries/categorias'
import { usePerfil } from '../../lib/queries/perfil'
import { mensagemDeErro } from '../../lib/queries/shared'
import { formatCentavos, parseCentavosInput } from '../../lib/money'
import { formatMesCurto, formatMesExtenso } from '../../lib/calc/datas'
import { mediaDosMesesFechados } from '../../lib/calc/minimo'
import { formatValorCurto } from '../../lib/rotulos'
import type { MinimoItem, Perfil } from '../../types/database'
import { BottomSheet, Button, Field, Input } from '../../components/ui'
import { IconeItemMinimo } from './minimoVisual'
import { regexDoTermo, termoLegivel } from './termo'
import './AjustarMinimoScreen.css'

const OPCOES_MESES = [3, 6, 12]

function paraRascunho(i: MinimoItem): ItemMinimoRascunho {
  return {
    id: i.id, nome: i.nome, tipo: i.tipo, categoriaId: i.categoria_id, valorCentavos: i.valor_centavos,
    mesesMedia: i.meses_media, termo: i.termo, posicao: i.posicao,
  }
}

function textoValor(centavos: number | null): string {
  return centavos === null ? '' : (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Tela 3c: meses da média de mercado, contas fixas e margem de atenção.
// Nada é gravado até "Salvar"; "Salvo" só depois da resposta do banco.
export function AjustarMinimoScreen() {
  const itensQuery = useMinimoItens()
  const perfilQuery = usePerfil()
  if (itensQuery.isLoading || perfilQuery.isLoading) return <p className="text-muted">Carregando…</p>
  if (itensQuery.isError || perfilQuery.isError || !perfilQuery.data) {
    return <div className="erro-banner" role="alert">Não foi possível carregar o mínimo. Verifique a conexão e tente de novo.</div>
  }
  return <FormularioMinimo itens={itensQuery.data ?? []} perfil={perfilQuery.data as Perfil} />
}

function FormularioMinimo({ itens, perfil }: { itens: MinimoItem[]; perfil: Perfil }) {
  const navigate = useNavigate()
  const { mes } = useMesSelecionado()
  const categoriasQuery = useCategorias()
  const salvar = useSalvarMinimo()

  const [rascunho, setRascunho] = useState<ItemMinimoRascunho[]>(() => itens.map(paraRascunho))
  const [margemTexto, setMargemTexto] = useState(textoValor(Number(perfil.margem_atencao_centavos ?? 30000)))
  const [editando, setEditando] = useState<number | 'nova' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const visiveis = rascunho.map((item, indice) => ({ item, indice })).filter(({ item }) => !item.remover)
  const mercado = visiveis.find(({ item }) => item.tipo === 'media_categoria')
  const fixos = visiveis.filter(({ item }) => item.tipo === 'fixo')
  const historico = useHistoricoDaCategoria(mercado?.item.categoriaId, mes, mercado?.item.mesesMedia ?? 3)
  const mediaCentavos = mediaDosMesesFechados(historico.data ?? [], mes, mercado?.item.mesesMedia ?? 3)
  const margemCentavos = parseCentavosInput(margemTexto)
  const totalCentavos = (mercado ? mediaCentavos : 0) + fixos.reduce((s, { item }) => s + (item.valorCentavos ?? 0), 0)
  const categorias = (categoriasQuery.data ?? []).filter((c) => !c.arquivada || c.id === mercado?.item.categoriaId)
  const categoriaMercado = categorias.find((c) => c.id === mercado?.item.categoriaId)

  function alterar(indice: number, mudanca: Partial<ItemMinimoRascunho>) {
    setRascunho((atual) => atual.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)))
  }

  async function aoSalvar() {
    setErro(null)
    if (margemCentavos === null || margemCentavos < 0) return setErro('Informe uma margem de atenção válida (pode ser zero).')
    if (fixos.some(({ item }) => !item.nome.trim() || item.valorCentavos === null || item.valorCentavos < 0)) {
      return setErro('Toda conta fixa precisa de nome e valor.')
    }
    if (mercado && !mercado.item.categoriaId) return setErro('Escolha a categoria do mercado.')
    try {
      await salvar.mutateAsync({
        perfilId: perfil.id,
        margemCentavos,
        itens: rascunho.map((item, i) => ({ ...item, posicao: i })),
      })
      navigate(-1)
    } catch (e) {
      // O rascunho continua na tela; nada é descartado quando a gravação falha.
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="ajmin-tela">
      <div className="ajmin-cabecalho">
        <button type="button" className="btn-voltar" onClick={() => navigate(-1)} aria-label="Voltar"><ArrowLeft size={18} strokeWidth={2.75} /></button>
        <span className="ajmin-titulo">Ajustar mínimo</span>
      </div>

      {mercado && (
        <section className="ajmin-secao">
          <span className="kicker">Mercado</span>
          <div className="ajmin-card">
            <div className="ajmin-linha">
              <span>Média dos últimos</span>
              <div className="ajmin-seg" role="radiogroup" aria-label="Meses da média">
                {OPCOES_MESES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={mercado.item.mesesMedia === n}
                    className={`ajmin-seg-opt ${mercado.item.mesesMedia === n ? 'ajmin-seg-ativo' : ''}`}
                    onClick={() => alterar(mercado.indice, { mesesMedia: n })}
                  >
                    {mercado.item.mesesMedia === n ? `${n} meses` : n}
                  </button>
                ))}
              </div>
            </div>
            <label className="ajmin-linha">
              <span>Categoria</span>
              {/* Rótulo visível (ponto + nome + seta) com o seletor nativo transparente por cima. */}
              <span className="ajmin-categoria">
                <span className="ajmin-ponto" style={{ background: categoriaMercado?.cor ?? 'var(--color-accent)' }} />
                {categoriaMercado?.nome ?? 'Escolha…'}
                <ChevronRight size={16} strokeWidth={2.75} color="var(--color-neutral-600)" />
                <select
                  className="ajmin-select"
                  aria-label="Categoria do mercado"
                  value={mercado.item.categoriaId ?? ''}
                  onChange={(e) => alterar(mercado.indice, { categoriaId: e.target.value || null })}
                >
                  <option value="">Escolha…</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </span>
            </label>
            <div className="ajmin-media">
              <span className="ajmin-media-meses">
                {historico.isLoading
                  ? 'Calculando…'
                  : (historico.data ?? []).filter((h) => h.totalCentavos > 0).map((h) => `${formatMesCurto(h.mes)} ${formatValorCurto(h.totalCentavos)}`).join(' · ')
                    || 'Sem gastos nesses meses'}
              </span>
              <span className="valor ajmin-media-valor">{formatValorCurto(mediaCentavos)}</span>
            </div>
          </div>
        </section>
      )}

      <section className="ajmin-secao">
        <span className="kicker">Contas fixas</span>
        <div className="ajmin-card ajmin-card-lista">
          {fixos.map(({ item, indice }) => (
            <div key={item.id ?? `nova-${indice}`} className="ajmin-conta">
              <span className="ajmin-conta-icone"><IconeItemMinimo nome={item.nome} tipo="fixo" termo={item.termo} /></span>
              <button type="button" className="ajmin-conta-corpo" onClick={() => setEditando(indice)}>
                <span className="ajmin-conta-nome">{item.nome || 'Sem nome'}</span>
                <span className="ajmin-conta-termo">
                  {item.termo ? `reconhece “${termoLegivel(item.termo)}”` : 'sem termo: o gasto não é reconhecido'}
                </span>
              </button>
              <input
                className="ajmin-valor"
                inputMode="decimal"
                aria-label={`Valor de ${item.nome}`}
                defaultValue={textoValor(item.valorCentavos)}
                onChange={(e) => alterar(indice, { valorCentavos: parseCentavosInput(e.target.value) })}
              />
            </div>
          ))}
          <button type="button" className="ajmin-adicionar" onClick={() => setEditando('nova')}>
            <Plus size={16} strokeWidth={3} /> Adicionar conta
          </button>
        </div>
      </section>

      <section className="ajmin-secao">
        <span className="kicker">Alertas</span>
        <div className="ajmin-card">
          <div className="ajmin-linha">
            <span>
              <span style={{ display: 'block' }}>Margem de atenção</span>
              <span className="ajmin-conta-termo">sobra depois do mínimo</span>
            </span>
            <input
              className="ajmin-valor"
              inputMode="decimal"
              aria-label="Margem de atenção"
              value={margemTexto}
              onChange={(e) => setMargemTexto(e.target.value)}
            />
          </div>
          <div className="ajmin-nivel"><span className="ajmin-nivel-selo saude-tranquilo">Tranquilo</span><span>sobra acima de {formatCentavos(margemCentavos ?? 0)}</span></div>
          <div className="ajmin-nivel"><span className="ajmin-nivel-selo saude-atencao">Atenção</span><span>sobra entre R$ 0 e {formatCentavos(margemCentavos ?? 0)}</span></div>
          <div className="ajmin-nivel"><span className="ajmin-nivel-selo saude-alto">Gastos altos</span><span>sobra negativa: não cobre o mínimo</span></div>
        </div>
      </section>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      <div className="ajmin-rodape">
        <div className="ajmin-total">
          <span>Mínimo de {formatMesExtenso(mes)}</span>
          <span className="valor-destaque ajmin-total-valor">{formatCentavos(totalCentavos)}</span>
        </div>
        <Button variant="primary" block onClick={aoSalvar} disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>

      {editando !== null && (
        <ContaSheet
          inicial={editando === 'nova' ? null : rascunho[editando]}
          onClose={() => setEditando(null)}
          onConcluir={(dados) => {
            if (editando === 'nova') {
              setRascunho((atual) => [...atual, {
                id: null, tipo: 'fixo', categoriaId: null, mesesMedia: 3, posicao: atual.length, ...dados,
              }])
            } else {
              alterar(editando, dados)
            }
            setEditando(null)
          }}
          onRemover={editando === 'nova' ? undefined : () => { alterar(editando, { remover: true }); setEditando(null) }}
        />
      )}
    </div>
  )
}

function ContaSheet({ inicial, onClose, onConcluir, onRemover }: {
  inicial: ItemMinimoRascunho | null
  onClose: () => void
  onConcluir: (dados: Pick<ItemMinimoRascunho, 'nome' | 'valorCentavos' | 'termo'>) => void
  onRemover?: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [valorTexto, setValorTexto] = useState(textoValor(inicial?.valorCentavos ?? null))
  const [termoTexto, setTermoTexto] = useState(inicial?.termo ? termoLegivel(inicial.termo) : '')
  const [erro, setErro] = useState<string | null>(null)

  function concluir() {
    const valorCentavos = parseCentavosInput(valorTexto)
    if (!nome.trim()) return setErro('Dê um nome para a conta.')
    if (valorCentavos === null || valorCentavos < 0) return setErro('Informe o valor previsto.')
    onConcluir({ nome: nome.trim(), valorCentavos, termo: regexDoTermo(termoTexto) })
  }

  return (
    <BottomSheet
      title={inicial ? 'Editar conta fixa' : 'Nova conta fixa'}
      subtitle="Muda só o rascunho; grava ao tocar em Salvar."
      onClose={onClose}
    >
      <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Internet Claro" autoFocus /></Field>
      <Field label="Valor previsto"><Input inputMode="decimal" value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} placeholder="0,00" /></Field>
      <Field label="Reconhecer gastos com (separe por vírgula)">
        <Input value={termoTexto} onChange={(e) => setTermoTexto(e.target.value)} placeholder="Ex.: Claro" />
      </Field>
      <span className="text-muted" style={{ fontSize: 11.5 }}>
        O gasto do mês é o que tiver esse nome na descrição ou no estabelecimento da compra.
      </span>
      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}
      <div className="sheet-actions-lado">
        {onRemover && <Button variant="contorno" onClick={onRemover}>Remover</Button>}
        <Button variant="primary" onClick={concluir}>Concluir</Button>
      </div>
    </BottomSheet>
  )
}
