import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useGravacao } from './shared'
import type { FormaPagamento, ItemLista, ListaMercado } from '../../types/database'
import type { ISODate } from '../calc/datas'

export function useListasMercado() {
  return useQuery({
    queryKey: ['listas-mercado'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listas_mercado')
        .select('*')
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data as ListaMercado[]
    },
  })
}

export function useListaMercado(listaId: string | undefined) {
  return useQuery({
    queryKey: ['lista-mercado', listaId],
    enabled: Boolean(listaId),
    queryFn: async () => {
      const [{ data: lista, error: erroLista }, { data: itens, error: erroItens }] = await Promise.all([
        supabase.from('listas_mercado').select('*').eq('id', listaId as string).single(),
        supabase.from('itens_lista').select('*').eq('lista_id', listaId as string).order('posicao'),
      ])
      if (erroLista) throw erroLista
      if (erroItens) throw erroItens
      return { lista: lista as ListaMercado, itens: itens as ItemLista[] }
    },
  })
}

export function useCriarListaMercado() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (nome: string) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('listas_mercado')
          .insert({ nome: nome.trim() || 'Lista de mercado' })
          .select()
          .single()
        if (error) throw error
        return data as ListaMercado
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listas-mercado'] }),
  })
}

export interface DadosItemLista {
  produto: string
  marca?: string | null
  quantidade: number
  unidade: string
  precoUnitarioCentavos: number | null
}

export function useAdicionarItem(listaId: string) {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: DadosItemLista) =>
      executar(async () => {
        const { data, error } = await supabase
          .from('itens_lista')
          .insert({
            lista_id: listaId,
            produto: input.produto.trim(),
            marca: input.marca?.trim() || null,
            quantidade: input.quantidade,
            unidade: input.unidade,
            preco_unitario_centavos: input.precoUnitarioCentavos,
          })
          .select()
          .single()
        if (error) throw error
        return data as ItemLista
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lista-mercado', listaId] }),
  })
}

export function useAtualizarItem(listaId: string) {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: { id: string } & Partial<DadosItemLista> & { confirmado?: boolean }) =>
      executar(async () => {
        const patch: Record<string, unknown> = {}
        if (input.produto !== undefined) patch.produto = input.produto.trim()
        if (input.marca !== undefined) patch.marca = input.marca?.trim() || null
        if (input.quantidade !== undefined) patch.quantidade = input.quantidade
        if (input.unidade !== undefined) patch.unidade = input.unidade
        if (input.precoUnitarioCentavos !== undefined) patch.preco_unitario_centavos = input.precoUnitarioCentavos
        if (input.confirmado !== undefined) patch.confirmado = input.confirmado

        const { data, error } = await supabase.from('itens_lista').update(patch).eq('id', input.id).select().single()
        if (error) throw error
        return data as ItemLista
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lista-mercado', listaId] }),
  })
}

export function useRemoverItem(listaId: string) {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (itemId: string) =>
      executar(async () => {
        const { error } = await supabase.from('itens_lista').delete().eq('id', itemId)
        if (error) throw error
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lista-mercado', listaId] }),
  })
}

export interface DadosFinalizacao {
  listaId: string
  data: ISODate
  categoriaId: string
  formaPagamento: FormaPagamento
  cartaoId?: string | null
  parcelas?: number
  primeiraFaturaId?: string | null
  estabelecimento?: string | null
}

// Idempotente por natureza: finalizar_lista() trava a linha e devolve a
// mesma compra se já existir (CA21). O botão também fica desabilitado
// durante o processamento (mutation.isPending) para não disparar duas
// chamadas em paralelo no mesmo clique duplo.
export function useFinalizarListaMercado() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: DadosFinalizacao) =>
      executar(async () => {
        const { data, error } = await supabase.rpc('finalizar_lista', {
          p_lista_id: input.listaId,
          p_data: input.data,
          p_categoria_id: input.categoriaId,
          p_forma: input.formaPagamento,
          p_cartao_id: input.cartaoId ?? null,
          p_parcelas: input.parcelas ?? 1,
          p_primeira_fatura_id: input.primeiraFaturaId ?? null,
          p_estabelecimento: input.estabelecimento ?? null,
        })
        if (error) throw error
        return data as string
      }),
    onSuccess: (_compraId, input) => {
      queryClient.invalidateQueries({ queryKey: ['listas-mercado'] })
      queryClient.invalidateQueries({ queryKey: ['lista-mercado', input.listaId] })
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['faturas'] })
    },
  })
}
