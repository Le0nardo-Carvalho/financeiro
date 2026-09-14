// Espelho em TypeScript das funções SQL de 02-modelo-de-dados.sql
// (dia_seguro, primeira_fatura, fatura_seguinte, dividir_parcelas).
//
// Usado só para a PRÉVIA no formulário de despesa, antes de salvar — a
// gravação real chama as funções do banco (criar_compra), que são a fonte
// de verdade. As duas implementações precisam concordar; é o que os testes
// deste arquivo garantem (03-regras-de-calculo.md, §3 e §4).

import { type ISODate, compareISO, diaSeguro, parseISO, proximoMes, toISO } from './datas'

export interface Cartao {
  diaFechamento: number
  diaVencimento: number
}

export interface ReferenciaFatura {
  mesReferencia: ISODate // primeiro dia do mês de vencimento
  dataFechamento: ISODate
  dataVencimento: ISODate
}

// Convenção do app: compra feita NO dia do fechamento entra naquela fatura.
export function primeiraFatura(cartao: Cartao, dataCompra: ISODate): ReferenciaFatura {
  const compra = parseISO(dataCompra)

  let fech = diaSeguro(compra.ano, compra.mes, cartao.diaFechamento)
  if (compareISO(dataCompra, fech) > 0) {
    const { ano: y, mes: m } = proximoMes(parseISO(fech).ano, parseISO(fech).mes)
    fech = diaSeguro(y, m, cartao.diaFechamento)
  }

  const fechParts = parseISO(fech)
  let venc = diaSeguro(fechParts.ano, fechParts.mes, cartao.diaVencimento)
  if (compareISO(venc, fech) <= 0) {
    const { ano: y, mes: m } = proximoMes(fechParts.ano, fechParts.mes)
    venc = diaSeguro(y, m, cartao.diaVencimento)
  }

  const vencParts = parseISO(venc)
  const mesReferencia = toISO({ ano: vencParts.ano, mes: vencParts.mes, dia: 1 })

  return { mesReferencia, dataFechamento: fech, dataVencimento: venc }
}

// Fatura seguinte, para as parcelas 2..N — mesma regra de fatura_seguinte().
export function faturaSeguinte(cartao: Cartao, anterior: ReferenciaFatura): ReferenciaFatura {
  const refParts = parseISO(anterior.mesReferencia)
  const { ano: mesRefAno, mes: mesRefMes } = proximoMes(refParts.ano, refParts.mes)
  const mesReferencia = toISO({ ano: mesRefAno, mes: mesRefMes, dia: 1 })

  const fechAnteriorParts = parseISO(anterior.dataFechamento)
  const { ano: fechAno, mes: fechMes } = proximoMes(fechAnteriorParts.ano, fechAnteriorParts.mes)
  const dataFechamento = diaSeguro(fechAno, fechMes, cartao.diaFechamento)

  const dataVencimento = diaSeguro(mesRefAno, mesRefMes, cartao.diaVencimento)

  return { mesReferencia, dataFechamento, dataVencimento }
}

// Divide o total em N parcelas inteiras de centavos; os centavos restantes
// vão para as primeiras parcelas. Soma das parcelas === total, sempre.
export function dividirParcelas(totalCentavos: number, parcelas: number): number[] {
  if (!Number.isInteger(parcelas) || parcelas < 1) {
    throw new Error('número de parcelas precisa ser um inteiro maior ou igual a 1')
  }
  if (totalCentavos < parcelas) {
    throw new Error('valor total insuficiente para gerar parcelas sem parcela zerada')
  }

  const base = Math.floor(totalCentavos / parcelas)
  const resto = totalCentavos % parcelas

  return Array.from({ length: parcelas }, (_, i) => base + (i < resto ? 1 : 0))
}

export interface ParcelaPrevia {
  numero: number
  totalParcelas: number
  valorCentavos: number
  mesReferencia: ISODate
  dataVencimento: ISODate
}

// Prévia completa mostrada em "Novo gasto" antes de salvar — cada parcela
// com seu valor e o mês/data de vencimento da fatura correspondente.
export function gerarPreviaParcelas(
  cartao: Cartao,
  dataCompra: ISODate,
  totalCentavos: number,
  parcelas: number,
  primeiraFaturaAjustada?: ReferenciaFatura,
): ParcelaPrevia[] {
  const valores = dividirParcelas(totalCentavos, parcelas)
  const previa: ParcelaPrevia[] = []

  let fatura = primeiraFaturaAjustada ?? primeiraFatura(cartao, dataCompra)

  for (let i = 0; i < parcelas; i++) {
    if (i > 0) fatura = faturaSeguinte(cartao, fatura)
    previa.push({
      numero: i + 1,
      totalParcelas: parcelas,
      valorCentavos: valores[i],
      mesReferencia: fatura.mesReferencia,
      dataVencimento: fatura.dataVencimento,
    })
  }

  return previa
}
