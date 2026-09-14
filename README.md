# Minhas finanças

Aplicativo web de finanças pessoais: lançamentos em Pix/débito/crédito, parcelamento automático entre faturas, categorias gerenciáveis, listas de mercado que geram uma única despesa ao finalizar, e objetivos financeiros.

Especificação completa e decisões de arquitetura: [`design_handoff_financas/`](./design_handoff_financas/) (comece por `01-especificacao-produto.md` e `03-regras-de-calculo.md`).

## Stack

- **React + TypeScript + Vite**, publicado como site estático.
- **Roteamento em hash** (`react-router-dom`, `HashRouter`) — necessário porque o GitHub Pages não reescreve rotas.
- **Supabase**: Postgres com Row Level Security, autenticação por link mágico (sem senha) e é a única fonte de dados — nada de armazenamento local como base principal.
- **@tanstack/react-query**: cache por tela, invalidação após gravações confirmadas, revalidação ao voltar o foco da janela ou a conexão.
- **Lucide** (`lucide-react`) para ícones, traço 2.75.
- **Vitest** para os testes automatizados da camada de cálculo.

## Estrutura

```
supabase/migrations/       Esquema, RLS e funções transacionais (aplicar nesta ordem)
src/lib/calc/               Espelho em TS das regras de cálculo do banco, com testes
src/lib/queries/            Hooks React Query por recurso (categorias, cartões, mercado...)
src/components/, src/layouts/  Design system e navegação responsiva
src/screens/                 Uma pasta por área do app
src/context/                 Autenticação, mês selecionado, estado de sincronização
tests/acceptance/            Checklist dos critérios de aceitação + testes SQL de RLS/idempotência
.github/workflows/deploy.yml Publicação automática no GitHub Pages
```

## Configuração pendente — o que só você pode fornecer

Nada disso pode ir para o repositório (§14.2 da especificação). Sem esses itens, o app mostra um aviso de configuração pendente e não simula login nem dados.

1. **Criar um projeto Supabase** e aplicar as migrações, na ordem, em SQL Editor ou via CLI:
   - `supabase/migrations/0001_initial.sql` (esquema, RLS, funções — do pacote de handoff)
   - `supabase/migrations/0002_corrigir_compra.sql` (função de correção de compra — ver nota abaixo)
2. **Criar o usuário único (Ágata)** em Authentication → Users no painel do Supabase, com o e-mail real. Nenhuma senha é definida pelo app: o acesso é só por link mágico.
3. **Ativar o provedor de e-mail** em Authentication → Providers/Email do Supabase (link mágico habilitado por padrão, mas confirme os limites de envio do plano).
4. **Configurar Redirect URLs** em Authentication → URL Configuration, incluindo `https://<seu-usuario>.github.io/financeiro/`.
5. **Copiar a URL do projeto e a chave `anon` (publicável)** — nunca a `service_role` — para:
   - Desenvolvimento local: copie `.env.example` para `.env.local` e preencha.
   - Produção: em Settings → Secrets and variables → Actions do repositório GitHub, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
6. **Ativar o GitHub Pages** em Settings → Pages do repositório, origem "GitHub Actions".

Depois de rodar a primeira migração e o primeiro login, chame a seed inicial (o app já faz isso automaticamente no primeiro `SIGNED_IN` — ver `src/context/AuthContext.tsx`): ela cria as categorias sugeridas e o cartão Nubank (fecha dia 5, vence dia 12).

### Nota sobre `0002_corrigir_compra.sql`

O pacote de handoff (`02-modelo-de-dados.sql`) define `criar_compra`, `finalizar_lista`, `reclassificar_compra` e `semear_perfil`, mas não uma função para corrigir valor/data/cartão/parcelamento de uma compra já registrada — comportamento exigido pela especificação (§6.2) e pelas regras de cálculo (§5, tela `3a`). Adicionei `corrigir_compra` como uma segunda migração, seguindo exatamente o mesmo padrão das funções existentes (mesma transação, mesmo ID de compra preservado, mesmo algoritmo de parcelamento). Isso **não** reabre nenhuma decisão já tomada — só preenche uma lacuna que o esquema fornecido deixou.

## Executando localmente

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev
```

## Testes

```bash
npm test
```

37 testes automatizados na camada de cálculo (parcelamento, competência mensal, arredondamento de mercado, objetivos, máquina de estado de sincronização). Veja [`tests/acceptance/CHECKLIST.md`](./tests/acceptance/CHECKLIST.md) para o mapeamento completo CA01–CA26, incluindo os critérios que dependem de um projeto Supabase real (RLS, idempotência no servidor, dois dispositivos) — esses têm um script SQL pronto em `tests/acceptance/sql/rls_e_idempotencia.sql`, mas **não foram executados nesta sessão** porque o ambiente de desenvolvimento não tem Docker disponível para rodar Postgres local. Rode esse script contra seu projeto Supabase antes de considerar o app validado.

## Build e publicação

```bash
npm run build   # gera dist/, base = /financeiro/
```

A publicação é automática via `.github/workflows/deploy.yml` a cada push em `main`, usando os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do repositório. O site fica em `https://<seu-usuario>.github.io/financeiro/`.

## Decisões preservadas do handoff (não reabertas)

- **Autenticação por link mágico, sem senha** — GitHub Pages desaconselha transações sensíveis como envio de senha; ver `design_handoff_financas/04-publicacao-github-pages.md`. Se isso não servir, é preciso decidir explicitamente entre OAuth, e-mail+senha (aceitando a ressalva) ou trocar a hospedagem — não fiz essa troca sozinho.
- **Conta única, nome de exibição Ágata**, criada no painel do Supabase — nenhuma verificação de senha no código do navegador.
- **Dinheiro em centavos inteiros**, toda agregação lê de `lancamentos_mensais`, marcar fatura como paga nunca gera lançamento, finalizar a mesma lista de mercado duas vezes retorna a mesma compra.

## Simplificações conscientes (documentadas, não escondidas)

- **Conflito de edição concorrente (CA24):** o app nunca sobrescreve silenciosamente — toda atualização usa `where versao = <versão lida>` e trata zero linhas afetadas como conflito, bloqueando a gravação com uma mensagem clara (`ConflitoVersaoError`). A tela `3d` do design (duas versões lado a lado, com "manter a minha / usar a do servidor / voltar a editar") não foi implementada na íntegra — hoje a saída é sempre "voltar a editar" depois de recarregar o registro. Dado o tempo disponível, priorizei a garantia de dado (não perder nem sobrescrever nada) sobre a interface completa de resolução.
- **FAB "Novo gasto" no desktop:** no celular é um botão flutuante fixo (fiel ao design); no desktop ele aparece no fim do conteúdo em vez de fixo no cabeçalho, por simplicidade de layout.
- **Exportação de dados** gera um `.json` com todas as tabelas do proprietário, baixado localmente — não há um formato de exportação específico definido na especificação além de "prever exportação" (§14.3).

## Cartão inicial e categorias

Criados automaticamente por `semear_perfil()` no primeiro login: Mercado, Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Assinaturas, Presentes, Ágata, Outros — e o cartão Nubank (fecha dia 5, vence dia 12). Todas editáveis pela interface (Categorias → Editar / Cartões e faturas), incluindo as sugeridas, conforme §10.1 da especificação.
