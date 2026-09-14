import { describe, expect, it } from 'vitest'
import { dividirParcelas, faturaSeguinte, gerarPreviaParcelas, primeiraFatura } from '../parcelas'
import { diaSeguro } from '../datas'

// Cartão do proprietário: Nubank, fecha dia 5, vence dia 12.
const nubank = { diaFechamento: 5, diaVencimento: 12 }

describe('CA03 — divisão em parcelas (dividirParcelas)', () => {
  it('R$ 100,00 em 3 parcelas dá 33,34 + 33,33 + 33,33', () => {
    const parcelas = dividirParcelas(10000, 3)
    expect(parcelas).toEqual([3334, 3333, 3333])
    expect(parcelas.reduce((a, b) => a + b, 0)).toBe(10000)
  })

  it('soma das parcelas é sempre exatamente o total, para vários N', () => {
    for (const [total, n] of [[10007, 7], [999, 4], [123456, 11], [500, 5]] as const) {
      const parcelas = dividirParcelas(total, n)
      expect(parcelas.reduce((a, b) => a + b, 0)).toBe(total)
      expect(parcelas.every((p) => p > 0)).toBe(true)
    }
  })

  it('rejeita parcelamento que geraria parcela zerada', () => {
    expect(() => dividirParcelas(2, 5)).toThrow()
  })

  it('rejeita número de parcelas menor que 1', () => {
    expect(() => dividirParcelas(1000, 0)).toThrow()
  })
})

describe('CA02 — compra parcelada no crédito (gerarPreviaParcelas)', () => {
  it('R$ 300,00 em 3 parcelas gera R$ 100,00 em cada mês de vencimento', () => {
    const previa = gerarPreviaParcelas(nubank, '2026-09-18', 30000, 3)
    expect(previa.map((p) => p.valorCentavos)).toEqual([10000, 10000, 10000])
    expect(previa.map((p) => p.mesReferencia)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01'])
  })
})

describe('CA04 — primeira fatura segue a convenção documentada', () => {
  it('compra antes do fechamento entra no fechamento do mesmo mês', () => {
    const f = primeiraFatura(nubank, '2026-10-02')
    expect(f.dataFechamento).toBe('2026-10-05')
    expect(f.dataVencimento).toBe('2026-10-12')
    expect(f.mesReferencia).toBe('2026-10-01')
  })

  it('compra NO dia do fechamento entra naquela fatura (convenção do app)', () => {
    const f = primeiraFatura(nubank, '2026-10-05')
    expect(f.dataFechamento).toBe('2026-10-05')
    expect(f.dataVencimento).toBe('2026-10-12')
  })

  it('compra depois do fechamento vai para o fechamento seguinte', () => {
    const f = primeiraFatura(nubank, '2026-10-06')
    expect(f.dataFechamento).toBe('2026-11-05')
    expect(f.dataVencimento).toBe('2026-11-12')
    expect(f.mesReferencia).toBe('2026-11-01')
  })
})

describe('CA05 — ajuste manual da primeira fatura', () => {
  it('parcelas seguintes acompanham a fatura ajustada pelo usuário', () => {
    const sugerida = primeiraFatura(nubank, '2026-10-02') // venceria 12/10
    const ajustada = faturaSeguinte(nubank, sugerida) // usuário empurra para 12/11

    const previa = gerarPreviaParcelas(nubank, '2026-10-02', 30000, 3, ajustada)
    expect(previa.map((p) => p.mesReferencia)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01'])
  })
})

describe('CA06 — parcelamento atravessando ano e meses curtos', () => {
  it('dezembro vira janeiro corretamente', () => {
    const previa = gerarPreviaParcelas(nubank, '2026-11-20', 30000, 3)
    expect(previa.map((p) => p.mesReferencia)).toEqual(['2026-12-01', '2027-01-01', '2027-02-01'])
    expect(previa.map((p) => p.dataVencimento)).toEqual(['2026-12-12', '2027-01-12', '2027-02-12'])
  })

  it('dia de fechamento/vencimento inexistente usa o último dia do mês (fevereiro)', () => {
    const cartaoDia31 = { diaFechamento: 31, diaVencimento: 31 }
    expect(diaSeguro(2027, 2, 31)).toBe('2027-02-28') // 2027 não é bissexto
    expect(diaSeguro(2028, 2, 31)).toBe('2028-02-29') // 2028 é bissexto

    const f = primeiraFatura(cartaoDia31, '2027-01-31')
    expect(f.dataFechamento).toBe('2027-01-31')
    expect(f.dataVencimento).toBe('2027-02-28')
  })
})

describe('mês de vencimento fica gravado; alterar o cartão não reorganiza', () => {
  it('faturaSeguinte usa os dados da fatura anterior, não o cartão atual', () => {
    const primeira = primeiraFatura(nubank, '2026-09-18')
    const segunda = faturaSeguinte(nubank, primeira)
    // mesmo se o cartão mudasse depois, a fatura já gravada segue a cadeia anterior
    expect(segunda.mesReferencia).toBe('2026-11-01')
  })
})
