import { describe, expect, it } from 'vitest'
import { bloqueiaGravacao, calcularStatusSync } from '../syncStatus'

describe('CA26 — nunca apresentar gravação como concluída antes da confirmação', () => {
  it('uma gravação em andamento nunca aparece como "atualizado", mesmo online', () => {
    expect(calcularStatusSync({ online: true, erro: false, emAndamento: 1 })).toBe('salvando')
  })

  it('perder a conexão durante uma gravação em andamento mostra offline, não sucesso', () => {
    // A conexão cai no meio de uma gravação: emAndamento ainda é 1, mas
    // offline tem prioridade — nunca se mostra "salvando" nem "atualizado"
    // quando não há garantia de que o servidor recebeu a gravação.
    expect(calcularStatusSync({ online: false, erro: false, emAndamento: 1 })).toBe('offline')
  })

  it('uma falha de gravação nunca é mostrada como sucesso', () => {
    expect(calcularStatusSync({ online: true, erro: true, emAndamento: 0 })).toBe('erro')
  })

  it('só mostra "atualizado" quando online, sem erro e sem gravação pendente', () => {
    expect(calcularStatusSync({ online: true, erro: false, emAndamento: 0 })).toBe('atualizado')
  })
})

describe('offline bloqueia novas gravações', () => {
  it('bloqueiaGravacao é verdadeiro apenas quando offline', () => {
    expect(bloqueiaGravacao('offline')).toBe(true)
    expect(bloqueiaGravacao('erro')).toBe(false)
    expect(bloqueiaGravacao('salvando')).toBe(false)
    expect(bloqueiaGravacao('atualizado')).toBe(false)
  })
})
