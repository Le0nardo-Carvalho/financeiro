# Regras de cálculo

Estas regras valem para todas as telas, gráficos e consultas. Divergência entre dashboard, categoria e fatura é defeito.

## 1. Dinheiro

Armazenar sempre em **centavos inteiros** (`bigint`). Nunca usar float. Formatar só na exibição, em pt-BR: `R$ 1.284,60`.

## 2. Competência mensal

| Forma de pagamento | Mês em que o gasto entra |
|---|---|
| Pix | mês da data da compra |
| Débito | mês da data da compra |
| Crédito à vista | mês de **vencimento** da fatura correspondente |
| Crédito parcelado | cada parcela no mês de vencimento da sua fatura |

**Gastos do mês = Pix do mês + débito do mês + parcelas de crédito atribuídas ao mês.**

O valor integral da compra aparece só no detalhe da compra. As somas mensais usam exclusivamente `lancamentos_mensais`.

Marcar uma fatura como paga **não cria** nenhum lançamento — as compras já foram contabilizadas.
Aportes em objetivos **não são gastos** e ficam fora de qualquer total de despesas.

## 3. Primeira fatura de uma compra no crédito

Com fechamento no dia F e vencimento no dia V do cartão:

1. Achar o primeiro fechamento que ocorre **na data da compra ou depois dela**.
2. Associar a ele a primeira ocorrência do dia V **posterior** a esse fechamento.
3. Sugerir essa fatura para a parcela 1; o usuário pode ajustar antes de salvar.
4. As demais parcelas vão para as faturas mensais seguintes.

Compra feita **no próprio dia do fechamento entra naquela fatura** — convenção do app, ajustável manualmente porque emissores variam.

Com o cartão do proprietário (Nubank, fecha 5, vence 12):

| Data da compra | Fechamento | Primeira fatura |
|---|---|---|
| 02/10/2026 | 05/10 | vence 12/10/2026 |
| 05/10/2026 | 05/10 | vence 12/10/2026 |
| 06/10/2026 | 05/11 | vence 12/11/2026 |

Dezembro → janeiro deve virar o ano corretamente. Se o dia configurado não existir no mês (ex.: 31 em fevereiro), usar o **último dia do mês**.

As datas atribuídas ficam **gravadas na fatura**. Alterar o ciclo do cartão vale só para compras futuras; nada é reorganizado retroativamente.

## 4. Divisão em parcelas

Parcelas: inteiro ≥ 1. A soma das parcelas é **exatamente** o valor total; nenhuma parcela pode ser zero.

Algoritmo: `base = total div n`, `resto = total mod n`; as `resto` primeiras parcelas recebem +1 centavo.

R$ 100,00 em 3 → **33,34 + 33,33 + 33,33 = 100,00** (CA03).
R$ 300,00 em 3 → 100,00 × 3, uma em cada mês de vencimento (CA02).

## 5. Alterações e correções

Mudar valor, data, cartão ou parcelamento de uma compra:

- Recalcular todos os `lancamentos_mensais` da compra em **uma transação**.
- Nunca criar outra compra; o ID da compra é preservado.
- Mostrar antes de confirmar quais meses mudam e de quanto para quanto (tela `3a`).
- Se algum mês afetado pertence a uma fatura **paga**, destacar isso e, ao confirmar, marcar a fatura como `corrigida_apos_pagamento = true`.

Reclassificar categoria: atualiza `compras.categoria_id` **e** `lancamentos_mensais.categoria_id` de todas as parcelas, atomicamente. Valores, datas, parcelamento e identidade da compra não mudam. O gasto total do mês não muda; só a divisão por categoria (CA12).

## 6. Categorias

- Nome sem espaços nas pontas; duplicidade equivalente bloqueada ignorando caixa (índice único sobre `lower(btrim(nome))`).
- Se existir uma categoria **arquivada** equivalente, oferecer reativação em vez de erro.
- Renomear ou trocar a cor **preserva o ID** e todos os vínculos; a mudança aparece em formulários, listas, filtros, faturas e gráficos (CA09, CA10).
- Arquivada some das opções de novos lançamentos, continua nos totais, no histórico e nos filtros históricos (CA11).
- Excluir definitivamente só sem nenhum vínculo; havendo vínculos, orientar o arquivamento.
- A categoria padrão do Mercado é referenciada por **ID** (`perfis.categoria_mercado_id`), nunca por comparação com o texto "Mercado". Renomeá-la preserva o vínculo (CA13). Se estiver arquivada, a finalização pede uma categoria ativa.

## 7. Histórico por categoria

- **Total do mês**: soma dos lançamentos da categoria no mês selecionado.
- **Total histórico**: soma dos lançamentos até o mês atual, inclusive.
- **Previsão**: parcelas de meses futuros — apresentadas **separadamente**, fora do histórico (CA14).

## 8. Mercado

`Subtotal do item = quantidade × preço unitário`, arredondado para centavos com **meio centavo para cima** nos valores positivos. O total é a soma dos subtotais **confirmados**; itens desmarcados ficam de fora.

O check exige quantidade válida e preço preenchido. **Preço zero ≠ campo vazio**: zero é um preço válido; vazio bloqueia a confirmação.

Quantidades fracionadas são permitidas quando a unidade fizer sentido (0,750 kg).

Finalização:

- Exige ao menos um item confirmado, gravações dos itens concluídas e total > 0.
- Gera **uma única** compra financeira ligada à lista, aplicando as regras de Pix/débito/crédito.
- Itens não confirmados ficam guardados como não comprados.
- A lista em andamento **não** gera despesa.

**Idempotência (CA21):** `listas_mercado.compra_id` é único e a função `finalizar_lista` trava a linha (`for update`) e devolve a compra existente se já houver uma. Duas chamadas — inclusive quando a conexão cai depois de o servidor concluir — retornam a mesma compra. Finalizar a lista, criar a compra e gerar os lançamentos acontecem na mesma transação: tudo ou nada.

Depois de finalizada, mudanças de valor exigem ação explícita de correção que atualize a compra e suas parcelas. Total dos itens e registro financeiro nunca podem divergir.

## 9. Objetivos

- **Acumulado** = aportes − retiradas.
- **Restante** = max(meta − acumulado, 0).
- **Progresso** = acumulado ÷ meta × 100; a barra pode parar em 100%, mas o valor real acumulado é preservado e o objetivo é marcado como alcançado.
- Uma retirada não pode superar o acumulado daquele objetivo.
- O valor inicial guardado é registrado como a primeira movimentação.

R$ 250,00 de uma meta de R$ 1.000,00 → 25% e R$ 750,00 restantes (CA16).

## 10. Sincronização e concorrência

- Nada é apresentado como salvo antes da confirmação do serviço de dados (CA26).
- Falha de gravação preserva o formulário e oferece nova tentativa.
- Offline: dados marcados como última versão disponível; **gravações bloqueadas** nesta primeira versão.
- Concorrência otimista: todo `update` leva `where versao = <versao lida>`; zero linhas afetadas significa conflito → tela `3d`, sem sobrescrever (CA24).
- Ao recuperar conexão ou foco da janela, revalidar as consultas da tela.

## 11. Checklist de aceitação

Implementar como testes automatizados, na ordem de CA01 a CA26 da especificação (`01-especificacao-produto.md`, §15). Os mais críticos: CA02, CA03, CA04, CA06, CA09, CA12, CA13, CA15, CA20, CA21, CA24, CA26.

Validar também a coerência entre os totais do dashboard, da categoria e da fatura sobre os mesmos lançamentos.
