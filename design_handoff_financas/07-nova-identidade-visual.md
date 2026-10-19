# 07 — Nova identidade visual

Substitui o visual anterior (creme, terracota, sálvia e Caprasimo, do design system Organic).
Referência visual: `design/Financas App.dc.html` (abra no navegador).
Arquivos: `tokens.css` (substitui `src/styles/tokens.css`) e `0005_nova_paleta.sql`.

## Princípio

- Fundo escuro **berinjela**.
- **Coral** marca ação e gasto: botão principal, "+", barras de gasto, mês atual.
- **Lilás** marca o que é positivo: fatura paga, gasto menor que o do mês anterior, progresso de objetivo.
- Nunca use lilás para gasto, nem coral para algo positivo.

## Como aplicar no código

`tokens.css` mantém **os mesmos nomes de variáveis** do arquivo atual. As rampas foram invertidas para fundo escuro: o passo 100 é o tom mais escuro e o 900 o mais claro. Os usos que já existem, do tipo "preenchimento 100–300 com texto 700–900", continuam corretos sem mexer nos componentes.

Depois de trocar o arquivo, revise só o que tem cor **escrita direto no código** (hex fora de `tokens.css`), sombras próprias e telas que usam `var(--color-bg)` como **cor de texto** sobre preenchimento claro. Elas ainda funcionam, mas confira o contraste.

`index.html`: `<meta name="theme-color" content="#171019">`.

## Cores

Base: fundo `#171019` · superfície `#261c28` · texto `#f5eef4` · destaque `#f2734f` · destaque 2 `#8a76e0` · divisor `rgba(245,238,244,.1)` · fundo de folha (scrim) `rgba(8,4,10,.62)`.

| Passo | neutro | coral | lilás |
|---|---|---|---|
| 100 | #2f2331 | #33202a | #241f3a |
| 200 | #3a2d3b | #45262c | #2f2850 |
| 300 | #45374a | #5c2e2c | #3d3172 |
| 400 | #554755 | #cf593a | #6f5cc0 |
| 500 | #776675 | #f2734f | #8a76e0 |
| 600 | #9a8898 | #ff9273 | #a594f5 |
| 700 | #c3b3c1 | #ffb59c | #c2b5ff |
| 800 | #e5d9e3 | #ffd7c9 | #ddd5ff |
| 900 | #f5eef4 | #ffeee8 | #f0ecff |

Usos frequentes:
- Texto secundário: neutro-600.
- Link: coral-600.
- Item ativo da navegação: coral-600.
- Selo "Paga": fundo lilás-300 e texto lilás-800.
- Chip comparativo positivo: fundo lilás-300 e texto lilás-800, seta para baixo.
- Chip comparativo negativo (gastou mais): fundo coral-200 e texto coral-800, seta para cima.

Categorias (a migração 0005 já troca as que estão cadastradas):

| Categoria | Antes | Agora |
|---|---|---|
| Mercado | #d67f48 | #f2734f |
| Alimentação | #8fa073 | #a594f5 |
| Transporte | #8c491a | #ffb59c |
| Moradia | #a19786 | #9a8898 |
| Saúde | #dcd3c4 | #6f5cc0 |
| Educação | #aebf92 | #c2b5ff |
| Lazer | #ffc6a5 | #e58fb3 |
| Assinaturas | #c0b6a5 | #8a76e0 |
| Presentes | #f6a06b | #ff9273 |
| Ágata | #56633f | #ffd7c9 |
| Encargos | #645c50 | #cf593a |
| Outros | #82796a | #c3b3c1 |

Paleta oferecida ao criar ou editar uma categoria: `#a594f5 #f2734f #ffb59c #e58fb3 #9a8898 #c2b5ff`.

## Tipografia

- **Newsreader 400** em títulos e no valor em destaque.
- **Figtree 400/600/700** no resto.
- Regra dos valores:
  - até 20 px: Figtree 700 com `tabular-nums` (classe `.valor`);
  - acima de 20 px: Newsreader (classe `.valor-destaque`).
- Na lista "Recentes", os gastos levam o sinal **−** (ex.: `−72,08`).
- Escala de tamanhos:
  - 50 px: total do mês;
  - 44 px: total da fatura;
  - 22–28 px: título de tela;
  - 16–17 px: título de seção;
  - 14–15 px: valores em lista;
  - 13–14 px: texto;
  - 11–12 px: informações secundárias.

## Navegação (celular)

São cinco posições: **Início · Gastos · [+] · Mercado · Ajustes**.

- **Barra:**
  - 76 px de altura, mais a área segura do aparelho;
  - fundo `--color-surface`;
  - cantos de `30px` no topo;
  - sem linha divisória.
- **Itens:** ativo em coral-600 com peso 700; inativos em neutro-600. Ícones Lucide de 21 px, traço 2.75.
- **Botão central:**
  - círculo de 56–58 px em `--color-accent`, com ícone `Plus` de 24 px, traço 3, na cor `--color-bg`;
  - fica 30 px acima da barra, com anel de 6 px na cor `--color-bg` (`box-shadow: 0 0 0 6px var(--color-bg)`);
  - abre Novo gasto.
- **Categorias** sai da barra e passa a abrir por "Ver todas" no Início e pelo item Categorias em Ajustes.
- **Computador:** a barra lateral continua com os 7 itens. O item ativo tem fundo coral-800 e texto `--color-bg`.

## Início (tela 1a)

De cima para baixo, com `gap` de 13 px e laterais de 20 px:

1. **Cabeçalho:**
   - avatar de 40 px com fundo `#ffb59c` e letra "Á" em Newsreader na cor `#4c1e14`;
   - "Olá," (12 px, neutro-600) e "Ágata" (15 px, peso 700);
   - à direita, seletor de mês em pílula com fundo superfície.
2. **Total:**
   - "Gastos de setembro" (12,5 px, neutro-600);
   - **R$ 1.284,60** em Newsreader 50 px;
   - chip comparativo com o mês anterior, mais o texto "R$ 111,60 a menos que agosto".
3. **Formas de pagamento:**
   - barra empilhada de 10 px, com 4 px entre os segmentos: Pix `#ffb59c`, Débito `#f2734f`, Crédito `#a594f5`;
   - legenda com ponto colorido, rótulo e valor.
4. **Últimos 6 meses:**
   - cartão em superfície com raio de 28 px;
   - barras com raio de 12 px e altura máxima de 68 px;
   - meses anteriores em neutro-200 e mês atual em coral;
   - "média R$ 1.321" à direita do título.
5. **Fatura:**
   - linha em superfície com raio de 24 px;
   - ícone de cartão em círculo `#55459a`;
   - nome, vencimento e forma de pagamento;
   - valor e selo "Paga" em lilás-700.
6. **Por categoria:** três blocos lado a lado, as maiores do mês, com ponto, nome e valor; "Ver todas" abre Categorias.
7. **Recentes:** dois lançamentos, com ícone em quadrado arredondado de 38 px (raio 14, fundo superfície, traço na cor da categoria); "Ver todos" abre Gastos.

Dados novos que a tela precisa (todos vindos de `lancamentos_mensais`):
- total do mês anterior;
- soma dos últimos 6 meses por `mes_competencia`;
- média desses 6 meses.

## Fatura (tela 1e)

1. **Cabeçalho:** voltar, título "Fatura" em Newsreader 22 px e seletor de mês.
2. **Cartão visual:**
   - 196 px de altura, raio de 28 px, fundo `#55459a`;
   - dois círculos decorativos, `#6f5cc0` (220 px, saindo pelo canto superior direito) e `#3d3172` (160 px, saindo por baixo);
   - nome "Nubank" em Newsreader 24 px, chip de 42×31 px em `#c2b5ff`;
   - "Fecha dia 5 · vence dia 12" e a frase "nenhum número do cartão é guardado".
3. **Total:** "Fatura de outubro" + **R$ 786,00** em Newsreader 44 px, com selo "Paga", "Parcialmente paga" ou "Aberta" à direita.
4. **Como foi paga:**
   - linha do tempo com um ponto colorido por pagamento (Pix coral, boleto coral-700), data, origem e valor;
   - último item: um check lilás com "Quitada · 786,00 de 786,00" ou "Falta R$ X".
5. **Composição:** barra dividida entre parcelas anteriores e compras do ciclo, com os dois valores.
6. Botão de contorno "Ver as 6 compras". O registro de pagamento (tela 1f) fica no cabeçalho ou num botão principal quando a fatura não está quitada.

## Demais telas

Seguem a prancheta `design/Financas App.dc.html`, com as mesmas regras de cor e tipografia. O comportamento de cada uma continua o descrito em `01-especificacao-produto.md`, `03-regras-de-calculo.md` e `06-cancelamento-e-pagamentos.md`.

## Conferência

- Contraste de texto de pelo menos 4,5:1 contra o fundo. Coral-500 sobre berinjela passa para texto grande e ícones; para texto pequeno em coral, use coral-600 ou mais claro.
- Nenhuma cor do visual anterior sobrando: procure `#f5ead8`, `#c67139`, `#7a8a5e` e `Caprasimo` no código.
- Os totais do Início, da Categoria e da Fatura continuam batendo entre si.
