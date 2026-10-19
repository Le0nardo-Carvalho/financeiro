import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMesSelecionado } from '../context/MesSelecionadoContext'
import { parseISO } from '../lib/calc/datas'
import './SeletorMes.css'

const CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Pílula do mês selecionado (Início, Fatura). O mês é o mesmo em todas as
// telas durante a sessão.
export function SeletorMes() {
  const { mes, irParaMesAnterior, irParaProximoMes } = useMesSelecionado()
  const { ano, mes: m } = parseISO(mes)
  return (
    <span className="seletor-mes">
      <button type="button" onClick={irParaMesAnterior} aria-label="Mês anterior"><ChevronLeft size={15} strokeWidth={2.75} /></button>
      <span className="seletor-mes-rotulo">{CURTO[m - 1]} {ano}</span>
      <button type="button" onClick={irParaProximoMes} aria-label="Próximo mês"><ChevronRight size={15} strokeWidth={2.75} /></button>
    </span>
  )
}
