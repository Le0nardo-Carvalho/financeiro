# Handoff: Minhas finanças

Atualizado em 19/10/2026.

- **Repositório:** `Le0nardo-Carvalho/financeiro` (branch `main`)
- **Site:** GitHub Pages (`https://le0nardo-carvalho.github.io/financeiro/`)
- **Dados e login:** Supabase. A conta é a da Ágata, com entrada por link mágico enviado ao e-mail, sem senha.

## O que muda nesta atualização

1. **Mercado:** dá para cancelar uma compra que não aconteceu e desfazer uma compra já finalizada (`06`, `0004`).
2. **Cartão:** a fatura pode ser paga em partes sem que nenhum valor seja somado duas vezes (`06`, `0004`).
3. **Visual novo:** berinjela, coral e lilás, com Newsreader e Figtree e o "+" no centro da barra (`07`, `tokens.css`, `0005`).
4. **Histórico importado:** faturas Nubank de jan a nov/2026 e extratos do BB de jan a out/2026, com parcelas, pagamentos e ajustes de fatura (`09`, `0006`, `0007`).
5. **Entradas, balancete e mínimo mensal:** registro de entradas, balancete mês a mês e mínimo para sobreviver, com alerta de gastos altos (`10`, `11`, `0008`, `0009`).

## Ordem de aplicação

| # | Onde | Arquivo |
|---|---|---|
| 1 | Supabase | `0004_cancelamento_e_pagamentos.sql` |
| 2 | Supabase | `0005_nova_paleta.sql` |
| 3 | Supabase | `0006_importacao_suporte.sql` |
| 4 | Supabase | `0007_importacao_jan_out_2026.sql` |
| 5 | Supabase | `0008_entradas_balancete_minimo.sql` |
| 6 | Supabase | `0009_entradas_jan_out_2026.sql` |
| 7 | Supabase | `conferencia_out_2026.sql` (só leitura) |
| 8 | Claude Code | `12-prompt-atualizacao-completa.md` |

O passo a passo para leigos está em `GUIA-ATUALIZACAO.md`, que vem junto com esta pasta no download.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `01-especificacao-produto.md` | Especificação do comportamento do app. É a referência principal |
| `02-modelo-de-dados.sql` | Esquema inicial (igual a `supabase/migrations/0001_initial.sql`) |
| `03-regras-de-calculo.md` | Parcelamento, competência mensal, centavos, idempotência |
| `04-publicacao-github-pages.md` | Hospedagem e login |
| `05-prompt-claude-code.md` | Prompt da primeira implementação (histórico) |
| `06-cancelamento-e-pagamentos.md` | Cancelar compra no mercado e pagar fatura em partes |
| `07-nova-identidade-visual.md` | Cores, fontes, navegação, Início e Fatura novos |
| `tokens.css` | Substitui `src/styles/tokens.css` |
| `08-prompt-atualizacao.md` | Prompt de 06 + 07 (incluído no 12) |
| `09-prompt-importacao.md` | Ajustes de fatura e compras importadas (incluído no 12) |
| `10-entradas-balancete-minimo.md` | Regras de entradas, balancete, mínimo e alertas; CA27–CA33 |
| `11-prompt-entradas.md` | Prompt das telas 3a–3g (incluído no 12) |
| `12-prompt-atualizacao-completa.md` | **Prompt único desta atualização** |
| `0004` a `0009` (`.sql`) | Migrações, nesta ordem |
| `conferencia_out_2026.sql` | Consultas para conferir os números depois da importação |
| `design/Financas App.dc.html` | **Prancheta atual**, com 34 telas. Abra no navegador |
| `design/Revisao Importacao.dc.html` | Relatório do que foi importado e do que ficou de fora |
| `design/Financas Mobile.dc.html` | Prancheta anterior; o comportamento continua valendo, o visual não |
| `design/support.js`, `design/_ds/`, `design/revisao-importacao.json` | Arquivos de que as pranchetas precisam para abrir |

## Sobre os arquivos de design

São **referências feitas em HTML**, não código para copiar. Recrie as telas no app em React com as variáveis de `tokens.css`. O design é de **alta fidelidade**: cores, tamanhos, raios e textos são finais.

Telas de celular medem 390 × 844 e as de computador 1280 × 800. O layout de computador vale a partir de cerca de 1024 px.

## Telas

| ID | Tela | Observação |
|---|---|---|
| 1a | Início | redesenhada |
| 1b | Início · "Saiu das contas" | |
| 1c | Novo gasto | |
| 1d | Lançamentos | |
| 1e | Fatura | + seção "Ajustes da fatura" (09) |
| 1f | Registrar pagamento | |
| 1g | Próximas faturas | |
| 1h | Cadastro do cartão | |
| 1i | Correção em fatura paga | |
| 1j–1l | Categorias, editar, detalhe | |
| 1m–1q | Mercado: listas, compra, finalizar, cancelar, desfazer | |
| 1r | Objetivo | |
| 1s | Ajustes | + item "Mínimo mensal" → 3c |
| 1t | Acesso (link mágico) | |
| 1u–1y | Estados: vazio, sem conexão, falha, conflito | |
| 2a, 2b | Início e Fatura · computador | |
| **3a** | Início com saúde do mês | sobra, alerta, mínimo — substitui o topo da 1a |
| **3b** | Mínimo do mês | itens, falta e conta final |
| **3c** | Ajustar mínimo | média de mercado, contas fixas, margem de alerta |
| **3d** | "+" → Gasto / Entrada / Lista | |
| **3e** | Nova entrada | |
| **3f** | Entradas do mês | recebidas e previstas |
| **3g** | Balancete | ano com resultado e acumulado |

## Comportamento (resumo)

- **Navegação no celular:** Início · Gastos · [+] · Mercado · Ajustes. O "+" abre a 3d. Categorias abre pelo Início e por Ajustes.
- **Mês selecionado:** é o mesmo no Início, em Lançamentos, Faturas, Entradas e Mínimo durante a sessão.
- **Três coisas que nunca se misturam:**
  - gasto vem de `lancamentos_mensais`;
  - pagamento de fatura vem de `pagamentos_fatura`;
  - entrada vem de `entradas`.
  Só o gasto aparece em dashboard e categorias. `ajustes_fatura` compõe o total da fatura, mas não é gasto.
- **Gravação:** "Salvando…" com o botão bloqueado; "Salvo" só depois da confirmação do servidor; em caso de falha, o formulário continua preenchido (1x).
- **Sem conexão / conflito:** 1w e 1y.
- **Animações:** folhas sobem em 180 ms com `cubic-bezier(.2,.8,.2,1)`; barras animam em 300 ms. Respeite `prefers-reduced-motion`.
