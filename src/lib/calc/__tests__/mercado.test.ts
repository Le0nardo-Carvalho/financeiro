import { describe, expect, it } from 'vitest'
import {
  podeConfirmarItem,
  subtotalItemCentavos,
  totalConfirmadoCentavos,
  totalForaCentavos,
} from '../mercado'
import { dividirParcelas, gerarPreviaParcelas } from '../parcelas'

const nubank = { diaFechamento: 5, diaVencimento: 12 }

describe('CA17 — item sem preço permanece na lista, confirmação bloqueada', () => {
  it('preço nulo (campo vazio) bloqueia a confirmação', () => {
    expect(podeConfirmarItem({ quantidade: 2, precoUnitarioCentavos: null })).toBe(false)
  })

  it('preço explicitamente zero é válido e distinto de vazio', () => {
    expect(podeConfirmarItem({ quantidade: 1, precoUnitarioCentavos: 0 })).toBe(true)
    expect(subtotalItemCentavos({ quantidade: 1, precoUnitarioCentavos: 0 })).toBe(0)
  })

  it('quantidade inválida também bloqueia', () => {
    expect(podeConfirmarItem({ quantidade: 0, precoUnitarioCentavos: 500 })).toBe(false)
  })
})

describe('CA18/CA19 — total confirmado da lista de mercado', () => {
  it('2 unidades de R$ 10,00 e 3 unidades de R$ 5,00 confirmadas somam R$ 35,00', () => {
    const itens = [
      { quantidade: 2, precoUnitarioCentavos: 1000, confirmado: true },
      { quantidade: 3, precoUnitarioCentavos: 500, confirmado: true },
    ]
    expect(totalConfirmadoCentavos(itens)).toBe(3500)
  })

  it('item de R$ 100,00 desmarcado não entra no total confirmado', () => {
    const itens = [
      { quantidade: 2, precoUnitarioCentavos: 1000, confirmado: true },
      { quantidade: 3, precoUnitarioCentavos: 500, confirmado: true },
      { quantidade: 1, precoUnitarioCentavos: 10000, confirmado: false },
    ]
    expect(totalConfirmadoCentavos(itens)).toBe(3500)
    expect(totalForaCentavos(itens)).toBe(10000)
  })
})

describe('CA22 — finalização de compra de mercado parcelada', () => {
  it('o total confirmado da lista é distribuído entre as faturas pela mesma regra geral', () => {
    const itens = [
      { quantidade: 3, precoUnitarioCentavos: 10000, confirmado: true }, // R$ 300,00
    ]
    const total = totalConfirmadoCentavos(itens)
    expect(total).toBe(30000)

    const previa = gerarPreviaParcelas(nubank, '2026-10-02', total, 3)
    expect(previa.map((p) => p.valorCentavos)).toEqual(dividirParcelas(total, 3))
    expect(previa.reduce((s, p) => s + p.valorCentavos, 0)).toBe(total)
  })
})

describe('arredondamento de meio centavo para cima (subtotalItemCentavos)', () => {
  it('0,750 kg a R$ 12,33/kg arredonda .5 para cima', () => {
    // 0.750 * 1233 = 924.75 → 925 (meio centavo para cima)
    expect(subtotalItemCentavos({ quantidade: 0.75, precoUnitarioCentavos: 1233 })).toBe(925)
  })

  it('quantidade fracionada comum', () => {
    // 0.333 * 1000 = 333.0 → 333
    expect(subtotalItemCentavos({ quantidade: 0.333, precoUnitarioCentavos: 1000 })).toBe(333)
  })
})
