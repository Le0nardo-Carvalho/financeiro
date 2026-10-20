import { describe, expect, it } from 'vitest'

// CA34 (06) e regra do 09/10: nenhuma consulta de gastos (Início, categoria,
// lançamentos) lê pagamentos_fatura, ajustes_fatura ou entradas. Teste
// estático sobre o código-fonte: cada tabela só pode ser consultada pelos
// arquivos que cuidam dela e pela exportação de dados.
const fontes = import.meta.glob<string>(['/src/**/*.ts', '/src/**/*.tsx', '!/src/**/__tests__/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const EXPORTACAO = '/src/screens/ajustes/AjustesScreen.tsx' // exportação completa dos dados

const PERMITIDOS: Record<string, Set<string>> = {
  // registrar/editar/excluir/listar pagamentos
  pagamentos_fatura: new Set(['/src/lib/queries/faturas.ts', EXPORTACAO]),
  // ajustes compõem o total da fatura (faturas_resumo), não são gasto
  ajustes_fatura: new Set(['/src/lib/queries/faturas.ts', EXPORTACAO]),
  // entradas: CRUD próprio; saúde do mês e balancete vêm de funções do banco
  entradas: new Set(['/src/lib/queries/entradas.ts', EXPORTACAO]),
}

// Onde os totais de gastos são calculados: dashboard, categoria, lançamentos.
const CONSULTAS_DE_GASTOS = [
  '/src/lib/queries/lancamentos.ts',
  '/src/lib/queries/categorias.ts',
  '/src/lib/calc/agregacao.ts',
]

function quemConsulta(tabela: string): string[] {
  const padrao = new RegExp(`from\\(\\s*['"]${tabela}['"]\\s*\\)`)
  return Object.entries(fontes)
    .filter(([, codigo]) => padrao.test(codigo))
    .map(([arquivo]) => arquivo)
}

describe('Gastos vêm só de lancamentos_mensais', () => {
  it('encontrou o código-fonte', () => {
    expect(Object.keys(fontes).length).toBeGreaterThan(20)
  })

  for (const tabela of Object.keys(PERMITIDOS)) {
    it(`só os arquivos próprios e a exportação consultam ${tabela}`, () => {
      const infratores = quemConsulta(tabela).filter((arquivo) => !PERMITIDOS[tabela].has(arquivo))
      expect(infratores).toEqual([])
    })
  }

  it('as consultas de gastos nunca citam entradas, pagamentos ou ajustes de fatura', () => {
    for (const arquivo of CONSULTAS_DE_GASTOS) {
      const codigo = fontes[arquivo]
      expect(codigo, arquivo).toBeDefined()
      for (const proibido of [
        'pagamentos_fatura', 'ajustes_fatura', 'entradas', 'saidas_por_conta', 'faturas_resumo',
        'balancete_mensal', 'saude_do_mes', 'minimo_do_mes',
      ]) {
        expect(codigo, `${arquivo} cita ${proibido}`).not.toContain(proibido)
      }
    }
    expect(fontes['/src/lib/queries/lancamentos.ts']).toContain("from('lancamentos_mensais')")
  })

  it('o total da fatura vem de faturas_resumo, não de uma soma no aparelho', () => {
    const faturas = fontes['/src/lib/queries/faturas.ts']
    expect(faturas).toContain("from('faturas_resumo')")
    // useFatura não devolve mais um total somado de lancamentos_mensais (09).
    expect(faturas).not.toMatch(/const totalCentavos = itens\.reduce/)
  })

  it('as gravações de entrada nunca tocam lançamentos, compras ou faturas', () => {
    const entradas = fontes['/src/lib/queries/entradas.ts']
    for (const tabela of ['lancamentos_mensais', 'compras', 'faturas', 'pagamentos_fatura', 'categorias']) {
      expect(entradas).not.toMatch(new RegExp(`from\\(\\s*['"]${tabela}['"]\\s*\\)`))
    }
  })
})
