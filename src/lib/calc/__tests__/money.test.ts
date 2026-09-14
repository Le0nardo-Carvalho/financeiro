import { describe, expect, it } from 'vitest'
import { formatCentavos, parseCentavosInput } from '../../money'

describe('formatCentavos', () => {
  it('formata centavos em real brasileiro', () => {
    expect(formatCentavos(128460)).toBe('R$ 1.284,60')
    expect(formatCentavos(0)).toBe('R$ 0,00')
  })
})

describe('parseCentavosInput', () => {
  it('aceita formato brasileiro com milhar e vírgula decimal', () => {
    expect(parseCentavosInput('1.284,60')).toBe(128460)
    expect(parseCentavosInput('100,00')).toBe(10000)
  })

  it('aceita número simples sem centavos', () => {
    expect(parseCentavosInput('100')).toBe(10000)
  })

  it('retorna null para entrada inválida ou vazia', () => {
    expect(parseCentavosInput('')).toBeNull()
    expect(parseCentavosInput('abc')).toBeNull()
  })
})
