import { WifiOff } from 'lucide-react'
import { useSyncStatus } from '../context/SyncStatusContext'

export function OfflineBanner() {
  const { status, ultimaSincronizacao } = useSyncStatus()
  if (status !== 'offline') return null

  const dataFormatada = ultimaSincronizacao
    ? ultimaSincronizacao.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'ainda não sincronizado nesta sessão'

  return (
    <div className="offline-banner" role="status">
      <WifiOff size={17} strokeWidth={2.75} style={{ flex: 'none' }} />
      <span>
        Sem conexão. Mostrando a última versão disponível ({dataFormatada}). Novas gravações ficam bloqueadas até a conexão voltar.
      </span>
    </div>
  )
}
