import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useGravacao } from './shared'
import type { BalanceteMes, MinimoDoMesLinha, MinimoItem, SaudeDoMes } from '../../types/database'
import { mesesFechadosAntes } from '../calc/minimo'
import type { ISODate } from '../calc/datas'

// Mínimo do mês, saúde do mês e balancete (0008). As chaves ficam sob
// 'dashboard': toda gravação de gasto, categoria ou entrada já invalida
// 'dashboard', então estes números nunca ficam velhos.

// bigint/numeric podem chegar como texto pelo PostgREST.
function numeros<T extends object>(linha: T, campos: (keyof T)[]): T {
  const copia = { ...linha }
  for (const c of campos) copia[c] = Number(copia[c]) as T[keyof T]
  return copia
}

export function useMinimoDoMes(mes: ISODate) {
  return useQuery({
    queryKey: ['dashboard', 'minimo', mes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('minimo_do_mes', { p_mes: mes })
      if (error) throw error
      return (data as MinimoDoMesLinha[]).map((l) =>
        numeros(l, ['previsto_centavos', 'gasto_centavos', 'coberto_centavos', 'falta_centavos', 'excedente_centavos']),
      )
    },
  })
}

export function useSaudeDoMes(mes: ISODate) {
  return useQuery({
    queryKey: ['dashboard', 'saude', mes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('saude_do_mes', { p_mes: mes })
      if (error) throw error
      const linha = (data as SaudeDoMes[])[0]
      if (!linha) return null
      return numeros(linha, [
        'entradas_centavos', 'previstas_centavos', 'gastos_centavos', 'minimo_centavos', 'gasto_essencial_centavos',
        'falta_minimo_centavos', 'sobra_centavos', 'margem_centavos',
      ])
    },
  })
}

export function useBalancete(ano: number) {
  return useQuery({
    queryKey: ['dashboard', 'balancete', ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balancete_mensal')
        .select('*')
        .gte('mes', `${ano}-01-01`)
        .lte('mes', `${ano}-12-01`)
        .order('mes')
      if (error) throw error
      return (data as BalanceteMes[]).map((l) =>
        numeros(l, ['entradas_centavos', 'gastos_centavos', 'resultado_centavos', 'acumulado_ano_centavos']),
      )
    },
  })
}

export function useMinimoItens() {
  return useQuery({
    queryKey: ['minimo-itens'],
    queryFn: async () => {
      const { data, error } = await supabase.from('minimo_itens').select('*').eq('ativo', true).order('posicao')
      if (error) throw error
      return (data as MinimoItem[]).map((i) => ({
        ...i,
        valor_centavos: i.valor_centavos === null ? null : Number(i.valor_centavos),
      }))
    },
  })
}

// Gasto da categoria em cada um dos `quantidade` meses fechados antes de
// `mes` — a linha "jul 687,10 · ago 620,49 · set 426,19" da tela 3c. Lê só
// lancamentos_mensais (mesma competência do dashboard).
export function useHistoricoDaCategoria(categoriaId: string | null | undefined, mes: ISODate, quantidade: number) {
  const meses = mesesFechadosAntes(mes, quantidade)
  return useQuery({
    queryKey: ['dashboard', 'historico-categoria', categoriaId, mes, quantidade],
    enabled: Boolean(categoriaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos_mensais')
        .select('valor_centavos, mes_competencia')
        .eq('categoria_id', categoriaId as string)
        .gte('mes_competencia', meses[0])
        .lte('mes_competencia', meses[meses.length - 1])
      if (error) throw error
      const totais = new Map<ISODate, number>(meses.map((m) => [m, 0]))
      for (const l of data as { valor_centavos: number; mes_competencia: ISODate }[]) {
        totais.set(l.mes_competencia, (totais.get(l.mes_competencia) ?? 0) + Number(l.valor_centavos))
      }
      return meses.map((m) => ({ mes: m, totalCentavos: totais.get(m) ?? 0 }))
    },
  })
}

export interface ItemMinimoRascunho {
  id: string | null // null = conta nova
  nome: string
  tipo: MinimoItem['tipo']
  categoriaId: string | null
  valorCentavos: number | null
  mesesMedia: number
  termo: string | null
  posicao: number
  remover?: boolean
}

// Tela 3c: grava itens alterados, contas novas, removidas e a margem de
// atenção. "Salvo" só aparece depois que todas as gravações voltam do banco.
export function useSalvarMinimo() {
  const queryClient = useQueryClient()
  const { executar } = useGravacao()
  return useMutation({
    mutationFn: (input: { perfilId: string; itens: ItemMinimoRascunho[]; margemCentavos: number }) =>
      executar(async () => {
        const agora = new Date().toISOString()
        for (const item of input.itens) {
          const linha = {
            nome: item.nome.trim(),
            tipo: item.tipo,
            categoria_id: item.categoriaId,
            valor_centavos: item.valorCentavos,
            meses_media: item.mesesMedia,
            termo: item.termo?.trim() || null,
            posicao: item.posicao,
          }
          if (item.id && item.remover) {
            const { error } = await supabase.from('minimo_itens').update({ ativo: false, atualizado_em: agora }).eq('id', item.id)
            if (error) throw error
          } else if (item.id) {
            const { error } = await supabase.from('minimo_itens').update({ ...linha, atualizado_em: agora }).eq('id', item.id)
            if (error) throw error
          } else if (!item.remover) {
            const { error } = await supabase.from('minimo_itens').insert(linha)
            if (error) throw error
          }
        }
        const { error } = await supabase
          .from('perfis')
          .update({ margem_atencao_centavos: input.margemCentavos, atualizado_em: agora })
          .eq('id', input.perfilId)
        if (error) throw error
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minimo-itens'] })
      queryClient.invalidateQueries({ queryKey: ['perfil'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
