import { useState } from 'react'
import { useCancelarLista } from '../../lib/queries/mercado'
import { mensagemDeErro } from '../../lib/queries/shared'
import { formatCentavos } from '../../lib/money'
import { formatMesExtenso, hojeISO } from '../../lib/calc/datas'
import { ROTULO_MOTIVO } from '../../lib/rotulos'
import type { MotivoCancelamento } from '../../types/database'
import { BottomSheet, Button } from '../../components/ui'

const MOTIVOS: MotivoCancelamento[] = ['nao_fui', 'comprei_em_outro_lugar', 'desisti']

interface Props {
  listaId: string
  nome: string
  quantidadeItens: number
  totalMarcadoCentavos: number
  onClose: () => void
  onCancelada: (novaListaId: string | null) => void
}

// Cancelar compra (tela 1p): a lista aberta vira cancelada; nenhuma compra
// nem lançamento é criado (CA27). Opcionalmente leva os produtos para uma
// lista nova, sem preço e sem confirmação (CA28).
export function CancelarCompraSheet({ listaId, nome, quantidadeItens, totalMarcadoCentavos, onClose, onCancelada }: Props) {
  const cancelar = useCancelarLista()
  const [motivo, setMotivo] = useState<MotivoCancelamento | null>(null)
  const [levarItens, setLevarItens] = useState(quantidadeItens > 0)
  const [erro, setErro] = useState<string | null>(null)

  async function aoCancelar() {
    setErro(null)
    try {
      const novaListaId = await cancelar.mutateAsync({ listaId, motivo, levarItens: levarItens && quantidadeItens > 0 })
      onCancelada(novaListaId)
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <BottomSheet
      title="Cancelar esta compra?"
      subtitle={`${nome} · ${quantidadeItens} ${quantidadeItens === 1 ? 'item' : 'itens'} · nada foi pago`}
      onClose={onClose}
    >
      <div>
        <span className="pag-rotulo">O que aconteceu? <span className="text-muted">(opcional)</span></span>
        <div className="cancelar-motivos" role="radiogroup" aria-label="Motivo do cancelamento">
          {MOTIVOS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={motivo === m}
              className={`opcao-radio ${motivo === m ? 'opcao-radio-ativa' : ''}`}
              onClick={() => setMotivo(motivo === m ? null : m)}
            >
              <span className="opcao-radio-marca" aria-hidden />
              {ROTULO_MOTIVO[m]}
            </button>
          ))}
        </div>
      </div>

      {quantidadeItens > 0 && (
        <div className="cancelar-levar">
          <span style={{ flex: 1 }}>
            <span className="atalho-titulo" id="levar-itens-rotulo">Levar os itens para a próxima lista</span>
            <span className="atalho-desc">{quantidadeItens} {quantidadeItens === 1 ? 'produto' : 'produtos'}, sem os preços desta vez</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={levarItens}
            aria-labelledby="levar-itens-rotulo"
            className="interruptor"
            onClick={() => setLevarItens((v) => !v)}
          />
        </div>
      )}

      <div className="sheet-aviso">
        <span>
          <strong>Nenhum gasto é criado.</strong>{' '}
          {totalMarcadoCentavos > 0 && <>Os {formatCentavos(totalMarcadoCentavos)} já marcados não entram em {formatMesExtenso(hojeISO())}. </>}
          A lista fica no histórico como cancelada e pode ser reaberta.
        </span>
      </div>

      {erro && <div className="novo-gasto-erro" role="alert">{erro}</div>}

      <div className="sheet-actions-lado">
        <Button variant="contorno" onClick={onClose}>Voltar</Button>
        <Button variant="perigo" onClick={aoCancelar} disabled={cancelar.isPending}>
          {cancelar.isPending ? 'Salvando…' : 'Cancelar compra'}
        </Button>
      </div>
    </BottomSheet>
  )
}
