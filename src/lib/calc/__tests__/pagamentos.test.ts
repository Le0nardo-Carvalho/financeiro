import { describe, expect, it } from 'vitest'
import { agruparSaidasPorConta, CONTA_NAO_INFORMADA, situacaoDaFatura, totalDoMesSemCompra } from '../pagamentos'
import { comparativoComAnterior, mediaCentavos, totaisDoMes, totaisPorMes } from '../agregacao'
import { ultimosMeses } from '../datas'

// Mês da tela 1b: Pix 274,30 + débito 152,90 + crédito 786,00 = 1.213,20.
const OUTUBRO = '2026-10-01'
const lancamentosOutubro = [
  { valorCentavos: 27430, mesCompetencia: OUTUBRO, formaPagamento: 'pix' as const, categoriaId: 'mercado' },
  { valorCentavos: 15290, mesCompetencia: OUTUBRO, formaPagamento: 'debito' as const, categoriaId: 'transporte' },
  { valorCentavos: 78600, mesCompetencia: OUTUBRO, formaPagamento: 'credito' as const, categoriaId: 'lazer' },
]

describe('CA31 — fatura de R$ 786,00 paga com Pix 500,00 + boleto 286,00', () => {
  it('fica paga, sem saldo', () => {
    const r = situacaoDaFatura(78600, [{ valorCentavos: 50000 }, { valorCentavos: 28600 }])
    expect(r.situacao).toBe('paga')
    expect(r.pagoCentavos).toBe(78600)
    expect(r.saldoCentavos).toBe(0)
  })

  it('os gastos do mês continuam R$ 1.213,20 — o pagamento não entra na soma', () => {
    // totaisDoMes só aceita lancamentos_mensais: não há como passar um pagamento.
    expect(totaisDoMes(lancamentosOutubro, OUTUBRO).totalCentavos).toBe(121320)
  })
})

describe('CA32 — só o pagamento de R$ 500,00', () => {
  it('fica parcial com saldo de R$ 286,00', () => {
    const r = situacaoDaFatura(78600, [{ valorCentavos: 50000 }])
    expect(r.situacao).toBe('parcial')
    expect(r.saldoCentavos).toBe(28600)
  })
})

describe('CA33 — excluir um pagamento recalcula a situação', () => {
  it('paga → parcial → aberta conforme os pagamentos saem', () => {
    const pagamentos = [{ valorCentavos: 50000 }, { valorCentavos: 28600 }]
    expect(situacaoDaFatura(78600, pagamentos).situacao).toBe('paga')
    expect(situacaoDaFatura(78600, pagamentos.slice(0, 1)).situacao).toBe('parcial')
    expect(situacaoDaFatura(78600, []).situacao).toBe('aberta')
    expect(situacaoDaFatura(78600, []).saldoCentavos).toBe(78600)
  })

  it('pagamento maior que a fatura fica paga e o excedente vira crédito, não gasto', () => {
    const r = situacaoDaFatura(78600, [{ valorCentavos: 80000 }])
    expect(r.situacao).toBe('paga')
    expect(r.saldoCentavos).toBe(0)
    expect(r.excedenteCentavos).toBe(1400)
    expect(totaisDoMes(lancamentosOutubro, OUTUBRO).totalCentavos).toBe(121320)
  })
})

describe('CA35 — "Saiu das contas" = Pix + débito em compras + pagamentos de fatura, por conta', () => {
  it('Banco do Brasil soma R$ 1.213,20 e conta não informada fica separada', () => {
    const contas = agruparSaidasPorConta([
      { conta: 'Banco do Brasil', tipo: 'pix', valorCentavos: 27430 },
      { conta: 'Banco do Brasil', tipo: 'debito', valorCentavos: 15290 },
      { conta: 'Banco do Brasil', tipo: 'pagamento_fatura', valorCentavos: 78600 },
      { conta: CONTA_NAO_INFORMADA, tipo: 'pix', valorCentavos: 1000 },
      { conta: 'Inter', tipo: 'debito', valorCentavos: 500 },
    ])
    expect(contas.map((c) => c.conta)).toEqual(['Banco do Brasil', 'Inter', CONTA_NAO_INFORMADA])
    expect(contas[0]).toEqual({
      conta: 'Banco do Brasil',
      pixCentavos: 27430,
      debitoCentavos: 15290,
      pagamentoFaturaCentavos: 78600,
      totalCentavos: 121320,
    })
  })

  it('o quadro é conferência de extrato: não altera o total de gastos (CA34)', () => {
    // Mesmo com R$ 786,00 saindo da conta para pagar a fatura, o gasto do mês
    // é o mesmo — o crédito já está contado pelas parcelas.
    const gastos = totaisDoMes(lancamentosOutubro, OUTUBRO).totalCentavos
    const saidas = agruparSaidasPorConta([
      { conta: 'Banco do Brasil', tipo: 'pix', valorCentavos: 27430 },
      { conta: 'Banco do Brasil', tipo: 'debito', valorCentavos: 15290 },
      { conta: 'Banco do Brasil', tipo: 'pagamento_fatura', valorCentavos: 78600 },
    ])
    expect(saidas[0].totalCentavos).toBe(gastos)
    expect(gastos).toBe(121320)
  })
})

describe('CA29 — desfazer compra finalizada devolve o total anterior do mês', () => {
  it('setembro passa de R$ 1.284,60 para R$ 1.212,52 ao remover a compra de R$ 72,08', () => {
    const doMes = [
      { compraId: 'mercado-bairro', valorCentavos: 7208 },
      { compraId: 'outras', valorCentavos: 121252 },
    ]
    expect(doMes.reduce((s, l) => s + l.valorCentavos, 0)).toBe(128460)
    expect(totalDoMesSemCompra(doMes, 'mercado-bairro')).toBe(121252)
  })

  it('remove todas as parcelas da compra que caem no mês', () => {
    const doMes = [
      { compraId: 'x', valorCentavos: 3334 },
      { compraId: 'x', valorCentavos: 3333 },
      { compraId: 'y', valorCentavos: 1000 },
    ]
    expect(totalDoMesSemCompra(doMes, 'x')).toBe(1000)
  })
})

describe('Início — comparativo e últimos 6 meses (tela 1a)', () => {
  it('R$ 1.284,60 contra R$ 1.396,20 = R$ 111,60 a menos, 8%', () => {
    const c = comparativoComAnterior(128460, 139620)
    expect(c.diferencaCentavos).toBe(-11160)
    expect(c.menor).toBe(true)
    expect(c.percentual).toBe(8)
  })

  it('sem mês anterior não há percentual', () => {
    expect(comparativoComAnterior(1000, 0).percentual).toBeNull()
  })

  it('últimos 6 meses atravessam a virada do ano e preenchem meses vazios com zero', () => {
    const meses = ultimosMeses('2027-02-01', 6)
    expect(meses).toEqual(['2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01'])
    const totais = totaisPorMes(
      [
        { valorCentavos: 100, mesCompetencia: '2026-09-01' },
        { valorCentavos: 50, mesCompetencia: '2027-02-01' },
        { valorCentavos: 999, mesCompetencia: '2026-08-01' },
      ],
      meses,
    )
    expect(totais.map((t) => t.totalCentavos)).toEqual([100, 0, 0, 0, 0, 50])
    expect(mediaCentavos(totais.map((t) => t.totalCentavos))).toBe(25)
  })
})
