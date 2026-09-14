import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useGravacao, ConflitoVersaoError, mensagemDeErro } from './shared'
import type { Categoria } from '../../types/database'

function normalizarNome(nome: string) {
  return nome.trim().toLowerCase()
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('*').order('nome')
      if (error) throw error
      return data as Categoria[]
    },
  })
}

export function useCriarCategoria() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: async (input: { nome: string; cor: string; descricao?: string | null }) =>
      executar(async () => {
        const nomeLimpo = input.nome.trim()
        if (!nomeLimpo) throw new Error('O nome da categoria é obrigatório.')

        const { data: existentes, error: erroConsulta } = await supabase
          .from('categorias')
          .select('*')
        if (erroConsulta) throw erroConsulta

        const equivalente = (existentes as Categoria[]).find(
          (c) => normalizarNome(c.nome) === normalizarNome(nomeLimpo),
        )

        if (equivalente && !equivalente.arquivada) {
          throw new Error(`Já existe uma categoria "${equivalente.nome}".`)
        }

        if (equivalente && equivalente.arquivada) {
          // Oferece reativação em vez de bloquear com erro (03-regras-de-calculo.md, §6).
          const { data, error } = await supabase
            .from('categorias')
            .update({ arquivada: false, versao: equivalente.versao + 1 })
            .eq('id', equivalente.id)
            .eq('versao', equivalente.versao)
            .select()
            .single()
          if (error) throw error
          if (!data) throw new ConflitoVersaoError()
          return { categoria: data as Categoria, reativada: true }
        }

        const { data, error } = await supabase
          .from('categorias')
          .insert({ nome: nomeLimpo, cor: input.cor, descricao: input.descricao ?? null })
          .select()
          .single()
        if (error) throw error
        return { categoria: data as Categoria, reativada: false }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}

export function useAtualizarCategoria() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: async (input: { id: string; versao: number; nome: string; cor: string; descricao?: string | null }) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('categorias')
          .update({ nome: input.nome.trim(), cor: input.cor, descricao: input.descricao ?? null, versao: input.versao + 1 })
          .eq('id', input.id)
          .eq('versao', input.versao)
          .select()
          .single()
        if (error) throw error
        if (!data) throw new ConflitoVersaoError()
        return data as Categoria
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useArquivarCategoria() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: async (input: { id: string; versao: number; arquivar: boolean }) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('categorias')
          .update({ arquivada: input.arquivar, versao: input.versao + 1 })
          .eq('id', input.id)
          .eq('versao', input.versao)
          .select()
          .single()
        if (error) throw error
        if (!data) throw new ConflitoVersaoError()
        return data as Categoria
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}

export function useExcluirCategoria() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()

  return useMutation({
    mutationFn: async (id: string) =>
      executar(async () => {
        const { count, error: erroContagem } = await supabase
          .from('lancamentos_mensais')
          .select('id', { count: 'exact', head: true })
          .eq('categoria_id', id)
        if (erroContagem) throw erroContagem
        if ((count ?? 0) > 0) {
          throw new Error('Esta categoria tem lançamentos vinculados. Arquive em vez de excluir para preservar o histórico.')
        }

        const { error } = await supabase.from('categorias').delete().eq('id', id)
        if (error) throw error
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}

export { mensagemDeErro }
