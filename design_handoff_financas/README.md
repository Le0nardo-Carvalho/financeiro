# Handoff: Minhas finanças

Atualizado em 19/10/2026.

- **Repositório:** `Le0nardo-Carvalho/financeiro` (branch `main`)
- **Site:** GitHub Pages (`https://le0nardo-carvalho.github.io/financeiro/`)
- **Dados e login:** Supabase. A conta é a da Ágata, com entrada por link mágico enviado ao e-mail, sem senha.

## O que muda nesta atualização

1. **Mercado:** dá para cancelar uma compra que não aconteceu e desfazer uma compra já finalizada. Detalhes em `06` e `0004`.
2. **Cartão:** a fatura pode ser paga em partes (Pix, boleto etc.) sem que nenhum valor seja somado duas vezes. Detalhes em `06` e `0004`.
3. **Visual novo:** berinjela, coral e lilás, com as fontes Newsreader e Figtree e o botão "+" no centro da barra. Detalhes em `07`, `tokens.css` e `0005`.

## Ordem de aplicação

1. `0004_cancelamento_e_pagamentos.sql` no SQL Editor do Supabase.
2. `0005_nova_paleta.sql` no SQL Editor do Supabase.
3. Claude Code com o prompt de `08-prompt-atualizacao.md`.

O passo a passo para leigos está em `COMO-ATUALIZAR.md`, que vem junto com esta pasta no download.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `01-especificacao-produto.md` | Especificação do comportamento do app. É a referência principal |
| `02-modelo-de-dados.sql` | Esquema inicial (igual a `supabase/migrations/0001_initial.sql`) |
| `03-regras-de-calculo.md` | Parcelamento, competência mensal, centavos, idempotência |
| `04-publicacao-github-pages.md` | Hospedagem e login |
| `05-prompt-claude-code.md` | Prompt da primeira implementação (histórico) |
| `06-cancelamento-e-pagamentos.md` | Cancelar compra no mercado e pagamento da fatura em partes |
| `0004_cancelamento_e_pagamentos.sql` | Migração do 06 |
| `07-nova-identidade-visual.md` | Cores, fontes, navegação, Início e Fatura novos |
| `tokens.css` | Substitui `src/styles/tokens.css` |
| `0005_nova_paleta.sql` | Troca as cores de categorias e cartões já cadastrados |
| `08-prompt-atualizacao.md` | Prompt desta atualização |
| `design/Financas App.dc.html` | **Prancheta atual**, com 27 telas. Abra no navegador |
| `design/Financas Mobile.dc.html` | Prancheta anterior. O comportamento descrito nela continua valendo; o visual não |
| `design/support.js`, `design/_ds/` | Arquivos de que as pranchetas precisam para abrir |

## Sobre os arquivos de design

São **referências feitas em HTML**, não código para copiar. Recrie as telas no app em React com as variáveis de `tokens.css`. O design é de **alta fidelidade**: cores, tamanhos, raios e textos são finais.

As telas de celular medem 390 × 844 e as de computador 1280 × 800. O layout de computador vale a partir de cerca de 1024 px de largura.

## Telas

| ID | Tela | ID na prancheta anterior |
|---|---|---|
| 1a | Início | 1a, redesenhada |
| 1b | Início · "Saiu das contas" | 5f |
| 1c | Novo gasto | 1b |
| 1d | Lançamentos | 1c |
| 1e | Fatura | 2a + 5e, redesenhada |
| 1f | Registrar pagamento | 5d |
| 1g | Próximas faturas | 2b |
| 1h | Cadastro do cartão | 2c |
| 1i | Correção em fatura paga | 3a |
| 1j | Categorias | 1d |
| 1k | Editar categoria | 1e |
| 1l | Detalhe da categoria | 1f |
| 1m | Listas de mercado | 5b |
| 1n | Lista durante a compra | 1g |
| 1o | Finalizar compra | 1h |
| 1p | Cancelar compra | 5a |
| 1q | Desfazer compra | 5c |
| 1r | Objetivo | 1i |
| 1s | Ajustes | 1j |
| 1t | Acesso (link mágico) | 4c |
| 1u | Primeiro mês vazio | 4d |
| 1v | Estados vazios | 4e |
| 1w | Sem conexão | 3b |
| 1x | Falha ao salvar | 3c |
| 1y | Conflito entre dispositivos | 3d |
| 2a | Início · computador | 4a |
| 2b | Fatura · computador | 4b |

## Comportamento (resumo)

- **Navegação:**
  - no celular: Início · Gastos · [+] · Mercado · Ajustes;
  - Categorias abre pelo Início e por Ajustes;
  - no computador, a barra lateral tem 7 itens.
- **Mês selecionado:** é o mesmo no Início, em Lançamentos e em Faturas durante a sessão.
- **Gravação:**
  - enquanto grava, aparece "Salvando…" e o botão fica bloqueado;
  - só aparece "Salvo" depois que o servidor confirmar;
  - se falhar, o formulário continua preenchido (1x).
- **Sem conexão:** os dados aparecem marcados como última versão disponível e novas gravações ficam bloqueadas (1w).
- **Conflito entre dispositivos:** o app mostra as duas versões e não sobrescreve nada (1y).
- **Confirmação antes de agir:** renomear categoria, reclassificar uma compra, corrigir compra de fatura já paga, desfazer compra e excluir abrem uma folha que mostra o que vai ser afetado.
- **Gasto e pagamento são coisas diferentes:** gasto vem de `lancamentos_mensais`; pagamento de fatura vem de `pagamentos_fatura` e nunca soma aos gastos.
- **Animações:** folhas sobem em 180 ms com `cubic-bezier(.2,.8,.2,1)`; barras de progresso animam em 300 ms. Respeite `prefers-reduced-motion`.
