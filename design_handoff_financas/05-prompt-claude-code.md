# Prompt inicial para o Claude Code

Cole o texto abaixo na primeira conversa do Claude Code, com esta pasta disponível no diretório de trabalho e o repositório `Le0nardo-Carvalho/financeiro` clonado (hoje vazio, branch `main`).

---

Implemente o aplicativo de finanças pessoais descrito nesta pasta de handoff, no repositório `Le0nardo-Carvalho/financeiro`.

Leia primeiro, nesta ordem: `README.md` (telas e tokens), `01-especificacao-produto.md` (comportamento — fonte de verdade), `03-regras-de-calculo.md` (cálculos) e `04-publicacao-github-pages.md` (decisão de hospedagem e login).

Contexto já decidido, não reabra sem me perguntar:

- Interface React + TypeScript, build com Vite, publicada no GitHub Pages em `/financeiro/`.
- Supabase para banco, autenticação e sincronização. O esquema, as políticas de RLS e as funções transacionais estão prontos em `02-modelo-de-dados.sql` — aplique como primeira migração.
- O app começa **vazio**: sem dados de demonstração. Ao primeiro login, chame `semear_perfil()`, que cria as categorias iniciais (Mercado, Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Assinaturas, Presentes, Ágata, Outros) e o cartão Nubank (fecha dia 5, vence dia 12).
- Autenticação por **link mágico por e-mail**, não por senha — o motivo está em `04-publicacao-github-pages.md`. Se discordar, explique antes de implementar.
- Conta única, nome de exibição **Ágata**. Nenhuma credencial vai para o repositório: o usuário é criado no painel do Supabase e o isolamento é garantido pelo RLS. Não escreva verificação de senha no código do navegador.

Comece apresentando, em texto, a estrutura de pastas, as bibliotecas escolhidas e a ordem de implementação. Só depois escreva código.

Ordem sugerida:

1. Projeto Vite + roteamento em hash + configuração do Supabase por variáveis de ambiente.
2. Migração do banco e políticas de RLS. Confirme que um usuário não alcança dados de outro.
3. Autenticação e a tela de acesso.
4. Camada de cálculo (parcelamento, competência mensal, divisão de centavos) com testes antes da interface — `03-regras-de-calculo.md`, seções 2 a 4.
5. Lançamentos, categorias, faturas, dashboard.
6. Mercado, com a finalização idempotente.
7. Objetivos.
8. Estados de sincronização, offline, falha e conflito.
9. Publicação por GitHub Actions.

Regras que não podem ser quebradas:

- Dinheiro em centavos inteiros; a soma das parcelas é exatamente o valor total.
- Toda agregação lê de `lancamentos_mensais`; a compra guarda o valor integral e nunca é somada aos totais.
- Marcar fatura como paga não cria gasto. Aportes em objetivos não são gastos.
- Finalizar a mesma lista de mercado duas vezes retorna a mesma compra.
- Nenhuma gravação é apresentada como concluída antes da confirmação do servidor.
- Categorias são gerenciadas pela interface, incluindo as sugeridas; renomear preserva o ID e todos os vínculos históricos.

Recrie a interface fielmente a partir de `design/Financas Mobile.dc.html` (abra no navegador). Os arquivos de design são **referência**, não código para copiar: use os tokens de `design/_ds/organic-.../styles.css` como origem de cores, fontes, raios e sombras, e reconstrua as telas com os componentes do seu stack. Ícones: Lucide, traço 2.75.

Ao final, valide os critérios de aceitação CA01 a CA26 da §15 da especificação como testes automatizados e entregue instruções de configuração, execução e publicação. Se algo depender de configuração externa que eu preciso fornecer, liste exatamente o que falta — não simule integração concluída.
