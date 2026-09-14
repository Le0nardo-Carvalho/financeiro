import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { calcularStatusSync, type StatusSync } from '../lib/calc/syncStatus'

export type { StatusSync }

interface SyncState {
  status: StatusSync
  ultimaSincronizacao: Date | null
  emAndamento: number
  iniciarGravacao: () => void
  concluirGravacao: (sucesso: boolean) => void
}

const SyncStatusContext = createContext<SyncState | null>(null)

// §4.4 / §10 das regras de cálculo: "Salvando…" até a confirmação do
// servidor; offline bloqueia novas gravações e mostra a última versão
// disponível; falha preserva o formulário para nova tentativa.
export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [emAndamento, setEmAndamento] = useState(0)
  const [erro, setErro] = useState(false)
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(
    navigator.onLine ? new Date() : null,
  )

  useEffect(() => {
    function aoFicarOnline() {
      setOnline(true)
      setUltimaSincronizacao(new Date())
    }
    function aoFicarOffline() {
      setOnline(false)
    }
    window.addEventListener('online', aoFicarOnline)
    window.addEventListener('offline', aoFicarOffline)
    return () => {
      window.removeEventListener('online', aoFicarOnline)
      window.removeEventListener('offline', aoFicarOffline)
    }
  }, [])

  function iniciarGravacao() {
    setErro(false)
    setEmAndamento((n) => n + 1)
  }

  function concluirGravacao(sucesso: boolean) {
    setEmAndamento((n) => Math.max(0, n - 1))
    if (sucesso) {
      setErro(false)
      setUltimaSincronizacao(new Date())
    } else {
      setErro(true)
    }
  }

  const status = calcularStatusSync({ online, erro, emAndamento })

  const value = useMemo(
    () => ({ status, ultimaSincronizacao, emAndamento, iniciarGravacao, concluirGravacao }),
    [status, ultimaSincronizacao, emAndamento],
  )

  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>
}

export function useSyncStatus() {
  const ctx = useContext(SyncStatusContext)
  if (!ctx) throw new Error('useSyncStatus precisa estar dentro de <SyncStatusProvider>')
  return ctx
}
