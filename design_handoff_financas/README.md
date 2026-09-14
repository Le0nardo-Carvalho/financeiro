# Handoff: aplicativo de finanças pessoais

Repositório de destino: **Le0nardo-Carvalho/financeiro** (branch `main`, hoje vazio).
Hospedagem escolhida: **GitHub Pages** — leia `04-publicacao-github-pages.md` antes de implementar o login.
Serviço de dados: **Supabase** (banco, autenticação e sincronização).
Primeira execução: **app vazio**, sem dados de demonstração.

## Visão geral

App web responsivo (celular e computador) para registrar despesas em Pix, débito e crédito, distribuir compras parceladas entre faturas, gerenciar categorias, acompanhar objetivos financeiros e transformar listas de mercado em uma única despesa. A especificação funcional completa, escrita pelo proprietário do produto, está em `01-especificacao-produto.md` e é a fonte de verdade sobre comportamento.

## Sobre os arquivos de design

Os arquivos em `design/` são **referências de design feitas em HTML** — protótipos que mostram aparência e comportamento pretendidos. **Não são código de produção para copiar.** A tarefa é recriar essas telas no ambiente do repositório, com React + TypeScript (proposta do §4.2 da especificação) e a biblioteca de componentes que você escolher, reproduzindo os valores visuais listados em "Tokens de design".

Para abrir os protótipos: `design/Financas Mobile.dc.html` renderiza em qualquer navegador (precisa dos arquivos vizinhos `support.js` e `_ds/`). A página é uma prancheta com quatro turnos de exploração, do mais recente ao mais antigo. Cada tela tem um identificador visível (`1a`, `2b`, `4c`…) usado neste documento.

## Fidelidade

**Alta fidelidade.** Cores, tipografia, espaçamentos, raios e estados são finais e vêm do design system "Organic" (`design/_ds/.../styles.css` + `readme.md`). Recrie a interface fielmente, usando os tokens CSS desse arquivo como origem dos valores — não invente cores, fontes ou raios novos.

As telas são **estáticas**: mostram o estado final de cada momento. A navegação, animações e validações vêm desta documentação e da especificação, não dos arquivos HTML.

## Telas

Todas as telas de celular foram desenhadas em 390 × 844. As de computador, em 1280 × 800 (layout fluido a partir de ~1024 px; abaixo disso, usar o layout de celular).

| ID | Tela | Função |
|---|---|---|
| `1a` | Dashboard (celular) | Panorama do mês: total, formas de pagamento, categorias, fatura, objetivo, recentes |
| `1b` | Novo gasto | Cadastro com prévia das parcelas antes de salvar |
| `1c` | Lançamentos | Busca, filtros e lista do mês |
| `1d` | Categorias | Ativas, arquivadas e ação "Nova" |
| `1e` | Editar categoria | Folha com nome, cor, descrição e alcance da mudança |
| `1f` | Detalhe da categoria | Mês, histórico acumulado, evolução, lançamentos, futuro |
| `1g` | Lista de mercado | Itens, check por item, total confirmado fixo no rodapé |
| `1h` | Finalizar compra | Resumo que gera a despesa única |
| `1i` | Objetivo | Progresso, aportes e retiradas |
| `1j` | Ajustes | Conta, sincronização, cartões, categorias, exportação |
| `2a` | Fatura do mês | Composição em dois grupos e ação "Marcar como paga" |
| `2b` | Próximas faturas | Previsão de nov/dez/jan e fatura paga anterior |
| `2c` | Cadastro do cartão | Apelido, fechamento, vencimento, cor, situação |
| `3a` | Correção em fatura paga | Folha de confirmação com meses afetados |
| `3b` | Sem conexão | Última versão carimbada; gravação bloqueada |
| `3c` | Falha ao salvar | Formulário preservado e ação de tentar de novo |
| `3d` | Conflito entre dispositivos | Duas versões lado a lado, nada sobrescrito |
| `4a` | Dashboard desktop | Navegação lateral, cartões de resumo, tabela de recentes |
| `4b` | Fatura desktop | Composição + previsão na mesma tela |
| `4c` | Acesso | Entrada na conta (ver ressalva em `04-publicacao-github-pages.md`) |
| `4d` | Primeiro mês vazio | Uma ação principal e três atalhos |
| `4e` | Estados vazios | Mercado, busca sem resultado, objetivos, sem cartão |

### Estrutura comum (celular)

- Moldura 390 × 844, fundo `--color-bg`, cantos 40 px.
- Barra de status simulada: 44 px, hora à esquerda.
- Conteúdo: `flex:1`, `padding: 8–10px 18px`, `gap: 12–14px`, coluna flex.
- Navegação inferior: 76 px + 10 px de área segura, fundo `--color-surface`, 5 itens de 56 px de largura com ícone de 21 px e rótulo de 10 px. Item ativo em `--color-accent-700`, inativos em `--color-neutral-600`.
- Alvos de toque nunca abaixo de 44 px.
- Botão flutuante "Novo gasto" (só no Dashboard): pílula `--color-accent`, texto `--color-bg`, 12 × 22 px de padding, 78 px acima da base, sombra `--shadow-md`.

### Estrutura comum (desktop)

- Barra lateral fixa de 232 px, fundo `--color-surface`, itens em pílula de 999 px; item ativo em `--color-accent-800` com texto `--color-bg`.
- Conteúdo com `padding: 24px 30px` e `gap: 18px`.
- Dashboard: grade `1.35fr 1fr 1fr` no topo, depois `1fr 1.4fr`.
- Fatura: grade `1.6fr 1fr`.

### Detalhes por tela que a implementação precisa respeitar

**`1a` Dashboard** — Total do mês em Caprasimo 46 px. Os três cartões de forma de pagamento são componentes do total e nunca são somados a ele. O gráfico de rosca (conic-gradient) é sempre acompanhado da lista com valores, navegável por teclado, e cada linha abre o detalhe da categoria. Selo de sincronização no topo direito: ponto de 7 px + texto ("Atualizado", "Salvando", "Sem conexão").

**`1b` Novo gasto** — Campos de cartão e parcelas só aparecem depois de escolher Crédito. A prévia lista cada parcela com número, data de vencimento e valor, e traz "Ajustar 1ª fatura". Valor em destaque no topo, com borda de foco em `--color-accent`.

**`1e` Editar categoria** — Folha inferior sobre fundo escurecido (`color-mix(in srgb, var(--color-neutral-900) 45%, transparent)`), cantos 34 px no topo. Mostra o nome anterior e um aviso em `--color-accent-2-100` dizendo quantos lançamentos serão afetados e que valores, datas e parcelas não mudam.

**`1g` Lista de mercado** — Item confirmado: fundo `--color-accent-2-100` e círculo de check de 26 px preenchido. Item sem preço: borda tracejada, círculo tracejado e campo "R$ —" destacado; confirmação bloqueada. Rodapé fixo com total confirmado, contagem e o valor que ficou de fora.

**`2a` Fatura** — Barra de proporção dividida entre parcelas anteriores e compras do ciclo. Cada parcela mostra a etiqueta "n de N". Rodapé com "Marcar como paga" e a frase "Marcar como paga não cria um novo gasto".

**`3a` Correção em fatura paga** — Tabela de meses afetados com valor antigo riscado → valor novo, etiqueta "paga" no mês já quitado, e a garantia de que nenhum lançamento novo é criado.

**`4d` / `4e` Vazios** — Nunca mostrar gráfico zerado. Um círculo de 132 px com o ícone da ação, título, uma frase e um botão; abaixo, atalhos secundários.

## Interações e comportamento

- **Navegação celular**: 5 abas (Início, Gastos, Mercado, Categorias, Ajustes). Objetivos e Cartões entram por cartões do Dashboard e por Ajustes.
- **Navegação desktop**: barra lateral com 7 itens, incluindo Cartões e faturas e Objetivos.
- **Seleção de mês**: Dashboard, Lançamentos e Faturas compartilham o mês selecionado na sessão.
- **Estados de gravação**: "Salvando…" (botão bloqueado) → "Salvo" só depois da confirmação do servidor. Falha preserva o formulário e oferece nova tentativa (`3c`). Nunca apresentar gravação como concluída antes da resposta.
- **Offline**: banner escuro com a data da última sincronização, dados marcados como desatualizados, botões de gravação desabilitados com a razão visível (`3b`).
- **Conflito**: ao receber erro de versão, mostrar as duas versões e três saídas — manter a minha, usar a do servidor, voltar a editar (`3d`).
- **Confirmações destrutivas ou de amplo alcance**: renomear categoria, reclassificar compra, corrigir compra em fatura paga e excluir categoria abrem folha de confirmação com o alcance calculado.
- **Transições**: folhas inferiores entram em 180 ms com `cubic-bezier(.2,.8,.2,1)`; mudanças de aba são instantâneas; barras de progresso animam largura em 300 ms. Respeitar `prefers-reduced-motion`.
- **Foco**: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }` — já definido no stylesheet do design system.

## Estado e dados

Estado por tela, além do cache do servidor:

- `mesSelecionado` (global, persistido na sessão)
- `statusSync`: `atualizado | salvando | erro | offline`
- Formulário de gasto: `descricao, data, valorCentavos, categoriaId, formaPagamento, cardId, parcelas, primeiraFaturaId, observacoes` + `parcelasPrevia[]` derivada
- Lista de mercado: itens com `confirmado`, `quantidade`, `precoUnitarioCentavos` (nulo ≠ zero), subtotal derivado
- Objetivo: movimentações → acumulado, restante e progresso derivados

Busca de dados: uma consulta por tela, com invalidação após gravações confirmadas e revalidação ao voltar o foco da janela ou a conexão. Realtime do Supabase para categorias, lançamentos e listas abertas.

Regras de cálculo (parcelamento, arredondamento, competência mensal, idempotência): `03-regras-de-calculo.md`.
Modelo de dados e políticas de acesso: `02-modelo-de-dados.sql`.

## Tokens de design

Todos vêm de `design/_ds/organic-.../styles.css`. Importe esse arquivo ou transponha as variáveis para o sistema de estilos escolhido.

**Cores base** — fundo `#f5ead8`, superfície `#ebddc5`, texto `#201e1d`, acento `#c67139`, acento 2 `#7a8a5e`, divisor `color-mix(in srgb, #201e1d 16%, transparent)`.

**Rampas** (100 → 900):
- neutro: `#f9f4ed #eee7db #dcd3c4 #c0b6a5 #a19786 #82796a #645c50 #474238 #2e2b25`
- acento: `#fff2eb #ffe1d0 #ffc6a5 #f6a06b #d67f48 #b2622d #8c491a #643312 #402310`
- acento 2: `#f0fae1 #e1eecc #ccdbb2 #aebf92 #8fa073 #728157 #56633f #3d472b #272e1b`

**Cores de categoria usadas nos protótipos** — Mercado `#d67f48`, Alimentação `#8fa073`, Transporte `#8c491a`, Moradia `#a19786`, Lazer `#ffc6a5`, Saúde `#dcd3c4`, Educação `#a19786`. A paleta oferecida ao usuário ao criar/editar categoria são os seis círculos de 38 px de `1e`: `#8fa073 #d67f48 #8c491a #ffc6a5 #a19786 #56633f`.

**Tipografia** — títulos e valores monetários em **Caprasimo** 400 (`--font-heading`); texto em **Figtree** 400/600/700 (`--font-body`). Escala usada: 46 px (total do mês), 26–28 px (título de tela), 19–24 px (título de cartão/folha), 15–17 px (valores em lista), 13–14 px (texto), 11–12 px (meta), 10–11 px (rótulos maiúsculos com `letter-spacing: .08em`).

**Espaçamento** — `--space-1..8`: 4.4, 8.8, 13.2, 17.6, 26.4, 35.2 px. Gaps de coluna usados: 10–16 px no celular, 16–18 px no desktop.

**Raios** — cartões 24–30 px, folhas 34 px no topo, molduras 40 px, botões/campos/etiquetas 999 px.

**Sombras** — `--shadow-sm/md/lg` do stylesheet. Não criar sombras próprias.

**Ícones** — Lucide, traço 2.75. Usados: home, receipt, shopping-cart, tag, sliders, plus, minus, chevron-left/right/down, check, credit-card, target, search, filter, alert-triangle, info, wifi-off, refresh-cw, lock, eye, upload, clock, arrow-right, arrow-up/down, more-vertical.

## Assets

Nenhuma imagem ou logotipo. O símbolo do app é um círculo sólido em `--color-accent` (52 px em `4c`, 30 px na barra lateral) — substituir por marca definitiva quando existir. Ícones vêm da biblioteca Lucide (licença ISC). Fontes Caprasimo e Figtree via Google Fonts, já importadas no stylesheet.

## Arquivos deste pacote

- `README.md` — este documento
- `01-especificacao-produto.md` — especificação funcional completa (fonte de verdade de comportamento)
- `02-modelo-de-dados.sql` — esquema Postgres/Supabase com RLS e funções transacionais
- `03-regras-de-calculo.md` — parcelamento, arredondamento, competência mensal, idempotência
- `04-publicacao-github-pages.md` — análise de compatibilidade do GitHub Pages com o login e o que fazer
- `05-prompt-claude-code.md` — prompt inicial para começar a implementação
- `design/Financas Mobile.dc.html` — prancheta com as 22 telas (abrir no navegador)
- `design/support.js`, `design/_ds/` — runtime e design system necessários para a prancheta renderizar
