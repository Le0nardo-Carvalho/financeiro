# Documentação do aplicativo de finanças pessoais


**Versão:** 1.1  
**Destino:** Claude Designer  
**Idioma:** Português do Brasil  
**Atualização desta versão:** criação e edição de categorias explicitadas como requisitos obrigatórios, com atualização dos gráficos e preservação do histórico.


## 1. Objetivo


Desenvolver um aplicativo web para registrar despesas pessoais, acompanhar faturas de cartão de crédito, distribuir compras parceladas entre os meses, analisar gastos por categoria, controlar objetivos financeiros e organizar compras de mercado.


O aplicativo deve funcionar no computador e no celular, com interface adaptada a cada dispositivo e acesso à mesma base de dados centralizada.


Este documento orienta o design, o desenvolvimento e a validação. O resultado esperado é um aplicativo funcional com persistência real dos dados.


## 2. Requisitos confirmados


| ID | Requisito obrigatório |
|---|---|
| RF01 | Registrar despesas distinguindo Pix, débito e cartão de crédito. |
| RF02 | Informar o número de parcelas de uma compra no crédito e distribuí-las automaticamente entre as faturas correspondentes. |
| RF03 | Consultar o total e a composição da fatura atual, incluindo parcelas de compras anteriores. |
| RF04 | Criar objetivos financeiros e acompanhar seu progresso em valores e gráficos. |
| RF05 | Criar e editar categorias de despesas, incluindo as categorias sugeridas inicialmente. |
| RF06 | Visualizar gastos por categoria no dashboard e consultar o total mensal e o histórico de cada categoria. |
| RF07 | Montar listas de mercado com produto, marca e quantidade, preenchendo os preços posteriormente. |
| RF08 | Confirmar os itens pegos, calcular o total e finalizar a compra com a forma de pagamento escolhida. |
| RF09 | Gerar automaticamente a despesa correspondente à compra de mercado finalizada, sem duplicidade. |
| RF10 | Sincronizar as informações entre computador e celular por meio de uma base central. |
| RF11 | Utilizar o GitHub no projeto e na estratégia de publicação, conforme a preferência do usuário. |


## 3. Premissas propostas para a primeira versão


As decisões abaixo resolvem detalhes ainda não especificados. Elas são premissas de implementação e podem ser ajustadas posteriormente.


| Aspecto | Premissa inicial |
|---|---|
| Uso | Pessoal, com acesso autenticado do proprietário. |
| Idioma e moeda | Português do Brasil e real brasileiro. |
| Datas | Exibição em dia/mês/ano. |
| Fuso horário | Configurável, inicialmente Brasília. |
| Cartões | Permitir um ou mais cartões, cada um com seu ciclo de fechamento e vencimento. |
| Crédito | O gasto mensal corresponde às parcelas das faturas com vencimento naquele mês. |
| Objetivos | Evolução alimentada por registros manuais de valores guardados e retirados. |
| Conectividade | Internet necessária para salvar e sincronizar na primeira versão. |
| Mercado | Cada lista finalizada gera uma única compra financeira; categoria inicial sugerida: Mercado. |
| Categorias | As sugestões iniciais são editáveis e o usuário pode criar outras categorias. |


## 4. Arquitetura, hospedagem e armazenamento


### 4.1 Responsabilidades


| Componente | Responsabilidade |
|---|---|
| Repositório GitHub | Código, documentação e histórico de alterações do projeto. |
| Hospedagem da interface | Publicar as telas acessadas pelo navegador. |
| Serviço de dados | Guardar informações, autenticar o usuário e sincronizar os dispositivos. |


O requisito de “arquivo centralizador” deve ser atendido por uma fonte única de dados compartilhada pelos dispositivos. Não é obrigatório que essa fonte seja literalmente um único arquivo.


O GitHub Pages publica arquivos estáticos de interface. Para atender à sincronização e à gravação dos lançamentos, o projeto precisa de um serviço de dados acessível pela aplicação. Não utilizar um JSON versionado no repositório como solução principal de gravação, nem usar o armazenamento local do navegador como única base. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)


### 4.2 Proposta técnica


- Interface responsiva com React e TypeScript.
- Supabase para banco de dados, autenticação e acompanhamento de alterações.
- Código e instruções de configuração mantidos no GitHub.


Essa combinação é uma recomendação técnica. Os requisitos funcionais não dependem de uma marca específica de banco de dados.


O Supabase oferece autenticação integrada às regras de acesso do banco e recursos de acompanhamento de alterações. [Autenticação](https://supabase.com/docs/guides/auth), [alterações em tempo real](https://supabase.com/docs/guides/realtime/postgres-changes)


### 4.3 Decisão de publicação


Preservar a preferência pelo GitHub ao avaliar a hospedagem. Antes de adotar GitHub Pages para a versão com dados reais, verificar a compatibilidade do fluxo de autenticação com suas condições de uso, que desaconselham transações sensíveis, como envio de senhas.


Se outra hospedagem conectada ao repositório for necessária, apresentar a proposta e explicar a mudança antes da publicação. Não substituir silenciosamente a preferência informada. [Limites do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)


### 4.4 Sincronização obrigatória


- Salvar lançamentos, categorias, cartões, objetivos e listas de mercado na base central.
- Carregar os registros existentes ao entrar em qualquer dispositivo.
- Atualizar as telas depois de alterações confirmadas.
- Consultar novamente os dados ao recuperar a conexão ou retornar ao aplicativo.
- Sincronizar também listas de mercado ainda não finalizadas.
- Apresentar os estados “Salvando”, “Atualizado” e “Sem conexão”.
- Se uma gravação falhar, preservar o formulário e permitir tentar novamente.
- Detectar quando outro dispositivo alterou o mesmo registro; não sobrescrever silenciosamente uma versão mais recente.
- Durante uma desconexão, identificar os dados como a última versão disponível e bloquear a confirmação de novas gravações nesta primeira versão.
- Não apresentar uma gravação como concluída antes da confirmação do serviço de dados.


## 5. Estrutura de telas


| Tela | Conteúdo principal |
|---|---|
| Acesso | Entrada na conta, recuperação de acesso e saída. |
| Dashboard | Panorama mensal, formas de pagamento, categorias, faturas e objetivos. |
| Lançamentos | Cadastro, consulta, filtros e correção de despesas. |
| Cartões e faturas | Configuração dos cartões, composição das faturas e parcelas futuras. |
| Categorias | Criação, edição, arquivamento e análise mensal e histórica. |
| Objetivos | Metas, movimentações e progresso. |
| Mercado | Listas em andamento, itens e compras finalizadas. |
| Configurações | Preferências, conta e exportação dos dados. |


No computador, utilizar navegação lateral. No celular, priorizar as ações frequentes em uma navegação compacta, mantendo todas as áreas acessíveis.


## 6. Lançamentos financeiros


### 6.1 Campos


| Campo | Regra |
|---|---|
| Descrição | Obrigatória. |
| Data da compra | Obrigatória; sugerir o dia atual. |
| Valor total | Obrigatório e maior que zero. |
| Categoria | Obrigatória; selecionar uma categoria ativa ou criar uma nova. |
| Forma de pagamento | Pix, débito ou crédito. |
| Cartão utilizado | Obrigatório quando o pagamento for crédito. |
| Número de parcelas | Obrigatório no crédito; iniciar em 1. |
| Primeira fatura | Sugerida automaticamente e ajustável antes de salvar. |
| Observações | Opcionais. |
| Origem | Manual ou compra de mercado. |


Apresentar os campos de cartão e parcelamento após selecionar crédito.


Antes de salvar uma compra parcelada, mostrar uma prévia contendo o valor de cada parcela e o mês de incidência.


### 6.2 Consulta e correção


Permitir:


- Busca por descrição.
- Filtros por período, categoria, pagamento e cartão.
- Consulta da compra original e de todas as suas parcelas.
- Correção e exclusão de lançamentos com confirmação das consequências.
- Reclassificação de uma compra para outra categoria.


Alterações de valor, data, cartão ou parcelamento devem mostrar os meses afetados e atualizar os registros vinculados em uma única operação, sem criar outra compra.


Se a correção afetar uma fatura marcada como paga, destacar esse efeito antes da confirmação e indicar que seu registro foi corrigido.


A reclassificação de uma compra deve atualizar a categoria de todos os seus lançamentos mensais, preservando valores, datas, parcelamento e identidade da compra.


## 7. Regra de contabilização mensal


Usar a mesma definição de gasto mensal em todas as telas, gráficos e consultas.


| Forma de pagamento | Mês em que o gasto entra |
|---|---|
| Pix | Mês da data da compra. |
| Débito | Mês da data da compra. |
| Crédito em uma parcela | Mês de vencimento da fatura correspondente. |
| Crédito parcelado | Cada parcela entra no mês de vencimento de sua fatura. |


**Gastos do mês = Pix do mês + débito do mês + parcelas de crédito atribuídas ao mês.**


O valor integral de uma compra parcelada deve aparecer nos detalhes da compra. Nas somas mensais, entram apenas as parcelas correspondentes.


Exemplo: uma compra de R$ 1.200,00 em três parcelas de R$ 400,00 representa R$ 400,00 em cada um dos três meses previstos.


Registrar que uma fatura foi paga não pode gerar outra despesa: suas compras já foram contabilizadas.


Aportes em objetivos financeiros ficam separados dos gastos, pois representam valores guardados segundo a premissa inicial.


## 8. Cartões, faturas e parcelamento


### 8.1 Cadastro de cartão


Cada cartão deve ter:


- Nome ou apelido.
- Dia de fechamento.
- Dia de vencimento.
- Identificação visual.
- Situação ativa ou arquivada.


O aplicativo não precisa armazenar número completo do cartão, código de segurança ou credenciais bancárias.


### 8.2 Distribuição automática


Adotar este procedimento inicial:


1. Identificar o primeiro fechamento que ocorre na data da compra ou depois dela.
2. Associar esse fechamento à primeira ocorrência do dia de vencimento configurado posterior ao fechamento.
3. Sugerir essa fatura para a primeira parcela.
4. Permitir que o usuário ajuste a primeira fatura antes de salvar.
5. Distribuir as demais parcelas pelas faturas mensais seguintes.


A inclusão de compras feitas no próprio dia do fechamento é uma convenção inicial do aplicativo. O ajuste manual da primeira fatura permite acomodar diferenças no processamento pelo emissor.


Exemplo hipotético, com fechamento no dia 25 e vencimento no dia 5:


| Data da compra | Primeira fatura sugerida |
|---|---|
| Dia 18 de setembro | Vencimento em 5 de outubro. |
| Dia 25 de setembro | Vencimento em 5 de outubro. |
| Dia 26 de setembro | Vencimento em 5 de novembro. |


Tratar corretamente a passagem de dezembro para janeiro e os meses com menos dias. Se o dia configurado não existir em determinado mês, utilizar seu último dia.


Guardar as datas atribuídas às faturas. Alterar a configuração do cartão não deve reorganizar silenciosamente compras já registradas.


### 8.3 Precisão dos valores


Armazenar dinheiro em centavos inteiros ou utilizar cálculo decimal exato.


O número de parcelas deve ser inteiro e positivo. A geração precisa preservar o valor integral da compra e evitar parcelas inválidas de valor zero.


Quando a divisão produzir centavos restantes, distribuí-los pelas primeiras parcelas. Exemplo:


| Parcela | Valor |
|---|---:|
| 1 de 3 | R$ 33,34 |
| 2 de 3 | R$ 33,33 |
| 3 de 3 | R$ 33,33 |
| **Total** | **R$ 100,00** |


### 8.4 Visão das faturas


Mostrar:


- Cartão e mês de vencimento.
- Datas de fechamento e vencimento.
- Total da fatura.
- Compras no crédito em uma parcela.
- Parcelas de compras anteriores.
- Identificação de cada parcela, como “2 de 6”.
- Categoria e descrição da compra.
- Situação: em formação, fechada ou marcada como paga.
- Previsão das faturas seguintes baseada nas compras cadastradas.


O dashboard deve identificar claramente a fatura do mês selecionado. A próxima fatura em formação pode ser apresentada separadamente, pois pode pertencer a outro mês.


Permitir cadastrar compras antigas com a data original para incorporar suas parcelas aos meses correspondentes, incluindo as que ainda vencerão.


## 9. Dashboard principal


O dashboard deve abrir no mês atual e permitir selecionar outros meses e anos.


Apresentar:


- Total de gastos do mês.
- Total em Pix.
- Total em débito.
- Total em crédito atribuído ao mês.
- Resumo das faturas.
- Gráfico de gastos por categoria.
- Lançamentos recentes.
- Resumo dos objetivos financeiros.
- Acesso rápido a “Novo gasto” e à lista de mercado.


Os valores por forma de pagamento são componentes do total mensal. Não devem ser somados novamente a esse total.


O gráfico deve possuir uma lista ou tabela equivalente, com valores e opção de selecionar cada categoria, para permitir uso pelo teclado e leitura no celular.


## 10. Categorias: criação, edição e histórico


### 10.1 Princípio obrigatório


As categorias devem ser gerenciadas pelo usuário. Não podem ser uma lista fixa alterável apenas no código.


As categorias sugeridas inicialmente devem oferecer as mesmas possibilidades de edição das categorias criadas pelo usuário.


### 10.2 Criar categoria


Disponibilizar a ação “Nova categoria” na tela Categorias e junto ao campo de categoria do formulário de despesas.


Campos:


| Campo | Regra |
|---|---|
| Nome | Obrigatório. |
| Cor de identificação | Editável, com uma cor inicial sugerida. |
| Descrição | Opcional. |
| Situação | Ativa inicialmente. |


Ao criar uma categoria a partir do formulário de despesas:


1. Preservar os dados já preenchidos da despesa.
2. Salvar a categoria na base central.
3. Selecioná-la automaticamente depois da confirmação.
4. Permitir continuar o lançamento sem refazer o formulário.


Remover espaços desnecessários dos nomes e impedir duplicações equivalentes para o mesmo usuário, desconsiderando diferenças apenas de maiúsculas e minúsculas. Se houver uma categoria arquivada equivalente, oferecer sua reativação.


### 10.3 Editar categoria


Disponibilizar a ação “Editar” para alterar nome, cor e descrição.


Regras:


- Preservar o identificador da categoria ao editar.
- Atualizar nome e cor nos formulários, lançamentos vinculados, filtros, faturas e gráficos.
- Manter todos os vínculos históricos existentes.
- Não criar outra categoria para realizar uma renomeação.
- Não alterar valores, datas, formas de pagamento ou parcelas das compras.
- Sincronizar a edição entre celular e computador.
- Detectar conflito de edição se outro dispositivo tiver modificado a mesma categoria.


Exemplo: renomear “Alimentação” para “Restaurantes e lanches” deve mudar sua apresentação em todo o aplicativo, mantendo os mesmos registros e totais.


### 10.4 Arquivar, reativar e excluir


- Permitir arquivar e reativar categorias.
- Categorias arquivadas deixam de aparecer para novos lançamentos.
- Registros já vinculados continuam identificados e entram normalmente nos totais e gráficos.
- Permitir consultar categorias arquivadas nos filtros históricos.
- A edição de outro campo de uma compra antiga não deve exigir a troca de uma categoria arquivada já vinculada.
- Excluir definitivamente apenas categorias sem vínculos, com confirmação.
- Quando houver vínculos, orientar o arquivamento para preservar o histórico.


### 10.5 Reclassificar compras


Permitir trocar a categoria de uma compra já registrada.


A mudança deve atualizar a compra original e sua classificação em todos os lançamentos mensais. Os gráficos das categorias de origem e destino devem ser recalculados, sem alterar o gasto total.


### 10.6 Categoria padrão do Mercado


A categoria sugerida para compras de mercado deve ser identificada por seu ID, não pela comparação com o texto “Mercado”.


Renomear essa categoria deve preservar seu uso como sugestão. Se ela for arquivada, solicitar uma categoria ativa ao finalizar a próxima compra, permitindo criar uma nova.


### 10.7 Análise por categoria


Ao selecionar uma categoria no gráfico, abrir seu detalhamento com:


- Total no mês selecionado.
- Total histórico acumulado até o mês atual.
- Evolução mensal.
- Lista dos lançamentos.
- Filtros por período e forma de pagamento.
- Compromissos futuros já cadastrados, apresentados separadamente.


O histórico deve seguir a regra de contabilização mensal. Parcelas de meses futuros ficam fora do total histórico e aparecem na previsão.


Sugestões iniciais editáveis: Mercado, Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Assinaturas e Outros.


## 11. Objetivos financeiros


Permitir objetivos como “Viagem”, “Computador” ou “Reserva”.


| Campo | Regra |
|---|---|
| Nome | Obrigatório. |
| Valor desejado | Obrigatório e maior que zero. |
| Valor inicial guardado | Opcional. |
| Prazo desejado | Opcional. |
| Descrição | Opcional. |
| Movimentações | Valores adicionados ou retirados, com data. |


Registrar o valor inicial como uma movimentação para manter o histórico consistente.


Calcular:


- **Acumulado:** entradas menos retiradas.
- **Valor restante:** meta menos acumulado, limitado ao mínimo de zero.
- **Progresso:** acumulado dividido pela meta, multiplicado por 100.


Exibir acumulado, meta, valor restante e gráfico ou barra de progresso. Permitir consultar o histórico de movimentações.


Se o acumulado superar a meta, preservar o valor real e indicar objetivo alcançado. A barra pode terminar em 100%.


Uma retirada não pode superar o valor registrado naquele objetivo.


Esses registros acompanham o planejamento informado pelo usuário. Não representam transferências bancárias executadas pelo aplicativo.


## 12. Seção Mercado


### 12.1 Montagem da lista


Permitir criar uma lista com nome e adicionar itens:


| Campo | Regra |
|---|---|
| Produto | Obrigatório. |
| Marca | Disponível para preenchimento, podendo ficar vazia. |
| Quantidade | Obrigatória e maior que zero. |
| Unidade | Unidade, kg, litro ou outra opção. |
| Valor unitário | Pode ficar vazio durante o planejamento. |
| Item confirmado | Inicialmente desmarcado. |
| Subtotal | Calculado automaticamente. |


Permitir quantidades fracionadas quando fizer sentido para a unidade, como 0,750 kg.


### 12.2 Durante a compra


O usuário deve conseguir:


1. Abrir a lista no celular.
2. Adicionar ou remover itens.
3. Ajustar marca e quantidade.
4. Preencher o preço unitário posteriormente à inclusão do produto.
5. Marcar o item depois de pegá-lo.
6. Acompanhar o total dos itens confirmados.


O check exige quantidade válida e preço preenchido. Um preço explicitamente igual a zero deve ser distinguido de um campo vazio.


**Subtotal do item = quantidade × preço unitário.**


Usar cálculo decimal, arredondar cada subtotal para centavos e somar os subtotais confirmados. Adotar uma regra consistente de arredondamento de meio centavo para cima nos valores positivos.


Itens desmarcados ficam fora do valor a finalizar.


O total e o botão “Finalizar Compra” devem permanecer acessíveis durante o uso no celular.


### 12.3 Finalização


Apresentar antes da confirmação:


- Quantidade de itens confirmados.
- Total da compra.
- Data.
- Estabelecimento, opcional.
- Categoria, inicialmente a categoria padrão de Mercado.
- Forma de pagamento.
- Cartão, número de parcelas e primeira fatura, quando aplicáveis.


Exigir pelo menos um item confirmado, gravações dos itens concluídas e total maior que zero.


Após confirmar:


- Gerar uma única compra financeira vinculada à lista.
- Aplicar as regras de Pix, débito ou crédito.
- Atualizar dashboard, categoria e fatura, quando houver.
- Guardar produtos, quantidades e preços no histórico.
- Manter itens não confirmados identificados como não comprados.


A lista em andamento não gera despesas. A despesa surge somente após a finalização confirmada.


### 12.4 Prevenção de duplicidade e correções


Desabilitar o botão enquanto a operação estiver sendo processada.


Garantir também no serviço de dados que duas solicitações de finalização da mesma lista retornem a mesma compra, sem gerar outra despesa. A proteção deve funcionar mesmo quando a conexão cair depois de o servidor concluir a operação.


Finalizar a lista, criar a compra e gerar os lançamentos mensais devem ocorrer em uma operação atômica: todas as etapas são concluídas ou nenhuma é confirmada.


Depois de finalizar, mudanças de valores devem utilizar uma ação explícita de correção que atualize a compra vinculada e, quando necessário, suas parcelas. Não permitir que o total dos itens e o registro financeiro fiquem divergentes.


## 13. Organização dos dados


Modelo conceitual sugerido:


| Entidade | Informações principais |
|---|---|
| Perfil | Identidade, moeda, fuso e categoria padrão do Mercado. |
| Categoria | ID estável, nome, cor, descrição, proprietário e situação. |
| Cartão | Apelido, fechamento, vencimento e proprietário. |
| Fatura | Cartão, mês de referência, datas e marcação de pagamento. |
| Compra | Descrição, data, valor integral, categoria, pagamento e origem. |
| Lançamento mensal | Compra de origem, valor, mês, número da parcela e fatura. |
| Objetivo | Nome, valor desejado e prazo. |
| Movimentação do objetivo | Objetivo, data, valor e tipo de movimento. |
| Lista de mercado | Nome, situação e vínculo com a compra finalizada. |
| Item da lista | Produto, marca, quantidade, unidade, preço e confirmação. |


Cada compra em Pix ou débito gera um lançamento mensal. Cada compra no crédito gera um lançamento mensal por parcela.


Dashboard, categorias e faturas devem agregar os lançamentos mensais. A compra original guarda o contexto e o valor integral, evitando contagens duplicadas.


A classificação dos lançamentos deve usar a categoria vinculada à compra por ID. Se a implementação duplicar o ID da categoria nos lançamentos, as reclassificações precisam atualizar todos os vínculos de forma atômica.


Os registros devem possuir identificadores estáveis, proprietário, datas de criação e atualização e controle de versão.


Validar os vínculos para impedir associações a categorias, cartões, objetivos ou listas de outro usuário.


## 14. Interface, proteção e manutenção


### 14.1 Interface


Priorizar:


- Leitura confortável e destaque dos valores monetários.
- Formulários curtos, com campos apresentados conforme a escolha.
- Botões fáceis de tocar no celular.
- Identificação textual das formas de pagamento.
- Mensagens específicas junto aos campos inválidos.
- Estados de carregamento, ausência de registros e falha de conexão.
- Navegação por teclado e gráficos compreensíveis sem depender apenas de cores.
- Ações “Nova categoria” e “Editar categoria” fáceis de encontrar.


A primeira versão não inclui conciliação bancária ou acompanhamento de receitas. Por isso, não apresentar um suposto saldo bancário disponível.


### 14.2 Proteção dos dados


Exigir autenticação e aplicar proteção no banco e nas operações de gravação.


Se Supabase for adotado, configurar políticas por proprietário com Row Level Security para consulta, inserção, alteração e exclusão. Funções e consultas agregadas também precisam respeitar esse isolamento. [Regras de acesso do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)


No navegador, utilizar apenas a chave publicável apropriada. Chaves secretas, administrativas e credenciais do banco devem permanecer fora do código distribuído e do repositório. [Chaves de API do Supabase](https://supabase.com/docs/guides/getting-started/api-keys)


### 14.3 Exportação


Como complemento de manutenção, prever exportação dos dados do proprietário. Os arquivos exportados com informações pessoais não devem ser incluídos no repositório.


## 15. Critérios de aceitação


Os cenários abaixo são testes a executar durante o desenvolvimento. Não representam validações de um aplicativo já implementado.


| ID | Cenário | Resultado esperado |
|---|---|---|
| CA01 | Registrar R$ 100,00 em Pix e R$ 50,00 em débito no mesmo mês. | Total mensal de R$ 150,00, separado corretamente por pagamento. |
| CA02 | Acrescentar uma compra de R$ 300,00 em três parcelas, começando naquele mês. | Total mensal de R$ 250,00; crédito representa R$ 100,00. |
| CA03 | Dividir R$ 100,00 em três parcelas. | R$ 33,34 + R$ 33,33 + R$ 33,33. |
| CA04 | Comprar antes, no dia e depois do fechamento. | Primeira fatura segue a convenção documentada. |
| CA05 | Ajustar manualmente a primeira fatura. | As parcelas seguintes acompanham a nova referência. |
| CA06 | Parcelamento atravessar dezembro ou um mês curto. | Meses, anos e datas de vencimento corretos. |
| CA07 | Criar a categoria “Pets”. | Ela aparece na seleção de novos gastos e no outro dispositivo após sincronizar. |
| CA08 | Criar uma categoria pelo formulário de despesa. | Dados já preenchidos são preservados e a nova categoria é selecionada. |
| CA09 | Renomear uma categoria com gastos históricos e parcelas futuras. | Novo nome aparece em todos os vínculos; valores e datas permanecem iguais. |
| CA10 | Editar a cor de uma categoria. | Gráfico, legendas e identificação visual passam a utilizar a nova cor. |
| CA11 | Arquivar uma categoria utilizada. | Ela sai das opções para novos gastos e permanece no histórico e nos totais. |
| CA12 | Reclassificar uma compra parcelada. | Categorias de origem e destino são recalculadas em todos os meses afetados; total geral não muda. |
| CA13 | Renomear a categoria padrão do Mercado. | A sugestão da finalização mantém o vínculo com a mesma categoria. |
| CA14 | Selecionar uma categoria no gráfico. | Totais mensal e histórico respeitam os períodos; futuro aparece separado. |
| CA15 | Marcar uma fatura como paga. | Nenhum gasto adicional é criado. |
| CA16 | Guardar R$ 250,00 para uma meta de R$ 1.000,00. | Progresso de 25% e R$ 750,00 restantes. |
| CA17 | Adicionar um produto ao mercado sem preço. | Item permanece na lista, com confirmação bloqueada. |
| CA18 | Confirmar 2 unidades de R$ 10,00 e 3 unidades de R$ 5,00. | Total de R$ 35,00. |
| CA19 | Manter outro produto de R$ 100,00 desmarcado. | Total confirmado continua em R$ 35,00. |
| CA20 | Finalizar a lista de R$ 35,00 em Pix. | Uma única despesa de R$ 35,00 é criada. |
| CA21 | Repetir a solicitação de finalização. | A mesma compra é retornada, sem duplicidade. |
| CA22 | Finalizar uma compra de mercado parcelada. | O total é distribuído entre as faturas segundo a regra geral. |
| CA23 | Alterar dados no computador e consultar no celular. | Ambos apresentam os registros confirmados na base central. |
| CA24 | Dois dispositivos editarem a mesma versão. | O conflito é identificado, sem perda silenciosa. |
| CA25 | Tentar acessar dados sem autorização. | Consulta ou alteração é impedida pelo serviço de dados. |
| CA26 | Perder a conexão durante uma gravação. | Não há falsa confirmação; os dados digitados são preservados. |


Validar também a coerência entre totais do dashboard, da categoria e da fatura ao consultar os mesmos lançamentos.


## 16. Entregáveis esperados


A implementação deve entregar:


- Interface funcional para computador e celular.
- Código organizado para o repositório GitHub.
- Banco de dados, relacionamentos e regras de acesso.
- Cadastro e correção de despesas.
- Criação, edição, arquivamento e reativação de categorias pela interface.
- Cálculo de parcelas e consultas mensais centralizados.
- Finalização de listas de mercado sem duplicidade.
- Objetivos financeiros com movimentações e gráficos.
- Autenticação e sincronização reais.
- Dados fictícios opcionais para demonstração, separados dos dados reais.
- Testes das regras críticas desta documentação.
- Instruções para configurar, executar e publicar o aplicativo.
- Lista objetiva de dependências externas e eventuais pendências.


Considerar a versão completa somente depois de validar os fluxos principais com persistência real e acesso por dois dispositivos ou sessões distintas.


## 17. Instrução de uso para o Claude Designer


Ao receber este arquivo, use-o como especificação principal do projeto.


~~~text
Desenvolva o aplicativo de finanças pessoais descrito neste documento.


Comece apresentando a arquitetura proposta, a navegação e as premissas adotadas.
Depois implemente os fluxos e a persistência centralizada.


Inclua interface responsiva para computador e celular, lançamentos em Pix,
débito e crédito, faturas, parcelamento automático, categorias, objetivos
financeiros e listas de mercado integradas às despesas.


A criação e a edição de categorias são requisitos obrigatórios. O usuário deve
poder gerenciar suas categorias pela interface, incluindo as categorias sugeridas.
Editar o nome ou a cor deve atualizar as telas e preservar os registros históricos.
Permita também arquivar e reativar categorias sem perder os vínculos existentes.


Preserve as regras de contabilização mensal. Uma compra parcelada deve impactar
cada mês apenas com sua parcela correspondente. Marcar a fatura como paga não deve
duplicar despesas.


A finalização de uma lista de mercado deve gerar uma única compra financeira,
inclusive quando a solicitação for repetida.


Mantenha o código preparado para GitHub e verifique a compatibilidade da
hospedagem escolhida com autenticação e uso de dados pessoais. Explique qualquer
mudança proposta na estratégia de publicação.


Use autenticação e proteção por proprietário no banco de dados. Se uma
integração depender de configuração externa, implemente o necessário e indique
exatamente a configuração pendente, sem apresentar uma simulação como integração
concluída.


Valide os critérios de aceitação e entregue instruções de instalação, configuração
e publicação. Dê prioridade a cálculos corretos, clareza das telas, gestão de
categorias e sincronização confiável.
~~~