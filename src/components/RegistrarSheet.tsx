import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, ShoppingCart } from 'lucide-react'
import { BottomSheet, Button } from './ui'
import { rotas } from '../router/rotas'
import './RegistrarSheet.css'

// Tela 3d: o "+" central pergunta o que registrar.
export function RegistrarSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()

  function ir(destino: string, state?: unknown) {
    onClose()
    navigate(destino, state ? { state } : undefined)
  }

  return (
    <BottomSheet title="O que você quer registrar?" onClose={onClose}>
      <div className="registrar-opcoes">
        <button type="button" className="registrar-opcao" onClick={() => ir(rotas.novoLancamento)}>
          <span className="registrar-icone registrar-icone-gasto"><ArrowUpRight size={18} strokeWidth={2.75} /></span>
          <span className="registrar-texto">
            <span className="registrar-titulo">Gasto</span>
            <span className="registrar-desc">Pix, débito ou crédito parcelado</span>
          </span>
          <ChevronRight size={17} strokeWidth={2.75} />
        </button>
        <button type="button" className="registrar-opcao" onClick={() => ir(rotas.novaEntrada)}>
          <span className="registrar-icone registrar-icone-entrada"><ArrowDownLeft size={18} strokeWidth={2.75} /></span>
          <span className="registrar-texto">
            <span className="registrar-titulo">Entrada</span>
            <span className="registrar-desc">Renda, Pix recebido, reembolso</span>
          </span>
          <ChevronRight size={17} strokeWidth={2.75} />
        </button>
        <button type="button" className="registrar-opcao" onClick={() => ir(rotas.mercado, { novaLista: true })}>
          <span className="registrar-icone registrar-icone-lista"><ShoppingCart size={18} strokeWidth={2.75} /></span>
          <span className="registrar-texto">
            <span className="registrar-titulo">Lista de mercado</span>
            <span className="registrar-desc">Montar a lista e finalizar no caixa</span>
          </span>
          <ChevronRight size={17} strokeWidth={2.75} />
        </button>
      </div>
      <Button variant="ghost" className="registrar-cancelar" onClick={onClose}>Cancelar</Button>
    </BottomSheet>
  )
}
