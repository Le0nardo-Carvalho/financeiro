import { describe, expect, it } from 'vitest'
import { totaisDoMes, totalHistoricoCategoria, previsaoFuturaCategoria } from '../agregacao'

describe('CA01 — Pix e débito no mesmo mês são somados e discriminados', () => {
  it('R$ 100,00 em Pix e R$ 50,00 em débito dão total R$ 150,00, separados por forma', () => {
    const totais = totaisDoMes(
      [
        { valorCentavos: 10000, mesCompetencia: '2026-09-01', formaPagamento: 'pix', categoriaId: 'a' },
        { valorCentavos: 5000, mesCompetencia: '2026-09-01', formaPagamento: 'debito', categoriaId: 'b' },
      ],
      '2026-09-01',
    )
    expect(totais.totalCentavos).toBe(15000)
    expect(totais.pixCentavos).toBe(10000)
    expect(totais.debitoCentavos).toBe(5000)
    expect(totais.creditoCentavos).toBe(0)
  })
})

describe('CA02 — combinado com uma compra parcelada no crédito', () => {
  it('R$ 150,00 (CA01) + R$ 100,00 da primeira parcela de crédito dá R$ 250,00, crédito = R$ 100,00', () => {
    const totais = totaisDoMes(
      [
        { valorCentavos: 10000, mesCompetencia: '2026-09-01', formaPagamento: 'pix', categoriaId: 'a' },
        { valorCentavos: 5000, mesCompetencia: '2026-09-01', formaPagamento: 'debito', categoriaId: 'b' },
        { valorCentavos: 10000, mesCompetencia: '2026-09-01', formaPagamento: 'credito', categoriaId: 'c' },
      ],
      '2026-09-01',
    )
    expect(totais.totalCentavos).toBe(25000)
    expect(totais.creditoCentavos).toBe(10000)
  })
})

describe('valores por forma de pagamento são componentes do total, não somados de novo', () => {
  it('a soma dos três componentes é exatamente o total, nunca mais que isso', () => {
    const lancamentos = [
      { valorCentavos: 7208, mesCompetencia: '2026-09-01', formaPagamento: 'pix', categoriaId: 'mercado' },
      { valorCentavos: 1840, mesCompetencia: '2026-09-01', formaPagamento: 'debito', categoriaId: 'transporte' },
      { valorCentavos: 10000, mesCompetencia: '2026-09-01', formaPagamento: 'credito', categoriaId: 'lazer' },
    ] as const
    const totais = totaisDoMes([...lancamentos], '2026-09-01')
    expect(totais.totalCentavos).toBe(totais.pixCentavos + totais.debitoCentavos + totais.creditoCentavos)
  })
})

describe('CA14 — histórico da categoria x previsão futura', () => {
  const lancamentos = [
    { valorCentavos: 10000, mesCompetencia: '2026-08-01', formaPagamento: 'credito', categoriaId: 'educacao' },
    { valorCentavos: 10000, mesCompetencia: '2026-09-01', formaPagamento: 'credito', categoriaId: 'educacao' },
    { valorCentavos: 10000, mesCompetencia: '2026-10-01', formaPagamento: 'credito', categoriaId: 'educacao' },
  ] as const

  it('total histórico inclui até o mês atual; previsão fica separada e não entra no histórico', () => {
    const historico = totalHistoricoCategoria([...lancamentos], 'educacao', '2026-09-01')
    const previsao = previsaoFuturaCategoria([...lancamentos], 'educacao', '2026-09-01')
    expect(historico).toBe(20000) // agosto + setembro
    expect(previsao).toBe(10000) // outubro, futuro
  })
})
