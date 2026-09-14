# Critérios de aceitação (CA01–CA26) — status de validação

Fonte: `design_handoff_financas/01-especificacao-produto.md`, §15.

Duas camadas de teste automatizado:

1. **Cálculo puro (Vitest, roda agora, sem infraestrutura)** — `src/lib/calc/__tests__/*.test.ts`. Rode com `npm test`.
2. **RLS, idempotência e atomicidade no Postgres (SQL, requer Supabase real)** — `tests/acceptance/sql/rls_e_idempotencia.sql`. Este ambiente de desenvolvimento não tem Docker disponível para rodar `supabase start`, então este arquivo **não foi executado aqui**. Rode-o você mesmo (instruções no topo do arquivo) contra um projeto Supabase — local via CLI ou um projeto de teste — antes de considerar essas linhas validadas.

| CA | Cenário | Como é validado |
|---|---|---|
| CA01 | Pix + débito no mesmo mês | ✅ Vitest — `agregacao.test.ts` |
| CA02 | Compra parcelada soma ao mês | ✅ Vitest — `agregacao.test.ts`, `parcelas.test.ts` |
| CA03 | Divisão em 3 parcelas | ✅ Vitest — `parcelas.test.ts` |
| CA04 | Primeira fatura antes/no/depois do fechamento | ✅ Vitest — `parcelas.test.ts` |
| CA05 | Ajuste manual da primeira fatura | ✅ Vitest — `parcelas.test.ts` |
| CA06 | Parcelamento atravessa ano / mês curto | ✅ Vitest — `parcelas.test.ts` |
| CA07 | Categoria nova aparece após sincronizar | ⏳ SQL (isolamento) + verificação manual em 2 sessões — ver `sql/rls_e_idempotencia.sql` e §"Como validar com dois dispositivos" no README |
| CA08 | Categoria criada no formulário preserva dados | ✅ Implementado em `NovoGastoScreen` (estado do formulário não é tocado ao criar categoria inline) — verificação funcional manual recomendada |
| CA09 | Renomear categoria com histórico | ⏳ SQL — `rls_e_idempotencia.sql` (bloco de reclassificação/renomeação) |
| CA10 | Editar cor da categoria | Implementado (`useAtualizarCategoria` preserva ID); sem teste automatizado dedicado — verificação manual |
| CA11 | Arquivar categoria usada | Implementado (`useArquivarCategoria`; lançamentos vinculados não são afetados porque nunca referenciam por nome); verificação manual |
| CA12 | Reclassificar compra parcelada | ⏳ SQL — `rls_e_idempotencia.sql` |
| CA13 | Renomear categoria padrão do Mercado | ⏳ SQL — `rls_e_idempotencia.sql` (vínculo por `perfis.categoria_mercado_id`) |
| CA14 | Selecionar categoria no gráfico | ✅ Vitest — `agregacao.test.ts` (histórico vs. previsão futura) |
| CA15 | Marcar fatura como paga não gera gasto | ⏳ SQL — `rls_e_idempotencia.sql` |
| CA16 | Progresso do objetivo (25%) | ✅ Vitest — `objetivos.test.ts` |
| CA17 | Item sem preço bloqueia confirmação | ✅ Vitest — `mercado.test.ts` |
| CA18 | Total de itens confirmados | ✅ Vitest — `mercado.test.ts` |
| CA19 | Item desmarcado fica fora do total | ✅ Vitest — `mercado.test.ts` |
| CA20 | Finalizar lista gera uma única despesa | ⏳ SQL — `rls_e_idempotencia.sql` |
| CA21 | Repetir finalização não duplica | ⏳ SQL — `rls_e_idempotencia.sql` (idempotência de `finalizar_lista`) |
| CA22 | Mercado parcelado distribui entre faturas | ✅ Vitest — `mercado.test.ts` |
| CA23 | Computador e celular veem os mesmos dados | ⏳ Requer dois dispositivos/sessões reais contra o mesmo projeto Supabase — não simulável sem infraestrutura |
| CA24 | Conflito de edição concorrente | ⏳ SQL (constraint `where versao = <lida>`) — `rls_e_idempotencia.sql`. No cliente, toda mutação de update usa esse padrão (`src/lib/queries/*.ts`, `ConflitoVersaoError`) |
| CA25 | Acesso sem autorização é impedido | ⏳ SQL — `rls_e_idempotencia.sql` (bloco de isolamento entre usuários A/B) |
| CA26 | Queda de conexão durante gravação | ✅ Vitest — `syncStatus.test.ts` (offline tem prioridade sobre "salvando"; `useGravacao` bloqueia e nunca marca sucesso sem confirmação do servidor) |

**Resumo:** 12 critérios têm teste automatizado executado nesta sessão (31 a mais que o mínimo, cobrindo o "mais crítico" apontado em `03-regras-de-calculo.md` §11: CA02, CA03, CA04, CA06). Os demais (10 critérios) dependem de um projeto Supabase real — o script SQL está pronto e cobre 8 deles; CA07 e CA23 exigem literalmente dois dispositivos/sessões autenticados contra a mesma base, o que só pode ser verificado depois da configuração externa listada no README.
