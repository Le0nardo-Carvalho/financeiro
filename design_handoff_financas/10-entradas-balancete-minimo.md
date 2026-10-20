# Entradas, balancete e mínimo mensal

Telas `3a`–`3g` em `Financas App.dc.html` (seção 3). Banco: `0008_entradas_balancete_minimo.sql`; dados: `0009_entradas_jan_out_2026.sql`.

## 1. Entradas

- Tabela `entradas`. Tipos: Renda, Extra, Reembolso, Ajuda, Outro. Conta: Banco do Brasil, Nubank, Dinheiro.
- **Não é gasto, não abate fatura, não entra em categoria.** Transferência entre contas próprias, resgate de poupança, estorno e Pix devolvido não são entrada.
- "Repete todo mês" marca `recorrente`. No mês seguinte ela aparece como **prevista** (3f, tracejada) até chegar uma entrada com a mesma descrição. Prevista não soma no total de entradas recebidas.
- O "+" central abre a escolha Gasto / Entrada / Lista de mercado (3d).

## 2. Balancete

`balancete_mensal`: por mês, **entradas − gastos = resultado**, com acumulado do ano.
Gastos pela mesma competência do dashboard (crédito no mês da fatura). Pagamento de fatura nunca entra.
Mostrar até o mês atual; meses futuros só têm parcelas e ficam fora.

## 3. Mínimo mensal

**Mínimo = média de Mercado dos 3 últimos meses fechados + Claro R$ 185,00 + Caesb R$ 100,00 + Neoenergia R$ 380,00.**

Por item (`minimo_do_mes`):

| | Fórmula |
|---|---|
| Previsto | fixo: o valor cadastrado · mercado: média dos meses fechados com lançamento |
| Gasto | lançamentos do mês (competência) da categoria, ou cujo nome bate com o termo |
| Coberto | menor(gasto, previsto) |
| Falta | maior(previsto − gasto, 0) |
| Excedente | maior(gasto − previsto, 0) — mostrado como "+X acima"; não reduz a falta dos outros |

Mês (`saude_do_mes`):

- **Disponível** = entradas (+ previstas no mês atual) − gastos do mês
- **Sobra depois do mínimo** = disponível − Σ falta
- Os gastos essenciais já estão em "gastos"; por isso só a **falta** é descontada (sem contar duas vezes).

Níveis de alerta (margem padrão R$ 300,00, editável em 3c):

| Nível | Condição | Visual |
|---|---|---|
| Tranquilo | sobra ≥ margem | lilás `#2f2850` / `#ddd5ff` |
| Atenção | 0 ≤ sobra < margem | `#33202a` / `#ffb59c` |
| Gastos altos | sobra < 0 | `#45262c` / `#ffd7c9`, ícone coral |
| Sem entradas | nenhuma entrada no mês | pedir para registrar entradas; não alertar |

Exemplo real (out/2026, até 19/10): mínimo 1.242,93 (mercado 577,93 + 665,00); gasto essencial 1.022,66; falta 321,39 (mercado 221,39 + água 100,00); entradas 3.217,05; gastos 3.141,87; sobra **−246,21 → Gastos altos**.

## 4. Critérios de aceitação

- **CA27** Entrada de R$ 3.000,00 não altera gastos do mês, categoria nem fatura.
- **CA28** Balancete de um mês = soma das entradas − soma de `lancamentos_mensais` do mês; acumulado reinicia em janeiro.
- **CA29** Mercado com jul 687,10, ago 620,49, set 426,19 → previsto de outubro 577,93.
- **CA30** Conta fixa paga acima do previsto (479,78 de 380,00) → falta 0, excedente 99,78; a falta da água continua 100,00.
- **CA31** Sobra 75,18 e falta 321,39 → nível "alto" e mensagem "faltam R$ 246,21".
- **CA32** Sobra entre 0 e a margem → "atenção"; acima → "tranquilo"; sem entradas → "sem_entradas".
- **CA33** Recorrente de outubro não recebida em novembro aparece como prevista e entra na sobra de novembro; ao lançar a entrada real, a prevista some.
