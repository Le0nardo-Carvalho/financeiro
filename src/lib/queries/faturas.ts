import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useGravacao } from './shared'
import type { Fatura, LancamentoMensal, Compra, Categoria } from '../../types/database'
import { hojeISO } from '../calc/datas'

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

export interface FaturaComComposicao {
  fatura: Fatura
  itens: ItemComposicaoFatura[]
  totalCentavos: number
  parcelasAnterioresCentavos: number // numero_parcela > 1: compras de ciclos anteriores
  desteCicloCentavos: number // numero_parcela === 1: novas compras deste ciclo
}

export function useFatura(faturaId: string | undefined) {
  return useQuery({
    queryKey: ['fatura', faturaId],
    enabled: Boolean(faturaId),
    queryFn: async (): Promise<FaturaComComposicao> => {
      const [{ data: fatura, error: erroFatura }, { data: lancamentos, error: erroLanc }] = await Promise.all([
        supabase.from('faturas').select('*').eq('id', faturaId as string).single(),
        supabase
          .from('lancamentos_mensais')
          .select('*, compra:compras(*, categoria:categorias(*))')
          .eq('fatura_id', faturaId as string)
          .order('criado_em'),
      ])
      if (erroFatura) throw erroFatura
      if (erroLanc) throw erroLanc

      type Linha = LancamentoMensal & { compra: Compra & { categoria: Categoria } }
      const linhas = lancamentos as unknown as Linha[]

      const itens: ItemComposicaoFatura[] = linhas.map((l) => ({
        lancamento: l,
        compra: l.compra,
        categoria: l.compra.categoria,
      }))

      const totalCentavos = itens.reduce((s, i) => s + i.lancamento.valor_centavos, 0)
      const parcelasAnterioresCentavos = itens
        .filter((i) => i.lancamento.numero_parcela > 1)
        .reduce((s, i) => s + i.lancamento.valor_centavos, 0)
      const desteCicloCentavos = totalCentavos - parcelasAnterioresCentavos

      return { fatura: fatura as Fatura, itens, totalCentavos, parcelasAnterioresCentavos, desteCicloCentavos }
    },
  })
}

export interface ResumoFatura {
  fatura: Fatura
  totalCentavos: number
  quantidadeParcelas: number
}

// Usado tanto para "fatura do mês selecionado" (via mes_referencia) quanto
// para a lista de "próximas faturas" — uma consulta por tela, agregada aqui.
export function useResumoFaturasCartao(cartaoId: string | undefined) {
  return useQuery({
    queryKey: ['faturas-resumo', cartaoId],
    enabled: Boolean(cartaoId),
    queryFn: async (): Promise<ResumoFatura[]> => {
      const { data: faturas, error: erroFaturas } = await supabase
        .from('faturas')
        .select('*')
        .eq('cartao_id', cartaoId as string)
        .order('mes_referencia')
      if (erroFaturas) throw erroFaturas

      const ids = (faturas as Fatura[]).map((f) => f.id)
      if (ids.length === 0) return []

      const { data: lancamentos, error: erroLanc } = await supabase
        .from('lancamentos_mensais')
        .select('fatura_id, valor_centavos')
        .in('fatura_id', ids)
      if (erroLanc) throw erroLanc

      const totais = new Map<string, { total: number; qtd: number }>()
      for (const l of lancamentos as { fatura_id: string; valor_centavos: number }[]) {
        const atual = totais.get(l.fatura_id) ?? { total: 0, qtd: 0 }
        atual.total += l.valor_centavos
        atual.qtd += 1
        totais.set(l.fatura_id, atual)
      }

      return (faturas as Fatura[]).map((fatura) => ({
        fatura,
        totalCentavos: totais.get(fatura.id)?.total ?? 0,
        quantidadeParcelas: totais.get(fatura.id)?.qtd ?? 0,
      }))
    },
  })
}

export function useMarcarFaturaPaga() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: (faturaId: string) =>
      executar(async () => {
        // Marcar como paga NUNCA cria lançamento — só atualiza a fatura (§7, CA15).
        const { data, error } = await supabase
          .from('faturas')
          .update({ paga: true, paga_em: hojeISO() })
          .eq('id', faturaId)
          .select()
          .single()
        if (error) throw error
        return data as Fatura
      }),
    onSuccess: (fatura) => {
      queryClient.invalidateQueries({ queryKey: ['faturas', fatura.cartao_id] })
      queryClient.invalidateQueries({ queryKey: ['faturas-resumo', fatura.cartao_id] })
      queryClient.invalidateQueries({ queryKey: ['fatura', fatura.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
