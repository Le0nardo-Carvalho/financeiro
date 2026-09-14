import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useGravacao, ConflitoVersaoError } from './shared'
import type { Cartao, Compra, Fatura, FormaPagamento, LancamentoMensal } from '../../types/database'
import type { ISODate } from '../calc/datas'

export interface LancamentoDetalhado extends LancamentoMensal {
  compra: Compra
  fatura: (Fatura & { cartao: Cartao }) | null
}

// Uma consulta por tela: todos os lançamentos do mês selecionado, já com a
// compra de origem e a fatura (quando crédito) — dá para montar dashboard,
// lista de lançamentos e resumo de fatura sem consultas extras.
export function useLancamentosDoMes(mes: ISODate) {
  return useQuery({
    queryKey: ['lancamentos', mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos_mensais')
        .select('*, compra:compras(*), fatura:faturas(*, cartao:cartoes(*))')
        .eq('mes_competencia', mes)
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data as unknown as LancamentoDetalhado[]
    },
  })
}

export function useLancamentosDaCategoria(categoriaId: string | undefined) {
  return useQuery({
    queryKey: ['lancamentos', 'categoria', categoriaId],
    enabled: Boolean(categoriaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos_mensais')
        .select('*, compra:compras(*)')
        .eq('categoria_id', categoriaId as string)
        .order('mes_competencia', { ascending: true })
      if (error) throw error
      return data as unknown as LancamentoDetalhado[]
    },
  })
}

export function useCompra(compraId: string | undefined) {
  return useQuery({
    queryKey: ['compra', compraId],
    enabled: Boolean(compraId),
    queryFn: async () => {
      const [{ data: compra, error: erroCompra }, { data: parcelas, error: erroParcelas }] = await Promise.all([
        supabase.from('compras').select('*').eq('id', compraId as string).single(),
        supabase
          .from('lancamentos_mensais')
          .select('*')
          .eq('compra_id', compraId as string)
          .order('numero_parcela'),
      ])
      if (erroCompra) throw erroCompra
      if (erroParcelas) throw erroParcelas
      return { compra: compra as Compra, parcelas: parcelas as LancamentoMensal[] }
    },
  })
}

export interface DadosCompra {
  descricao: string
  dataCompra: ISODate
  valorTotalCentavos: number
  categoriaId: string
  formaPagamento: FormaPagamento
  cartaoId?: string | null
  parcelas?: number
  primeiraFaturaId?: string | null
  estabelecimento?: string | null
  observacoes?: string | null
}

function invalidarAgregacoes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['faturas'] })
  queryClient.invalidateQueries({ queryKey: ['faturas-resumo'] })
  queryClient.invalidateQueries({ queryKey: ['fatura'] })
  queryClient.invalidateQueries({ queryKey: ['compra'] })
}

export function useCriarCompra() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: (input: DadosCompra) =>
      executar(async () => {
        const { data, error } = await supabase.rpc('criar_compra', {
          p_descricao: input.descricao.trim(),
          p_data_compra: input.dataCompra,
          p_valor_total_centavos: input.valorTotalCentavos,
          p_categoria_id: input.categoriaId,
          p_forma: input.formaPagamento,
          p_cartao_id: input.cartaoId ?? null,
          p_parcelas: input.parcelas ?? 1,
          p_primeira_fatura_id: input.primeiraFaturaId ?? null,
          p_origem: 'manual',
          p_estabelecimento: input.estabelecimento ?? null,
          p_observacoes: input.observacoes ?? null,
        })
        if (error) throw error
        return data as string
      }),
    onSuccess: () => invalidarAgregacoes(queryClient),
  })
}

export function useCorrigirCompra() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: (input: DadosCompra & { compraId: string; versaoLida: number }) =>
      executar(async () => {
        const { data, error } = await supabase.rpc('corrigir_compra', {
          p_compra_id: input.compraId,
          p_descricao: input.descricao.trim(),
          p_data_compra: input.dataCompra,
          p_valor_total_centavos: input.valorTotalCentavos,
          p_forma: input.formaPagamento,
          p_cartao_id: input.cartaoId ?? null,
          p_parcelas: input.parcelas ?? 1,
          p_primeira_fatura_id: input.primeiraFaturaId ?? null,
          p_estabelecimento: input.estabelecimento ?? null,
          p_observacoes: input.observacoes ?? null,
          p_versao_lida: input.versaoLida,
        })
        if (error) {
          if (error.code === '40001') throw new ConflitoVersaoError()
          throw error
        }
        return data as string
      }),
    onSuccess: () => invalidarAgregacoes(queryClient),
  })
}

export function useReclassificarCompra() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: (input: { compraId: string; categoriaId: string }) =>
      executar(async () => {
        const { error } = await supabase.rpc('reclassificar_compra', {
          p_compra_id: input.compraId,
          p_categoria_id: input.categoriaId,
        })
        if (error) throw error
      }),
    onSuccess: () => invalidarAgregacoes(queryClient),
  })
}

export function useExcluirCompra() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: (compraId: string) =>
      executar(async () => {
        const { error } = await supabase.from('compras').delete().eq('id', compraId)
        if (error) throw error
      }),
    onSuccess: () => invalidarAgregacoes(queryClient),
  })
}
