// Tipos manuais espelhando supabase/migrations/0001_initial.sql a 0009_entradas_jan_out_2026.sql.
// Dinheiro sempre em centavos (number); datas de calendário como ISODate.

import type { ISODate } from '../lib/calc/datas'

export type FormaPagamento = 'pix' | 'debito' | 'credito'
export type OrigemCompra = 'manual' | 'mercado' | 'importacao'
export type TipoMovimento = 'aporte' | 'retirada'
export type SituacaoLista = 'aberta' | 'finalizada' | 'cancelada'
export type MotivoCancelamento = 'nao_fui' | 'comprei_em_outro_lugar' | 'desisti' | 'outro'
export type MeioPagamentoFatura = 'pix' | 'boleto' | 'debito_automatico' | 'transferencia' | 'outro'
export type SituacaoFatura = 'aberta' | 'parcial' | 'paga'
export type TipoEntrada = 'renda' | 'extra' | 'reembolso' | 'ajuda' | 'outro'
export type TipoAjusteFatura = 'saldo_anterior' | 'principal_parcelamento' | 'outro'
export type TipoMinimoItem = 'media_categoria' | 'fixo'
export type NivelSaude = 'sem_entradas' | 'alto' | 'atencao' | 'tranquilo'

export interface Perfil {
  id: string
  nome: string | null
  moeda: string
  fuso: string
  categoria_mercado_id: string | null
  margem_atencao_centavos: number
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
  conta_origem: string | null
  id_externo: string | null
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
  cancelada_em: string | null
  motivo_cancelamento: MotivoCancelamento | null
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

// Pagamento de fatura: como a dívida do cartão foi quitada. NUNCA entra em
// soma de gastos — gasto vem só de lancamentos_mensais (0004, CA34).
export interface PagamentoFatura {
  id: string
  owner_id: string
  fatura_id: string
  data: ISODate
  valor_centavos: number
  meio: MeioPagamentoFatura
  conta_origem: string | null
  observacao: string | null
  id_externo: string | null
  criado_em: string
  atualizado_em: string
}

// View faturas_resumo: a fatura com total, pago, saldo e situação derivados.
export interface FaturaResumo extends Fatura {
  total_centavos: number
  pago_centavos: number
  saldo_centavos: number
  situacao: SituacaoFatura
  // 0006: total_centavos = gastos_centavos + ajustes_centavos.
  gastos_centavos: number
  ajustes_centavos: number
}

// Ajuste de fatura (0006): compõe o total da fatura, mas NÃO é gasto —
// nunca entra em dashboard, categoria ou histórico.
export interface AjusteFatura {
  id: string
  owner_id: string
  fatura_id: string
  valor_centavos: number
  tipo: TipoAjusteFatura
  descricao: string
  id_externo: string | null
  criado_em: string
}

// Entrada (0008): dinheiro que entrou. Não é gasto, não abate fatura e não
// entra em categoria.
export interface Entrada {
  id: string
  owner_id: string
  descricao: string
  data: ISODate
  valor_centavos: number
  tipo: TipoEntrada
  conta: string | null
  recorrente: boolean
  dia_previsto: number | null
  observacoes: string | null
  id_externo: string | null
  versao: number
  criado_em: string
  atualizado_em: string
}

export interface MinimoItem {
  id: string
  owner_id: string
  nome: string
  tipo: TipoMinimoItem
  categoria_id: string | null
  valor_centavos: number | null
  meses_media: number
  termo: string | null
  posicao: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

// Retorno de minimo_do_mes(p_mes).
export interface MinimoDoMesLinha {
  item_id: string
  nome: string
  tipo: TipoMinimoItem
  previsto_centavos: number
  gasto_centavos: number
  coberto_centavos: number
  falta_centavos: number
  excedente_centavos: number
  ultimo_lancamento: ISODate | null
}

// Retorno de saude_do_mes(p_mes).
export interface SaudeDoMes {
  mes: ISODate
  entradas_centavos: number
  previstas_centavos: number
  gastos_centavos: number
  minimo_centavos: number
  gasto_essencial_centavos: number
  falta_minimo_centavos: number
  sobra_centavos: number
  margem_centavos: number
  nivel: NivelSaude
}

// View balancete_mensal: entradas − gastos por mês, com acumulado do ano.
export interface BalanceteMes {
  owner_id: string
  mes: ISODate
  entradas_centavos: number
  gastos_centavos: number
  resultado_centavos: number
  acumulado_ano_centavos: number
}

// View saidas_por_conta: uso exclusivo do quadro "Saiu das contas".
export interface SaidaPorConta {
  owner_id: string
  mes: ISODate
  conta: string
  tipo: 'pix' | 'debito' | 'pagamento_fatura'
  valor_centavos: number
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

export interface ArgsCancelarLista {
  p_lista_id: string
  p_motivo?: MotivoCancelamento | null
  p_levar_itens?: boolean
}

export interface ArgsReabrirLista {
  p_lista_id: string
}

export interface ArgsDesfazerFinalizacao {
  p_lista_id: string
  p_destino?: 'aberta' | 'cancelada'
}
