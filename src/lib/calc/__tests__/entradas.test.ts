import { describe, expect, it } from 'vitest'
import { formatCentavos } from '../../money'
import { previstasDoMes, totalRecebidoCentavos, totalPorTipo, type EntradaCalc } from '../entradas'
import {
  coberturaDoItem, faltaTotalCentavos, mediaDosMesesFechados, mensagemDaSaude, mesesFechadosAntes, saudeDoMes,
} from '../minimo'
import { balanceteAteMes, montarBalancete, resumoDoBalancete } from '../balancete'
import { totaisDoMes } from '../agregacao'

// Critérios do 10 (entradas, balancete e mínimo). Os números CA27–CA33 já
// existiam no 06; aqui levam o sufixo "-E".

function entrada(parcial: Partial<EntradaCalc> & Pick<EntradaCalc, 'descricao' | 'data' | 'valorCentavos'>): EntradaCalc {
  return { tipo: 'renda', recorrente: false, diaPrevisto: null, ...parcial }
}

describe('CA27-E — entrada não é gasto', () => {
  it('uma entrada de R$ 3.000,00 não muda os totais de gastos do mês', () => {
    const lancamentos = [
      { valorCentavos: 12000, mesCompetencia: '2026-10-01', formaPagamento: 'pix' as const, categoriaId: 'mercado' },
      { valorCentavos: 7860, mesCompetencia: '2026-10-01', formaPagamento: 'credito' as const, categoriaId: 'casa' },
    ]
    const antes = totaisDoMes(lancamentos, '2026-10-01')
    const entradas = [entrada({ descricao: 'M Dumont Bordados', data: '2026-10-07', valorCentavos: 300000 })]
    // Gastos vêm só de lançamentos: a entrada entra no balancete, não nos gastos.
    expect(totaisDoMes(lancamentos, '2026-10-01')).toEqual(antes)
    const [outubro] = montarBalancete(entradas, lancamentos)
    expect(outubro.gastosCentavos).toBe(antes.totalCentavos)
    expect(outubro.entradasCentavos).toBe(300000)
  })
})

describe('CA28-E — balancete', () => {
  const entradas = [
    { data: '2025-12-10', valorCentavos: 20000 },
    { data: '2026-01-05', valorCentavos: 40000 },
    { data: '2026-01-20', valorCentavos: 5000 },
    { data: '2026-02-05', valorCentavos: 30000 },
  ]
  const gastos = [
    { mesCompetencia: '2025-12-01', valorCentavos: 50000 },
    { mesCompetencia: '2026-01-01', valorCentavos: 10000 },
    { mesCompetencia: '2026-02-01', valorCentavos: 45000 },
    { mesCompetencia: '2026-03-01', valorCentavos: 9000 }, // parcela futura
  ]

  it('resultado do mês = entradas − lançamentos do mês', () => {
    const linhas = montarBalancete(entradas, gastos)
    const janeiro = linhas.find((l) => l.mes === '2026-01-01')!
    expect(janeiro).toMatchObject({ entradasCentavos: 45000, gastosCentavos: 10000, resultadoCentavos: 35000 })
  })

  it('acumulado reinicia em janeiro', () => {
    const linhas = montarBalancete(entradas, gastos)
    expect(linhas.find((l) => l.mes === '2025-12-01')!.acumuladoAnoCentavos).toBe(-30000)
    expect(linhas.find((l) => l.mes === '2026-01-01')!.acumuladoAnoCentavos).toBe(35000)
    expect(linhas.find((l) => l.mes === '2026-02-01')!.acumuladoAnoCentavos).toBe(20000)
  })

  it('mostra só o ano pedido e até o mês atual', () => {
    const linhas = balanceteAteMes(montarBalancete(entradas, gastos), 2026, '2026-02-15')
    expect(linhas.map((l) => l.mes)).toEqual(['2026-01-01', '2026-02-01'])
    expect(resumoDoBalancete(linhas)).toEqual({ entradasCentavos: 75000, gastosCentavos: 55000, resultadoCentavos: 20000 })
  })
})

describe('CA29-E — previsto de mercado', () => {
  it('jul 687,10 · ago 620,49 · set 426,19 → outubro 577,93', () => {
    const totais = [
      { mes: '2026-06-01', totalCentavos: 99999 }, // fora da janela de 3 meses
      { mes: '2026-07-01', totalCentavos: 68710 },
      { mes: '2026-08-01', totalCentavos: 62049 },
      { mes: '2026-09-01', totalCentavos: 42619 },
      { mes: '2026-10-01', totalCentavos: 35654 }, // mês em andamento não entra
    ]
    expect(mesesFechadosAntes('2026-10-01', 3)).toEqual(['2026-07-01', '2026-08-01', '2026-09-01'])
    expect(mediaDosMesesFechados(totais, '2026-10-01', 3)).toBe(57793)
  })

  it('meses sem lançamento não puxam a média para baixo; sem histórico = 0', () => {
    const totais = [{ mes: '2026-09-01', totalCentavos: 42619 }]
    expect(mediaDosMesesFechados(totais, '2026-10-01', 3)).toBe(42619)
    expect(mediaDosMesesFechados([], '2026-10-01', 3)).toBe(0)
  })

  it('a janela atravessa o ano', () => {
    expect(mesesFechadosAntes('2026-02-01', 3)).toEqual(['2025-11-01', '2025-12-01', '2026-01-01'])
  })
})

describe('CA30-E — conta fixa paga acima do previsto', () => {
  it('Neoenergia 479,78 de 380,00 → falta 0, excedente 99,78; a água continua faltando 100,00', () => {
    expect(coberturaDoItem(38000, 47978)).toEqual({ cobertoCentavos: 38000, faltaCentavos: 0, excedenteCentavos: 9978 })
    expect(coberturaDoItem(10000, 0)).toEqual({ cobertoCentavos: 0, faltaCentavos: 10000, excedenteCentavos: 0 })
    const itens = [
      { previstoCentavos: 57793, gastoCentavos: 35654 }, // mercado: falta 221,39
      { previstoCentavos: 18500, gastoCentavos: 18634 }, // Claro
      { previstoCentavos: 38000, gastoCentavos: 47978 }, // Neoenergia
      { previstoCentavos: 10000, gastoCentavos: 0 }, // água
    ]
    expect(faltaTotalCentavos(itens)).toBe(32139)
  })
})

describe('CA31-E — gastos altos', () => {
  it('sobra 75,18 e falta 321,39 → nível "alto" e "faltam R$ 246,21"', () => {
    const saude = saudeDoMes({
      entradasCentavos: 321705, previstasCentavos: 0, gastosCentavos: 314187, faltaMinimoCentavos: 32139, margemCentavos: 30000,
    })
    expect(saude).toEqual({ disponivelCentavos: 7518, sobraCentavos: -24621, nivel: 'alto' })
    const msg = mensagemDaSaude(saude, 32139, 30000, ['mercado', 'água'], formatCentavos)
    expect(msg.texto).toBe('Ainda faltam R$ 321,39 do mínimo (mercado e água) e só sobraram R$ 75,18. Faltam ')
    expect(msg.destaque).toBe('R$ 246,21')
  })

  it('gastos acima do que entrou também é "alto"', () => {
    const saude = saudeDoMes({ entradasCentavos: 100000, previstasCentavos: 0, gastosCentavos: 150000, faltaMinimoCentavos: 0, margemCentavos: 30000 })
    expect(saude.nivel).toBe('alto')
    expect(mensagemDaSaude(saude, 0, 30000, [], formatCentavos).destaque).toBe('R$ 500,00')
  })
})

describe('CA32-E — atenção, tranquilo e sem entradas', () => {
  const base = { previstasCentavos: 0, gastosCentavos: 100000, faltaMinimoCentavos: 0, margemCentavos: 30000 }
  it('sobra entre 0 e a margem → atenção', () => {
    expect(saudeDoMes({ ...base, entradasCentavos: 100000 }).nivel).toBe('atencao') // sobra 0
    expect(saudeDoMes({ ...base, entradasCentavos: 129999 }).nivel).toBe('atencao')
  })
  it('sobra igual ou acima da margem → tranquilo', () => {
    expect(saudeDoMes({ ...base, entradasCentavos: 130000 }).nivel).toBe('tranquilo')
  })
  it('nenhuma entrada no mês → sem_entradas, sem alerta', () => {
    expect(saudeDoMes({ ...base, entradasCentavos: 0 }).nivel).toBe('sem_entradas')
  })
})

describe('CA33-E — entrada recorrente prevista', () => {
  const outubro = [
    entrada({ descricao: 'M Dumont Bordados', data: '2026-10-07', valorCentavos: 300000, recorrente: true, diaPrevisto: 7 }),
    entrada({ descricao: 'Marcelo Pedro', data: '2026-10-06', valorCentavos: 15000, tipo: 'outro' }),
  ]

  it('recorrente de outubro não recebida aparece prevista em novembro e entra na sobra', () => {
    const previstas = previstasDoMes(outubro, '2026-11-01', '2026-10-01')
    expect(previstas).toHaveLength(1)
    expect(previstas[0]).toMatchObject({ dataPrevista: '2026-11-07', valorCentavos: 300000 })
    // Prevista não soma no total recebido…
    expect(totalRecebidoCentavos(outubro, '2026-11-01')).toBe(0)
    // … mas entra na sobra de novembro.
    const saude = saudeDoMes({
      entradasCentavos: 0, previstasCentavos: 300000, gastosCentavos: 120000, faltaMinimoCentavos: 0, margemCentavos: 30000,
    })
    expect(saude.nivel).toBe('tranquilo')
    expect(saude.sobraCentavos).toBe(180000)
  })

  it('ao lançar a entrada real (mesma descrição), a prevista some', () => {
    const comReal = [...outubro, entrada({ descricao: ' m dumont bordados ', data: '2026-11-09', valorCentavos: 310000 })]
    expect(previstasDoMes(comReal, '2026-11-01', '2026-10-01')).toEqual([])
    expect(totalRecebidoCentavos(comReal, '2026-11-01')).toBe(310000)
  })

  it('mês que já passou não tem previstas', () => {
    expect(previstasDoMes(outubro, '2026-11-01', '2026-12-01')).toEqual([])
  })

  it('dia previsto que não existe no mês usa o último dia', () => {
    const jan = [entrada({ descricao: 'Aluguel', data: '2026-01-31', valorCentavos: 50000, recorrente: true, diaPrevisto: 31 })]
    expect(previstasDoMes(jan, '2026-02-01', '2026-01-01')[0].dataPrevista).toBe('2026-02-28')
  })

  it('total por tipo considera só o que foi passado', () => {
    expect(totalPorTipo(outubro)).toEqual(new Map([['renda', 300000], ['outro', 15000]]))
  })
})
