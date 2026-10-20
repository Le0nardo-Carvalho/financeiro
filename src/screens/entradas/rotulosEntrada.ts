import type { TipoEntrada } from '../../types/database'

export const TIPOS_ENTRADA: TipoEntrada[] = ['renda', 'extra', 'reembolso', 'ajuda', 'outro']

export const ROTULO_TIPO_ENTRADA: Record<TipoEntrada, string> = {
  renda: 'Renda',
  extra: 'Extra',
  reembolso: 'Reembolso',
  ajuda: 'Ajuda',
  outro: 'Outro',
}

// Contas oferecidas na tela 3e (10, §1).
export const CONTAS_ENTRADA = ['Banco do Brasil', 'Nubank', 'Dinheiro']

// Cor de cada tipo na barra de "Entrou em …" (3f).
export const COR_TIPO_ENTRADA: Record<TipoEntrada, string> = {
  renda: 'var(--color-accent-2-600)',
  extra: 'var(--color-accent-2-400)',
  reembolso: 'var(--color-accent-700)',
  ajuda: 'var(--color-accent-2-800)',
  outro: 'var(--color-accent-2-900)',
}
