import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useGravacao } from './shared'
import type {
  AjusteFatura, Fatura, FaturaResumo, LancamentoMensal, Compra, Categoria, MeioPagamentoFatura, PagamentoFatura,
} from '../../types/database'
import type { ISODate } from '../calc/datas'

export function useFaturasDoCartao(cartaoId: string | undefined) {
  return useQuery({
    queryKey: ['faturas', cartaoId],
    enabled: Boolean(cartaoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faturas')
        .select('*')
        .eq('cartao_id', cartaoId as string)
        .order('mes_referencia')
      if (error) throw error
      return data as Fatura[]
    },
  })
}

export interface ItemComposicaoFatura {
  lancamento: LancamentoMensal
  compra: Compra
  categoria: Categoria
}

// O TOTAL da fatura não sai daqui: vem de faturas_resumo.total_centavos,
// que soma lançamentos + ajustes (0006). Isto é só a composição das compras.
export interface FaturaComComposicao {
  fatura: Fatura
  itens: ItemComposicaoFatura[]
  ajustes: AjusteFatura[] // compõem o total da fatura, não são gasto
  parcelasAnterioresCentavos: number // numero_parcela > 1: compras de ciclos anteriores
  desteCicloCentavos: number // numero_parcela === 1: novas compras deste ciclo
}

export function useFatura(faturaId: string | undefined) {
  return useQuery({
    queryKey: ['fatura', faturaId],
    enabled: Boolean(faturaId),
    queryFn: async (): Promise<FaturaComComposicao> => {
      const [
        { data: fatura, error: erroFatura },
        { data: lancamentos, error: erroLanc },
        { data: ajustes, error: erroAjustes },
      ] = await Promise.all([
        supabase.from('faturas').select('*').eq('id', faturaId as string).single(),
        supabase
          .from('lancamentos_mensais')
          .select('*, compra:compras(*, categoria:categorias(*))')
          .eq('fatura_id', faturaId as string)
          .order('criado_em'),
        supabase.from('ajustes_fatura').select('*').eq('fatura_id', faturaId as string).order('criado_em'),
      ])
      if (erroFatura) throw erroFatura
      if (erroLanc) throw erroLanc
      if (erroAjustes) throw erroAjustes

      type Linha = LancamentoMensal & { compra: Compra & { categoria: Categoria } }
      const linhas = lancamentos as unknown as Linha[]

      const itens: ItemComposicaoFatura[] = linhas.map((l) => ({
        lancamento: l,
        compra: l.compra,
        categoria: l.compra.categoria,
      }))

      const parcelasAnterioresCentavos = itens
        .filter((i) => i.lancamento.numero_parcela > 1)
        .reduce((s, i) => s + i.lancamento.valor_centavos, 0)
      const desteCicloCentavos = itens
        .filter((i) => i.lancamento.numero_parcela === 1)
        .reduce((s, i) => s + i.lancamento.valor_centavos, 0)

      return {
        fatura: fatura as Fatura,
        itens,
        ajustes: (ajustes as AjusteFatura[]).map((a) => ({ ...a, valor_centavos: Number(a.valor_centavos) })),
        parcelasAnterioresCentavos,
        desteCicloCentavos,
      }
    },
  })
}

// sum() de bigint chega como numeric; o PostgREST pode devolvê-lo como texto.
function normalizarResumo<T extends FaturaResumo>(f: T): T {
  return {
    ...f,
    total_centavos: Number(f.total_centavos),
    pago_centavos: Number(f.pago_centavos),
    saldo_centavos: Number(f.saldo_centavos),
    gastos_centavos: Number(f.gastos_centavos),
    ajustes_centavos: Number(f.ajustes_centavos),
  }
}

export interface ResumoFatura {
  fatura: FaturaResumo
  totalCentavos: number
  quantidadeParcelas: number
}

// Situação (aberta/parcial/paga), total, pago e saldo vêm da view
// faturas_resumo — derivados no banco, nunca gravados pelo app (0004).
// Usado para a "fatura do mês selecionado" (via mes_referencia) e para a
// lista de "próximas faturas".
export function useResumoFaturasCartao(cartaoId: string | undefined) {
  return useQuery({
    queryKey: ['faturas-resumo', cartaoId],
    enabled: Boolean(cartaoId),
    queryFn: async (): Promise<ResumoFatura[]> => {
      const { data: faturas, error: erroFaturas } = await supabase
        .from('faturas_resumo')
        .select('*')
        .eq('cartao_id', cartaoId as string)
        .order('mes_referencia')
      if (erroFaturas) throw erroFaturas

      const resumos = (faturas as FaturaResumo[]).map(normalizarResumo)
      const ids = resumos.map((f) => f.id)
      if (ids.length === 0) return []

      // Só a contagem de parcelas; o total já vem da view.
      const { data: lancamentos, error: erroLanc } = await supabase
        .from('lancamentos_mensais')
        .select('fatura_id')
        .in('fatura_id', ids)
      if (erroLanc) throw erroLanc

      const quantidades = new Map<string, number>()
      for (const l of lancamentos as { fatura_id: string }[]) {
        quantidades.set(l.fatura_id, (quantidades.get(l.fatura_id) ?? 0) + 1)
      }

      return resumos.map((fatura) => ({
        fatura,
        totalCentavos: fatura.total_centavos,
        quantidadeParcelas: quantidades.get(fatura.id) ?? 0,
      }))
    },
  })
}

// Situação das faturas de um mês (todos os cartões) — cartão "Crédito" do
// Início. Sem embed de cartoes: a view não garante a relação no PostgREST;
// quem usa junta com useCartoes().
export function useFaturasResumoDoMes(mes: ISODate) {
  return useQuery({
    queryKey: ['faturas-resumo', 'mes', mes],
    queryFn: async () => {
      const { data, error } = await supabase.from('faturas_resumo').select('*').eq('mes_referencia', mes)
      if (error) throw error
      return (data as FaturaResumo[]).map(normalizarResumo)
    },
  })
}

// ------------------------------------------------- pagamentos da fatura ---
// Pagamento é como a dívida foi quitada, não gasto: estas funções só tocam
// pagamentos_fatura e NUNCA criam lançamento (06, CA31–CA34).

export function usePagamentosFatura(faturaId: string | undefined) {
  return useQuery({
    queryKey: ['pagamentos-fatura', faturaId],
    enabled: Boolean(faturaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamentos_fatura')
        .select('*')
        .eq('fatura_id', faturaId as string)
        .order('data')
        .order('criado_em')
      if (error) throw error
      return data as PagamentoFatura[]
    },
  })
}

export interface DadosPagamento {
  valorCentavos: number
  meio: MeioPagamentoFatura
  contaOrigem: string | null
  data: ISODate
  observacao: string | null
}

function invalidarPagamentos(queryClient: ReturnType<typeof useQueryClient>, faturaId: string) {
  queryClient.invalidateQueries({ queryKey: ['pagamentos-fatura'] })
  queryClient.invalidateQueries({ queryKey: ['faturas-resumo'] })
  queryClient.invalidateQueries({ queryKey: ['faturas'] })
  queryClient.invalidateQueries({ queryKey: ['fatura', faturaId] })
  queryClient.invalidateQueries({ queryKey: ['saidas-por-conta'] })
  // A situação "paga" aparece no Início e na lista de lançamentos.
  queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
}

function linhaPagamento(input: DadosPagamento) {
  return {
    valor_centavos: input.valorCentavos,
    meio: input.meio,
    conta_origem: input.contaOrigem?.trim() || null,
    data: input.data,
    observacao: input.observacao?.trim() || null,
  }
}

export function useRegistrarPagamento() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: DadosPagamento & { faturaId: string }) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('pagamentos_fatura')
          .insert({ fatura_id: input.faturaId, ...linhaPagamento(input) })
          .select()
          .single()
        if (error) throw error
        return data as PagamentoFatura
      }),
    onSuccess: (pagamento) => invalidarPagamentos(queryClient, pagamento.fatura_id),
  })
}

export function useEditarPagamento() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: DadosPagamento & { id: string }) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('pagamentos_fatura')
          .update({ ...linhaPagamento(input), atualizado_em: new Date().toISOString() })
          .eq('id', input.id)
          .select()
          .single()
        if (error) throw error
        return data as PagamentoFatura
      }),
    onSuccess: (pagamento) => invalidarPagamentos(queryClient, pagamento.fatura_id),
  })
}

export function useExcluirPagamento() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (pagamento: Pick<PagamentoFatura, 'id' | 'fatura_id'>) =>
      executar(async () => {
        const { error } = await supabase.from('pagamentos_fatura').delete().eq('id', pagamento.id)
        if (error) throw error
      }),
    onSuccess: (_, pagamento) => invalidarPagamentos(queryClient, pagamento.fatura_id),
  })
}

// Pagamentos de várias faturas de uma vez — só para descrever "como foi
// paga" (ex.: "Pix + boleto") na linha da fatura do Início. Nunca somado a
// gastos.
export function usePagamentosDasFaturas(faturaIds: string[]) {
  return useQuery({
    queryKey: ['pagamentos-fatura', 'varias', faturaIds],
    enabled: faturaIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamentos_fatura')
        .select('*')
        .in('fatura_id', faturaIds)
        .order('data')
      if (error) throw error
      return data as PagamentoFatura[]
    },
  })
}

// Situação de faturas específicas (ex.: as das parcelas de uma compra que
// será desfeita — tela 1q avisa se alguma já tem pagamento).
export function useFaturasResumoPorIds(faturaIds: string[]) {
  return useQuery({
    queryKey: ['faturas-resumo', 'ids', faturaIds],
    enabled: faturaIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('faturas_resumo').select('*').in('id', faturaIds)
      if (error) throw error
      return (data as FaturaResumo[]).map(normalizarResumo)
    },
  })
}
