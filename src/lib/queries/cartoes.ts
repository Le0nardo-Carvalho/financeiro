import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useGravacao, ConflitoVersaoError } from './shared'
import type { Cartao } from '../../types/database'

export function useCartoes() {
  return useQuery({
    queryKey: ['cartoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cartoes').select('*').order('apelido')
      if (error) throw error
      return data as Cartao[]
    },
  })
}

export interface DadosCartao {
  apelido: string
  diaFechamento: number
  diaVencimento: number
  cor: string
}

export function useCriarCartao() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: (input: DadosCartao) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('cartoes')
          .insert({
            apelido: input.apelido.trim(),
            dia_fechamento: input.diaFechamento,
            dia_vencimento: input.diaVencimento,
            cor: input.cor,
          })
          .select()
          .single()
        if (error) throw error
        return data as Cartao
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cartoes'] }),
  })
}

export function useAtualizarCartao() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: (input: DadosCartao & { id: string; versao: number }) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('cartoes')
          .update({
            apelido: input.apelido.trim(),
            dia_fechamento: input.diaFechamento,
            dia_vencimento: input.diaVencimento,
            cor: input.cor,
            versao: input.versao + 1,
          })
          .eq('id', input.id)
          .eq('versao', input.versao)
          .select()
          .single()
        if (error) throw error
        if (!data) throw new ConflitoVersaoError()
        return data as Cartao
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cartoes'] }),
  })
}

export function useArquivarCartao() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: (input: { id: string; versao: number; arquivar: boolean }) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('cartoes')
          .update({ arquivado: input.arquivar, versao: input.versao + 1 })
          .eq('id', input.id)
          .eq('versao', input.versao)
          .select()
          .single()
        if (error) throw error
        if (!data) throw new ConflitoVersaoError()
        return data as Cartao
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cartoes'] }),
  })
}
