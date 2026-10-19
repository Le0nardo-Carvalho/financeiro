import { useState } from 'react'
import { AlertTriangle, ArrowRight, ListChecks } from 'lucide-react'
import { useCompra, useLancamentosDoMes } from '../../lib/queries/lancamentos'
import { useCategorias } from '../../lib/queries/categorias'
import { useFaturasResumoPorIds } from '../../lib/queries/faturas'
import { useDesfazerFinalizacao } from '../../lib/queries/mercado'
import { mensagemDeErro } from '../../lib/queries/shared'
import { totalDoMesSemCompra } from '../../lib/calc/pagamentos'
import { formatCentavos } from '../../lib/money'
import { formatDataCurta, formatMesExtenso } from '../../lib/calc/datas'
import { formatValorCurto, ROTULO_FORMA } from '../../lib/rotulos'
import { BottomSheet, Button } from '../../components/ui'

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

interface Props {
  listaId: string
  compraId: string
  onClose: () => void
  onDesfeita: () => void
}

// Desfazer compra (tela 1q): remove a compra gerada pela lista e todas as
// parcelas, numa transação só (desfazer_finalizacao, CA29/CA30). A folha
// mostra antes o gasto removido e o efeito no mês.
export function DesfazerCompraSheet({ listaId, compraId, onClose, onDesfeita }: Props) {
  const desfazer = useDesfazerFinalizacao()
  const compraQuery = useCompra(compraId)
  const categoriasQuery = useCategorias()
  const [destino, setDestino] = useState<'aberta' | 'cancelada'>('aberta')
  const [erro, setErro] = useState<string | null>(null)

  const compra = compraQuery.data?.compra
  const parcelas = compraQuery.data?.parcelas ?? []
  const primeiroMes = parcelas[0]?.mes_competencia ?? ''
  const mesQuery = useLancamentosDoMes(primeiroMes)
  const faturaIds = [...new Set(parcelas.map((p) => p.fatura_id).filter((id): id is string => Boolean(id)))]
  const faturasQuery = useFaturasResumoPorIds(faturaIds)
  const faturasComPagamento = (faturasQuery.data ?? []).filter((f) => f.pago_centavos > 0)

  const doMes = (mesQuery.data ?? []).map((l) => ({ compraId: l.compra_id, valorCentavos: l.valor_centavos }))
  const totalAntes = doMes.reduce((s, l) => s + l.valorCentavos, 0)
  const totalDepois = totalDoMesSemCompra(doMes, compraId)
  const categoria = categoriasQuery.data?.find((c) => c.id === compra?.categoria_id)

  async function aoDesfazer() {
    setErro(null)
    try {
      await desfazer.mutateAsync({ listaId, destino })
      onDesfeita()
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <BottomSheet title="Desfazer esta compra?" subtitle="Ela já virou um gasto" onClose={onClose}>
      {compra && (
        <div className="desfazer-compra">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="atalho-titulo">{compra.descricao}</span>
            <span className="atalho-desc">
              {formatDataCurta(compra.data_compra)} · {ROTULO_FORMA[compra.forma_pagamento]}
              {compra.parcelas > 1 ? ` ${compra.parcelas}x` : ''}{categoria ? ` · ${categoria.nome}` : ''}
            </span>
          </span>
          <span className="valor desfazer-compra-valor">{formatValorCurto(compra.valor_total_centavos)}</span>
        </div>
      )}

      <div className="desfazer-efeitos">
        {primeiroMes && mesQuery.data && (
          <span>
            <ArrowRight size={15} strokeWidth={2.75} color="var(--color-accent-600)" />
            <span>
              {capitalizar(formatMesExtenso(primeiroMes))} passa de {formatCentavos(totalAntes)} para {formatCentavos(totalDepois)}
              {parcelas.length > 1 && ` — e as outras ${parcelas.length - 1} parcelas saem dos meses delas`}
            </span>
          </span>
        )}
        <span>
          <ListChecks size={15} strokeWidth={2.75} color="var(--color-accent-2-600)" />
          <span>Itens e preços continuam guardados na lista</span>
        </span>
      </div>

      <div>
        <span className="pag-rotulo">E a lista?</span>
        <div className="seg" role="radiogroup" style={{ display: 'flex' }}>
          {(['aberta', 'cancelada'] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={destino === d}
              className={`seg-opt ${destino === d ? 'seg-opt-ativo' : ''}`}
              style={{ border: 'none' }}
              onClick={() => setDestino(d)}
            >
              {d === 'aberta' ? 'Reabrir para editar' : 'Marcar cancelada'}
            </button>
          ))}
        </div>
      </div>

      {faturasComPagamento.length > 0 && (
        <div className="aviso-coral">
          <AlertTriangle size={16} strokeWidth={2.75} style={{ flex: 'none', marginTop: 1 }} />
          <span>
            {faturasComPagamento.length === 1
              ? `A fatura de ${formatMesExtenso(faturasComPagamento[0].mes_referencia)} já tem pagamento registrado.`
              : 'Algumas faturas destas parcelas já têm pagamento registrado.'}{' '}
            Ao desfazer, ela fica marcada como <strong>corrigida</strong> — confira o valor pago depois.
          </span>
        </div>
      )}

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      <div className="sheet-actions-lado">
        <Button variant="contorno" onClick={onClose}>Voltar</Button>
        <Button variant="perigo" onClick={aoDesfazer} disabled={desfazer.isPending || !compra}>
          {desfazer.isPending ? 'Salvando…' : 'Desfazer e remover gasto'}
        </Button>
      </div>
    </BottomSheet>
  )
}
