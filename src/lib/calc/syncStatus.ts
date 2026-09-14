export type StatusSync = 'atualizado' | 'salvando' | 'erro' | 'offline'

// Extraído do SyncStatusProvider para ser testável sem React: a prioridade
// é sempre offline > erro > salvando > atualizado (§4.4/§10, CA26 — nunca
// mostrar "salvo" antes da confirmação, e offline sempre bloqueia gravação).
export function calcularStatusSync(input: { online: boolean; erro: boolean; emAndamento: number }): StatusSync {
  if (!input.online) return 'offline'
  if (input.erro) return 'erro'
  if (input.emAndamento > 0) return 'salvando'
  return 'atualizado'
}

export function bloqueiaGravacao(status: StatusSync): boolean {
  return status === 'offline'
}
