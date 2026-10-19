import { useEffect, useState } from 'react'

// O layout de computador vale a partir de 1024 px (README do handoff).
const CONSULTA = '(min-width: 1024px)'

export function useEhComputador(): boolean {
  const [eh, setEh] = useState(() => typeof window !== 'undefined' && window.matchMedia(CONSULTA).matches)
  useEffect(() => {
    const mql = window.matchMedia(CONSULTA)
    const aoMudar = () => setEh(mql.matches)
    mql.addEventListener('change', aoMudar)
    return () => mql.removeEventListener('change', aoMudar)
  }, [])
  return eh
}
