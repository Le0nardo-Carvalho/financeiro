// §11 da especificação e §9 das regras de cálculo.

export interface MovimentoObjetivo {
  valorCentavos: number
  tipo: 'aporte' | 'retirada'
}

export function acumuladoCentavos(movimentos: MovimentoObjetivo[]): number {
  return movimentos.reduce(
    (soma, m) => soma + (m.tipo === 'aporte' ? m.valorCentavos : -m.valorCentavos),
    0,
  )
}

export function restanteCentavos(metaCentavos: number, acumulado: number): number {
  return Math.max(metaCentavos - acumulado, 0)
}

// Progresso em pontos percentuais, sem limitar a 100 — quem exibe a barra
// decide truncar em 100%, mas o valor real (podendo passar de 100) é preservado.
export function progressoPercentual(metaCentavos: number, acumulado: number): number {
  if (metaCentavos <= 0) return 0
  return (acumulado / metaCentavos) * 100
}

export function objetivoAlcancado(metaCentavos: number, acumulado: number): boolean {
  return acumulado >= metaCentavos
}

export function retiradaValida(acumuladoAtual: number, valorRetiradaCentavos: number): boolean {
  return valorRetiradaCentavos > 0 && valorRetiradaCentavos <= acumuladoAtual
}
