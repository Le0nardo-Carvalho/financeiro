// Pagamento de fatura e conferência com o extrato (06-cancelamento-e-pagamentos.md).
//
// Regra central: gasto é o que foi consumido (lancamentos_mensais); pagamento
// é como a dívida do cartão foi quitada (pagamentos_fatura). Nada aqui entra
// em totaisDoMes — estes cálculos só servem para a situação da fatura e para
// o quadro "Saiu das contas".

export type SituacaoFatura = 'aberta' | 'parcial' | 'paga'

export interface PagamentoCalc {
  valorCentavos: number
}

export interface SituacaoFaturaCalc {
  totalCentavos: number
  pagoCentavos: number
  saldoCentavos: number // nunca negativo
  excedenteCentavos: number // pago acima do total: crédito, nunca gasto
  situacao: SituacaoFatura
}

// Espelha a view faturas_resumo: sem pagamento = aberta; menos que o total =
// parcial; total ou mais = paga.
export function situacaoDaFatura(totalCentavos: number, pagamentos: PagamentoCalc[]): SituacaoFaturaCalc {
  const pagoCentavos = pagamentos.reduce((s, p) => s + p.valorCentavos, 0)
  const situacao: SituacaoFatura =
    pagoCentavos === 0 ? 'aberta' : pagoCentavos < totalCentavos ? 'parcial' : 'paga'
  return {
    totalCentavos,
    pagoCentavos,
    saldoCentavos: Math.max(totalCentavos - pagoCentavos, 0),
    excedenteCentavos: Math.max(pagoCentavos - totalCentavos, 0),
    situacao,
  }
}

// Linhas no formato da view saidas_por_conta.
export interface SaidaCalc {
  conta: string
  tipo: 'pix' | 'debito' | 'pagamento_fatura'
  valorCentavos: number
}

export interface SaidasDaConta {
  conta: string
  pixCentavos: number
  debitoCentavos: number
  pagamentoFaturaCentavos: number
  totalCentavos: number
}

export const CONTA_NAO_INFORMADA = 'Conta não informada'

// "Saiu das contas" = Pix + débito em compras + pagamentos de fatura, por
// conta (CA35). Contas maiores primeiro; "Conta não informada" por último.
export function agruparSaidasPorConta(linhas: SaidaCalc[]): SaidasDaConta[] {
  const porConta = new Map<string, SaidasDaConta>()
  for (const l of linhas) {
    const atual = porConta.get(l.conta) ?? {
      conta: l.conta, pixCentavos: 0, debitoCentavos: 0, pagamentoFaturaCentavos: 0, totalCentavos: 0,
    }
    if (l.tipo === 'pix') atual.pixCentavos += l.valorCentavos
    else if (l.tipo === 'debito') atual.debitoCentavos += l.valorCentavos
    else atual.pagamentoFaturaCentavos += l.valorCentavos
    atual.totalCentavos += l.valorCentavos
    porConta.set(l.conta, atual)
  }
  return [...porConta.values()].sort((a, b) => {
    if (a.conta === CONTA_NAO_INFORMADA) return 1
    if (b.conta === CONTA_NAO_INFORMADA) return -1
    return b.totalCentavos - a.totalCentavos
  })
}

// Efeito de "Desfazer compra" no total do mês (tela 1q): o total sem as
// parcelas daquela compra que caem no mês (CA29).
export function totalDoMesSemCompra(
  lancamentosDoMes: { compraId: string; valorCentavos: number }[],
  compraId: string,
): number {
  return lancamentosDoMes
    .filter((l) => l.compraId !== compraId)
    .reduce((s, l) => s + l.valorCentavos, 0)
}
