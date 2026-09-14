// Regras de cálculo da lista de mercado (03-regras-de-calculo.md, §8).
// Subtotal do item = quantidade × preço unitário, arredondado para
// centavos com meio centavo para cima nos valores positivos — que é
// exatamente o comportamento de Math.round para números positivos.

export interface ItemMercado {
  quantidade: number
  precoUnitarioCentavos: number | null // null !== 0: vazio bloqueia confirmação
  confirmado: boolean
}

export function subtotalItemCentavos(item: Pick<ItemMercado, 'quantidade' | 'precoUnitarioCentavos'>): number | null {
  if (item.precoUnitarioCentavos === null) return null
  return Math.round(item.quantidade * item.precoUnitarioCentavos)
}

// O check exige quantidade válida (> 0) e preço preenchido (não nulo).
// Preço explicitamente zero é válido; campo vazio (null) bloqueia.
export function podeConfirmarItem(item: Pick<ItemMercado, 'quantidade' | 'precoUnitarioCentavos'>): boolean {
  return item.quantidade > 0 && item.precoUnitarioCentavos !== null
}

export function totalConfirmadoCentavos(itens: ItemMercado[]): number {
  return itens
    .filter((item) => item.confirmado)
    .reduce((soma, item) => soma + (subtotalItemCentavos(item) ?? 0), 0)
}

export function totalForaCentavos(itens: ItemMercado[]): number {
  return itens
    .filter((item) => !item.confirmado)
    .reduce((soma, item) => soma + (subtotalItemCentavos(item) ?? 0), 0)
}
