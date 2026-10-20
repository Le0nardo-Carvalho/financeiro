import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useGravacao, ConflitoVersaoError } from './shared'
import type { Entrada, TipoEntrada } from '../../types/database'
import type { ISODate } from '../calc/datas'

// Entradas (0008): só a tabela entradas. Nunca tocam lançamentos, faturas ou
// categorias — entrada não é gasto e não abate fatura (10, §1).

function normalizar(e: Entrada): Entrada {
  return { ...e, valor_centavos: Number(e.valor_centavos) }
}

// Entradas com data em [inicio, fim) — a tela 3f pede o mês anterior, o mês e
// o seguinte de uma vez (comparativo e previstas).
export function useEntradasDoPeriodo(inicio: ISODate, fim: ISODate) {
  return useQuery({
    queryKey: ['entradas', 'periodo', inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entradas')
        .select('*')
        .gte('data', inicio)
        .lt('data', fim)
        .order('data', { ascending: false })
        .order('criado_em', { ascending: false })
      if (error) throw error
      return (data as Entrada[]).map(normalizar)
    },
  })
}

export function useEntrada(id: string | undefined) {
  return useQuery({
    queryKey: ['entradas', 'uma', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('entradas').select('*').eq('id', id as string).single()
      if (error) throw error
      return normalizar(data as Entrada)
    },
  })
}

export interface DadosEntrada {
  descricao: string
  data: ISODate
  valorCentavos: number
  tipo: TipoEntrada
  conta: string | null
  recorrente: boolean
  diaPrevisto: number | null
  observacoes: string | null
}

function linhaEntrada(input: DadosEntrada) {
  return {
    descricao: input.descricao.trim(),
    data: input.data,
    valor_centavos: input.valorCentavos,
    tipo: input.tipo,
    conta: input.conta,
    recorrente: input.recorrente,
    dia_previsto: input.recorrente ? input.diaPrevisto : null,
    observacoes: input.observacoes?.trim() || null,
  }
}

function invalidarEntradas(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['entradas'] })
  // Saúde do mês e balancete usam as entradas (chaves sob 'dashboard').
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useCriarEntrada() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: DadosEntrada) =>
      executar(async () => {
        const { data, error } = await supabase.from('entradas').insert(linhaEntrada(input)).select().single()
        if (error) throw error
        return normalizar(data as Entrada)
      }),
    onSuccess: () => invalidarEntradas(queryClient),
  })
}

// Concorrência otimista: só grava se a versão no banco ainda for a lida.
export function useAtualizarEntrada() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: DadosEntrada & { id: string; versao: number }) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('entradas')
          .update({ ...linhaEntrada(input), versao: input.versao + 1, atualizado_em: new Date().toISOString() })
          .eq('id', input.id)
          .eq('versao', input.versao)
          .select()
          .maybeSingle()
        if (error) throw error
        if (!data) throw new ConflitoVersaoError()
        return normalizar(data as Entrada)
      }),
    onSuccess: () => invalidarEntradas(queryClient),
  })
}

export function useExcluirEntrada() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: { id: string; versao: number }) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('entradas')
          .delete()
          .eq('id', input.id)
          .eq('versao', input.versao)
          .select('id')
        if (error) throw error
        if (!data || data.length === 0) throw new ConflitoVersaoError()
      }),
    onSuccess: () => invalidarEntradas(queryClient),
  })
}
