import { describe, expect, it } from 'vitest'

// CA34 — nenhuma consulta de gastos (Início, categoria, lançamentos) lê
// pagamentos_fatura. Teste estático sobre o código-fonte: só os arquivos de
// pagamento da fatura e a exportação de dados podem consultar a tabela.
const fontes = import.meta.glob<string>(['/src/**/*.ts', '/src/**/*.tsx', '!/src/**/__tests__/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const PERMITIDOS = new Set([
  '/src/lib/queries/faturas.ts', // registrar/editar/excluir/listar pagamentos
  '/src/screens/ajustes/AjustesScreen.tsx', // exportação completa dos dados
])

describe('CA34 — consultas de gastos não leem pagamentos_fatura', () => {
  it('encontrou o código-fonte', () => {
    expect(Object.keys(fontes).length).toBeGreaterThan(20)
  })

  it('só os arquivos de pagamento e a exportação consultam a tabela', () => {
    const infratores = Object.entries(fontes)
      .filter(([, codigo]) => /from\(\s*['"]pagamentos_fatura['"]\s*\)/.test(codigo))
      .map(([arquivo]) => arquivo)
      .filter((arquivo) => !PERMITIDOS.has(arquivo))
    expect(infratores).toEqual([])
  })

  it('as consultas de gastos usam só lancamentos_mensais', () => {
    for (const arquivo of ['/src/lib/queries/lancamentos.ts', '/src/lib/calc/agregacao.ts']) {
      const codigo = fontes[arquivo]
      expect(codigo).toBeDefined()
      expect(codigo).not.toContain('pagamentos_fatura')
      expect(codigo).not.toContain('saidas_por_conta')
      expect(codigo).not.toContain('faturas_resumo')
    }
    expect(fontes['/src/lib/queries/lancamentos.ts']).toContain("from('lancamentos_mensais')")
  })
})
