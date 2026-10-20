# Prompt para o Claude Code — atualização completa (out/2026)

Copie tudo **abaixo da linha** e cole como primeira mensagem no Claude Code, com o repositório `Le0nardo-Carvalho/financeiro` aberto.

---

Rode `git pull`. A pasta `design_handoff_financas/` foi atualizada no repositório. Leia primeiro `design_handoff_financas/README.md`.

No Supabase eu já rodei, nesta ordem, `0004` a `0009`. Os números conferem com `conferencia_out_2026.sql`.

Faça o seguinte, **nesta ordem**, e me mostre o plano antes de começar:

1. **Migrações no repositório:** copie `design_handoff_financas/0004_…sql` até `0009_…sql` para `supabase/migrations/`, mantendo os nomes. Não rode nada no banco, porque já está aplicado. Regenere os tipos do Supabase.

2. **Visual e pagamentos/cancelamento:** siga `08-prompt-atualizacao.md`. Se algo dele já estiver implementado (confira pelo código), pule só aquela parte e me diga o que pulou.

3. **Dados importados:** siga `09-prompt-importacao.md`: total da fatura via `faturas_resumo`, seção "Ajustes da fatura" na 1e e tag "Importada do extrato".

4. **Entradas, balancete e mínimo:** siga `11-prompt-entradas.md`, com as regras de `10-entradas-balancete-minimo.md` e as telas 3a–3g de `design/Financas App.dc.html` (seção 3, no topo da prancheta).

5. **Testes:** CA01–CA33. Os novos (CA27–CA33) estão no `10`. Adicione um teste que garanta que entradas, pagamentos de fatura e ajustes de fatura **nunca** entram nos totais de gastos.

6. **Publicação:** abra um pull request com o título `Atualização out/2026: visual, importação, entradas e mínimo`. No corpo, liste o que foi feito em cada passo e o que foi pulado.

Regras que não mudam: dinheiro em centavos inteiros; competência como em `03-regras-de-calculo.md`; nada aparece como salvo antes da confirmação do servidor; use só as variáveis de `tokens.css`.
