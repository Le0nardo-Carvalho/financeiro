# Critérios de aceitação (CA01–CA35) — status de validação

Fontes: `design_handoff_financas/01-especificacao-produto.md`, §15 (CA01–CA26) e `design_handoff_financas/06-cancelamento-e-pagamentos.md`, §4 (CA27–CA35).

Duas camadas de teste automatizado:

1. **Cálculo puro (Vitest, sem infraestrutura)** — `src/lib/calc/__tests__/*.test.ts` e `src/lib/queries/__tests__/*.test.ts`. Rode com `npm test`.
2. **RLS, idempotência, atomicidade e pagamentos no Postgres (SQL)** — `tests/acceptance/sql/rls_e_idempotencia.sql` e `tests/acceptance/sql/cancelamento_e_pagamentos.sql`.

Em 19/10/2026 os dois arquivos SQL foram **executados** num PostgreSQL 16 local, com as migrações 0001–0005 aplicadas sobre `tests/acceptance/sql/supabase_local_shim.sql` (uma imitação mínima de `auth.users`/`auth.uid()` e dos papéis do Supabase; instruções no topo do arquivo). Os dois terminaram sem erro. Isso valida as regras no banco, mas **não** substitui um teste no projeto Supabase de verdade (políticas de acesso da API, PostgREST e login real). Para rodar de novo:

```sh
psql -d teste -f tests/acceptance/sql/supabase_local_shim.sql
for f in supabase/migrations/*.sql; do psql -d teste -1 -v ON_ERROR_STOP=1 -f "$f"; done
psql -d teste -v ON_ERROR_STOP=1 -f tests/acceptance/sql/rls_e_idempotencia.sql
psql -d teste -v ON_ERROR_STOP=1 -f tests/acceptance/sql/cancelamento_e_pagamentos.sql
```

O `-1` (uma transação por arquivo) é necessário para a `0005`, que usa uma tabela temporária `on commit drop` — no SQL Editor do Supabase o script já roda numa transação só.

| CA | Cenário | Como é validado |
|---|---|---|
| CA01 | Pix + débito no mesmo mês | ✅ Vitest — `agregacao.test.ts` |
| CA02 | Compra parcelada soma ao mês | ✅ Vitest — `agregacao.test.ts`, `parcelas.test.ts` |
| CA03 | Divisão em 3 parcelas | ✅ Vitest — `parcelas.test.ts` |
| CA04 | Primeira fatura antes/no/depois do fechamento | ✅ Vitest — `parcelas.test.ts` |
| CA05 | Ajuste manual da primeira fatura | ✅ Vitest — `parcelas.test.ts` |
| CA06 | Parcelamento atravessa ano / mês curto | ✅ Vitest — `parcelas.test.ts` |
| CA07 | Categoria nova aparece após sincronizar | ✅ SQL (isolamento, executado localmente) + ⏳ verificação manual em 2 sessões — ver §"Como validar com dois dispositivos" no README |
| CA08 | Categoria criada no formulário preserva dados | ✅ Implementado em `NovoGastoScreen` (estado do formulário não é tocado ao criar categoria inline) — verificação funcional manual recomendada |
| CA09 | Renomear categoria com histórico | ✅ SQL (executado localmente) — `rls_e_idempotencia.sql` (bloco de reclassificação/renomeação) |
| CA10 | Editar cor da categoria | Implementado (`useAtualizarCategoria` preserva ID); sem teste automatizado dedicado — verificação manual |
| CA11 | Arquivar categoria usada | Implementado (`useArquivarCategoria`; lançamentos vinculados não são afetados porque nunca referenciam por nome); verificação manual |
| CA12 | Reclassificar compra parcelada | ✅ SQL (executado localmente) — `rls_e_idempotencia.sql` |
| CA13 | Renomear categoria padrão do Mercado | ✅ SQL (executado localmente) — `rls_e_idempotencia.sql` (vínculo por `perfis.categoria_mercado_id`) |
| CA14 | Selecionar categoria no gráfico | ✅ Vitest — `agregacao.test.ts` (histórico vs. previsão futura) |
| CA15 | Marcar fatura como paga não gera gasto | ✅ SQL (executado localmente) — `rls_e_idempotencia.sql`. Desde a 0004 o app não marca mais "paga": registra pagamentos (CA31–CA34) e a situação é derivada |
| CA16 | Progresso do objetivo (25%) | ✅ Vitest — `objetivos.test.ts` |
| CA17 | Item sem preço bloqueia confirmação | ✅ Vitest — `mercado.test.ts` |
| CA18 | Total de itens confirmados | ✅ Vitest — `mercado.test.ts` |
| CA19 | Item desmarcado fica fora do total | ✅ Vitest — `mercado.test.ts` |
| CA20 | Finalizar lista gera uma única despesa | ✅ SQL (executado localmente) — `rls_e_idempotencia.sql` |
| CA21 | Repetir finalização não duplica | ✅ SQL (executado localmente) — `rls_e_idempotencia.sql` (idempotência de `finalizar_lista`) |
| CA22 | Mercado parcelado distribui entre faturas | ✅ Vitest — `mercado.test.ts` |
| CA23 | Computador e celular veem os mesmos dados | ⏳ Requer dois dispositivos/sessões reais contra o mesmo projeto Supabase — não simulável sem infraestrutura |
| CA24 | Conflito de edição concorrente | ⏳ Sem bloco automatizado: o cabeçalho de `rls_e_idempotencia.sql` cita o CA24, mas o arquivo não testa o conflito. No cliente, toda mutação de update usa `where versao = <lida>` (`src/lib/queries/*.ts`, `ConflitoVersaoError`) — verificação manual em dois dispositivos |
| CA25 | Acesso sem autorização é impedido | ✅ SQL (executado localmente) — `rls_e_idempotencia.sql` (bloco de isolamento entre usuários A/B) |
| CA26 | Queda de conexão durante gravação | ✅ Vitest — `syncStatus.test.ts` (offline tem prioridade sobre "salvando"; `useGravacao` bloqueia e nunca marca sucesso sem confirmação do servidor) |
| CA27 | Cancelar lista aberta não cria compra nem lançamento; lista fica `cancelada` | ✅ SQL (executado localmente) — `cancelamento_e_pagamentos.sql` (também cobre reabrir) |
| CA28 | Cancelar levando itens cria lista aberta com os mesmos produtos sem preço | ✅ SQL (executado localmente) — `cancelamento_e_pagamentos.sql` |
| CA29 | Desfazer lista finalizada remove a compra e todas as parcelas; total do mês volta | ✅ SQL (executado localmente, Pix e crédito 3x com fatura paga → marcada como corrigida) + ✅ Vitest — `pagamentos.test.ts` (efeito mostrado na folha 1q) |
| CA30 | Desfazer não deixa compra órfã nem lista apontando para compra inexistente | ✅ SQL (executado localmente) — `cancelamento_e_pagamentos.sql` (inclui chamadas inválidas que não mudam nada) |
| CA31 | Fatura de R$ 786,00 paga com Pix 500,00 + boleto 286,00 fica `paga`; gastos continuam R$ 1.213,20 | ✅ SQL (executado localmente) + ✅ Vitest — `pagamentos.test.ts` |
| CA32 | Só o pagamento de 500,00 → `parcial`, saldo 286,00 | ✅ SQL (executado localmente) + ✅ Vitest — `pagamentos.test.ts` |
| CA33 | Excluir um pagamento recalcula a situação | ✅ SQL (executado localmente; excluir e editar) + ✅ Vitest — `pagamentos.test.ts` |
| CA34 | Nenhuma consulta de gastos lê `pagamentos_fatura` | ✅ Vitest — `semPagamentosEmGastos.test.ts` (varre o código: só `faturas.ts` e a exportação de Ajustes consultam a tabela) + ✅ SQL (pagamento não cria lançamento nem muda o total) |
| CA35 | "Saiu das contas" = Pix + débito em compras + pagamentos de fatura, por conta | ✅ SQL (view `saidas_por_conta`, executado localmente) + ✅ Vitest — `pagamentos.test.ts` (agrupamento da tela 1b) |

**Resumo:** os testes de cálculo rodam com `npm test` (52 testes em 19/10/2026). Os dois arquivos SQL foram executados num Postgres local e passaram; continuam pendentes só CA23 (dois dispositivos reais) e a parte manual de CA07/CA08/CA10/CA11, que dependem do projeto Supabase publicado.

**Correções nos testes antigos (19/10/2026):** `rls_e_idempotencia.sql` nunca tinha sido executado e tinha três erros de escrita que o impediam de rodar: o número de parcelas sem `::smallint` (o Postgres não acha `criar_compra` com `integer`), uma variável `fatura_id` com o mesmo nome da coluna, e um `raise notice` fora de bloco `do`. As asserções não mudaram.
