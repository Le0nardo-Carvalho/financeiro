# Critérios de aceitação (CA01–CA35 e CA27-E–CA33-E) — status de validação

Fontes: `design_handoff_financas/01-especificacao-produto.md`, §15 (CA01–CA26), `design_handoff_financas/06-cancelamento-e-pagamentos.md`, §4 (CA27–CA35) e `design_handoff_financas/10-entradas-balancete-minimo.md`, §4.

**Numeração:** o `10` reaproveita os números CA27–CA33, que já eram do `06`. Para não confundir, os critérios do `10` (entradas, balancete e mínimo) levam aqui o sufixo **-E**: CA27-E a CA33-E. Os CA27–CA35 sem sufixo continuam sendo os do `06`.

Duas camadas de teste automatizado:

1. **Cálculo puro (Vitest, sem infraestrutura)** — `src/lib/calc/__tests__/*.test.ts` e `src/lib/queries/__tests__/*.test.ts`. Rode com `npm test`.
2. **RLS, idempotência, atomicidade, pagamentos, entradas e mínimo no Postgres (SQL)** — `tests/acceptance/sql/rls_e_idempotencia.sql`, `tests/acceptance/sql/cancelamento_e_pagamentos.sql` e `tests/acceptance/sql/entradas_e_minimo.sql`.

Em 20/10/2026 os três arquivos SQL foram **executados** num PostgreSQL 16 local, com as migrações 0001–0006 e 0008 aplicadas sobre `tests/acceptance/sql/supabase_local_shim.sql` (uma imitação mínima de `auth.users`/`auth.uid()` e dos papéis do Supabase; instruções no topo do arquivo). Os três terminaram sem erro. A `0007` e a `0009` são só os dados importados da conta real: elas exigem exatamente um perfil (e, a 0007, o cartão Nubank e as compras já lançadas) e por isso não rodam num banco de teste vazio — a conferência desses números é o `design_handoff_financas/conferencia_out_2026.sql`, já rodado no Supabase. Isso valida as regras no banco, mas **não** substitui um teste no projeto Supabase de verdade (políticas de acesso da API, PostgREST e login real). Para rodar de novo:

```sh
psql -d teste -f tests/acceptance/sql/supabase_local_shim.sql
for f in supabase/migrations/*.sql; do
  case "$f" in *0007_*|*0009_*) continue;; esac   # só dados da conta real
  psql -d teste -1 -v ON_ERROR_STOP=1 -f "$f"
done
psql -d teste -v ON_ERROR_STOP=1 -f tests/acceptance/sql/rls_e_idempotencia.sql
psql -d teste -v ON_ERROR_STOP=1 -f tests/acceptance/sql/cancelamento_e_pagamentos.sql
psql -d teste -v ON_ERROR_STOP=1 -f tests/acceptance/sql/entradas_e_minimo.sql
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
| CA34 | Nenhuma consulta de gastos lê `pagamentos_fatura` | ✅ Vitest — `semPagamentosEmGastos.test.ts` (varre o código: só `faturas.ts` e a exportação de Ajustes consultam a tabela; ampliado em 20/10 para `ajustes_fatura` e `entradas`) + ✅ SQL (pagamento não cria lançamento nem muda o total) |
| CA35 | "Saiu das contas" = Pix + débito em compras + pagamentos de fatura, por conta | ✅ SQL (view `saidas_por_conta`, executado localmente) + ✅ Vitest — `pagamentos.test.ts` (agrupamento da tela 1b) |


### Entradas, balancete e mínimo (`10`)

| CA | Cenário | Como é validado |
|---|---|---|
| CA27-E | Entrada de R$ 3.000,00 não altera gastos do mês, categoria nem fatura | ✅ SQL (executado localmente) — `entradas_e_minimo.sql` (também com pagamento e ajuste de fatura no mesmo mês) + ✅ Vitest — `entradas.test.ts` |
| CA28-E | Balancete = entradas − `lancamentos_mensais` do mês; acumulado reinicia em janeiro | ✅ SQL (executado localmente; dez/2025 → jan/2026 e todos os meses conferidos) + ✅ Vitest — `entradas.test.ts` (`montarBalancete`, `balanceteAteMes`) |
| CA29-E | Mercado jul 687,10 · ago 620,49 · set 426,19 → previsto de outubro 577,93 | ✅ SQL (executado localmente, `minimo_do_mes`) + ✅ Vitest — `entradas.test.ts` (`mediaDosMesesFechados`, prévia da tela 3c) |
| CA30-E | Conta fixa paga acima do previsto (479,78 de 380,00) → falta 0, excedente 99,78; a água continua faltando 100,00 | ✅ SQL (executado localmente) + ✅ Vitest — `entradas.test.ts` |
| CA31-E | Sobra 75,18 e falta 321,39 → nível "alto" e "faltam R$ 246,21" | ✅ SQL (executado localmente, `saude_do_mes` com os números reais de out/2026) + ✅ Vitest — `entradas.test.ts` (nível e texto do card de alerta) |
| CA32-E | Sobra entre 0 e a margem → atenção; acima → tranquilo; sem entradas → sem_entradas | ✅ SQL (executado localmente, inclusive margem editada para 500,00) + ✅ Vitest — `entradas.test.ts` |
| CA33-E | Recorrente não recebida aparece como prevista e entra na sobra; a entrada real apaga a prevista | ✅ SQL (executado localmente, no mês corrente) + ✅ Vitest — `entradas.test.ts` (`previstasDoMes`) |
| — | Entradas, pagamentos e ajustes de fatura **nunca** entram nos totais de gastos | ✅ Vitest — `semPagamentosEmGastos.test.ts` (cada tabela só é consultada pelo arquivo dela e pela exportação; as consultas de gastos não citam nenhuma delas; o total da fatura vem de `faturas_resumo`) + ✅ SQL — bloco CA27-E de `entradas_e_minimo.sql` |

**Resumo:** os testes de cálculo rodam com `npm test` (74 testes em 20/10/2026). Os três arquivos SQL foram executados num Postgres local e passaram; continuam pendentes só CA23 (dois dispositivos reais) e a parte manual de CA07/CA08/CA10/CA11, que dependem do projeto Supabase publicado.

**Correções nos testes antigos (19/10/2026):** `rls_e_idempotencia.sql` nunca tinha sido executado e tinha três erros de escrita que o impediam de rodar: o número de parcelas sem `::smallint` (o Postgres não acha `criar_compra` com `integer`), uma variável `fatura_id` com o mesmo nome da coluna, e um `raise notice` fora de bloco `do`. As asserções não mudaram.
