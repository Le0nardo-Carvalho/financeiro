import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { agruparSaidasPorConta } from '../calc/pagamentos'
import type { SaidaPorConta } from '../../types/database'
import type { ISODate } from '../calc/datas'

// Quadro "Saiu das contas" (tela 1b): conferência com o extrato. A view
// saidas_por_conta inclui pagamentos de fatura — por isso este resultado
// NUNCA entra em soma de gastos (CA34, CA35).
export function useSaidasPorConta(mes: ISODate) {
  return useQuery({
    queryKey: ['saidas-por-conta', mes],
    queryFn: async () => {
      const { data, error } = await supabase.from('saidas_por_conta').select('*').eq('mes', mes)
      if (error) throw error
      return agruparSaidasPorConta(
        (data as SaidaPorConta[]).map((l) => ({ conta: l.conta, tipo: l.tipo, valorCentavos: Number(l.valor_centavos) })),
      )
    },
  })
}
