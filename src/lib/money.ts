// Dinheiro sempre em centavos inteiros (bigint-safe via number, já que valores
// pessoais nunca chegam perto de Number.MAX_SAFE_INTEGER). Nunca usar float.

const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCentavos(centavos: number): string {
  // Intl usa um espaço não separável (U+00A0) entre "R$" e o valor;
  // trocamos por um espaço comum para evitar bugs sutis de exibição/cópia.
  return formatter.format(centavos / 100).replace(' ', ' ')
}

// Aceita "1.234,56", "1234,56", "1234.56" ou "1234" digitados pelo usuário.
export function parseCentavosInput(valor: string): number | null {
  const limpo = valor.trim()
  if (!limpo) return null

  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo

  const numero = Number(normalizado)
  if (!Number.isFinite(numero)) return null

  return Math.round(numero * 100)
}
