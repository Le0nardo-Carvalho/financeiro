# Prompt para o Claude Code — atualização de 19/10/2026

Copie tudo o que está abaixo da linha e cole na primeira mensagem do Claude Code.

---

Atualize o app do repositório `Le0nardo-Carvalho/financeiro` com o pacote `design_handoff_financas/`.

Antes de tudo, rode `git pull` para baixar a versão mais recente do pacote. Depois leia, nesta ordem:
- `design_handoff_financas/README.md`
- `design_handoff_financas/06-cancelamento-e-pagamentos.md`
- `design_handoff_financas/07-nova-identidade-visual.md`

A referência visual é `design_handoff_financas/design/Financas App.dc.html`. Ela é só referência: não copie esse arquivo para o app.

As migrações `0004_cancelamento_e_pagamentos.sql` e `0005_nova_paleta.sql` **já foram aplicadas por mim no Supabase** pelo SQL Editor. Copie as duas para `supabase/migrations/` só para manter o histórico. Não tente aplicar de novo. Atualize `src/types/database.ts` com as tabelas, colunas e views novas.

Comece me mostrando, em texto, a lista do que vai mudar e em quais arquivos. Só depois escreva código.

## Parte A — funcionalidade (arquivo 06)

1. **Mercado.**
   - Em `src/lib/queries/mercado.ts`, crie `useCancelarLista`, `useReabrirLista` e `useDesfazerFinalizacao`, chamando as funções `cancelar_lista`, `reabrir_lista` e `desfazer_finalizacao`.
   - A tela Mercado separa "Em andamento" de "Histórico" (tela 1m).
   - A lista ganha a folha "Cancelar compra" (1p) e, quando já foi finalizada, a folha "Desfazer compra" (1q).
2. **Faturas.**
   - Troque "Marcar como paga" por "Registrar pagamento" (1f), usando a tabela `pagamentos_fatura`. O pagamento pode ser feito em partes, com meio e conta de origem.
   - Leia a situação da fatura (aberta, parcial ou paga) da view `faturas_resumo`.
   - Mostre a lista "Como foi paga" e permita editar e excluir pagamentos (1e).
3. **Início.**
   - O cartão de crédito mostra a situação da fatura.
   - Crie o quadro "Saiu das contas" a partir da view `saidas_por_conta` (tela 1b).
   - **Nenhuma consulta de gastos pode ler `pagamentos_fatura`.**

## Parte B — visual (arquivo 07)

1. Substitua `src/styles/tokens.css` por `design_handoff_financas/tokens.css`. Mude o `theme-color` em `index.html` para `#171019`.
2. Procure no código cores escritas direto (hex, `rgb`, sombras próprias) e troque pelas variáveis. Confira o contraste das telas que usam `var(--color-bg)` como cor de texto.
3. Navegação do celular (`src/layouts/AppLayout.tsx` e `.css`):
   - a barra fica Início · Gastos · [+] · Mercado · Ajustes;
   - o "+" é o botão central descrito no 07 e abre a tela de novo gasto que já existe;
   - Categorias sai da barra e passa a abrir por "Ver todas" no Início e pelo item Categorias em Ajustes.
4. Refaça o Início (tela 1a) e a Fatura (tela 1e) como no 07. Isso inclui o comparativo com o mês anterior, o gráfico dos últimos 6 meses, o bloco "Por categoria", o cartão visual e a linha do tempo de pagamentos.
5. Aplique a regra dos valores: até 20 px em Figtree 700 com algarismos tabulares (`.valor`), acima disso em Newsreader (`.valor-destaque`). Gastos em "Recentes" levam o sinal −.
6. Compare cada tela do app com a prancheta, uma por uma (1a–1y no celular, 2a–2b no computador). Liste o que ficou diferente e por quê.

## Testes

- Implemente os critérios CA27–CA35 do 06: os de cálculo em Vitest e os de banco em `tests/acceptance/sql/`.
- Atualize `tests/acceptance/CHECKLIST.md`.
- Rode toda a suíte. Os testes antigos têm que continuar passando.

## Regras que não mudam

- Competência mensal, divisão de parcelas em centavos e finalização idempotente do mercado continuam como estão.
- Pagamento de fatura nunca soma aos gastos.
- Nenhuma credencial vai para o repositório.

## Ao terminar

1. Faça um commit em português descrevendo as mudanças e envie para a branch `main`. Se estiver no Claude Code do navegador, abra um pull request.
2. Me diga em linguagem simples:
   - o que mudou;
   - o que eu preciso conferir no site publicado;
   - se ficou alguma pendência.
