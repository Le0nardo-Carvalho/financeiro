# Prompt para o Claude Code — entradas, balancete e mínimo mensal

Rodei no Supabase `0008_entradas_balancete_minimo.sql` e `0009_entradas_jan_out_2026.sql` (copie-os para `supabase/migrations/`). Implemente as telas `3a`–`3g` de `design/Financas App.dc.html` (seção 3) seguindo `10-entradas-balancete-minimo.md`.

1. **Tipos**: regenere os tipos do Supabase (`entradas`, `minimo_itens`, `perfis.margem_atencao_centavos`, view `balancete_mensal`, funções `minimo_do_mes` e `saude_do_mes`).
2. **"+" central (3d)**: abre um sheet com Gasto, Entrada e Lista de mercado.
3. **Nova entrada (3e)** e **Entradas do mês (3f)**: CRUD em `entradas`, com concorrência otimista por `versao`. As previstas vêm das recorrentes do mês anterior sem correspondente no mês.
4. **Início (3a)**: no topo, "Sobra do mês" (entradas − gastos), o card de alerta conforme `saude_do_mes().nivel` e o card "Mínimo do mês". Os totais de gastos continuam lendo só `lancamentos_mensais`.
5. **Mínimo do mês (3b)**: lista de `minimo_do_mes(mes)` e a conta final de `saude_do_mes(mes)`.
6. **Ajustar mínimo (3c)**: editar `minimo_itens` (meses da média de mercado, valor e termo das contas fixas, adicionar conta) e `perfis.margem_atencao_centavos`.
7. **Balancete (3g)**: `balancete_mensal` do ano, até o mês atual, com gráfico entradas × gastos e tabela com acumulado.
8. **Navegação**: o card "Balancete" do Início abre a 3g; "Ver mínimo do mês" abre a 3b; em Ajustes, adicione "Mínimo mensal" → 3c.
9. **Testes**: CA27–CA33, além dos CA01–CA26 existentes.

Use os tokens de `tokens.css`. Não mude nenhuma regra de gastos, faturas ou pagamentos.
