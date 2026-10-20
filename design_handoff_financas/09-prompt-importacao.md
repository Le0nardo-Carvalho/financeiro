# Prompt para o Claude Code — suporte a dados importados

Rodei no Supabase as migrações `0006_importacao_suporte.sql` e `0007_importacao_jan_out_2026.sql` (estão em `supabase/migrations/`; copie-as para lá se ainda não estiverem). Ajuste o app para elas:

1. **Tipos**: regenere os tipos do Supabase. `origem_compra` ganhou `'importacao'`; `compras` e `pagamentos_fatura` ganharam `id_externo`; nova tabela `ajustes_fatura`; `faturas_resumo` ganhou `gastos_centavos` e `ajustes_centavos` no fim.

2. **Total da fatura**: use sempre `faturas_resumo.total_centavos` (já soma lançamentos + ajustes). Não recalcule no cliente somando só `lancamentos_mensais`.

3. **Detalhe da fatura**: abaixo da lista de compras, se houver `ajustes_fatura`, mostre uma seção "Ajustes da fatura" com descrição e valor, e a legenda "Compõe o total da fatura, não conta como gasto". Mesmo estilo de linha da lista de compras, valor em `--color-neutral-700`, sem categoria.

4. **Gastos**: dashboard, categorias e histórico continuam lendo só `lancamentos_mensais`. `ajustes_fatura` e `pagamentos_fatura` nunca entram nesses totais. Adicione um teste que garanta isso.

5. **Compra importada**: no detalhe da compra com `origem = 'importacao'`, mostre a tag "Importada do extrato" (`.tag-neutral`) e as `observacoes`. Edição e reclassificação funcionam igual às manuais.

6. **Categoria Impostos**: já existe no banco; só confira que aparece no seletor e no gráfico com a cor `#ddd5ff`.

Não altere nenhuma regra de cálculo além disso. Rode os testes CA01–CA26 no final.
