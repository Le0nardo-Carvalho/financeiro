import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { type ISODate, hojeISO, mesAnterior, parseISO, proximoMes, toISO } from '../lib/calc/datas'

interface MesSelecionadoState {
  mes: ISODate // primeiro dia do mês selecionado
  irParaMesAnterior: () => void
  irParaProximoMes: () => void
  selecionarMes: (mes: ISODate) => void
}

const MesSelecionadoContext = createContext<MesSelecionadoState | null>(null)

const CHAVE_SESSAO = 'financeiro.mesSelecionado'

function primeiroDiaMesAtual(): ISODate {
  const { ano, mes } = parseISO(hojeISO())
  return toISO({ ano, mes, dia: 1 })
}

function lerMesDaSessao(): ISODate {
  try {
    const salvo = sessionStorage.getItem(CHAVE_SESSAO)
    if (salvo) return salvo
  } catch {
    // sessionStorage indisponível (modo privado etc.) — segue com o mês atual
  }
  return primeiroDiaMesAtual()
}

// Dashboard, Lançamentos e Faturas compartilham o mês selecionado na sessão
// (README.md, "Seleção de mês").
export function MesSelecionadoProvider({ children }: { children: ReactNode }) {
  const [mes, setMes] = useState<ISODate>(lerMesDaSessao)

  function selecionarMes(novoMes: ISODate) {
    setMes(novoMes)
    try {
      sessionStorage.setItem(CHAVE_SESSAO, novoMes)
    } catch {
      // ignora indisponibilidade de sessionStorage
    }
  }

  function irParaMesAnterior() {
    const { ano, mes: m } = parseISO(mes)
    const anterior = mesAnterior(ano, m)
    selecionarMes(toISO({ ano: anterior.ano, mes: anterior.mes, dia: 1 }))
  }

  function irParaProximoMes() {
    const { ano, mes: m } = parseISO(mes)
    const proximo = proximoMes(ano, m)
    selecionarMes(toISO({ ano: proximo.ano, mes: proximo.mes, dia: 1 }))
  }

  const value = useMemo(
    () => ({ mes, irParaMesAnterior, irParaProximoMes, selecionarMes }),
    [mes],
  )

  return <MesSelecionadoContext.Provider value={value}>{children}</MesSelecionadoContext.Provider>
}

export function useMesSelecionado() {
  const ctx = useContext(MesSelecionadoContext)
  if (!ctx) throw new Error('useMesSelecionado precisa estar dentro de <MesSelecionadoProvider>')
  return ctx
}
