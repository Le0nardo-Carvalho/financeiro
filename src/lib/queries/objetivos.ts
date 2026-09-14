import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useGravacao, ConflitoVersaoError } from './shared'
import type { MovimentoObjetivo, Objetivo, TipoMovimento } from '../../types/database'
import type { ISODate } from '../calc/datas'
import { acumuladoCentavos, retiradaValida } from '../calc/objetivos'

export function useObjetivos() {
  return useQuery({
    queryKey: ['objetivos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('objetivos').select('*').order('criado_em')
      if (error) throw error
      return data as Objetivo[]
    },
  })
}

export function useObjetivo(objetivoId: string | undefined) {
  return useQuery({
    queryKey: ['objetivo', objetivoId],
    enabled: Boolean(objetivoId),
    queryFn: async () => {
      const [{ data: objetivo, error: erroObjetivo }, { data: movimentos, error: erroMov }] = await Promise.all([
        supabase.from('objetivos').select('*').eq('id', objetivoId as string).single(),
        supabase
          .from('movimentos_objetivo')
          .select('*')
          .eq('objetivo_id', objetivoId as string)
          .order('data', { ascending: false }),
      ])
      if (erroObjetivo) throw erroObjetivo
      if (erroMov) throw erroMov
      return { objetivo: objetivo as Objetivo, movimentos: movimentos as MovimentoObjetivo[] }
    },
  })
}

export interface DadosObjetivo {
  nome: string
  metaCentavos: number
  prazo?: ISODate | null
  descricao?: string | null
  valorInicialCentavos?: number
}

export function useCriarObjetivo() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: DadosObjetivo) =>
      executar(async () => {
        const { data: objetivo, error } = await supabase
          .from('objetivos')
          .insert({
            nome: input.nome.trim(),
            meta_centavos: input.metaCentavos,
            prazo: input.prazo ?? null,
            descricao: input.descricao ?? null,
          })
          .select()
          .single()
        if (error) throw error

        // Valor inicial guardado vira a primeira movimentação (§11).
        if (input.valorInicialCentavos && input.valorInicialCentavos > 0) {
          const { error: erroMov } = await supabase.from('movimentos_objetivo').insert({
            objetivo_id: (objetivo as Objetivo).id,
            valor_centavos: input.valorInicialCentavos,
            tipo: 'aporte' as TipoMovimento,
          })
          if (erroMov) throw erroMov
        }

        return objetivo as Objetivo
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['objetivos'] }),
  })
}

export function useAtualizarObjetivo() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: DadosObjetivo & { id: string; versao: number }) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('objetivos')
          .update({
            nome: input.nome.trim(),
            meta_centavos: input.metaCentavos,
            prazo: input.prazo ?? null,
            descricao: input.descricao ?? null,
            versao: input.versao + 1,
          })
          .eq('id', input.id)
          .eq('versao', input.versao)
          .select()
          .single()
        if (error) throw error
        if (!data) throw new ConflitoVersaoError()
        return data as Objetivo
      }),
    onSuccess: (objetivo) => {
      queryClient.invalidateQueries({ queryKey: ['objetivos'] })
      queryClient.invalidateQueries({ queryKey: ['objetivo', objetivo.id] })
    },
  })
}

export function useRegistrarMovimento(objetivoId: string) {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: { valorCentavos: number; tipo: TipoMovimento; data: ISODate; movimentosAtuais: MovimentoObjetivo[] }) =>
      executar(async () => {
        if (input.tipo === 'retirada') {
          const acumulado = acumuladoCentavos(
            input.movimentosAtuais.map((m) => ({ valorCentavos: m.valor_centavos, tipo: m.tipo })),
          )
          if (!retiradaValida(acumulado, input.valorCentavos)) {
            throw new Error('A retirada não pode superar o valor acumulado neste objetivo.')
          }
        }

        const { data, error } = await supabase
          .from('movimentos_objetivo')
          .insert({ objetivo_id: objetivoId, valor_centavos: input.valorCentavos, tipo: input.tipo, data: input.data })
          .select()
          .single()
        if (error) throw error
        return data as MovimentoObjetivo
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objetivo', objetivoId] })
      queryClient.invalidateQueries({ queryKey: ['objetivos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
