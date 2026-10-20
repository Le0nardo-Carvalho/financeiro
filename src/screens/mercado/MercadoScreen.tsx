import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check, Plus, ShoppingCart, X } from 'lucide-react'
import { useCriarListaMercado, useListasMercado, useReabrirLista, type ListaMercadoResumo } from '../../lib/queries/mercado'
import { mensagemDeErro } from '../../lib/queries/shared'
import { totalConfirmadoCentavos } from '../../lib/calc/mercado'
import { formatDataCurta } from '../../lib/calc/datas'
import { formatValorCurto, ROTULO_FORMA, ROTULO_MOTIVO } from '../../lib/rotulos'
import { Button, EmptyState, Field, Input, BottomSheet } from '../../components/ui'
import { rotas } from '../../router/rotas'
import { CancelarCompraSheet } from './CancelarCompraSheet'
import './MercadoScreen.css'

function totalMarcado(lista: ListaMercadoResumo): number {
  return totalConfirmadoCentavos(
    lista.itens.map((i) => ({ quantidade: i.quantidade, precoUnitarioCentavos: i.preco_unitario_centavos, confirmado: i.confirmado })),
  )
}

// Data ISO de um timestamptz, no fuso do aparelho.
function dataDe(timestamp: string | null): string | null {
  if (!timestamp) return null
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Listas de mercado (tela 1m): "Em andamento" (abertas) e "Histórico"
// (finalizadas e canceladas, mais recentes primeiro).
export function MercadoScreen() {
  const listasQuery = useListasMercado()
  const criar = useCriarListaMercado()
  const reabrir = useReabrirLista()
  const navigate = useNavigate()
  // "Lista de mercado" no "+" (3d) chega aqui já com a folha de nova lista aberta.
  const location = useLocation()
  const [criando, setCriando] = useState(() => Boolean((location.state as { novaLista?: boolean } | null)?.novaLista))
  const [nome, setNome] = useState('')
  const [cancelando, setCancelando] = useState<ListaMercadoResumo | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const listas = listasQuery.data ?? []
  const abertas = listas.filter((l) => l.situacao === 'aberta')
  const historico = listas
    .filter((l) => l.situacao !== 'aberta')
    .sort((a, b) => ((a.finalizada_em ?? a.cancelada_em ?? a.atualizado_em) < (b.finalizada_em ?? b.cancelada_em ?? b.atualizado_em) ? 1 : -1))

  async function aoCriar() {
    setErro(null)
    try {
      const lista = await criar.mutateAsync(nome)
      setCriando(false)
      setNome('')
      navigate(rotas.listaMercado(lista.id))
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function aoReabrir(listaId: string) {
    setErro(null)
    try {
      await reabrir.mutateAsync(listaId)
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="mercado-tela">
      <div className="lanc-header">
        <span className="lanc-titulo">Mercado</span>
        {listas.length > 0 && (
          <Button variant="primary" className="mercado-nova" onClick={() => setCriando(true)}>
            <Plus size={15} strokeWidth={3} /> Nova lista
          </Button>
        )}
      </div>

      {erro && !criando && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      {listasQuery.isLoading ? (
        <p className="text-muted">Carregando…</p>
      ) : listas.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={30} strokeWidth={2.75} color="var(--color-accent-600)" />}
          title="Nenhuma lista aberta"
          description="Monte a lista antes de ir ao mercado e preencha os preços no corredor. Ao finalizar, ela vira um gasto só."
          action={<Button variant="primary" onClick={() => setCriando(true)}><Plus size={16} strokeWidth={3} /> Criar lista</Button>}
        />
      ) : (
        <>
          {abertas.length > 0 && (
            <>
              <span className="kicker">Em andamento</span>
              {abertas.map((l) => {
                const confirmados = l.itens.filter((i) => i.confirmado).length
                return (
                  <div key={l.id} className="mercado-andamento">
                    <div className="mercado-andamento-topo">
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="mercado-andamento-nome">{l.nome}</span>
                        <span className="mercado-andamento-meta">
                          {l.itens.length} {l.itens.length === 1 ? 'item' : 'itens'} · {confirmados} {confirmados === 1 ? 'confirmado' : 'confirmados'}
                        </span>
                      </span>
                      <span className="valor mercado-andamento-valor">{formatValorCurto(totalMarcado(l))}</span>
                    </div>
                    <div className="mercado-andamento-acoes">
                      <button type="button" className="mercado-acao mercado-acao-principal" onClick={() => navigate(rotas.listaMercado(l.id))}>Continuar</button>
                      <button type="button" className="mercado-acao" onClick={() => setCancelando(l)}>Cancelar compra</button>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {historico.length > 0 && (
            <>
              <div className="mercado-historico-titulo"><span className="kicker">Histórico</span><span className="mercado-historico-linha" /></div>
              <div className="mercado-historico">
                {historico.map((l) => l.situacao === 'finalizada' ? (
                  <button key={l.id} type="button" className="mercado-item" onClick={() => navigate(rotas.listaMercado(l.id))}>
                    <span className="mercado-item-icone mercado-item-icone-finalizada"><Check size={16} strokeWidth={3} /></span>
                    <span className="mercado-item-corpo">
                      <span className="mercado-item-nome">{l.nome}</span>
                      <span className="mercado-item-meta">
                        Finalizada {formatDataCurta(l.compra?.data_compra ?? dataDe(l.finalizada_em) ?? '')}
                        {l.compra && ` · virou gasto no ${ROTULO_FORMA[l.compra.forma_pagamento]}`}
                      </span>
                    </span>
                    {l.compra && <span className="valor mercado-item-valor">{formatValorCurto(l.compra.valor_total_centavos)}</span>}
                  </button>
                ) : (
                  <div key={l.id} className="mercado-item mercado-item-cancelada">
                    <button type="button" className="mercado-item-abrir" onClick={() => navigate(rotas.listaMercado(l.id))}>
                      <span className="mercado-item-icone"><X size={16} strokeWidth={3} /></span>
                      <span className="mercado-item-corpo">
                        <span className="mercado-item-nome">{l.nome}</span>
                        <span className="mercado-item-meta">
                          Cancelada{l.cancelada_em ? ` ${formatDataCurta(dataDe(l.cancelada_em) as string)}` : ''}
                          {l.motivo_cancelamento && ` · ${ROTULO_MOTIVO[l.motivo_cancelamento].toLowerCase()}`}
                        </span>
                      </span>
                    </button>
                    <button type="button" className="mercado-reabrir" onClick={() => aoReabrir(l.id)} disabled={reabrir.isPending}>
                      Reabrir
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="mercado-nota">
            Listas canceladas nunca entram nos gastos. Para desfazer uma finalizada, abra-a e use “Desfazer compra”.
          </p>
        </>
      )}

      {criando && (
        <BottomSheet title="Nova lista de mercado" onClose={() => setCriando(false)}>
          <Field label="Nome da lista">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Feira da semana" autoFocus />
          </Field>
          {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}
          <div className="sheet-actions-lado">
            <Button variant="contorno" onClick={() => setCriando(false)}>Voltar</Button>
            <Button variant="primary" onClick={aoCriar} disabled={criar.isPending}>{criar.isPending ? 'Salvando…' : 'Criar lista'}</Button>
          </div>
        </BottomSheet>
      )}

      {cancelando && (
        <CancelarCompraSheet
          listaId={cancelando.id}
          nome={cancelando.nome}
          quantidadeItens={cancelando.itens.length}
          totalMarcadoCentavos={totalMarcado(cancelando)}
          onClose={() => setCancelando(null)}
          onCancelada={() => setCancelando(null)}
        />
      )}
    </div>
  )
}
