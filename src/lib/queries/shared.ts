import { useSyncStatus } from '../../context/SyncStatusContext'
import { bloqueiaGravacao } from '../calc/syncStatus'

export class ConflitoVersaoError extends Error {
  constructor() {
    super('Este registro foi alterado por outro dispositivo. Nada foi sobrescrito.')
    this.name = 'ConflitoVersaoError'
  }
}

// Envolve toda gravação: "Salvando…" antes, "Salvo"/"Falha" só depois da
// resposta do servidor (§4.4). Nunca marca sucesso antes da confirmação real,
// e nunca engole o erro — quem chama decide como preservar o formulário.
export function useGravacao() {
  const { status, iniciarGravacao, concluirGravacao } = useSyncStatus()

  async function executar<T>(fn: () => Promise<T>): Promise<T> {
    if (bloqueiaGravacao(status)) {
      throw new Error('Sem conexão: gravações ficam bloqueadas até a conexão voltar.')
    }
    iniciarGravacao()
    try {
      const resultado = await fn()
      concluirGravacao(true)
      return resultado
    } catch (erro) {
      concluirGravacao(false)
      throw erro
    }
  }

  return { executar, bloqueado: bloqueiaGravacao(status) }
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message
  // Erros do PostgREST/Supabase às vezes chegam como objeto simples
  // ({ message, details, hint, code }), sem passar por `instanceof Error`
  // (ex.: quando vêm de uma resposta serializada). Extrai a mensagem real
  // em vez de esconder atrás do texto genérico.
  if (erro && typeof erro === 'object' && 'message' in erro && typeof erro.message === 'string' && erro.message) {
    return erro.message
  }
  console.error('Erro sem mensagem legível:', erro)
  return 'Ocorreu um erro inesperado. Tente novamente.'
}
