# Alteração 06 — cancelar compra no mercado e registrar pagamento da fatura

Telas na prancheta atual `design/Financas App.dc.html`: **1p** cancelar compra · **1m** listas · **1q** desfazer compra · **1f** registrar pagamento · **1e** fatura paga · **1b** Início com “Saiu das contas”.
Na prancheta anterior (`Financas Mobile.dc.html`) eram, respectivamente, 5a, 5b, 5c, 5d, 5e e 5f — as referências abaixo usam esses IDs antigos. O visual vale o da prancheta atual (`07`).
Migração: `0004_cancelamento_e_pagamentos.sql` (neste pacote → copiar para `supabase/migrations/`).

## Regra central

**Gasto é o que foi consumido; pagamento é como a dívida foi quitada.**

- Compras no crédito continuam contadas pelas parcelas, no mês de vencimento da fatura (nada muda em `lancamentos_mensais`).
- Pagamentos de fatura vão para uma tabela própria, `pagamentos_fatura`, e **nunca** entram em soma de gastos.
- A situação da fatura (`aberta`, `parcial`, `paga`) é **derivada**: soma dos pagamentos comparada ao total das parcelas atribuídas.
- Assim, pagar com Pix do BB + boleto, em quantas partes for, não duplica nenhum valor.

## 1. Mercado — cancelar compra não realizada

**Lista aberta → cancelada** (`5a`)
- Ação "Cancelar compra" no menu da lista e no cartão da lista em andamento (`5b`).
- Motivo opcional: `nao_fui`, `comprei_em_outro_lugar`, `desisti`, `outro`.
- Opção "Levar os itens para a próxima lista": cria uma lista aberta nova com os mesmos produtos, quantidades e marcas, **sem preço e sem confirmação**.
- Nenhuma compra, nenhum lançamento. A lista fica no histórico como cancelada e pode ser **reaberta**.

**Lista finalizada → desfazer** (`5c`)
- Ação "Desfazer compra" dentro de uma lista finalizada.
- A folha mostra o gasto que será removido e o efeito no mês (`R$ 1.284,60 → R$ 1.212,52`).
- Escolha: reabrir a lista para edição ou marcá-la cancelada.
- Em uma transação: apagar a compra (os `lancamentos_mensais` saem em cascata), limpar `listas_mercado.compra_id`, mudar a situação.
- Se algum lançamento estava em fatura com pagamentos, marcar a fatura `corrigida_apos_pagamento = true` e avisar antes, como em `3a`.

**Histórico** (`5b`): seção "Em andamento" + "Histórico" com ícone e rótulo por situação. Canceladas com borda tracejada e "Reabrir".

## 2. Cartão — pagamento em partes

**Registrar pagamento** (`5d`) substitui o botão "Marcar como paga" de `2a`.
- Campos: valor, meio (`pix`, `boleto`, `debito_automatico`, `transferencia`, `outro`), conta de origem (texto livre por ora, ex.: "Banco do Brasil"), data, observação opcional.
- Atalho "Pagar o restante" preenche o saldo.
- Mostra o que já foi pago e o que falta, com barra de progresso.
- Valor > saldo: permitido com aviso ("pagamento maior que a fatura — sobra R$ X de crédito"); o excedente não vira gasto.

**Fatura paga** (`5e`): cartão principal em sage com etiqueta "Paga", lista "Como foi paga" e composição resumida. Ação "Editar pagamentos" (editar/excluir cada um).

**Parcial**: etiqueta "Parcialmente paga" + "Saldo em aberto R$ X". Juros, multa e IOF do rotativo **são** gastos reais: entram na fatura seguinte como compra da categoria `Encargos` (nova categoria sugerida, criada pela seed se não existir).

**Dashboard** (`5f`)
- Total do mês inalterado.
- Cartão "Crédito" ganha estado: sage + check quando a fatura do mês está paga; "parcial" com o saldo; neutro quando aberta.
- Novo quadro "Saiu das contas": por conta de origem, soma de Pix e débito em compras **mais** pagamentos de fatura, com o texto explicando que o pagamento não soma de novo. Serve para conferir com o extrato.
- Para Pix e débito ficarem atribuídos a uma conta, `compras` ganha `conta_origem` opcional. Sem conta, entram como "Conta não informada".

## 3. Importação de extrato (preparação)

Saídas do extrato que correspondem a um pagamento de fatura (mesmo valor e data ±3 dias, descrição contendo o emissor do cartão) devem ser **vinculadas a `pagamentos_fatura`**, nunca criadas como compra. Isto é o que evita duplicar quando o extrato do BB for importado.

## 4. Critérios de aceitação novos

- **CA27** Cancelar lista aberta não cria compra nem lançamento; lista fica `cancelada`.
- **CA28** Cancelar levando itens cria nova lista aberta com os mesmos produtos sem preço.
- **CA29** Desfazer lista finalizada remove a compra e todas as parcelas; o total do mês volta ao valor anterior.
- **CA30** Desfazer não deixa compra órfã nem lista apontando para compra inexistente (atomicidade).
- **CA31** Fatura de R$ 786,00 com pagamentos de 500,00 (Pix) e 286,00 (boleto) fica `paga`; gastos do mês continuam R$ 1.213,20.
- **CA32** Só o pagamento de 500,00 → `parcial`, saldo 286,00.
- **CA33** Excluir um pagamento recalcula a situação.
- **CA34** Nenhuma consulta de gastos (dashboard, categoria, lançamentos) lê `pagamentos_fatura`.
- **CA35** "Saiu das contas" = Pix + débito em compras + pagamentos de fatura, por conta.

## 5. Prompt para o Claude Code

> Use `08-prompt-atualizacao.md`, que junta esta alteração com a do visual. O texto abaixo fica como referência.
>
> Implemente a alteração descrita em `design_handoff_financas/06-cancelamento-e-pagamentos.md`, telas 1p, 1m, 1q, 1f, 1e e 1b de `design/Financas App.dc.html`.
>
> 1. Copie `design_handoff_financas/0004_cancelamento_e_pagamentos.sql` para `supabase/migrations/` e atualize `src/types/database.ts`.
> 2. Mercado: em `src/lib/queries/mercado.ts` adicione `useCancelarLista`, `useReabrirLista` e `useDesfazerFinalizacao` (chamando as RPCs). Em `MercadoScreen.tsx` separe "Em andamento" e "Histórico"; em `ListaMercadoDetalheScreen.tsx` adicione a folha de cancelamento (5a) e, para listas finalizadas, a de desfazer (5c).
> 3. Faturas: em `src/lib/queries/faturas.ts` troque o "marcar como paga" por `useRegistrarPagamento`, `useExcluirPagamento` e leia `faturas_resumo` para a situação. Em `FaturaCartaoScreen.tsx` implemente 5d e 5e.
> 4. Dashboard: em `DashboardScreen.tsx` aplique o estado do cartão Crédito e o quadro "Saiu das contas" (5f) usando a view `saidas_por_conta`.
> 5. Garanta que nenhuma consulta de gastos leia `pagamentos_fatura`.
> 6. Adicione os testes CA27–CA35: os de cálculo em Vitest e os de banco em `tests/acceptance/sql/`. Atualize `tests/acceptance/CHECKLIST.md`.
>
> Não altere regras já existentes de competência mensal, parcelamento ou idempotência.
