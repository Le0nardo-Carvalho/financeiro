import { useSyncStatus } from '../context/SyncStatusContext'

const ROTULOS: Record<string, string> = {
  atualizado: 'Atualizado',
  salvando: 'Salvando',
  erro: 'Falha ao salvar',
  offline: 'Sem conexão',
}

export function StatusSyncBadge() {
  const { status } = useSyncStatus()
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" aria-hidden />
      {ROTULOS[status]}
    </span>
  )
}
