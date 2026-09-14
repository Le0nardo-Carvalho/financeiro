import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuth } from '../../context/AuthContext'

export function usePerfil() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['perfil', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase.from('perfis').select('*').single()
      if (error) throw error
      return data
    },
  })
}

// Chamada uma vez, logo após o primeiro login (05-prompt-claude-code.md).
// semear_perfil() é idempotente: se já houver categorias, não faz nada.
export function useSemearPerfil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('semear_perfil')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfil'] })
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      queryClient.invalidateQueries({ queryKey: ['cartoes'] })
    },
  })
}
