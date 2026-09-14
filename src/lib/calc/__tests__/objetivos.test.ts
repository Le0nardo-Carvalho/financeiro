import { describe, expect, it } from 'vitest'
import {
  acumuladoCentavos,
  objetivoAlcancado,
  progressoPercentual,
  restanteCentavos,
  retiradaValida,
} from '../objetivos'

describe('CA16 — progresso do objetivo', () => {
  it('R$ 250,00 guardados de uma meta de R$ 1.000,00 dá 25% e R$ 750,00 restantes', () => {
    const acumulado = acumuladoCentavos([{ valorCentavos: 25000, tipo: 'aporte' }])
    expect(acumulado).toBe(25000)
    expect(progressoPercentual(100000, acumulado)).toBe(25)
    expect(restanteCentavos(100000, acumulado)).toBe(75000)
  })
})

describe('acumulado com retiradas', () => {
  it('retiradas subtraem do acumulado', () => {
    const acumulado = acumuladoCentavos([
      { valorCentavos: 100000, tipo: 'aporte' },
      { valorCentavos: 30000, tipo: 'retirada' },
    ])
    expect(acumulado).toBe(70000)
  })

  it('retirada não pode superar o acumulado', () => {
    expect(retiradaValida(50000, 30000)).toBe(true)
    expect(retiradaValida(50000, 50000)).toBe(true)
    expect(retiradaValida(50000, 50001)).toBe(false)
  })
})

describe('objetivo além da meta', () => {
  it('preserva o valor real acumulado e marca como alcançado; restante fica em zero', () => {
    const acumulado = acumuladoCentavos([{ valorCentavos: 120000, tipo: 'aporte' }])
    expect(objetivoAlcancado(100000, acumulado)).toBe(true)
    expect(restanteCentavos(100000, acumulado)).toBe(0)
    expect(progressoPercentual(100000, acumulado)).toBe(120) // valor real; a barra trunca em 100 na UI
  })
})
