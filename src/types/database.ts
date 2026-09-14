// Tipos manuais espelhando supabase/migrations/0001_initial.sql.
// Dinheiro sempre em centavos (number); datas de calendário como ISODate.

import type { ISODate } from '../lib/calc/datas'

export type FormaPagamento = 'pix' | 'debito' | 'credito'
export type OrigemCompra = 'manual' | 'mercado'
export type TipoMovimento = 'aporte' | 'retirada'
export type SituacaoLista = 'aberta' | 'finalizada'

export interface Perfil {
  id: string
  nome: string | null
  moeda: string
  fuso: string
  categoria_mercado_id: string | null
  criado_em: string
  atualizado_em: string
}

export interface Categoria {
  id: string
  owner_id: string
  nome: string
  cor: string
  descricao: string | null
  arquivada: boolean
  versao: number
  criado_em: string
  atualizado_em: string
}

export interface Cartao {
  id: string
  owner_id: string
  apelido: string
  dia_fechamento: number
  dia_vencimento: number
  cor: string
  arquivado: boolean
  versao: number
  criado_em: string
  atualizado_em: string
}

export interface Fatura {
  id: string
  owner_id: string
  cartao_id: string
  mes_referencia: ISODate
  data_fechamento: ISODate
  data_vencimento: ISODate
  paga: boolean
  paga_em: ISODate | null
  corrigida_apos_pagamento: boolean
  criado_em: string
  atualizado_em: string
}

export interface Compra {
  id: string
  owner_id: string
  descricao: string
  data_compra: ISODate
  valor_total_centavos: number
  categoria_id: string
  forma_pagamento: FormaPagamento
  cartao_id: string | null
  parcelas: number
  origem: OrigemCompra
  estabelecimento: string | null
  observacoes: string | null
  versao: number
  criado_em: string
  atualizado_em: string
}

export interface LancamentoMensal {
  id: string
  owner_id: string
  compra_id: string
  categoria_id: string
  valor_centavos: number
  mes_competencia: ISODate
  numero_parcela: number
  total_parcelas: number
  fatura_id: string | null
  criado_em: string
  atualizado_em: string
}

export interface Objetivo {
  id: string
  owner_id: string
  nome: string
  meta_centavos: number
  prazo: ISODate | null
  descricao: string | null
  versao: number
  criado_em: string
  atualizado_em: string
}

export interface MovimentoObjetivo {
  id: string
  owner_id: string
  objetivo_id: string
  data: ISODate
  valor_centavos: number
  tipo: TipoMovimento
  criado_em: string
}

export interface ListaMercado {
  id: string
  owner_id: string
  nome: string
  situacao: SituacaoLista
  compra_id: string | null
  finalizada_em: string | null
  versao: number
  criado_em: string
  atualizado_em: string
}

export interface ItemLista {
  id: string
  owner_id: string
  lista_id: string
  produto: string
  marca: string | null
  quantidade: number
  unidade: string
  preco_unitario_centavos: number | null
  confirmado: boolean
  posicao: number
  criado_em: string
  atualizado_em: string
}

// Formatos dos argumentos das funções RPC do banco (documentação — não
// conectados ao generic do supabase-js; ver o comentário em lib/supabase.ts).
export interface ArgsCriarCompra {
  p_descricao: string
  p_data_compra: string
  p_valor_total_centavos: number
  p_categoria_id: string
  p_forma: FormaPagamento
  p_cartao_id?: string | null
  p_parcelas?: number
  p_primeira_fatura_id?: string | null
  p_origem?: OrigemCompra
  p_estabelecimento?: string | null
  p_observacoes?: string | null
}

export interface ArgsFinalizarLista {
  p_lista_id: string
  p_data: string
  p_categoria_id: string
  p_forma: FormaPagamento
  p_cartao_id?: string | null
  p_parcelas?: number
  p_primeira_fatura_id?: string | null
  p_estabelecimento?: string | null
}

export interface ArgsCorrigirCompra {
  p_compra_id: string
  p_descricao: string
  p_data_compra: string
  p_valor_total_centavos: number
  p_forma: FormaPagamento
  p_cartao_id?: string | null
  p_parcelas?: number
  p_primeira_fatura_id?: string | null
  p_estabelecimento?: string | null
  p_observacoes?: string | null
  p_versao_lida?: number | null
}
