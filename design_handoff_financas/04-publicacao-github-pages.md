# Publicação no GitHub Pages — compatibilidade com o login

Preferência registrada: **GitHub Pages**, como pedido no §4.3 da especificação. Este documento é a verificação que o §4.3 exige, feita antes de implementar o acesso.

## O que funciona

O GitHub Pages publica arquivos estáticos. Um app React compilado (HTML + JS + CSS) roda normalmente, e o navegador conversa direto com o Supabase por HTTPS. Não há servidor próprio no meio — o que é exatamente a arquitetura proposta: interface estática + serviço de dados.

Requisitos práticos:

- Build estático (Vite) publicado por GitHub Actions no branch `gh-pages` ou via Pages Actions.
- `base` do Vite igual a `/financeiro/` (o site fica em `https://le0nardo-carvalho.github.io/financeiro/`).
- Roteamento em **hash** (`/#/gastos`) ou um `404.html` que devolve o `index.html` — o Pages não reescreve rotas.
- No navegador, usar **apenas a chave publicável** do Supabase. Chave de serviço, credenciais do banco e qualquer segredo ficam fora do código e fora do repositório (§14.2).

## A ressalva

A documentação do GitHub Pages desaconselha usar sites do Pages para **transações sensíveis, como envio de senhas**. Um formulário de e-mail + senha — a tela `4c` como está desenhada — é justamente esse caso.

A recomendação não é técnica (o tráfego é HTTPS de qualquer modo); é uma condição de uso do serviço. Ignorá-la mantém o app funcionando, mas contraria a orientação do provedor e a §14.2 da especificação.

## Três caminhos

**A. Manter o GitHub Pages e trocar o método de login (recomendado).**
Usar o Supabase Auth sem senha: **link mágico por e-mail** (OTP) ou OAuth (Google/GitHub). O usuário digita o e-mail, recebe o link, volta autenticado. Nenhuma senha trafega pelo site do Pages, a preferência pelo GitHub é preservada e a implementação é mais simples do que o fluxo com senha.

Impacto no design: a tela `4c` precisa de uma variante — campo de e-mail, botão "Enviar link de acesso" e um estado "Confira seu e-mail". O campo de senha e o "Esqueci minha senha" saem. Peça essa variante ao designer antes de implementar o acesso.

**B. Manter o GitHub Pages com e-mail + senha.**
Funciona tecnicamente. Registre no repositório a decisão consciente de contrariar a orientação do provedor, mantendo o app como uso pessoal.

**C. Trocar a hospedagem.**
Vercel ou Netlify conectados ao mesmo repositório GitHub — o código continua versionado no GitHub, muda só quem serve os arquivos, e a ressalva desaparece. **Não faça essa troca sem apresentar a proposta ao proprietário** (§4.3 é explícito: nada de substituir silenciosamente a preferência informada).

## Recomendação

Caminho **A**: GitHub Pages + link mágico. Preserva a preferência, resolve a ressalva e reduz o escopo de autenticação.

## Conta do proprietário

A conta se chama **Ágata**. O app é de uso pessoal, com um único proprietário autenticado.

**A senha nunca entra no repositório, nem no código, nem em arquivo de configuração versionado.** Num app estático publicado no GitHub Pages, qualquer credencial escrita no código-fonte fica legível por quem abrir a página — inclusive num repositório privado, porque o JavaScript publicado é público. Uma verificação de login feita no navegador (`if (senha === "...")`) não protege nada: os dados continuam acessíveis direto pelo Supabase.

O correto:

1. Criar o usuário no painel do Supabase (Authentication → Users), com o e-mail do proprietário. O Supabase guarda só o hash da senha.
2. O app autentica contra o Supabase; o RLS do banco é quem garante que só esse usuário lê e escreve os próprios dados.
3. Se o caminho A (link mágico) for adotado, não existe senha alguma — o acesso é pelo e-mail.

Se o proprietário quiser manter senha própria, ela é definida no painel do Supabase e trocada por lá; o repositório nunca a conhece. O nome "Ágata" pode ser usado como nome de exibição do perfil (`perfis.nome`) e como nome da categoria homônima já prevista em `semear_perfil()`.

## Configuração pendente (não simule integração concluída)

Quem implementar precisa receber, fora do repositório:

1. URL do projeto Supabase e a chave publicável (`anon`).
2. Redirect URLs autorizadas no Supabase Auth, incluindo `https://le0nardo-carvalho.github.io/financeiro/`.
3. Provedor de e-mail configurado no Supabase, se o caminho A for adotado.

Enquanto esses itens não existirem, o app deve exibir claramente que a configuração está pendente — nunca fingir que a integração está pronta.

## Referências citadas na especificação

- GitHub Pages: o que é e limites de uso — links no §4.1 e §4.3 de `01-especificacao-produto.md`
- Supabase: autenticação, mudanças em tempo real, Row Level Security e chaves de API — links nos §4.2 e §14.2
