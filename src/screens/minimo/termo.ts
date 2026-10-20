// O "termo" de uma conta fixa é uma expressão regular do Postgres (~*, sem
// diferenciar maiúsculas) — ex.: 'neoenergia|\mceb\M'. A tela mostra e
// edita a versão legível: "Neoenergia, CEB".

const SIGLA_MAX = 3

function capitalizar(palavra: string): string {
  if (palavra.length <= SIGLA_MAX) return palavra.toUpperCase()
  return palavra.charAt(0).toUpperCase() + palavra.slice(1)
}

export function termoLegivel(termo: string): string {
  return termo
    .split('|')
    .map((parte) => parte.replace(/\\[mMyY]/g, '').replace(/\\(.)/g, '$1').trim())
    .filter(Boolean)
    .map(capitalizar)
    .join(', ')
}

// Palavras curtas (siglas) só casam como palavra inteira: "CEB" não pode
// reconhecer "CEBOLA".
export function regexDoTermo(texto: string): string | null {
  const partes = texto
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .map((p) => {
      const escapado = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return p.length <= SIGLA_MAX ? `\\m${escapado}\\M` : escapado
    })
  return partes.length > 0 ? partes.join('|') : null
}
