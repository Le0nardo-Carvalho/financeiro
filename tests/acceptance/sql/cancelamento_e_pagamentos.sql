-- ============================================================================
-- Testes de banco da alteração 06 — CA27 a CA35 (cancelar/desfazer compra do
-- mercado e pagamento de fatura em partes).
--
-- Requer as migrações 0001–0005 aplicadas. Contra um Postgres local comum,
-- aplique antes tests/acceptance/sql/supabase_local_shim.sql (instruções no
-- topo dele). Cada bloco levanta exceção se a asserção falhar; rodar o
-- arquivo inteiro sem erro = suíte passou. Tudo termina em ROLLBACK.
-- ============================================================================

begin;

insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'teste-06@teste.dev')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select semear_perfil();

-- Funções auxiliares só desta sessão (pg_temp some no fim).
create function pg_temp.gastos_do_mes(p_mes date) returns bigint language sql as $$
  select coalesce(sum(valor_centavos), 0) from lancamentos_mensais
   where owner_id = auth.uid() and mes_competencia = p_mes
$$;

-- ---------------------------------------------------------------------------
-- CA31–CA35 — fatura de outubro de R$ 786,00; gastos do mês R$ 1.213,20.
-- Nubank fecha dia 5 e vence dia 12: compra em 20/09 cai na fatura de outubro.
-- ---------------------------------------------------------------------------
do $$
declare
  cat uuid; cartao uuid; compra_credito uuid; fatura uuid; pag_pix uuid; pag_boleto uuid;
  r record; qtd_lanc_antes int;
begin
  select categoria_mercado_id into cat from perfis where id = auth.uid();
  select id into cartao from cartoes where owner_id = auth.uid() and apelido = 'Nubank';

  compra_credito := criar_compra('Notebook', '2026-09-20', 78600, cat, 'credito', cartao);
  perform criar_compra('Mercado do Bairro', '2026-10-14', 27430, cat, 'pix');
  perform criar_compra('Uber centro', '2026-10-10', 15290, cat, 'debito');
  update compras set conta_origem = 'Banco do Brasil'
   where owner_id = auth.uid() and forma_pagamento in ('pix', 'debito');

  select fatura_id into fatura from lancamentos_mensais where compra_id = compra_credito;
  if (select mes_referencia from faturas where id = fatura) <> '2026-10-01' then
    raise exception 'preparação: a compra de 20/09 deveria cair na fatura de outubro';
  end if;
  if pg_temp.gastos_do_mes('2026-10-01') <> 121320 then
    raise exception 'preparação: gastos de outubro deveriam ser R$ 1.213,20, deu %', pg_temp.gastos_do_mes('2026-10-01');
  end if;

  select * into r from faturas_resumo where id = fatura;
  if r.situacao <> 'aberta' or r.total_centavos <> 78600 or r.saldo_centavos <> 78600 then
    raise exception 'fatura sem pagamento deveria estar aberta com saldo 786,00 (situacao=%, saldo=%)', r.situacao, r.saldo_centavos;
  end if;

  select count(*) into qtd_lanc_antes from lancamentos_mensais where owner_id = auth.uid();

  -- CA32 — só o pagamento de R$ 500,00 → parcial, saldo R$ 286,00.
  insert into pagamentos_fatura (fatura_id, data, valor_centavos, meio, conta_origem)
  values (fatura, '2026-10-10', 50000, 'pix', 'Banco do Brasil') returning id into pag_pix;
  select * into r from faturas_resumo where id = fatura;
  if r.situacao <> 'parcial' or r.saldo_centavos <> 28600 then
    raise exception 'CA32 falhou: esperado parcial com saldo 286,00 (situacao=%, saldo=%)', r.situacao, r.saldo_centavos;
  end if;
  if (select paga from faturas where id = fatura) then
    raise exception 'CA32 falhou: faturas.paga não pode ser true com pagamento parcial';
  end if;

  -- CA31 — Pix 500,00 + boleto 286,00 → paga; gastos continuam R$ 1.213,20.
  insert into pagamentos_fatura (fatura_id, data, valor_centavos, meio, conta_origem)
  values (fatura, '2026-10-12', 28600, 'boleto', 'Banco do Brasil') returning id into pag_boleto;
  select * into r from faturas_resumo where id = fatura;
  if r.situacao <> 'paga' or r.saldo_centavos <> 0 or r.pago_centavos <> 78600 then
    raise exception 'CA31 falhou: esperado paga (situacao=%, pago=%)', r.situacao, r.pago_centavos;
  end if;
  if not (select paga from faturas where id = fatura) or (select paga_em from faturas where id = fatura) <> '2026-10-12' then
    raise exception 'CA31 falhou: gatilho não sincronizou faturas.paga/paga_em';
  end if;
  if pg_temp.gastos_do_mes('2026-10-01') <> 121320 then
    raise exception 'CA31 falhou: gastos de outubro mudaram com o pagamento (%)', pg_temp.gastos_do_mes('2026-10-01');
  end if;

  -- CA34 — pagamento não cria lançamento; gasto só vem de lancamentos_mensais.
  if (select count(*) from lancamentos_mensais where owner_id = auth.uid()) <> qtd_lanc_antes then
    raise exception 'CA34 falhou: registrar pagamento criou lançamento';
  end if;

  -- CA35 — "Saiu das contas" = Pix + débito em compras + pagamentos de fatura.
  if (select sum(valor_centavos) from saidas_por_conta
       where owner_id = auth.uid() and mes = '2026-10-01' and conta = 'Banco do Brasil') <> 121320 then
    raise exception 'CA35 falhou: Banco do Brasil deveria somar 1.213,20';
  end if;
  if (select valor_centavos from saidas_por_conta
       where owner_id = auth.uid() and mes = '2026-10-01' and conta = 'Banco do Brasil' and tipo = 'pagamento_fatura') <> 78600 then
    raise exception 'CA35 falhou: pagamentos da fatura deveriam somar 786,00 por conta';
  end if;
  if exists (select 1 from saidas_por_conta where owner_id = auth.uid() and tipo = 'credito') then
    raise exception 'CA35 falhou: compra no crédito não pode aparecer como saída de conta';
  end if;

  -- CA33 — excluir um pagamento recalcula a situação (e editar também).
  delete from pagamentos_fatura where id = pag_boleto;
  select * into r from faturas_resumo where id = fatura;
  if r.situacao <> 'parcial' or r.saldo_centavos <> 28600 or (select paga from faturas where id = fatura) then
    raise exception 'CA33 falhou: após excluir o boleto a fatura deveria voltar a parcial';
  end if;
  update pagamentos_fatura set valor_centavos = 78600 where id = pag_pix;
  if (select situacao from faturas_resumo where id = fatura) <> 'paga' then
    raise exception 'CA33 falhou: editar o pagamento para o total deveria quitar a fatura';
  end if;
  delete from pagamentos_fatura where id = pag_pix;
  select * into r from faturas_resumo where id = fatura;
  if r.situacao <> 'aberta' or r.pago_centavos <> 0 or (select paga from faturas where id = fatura) then
    raise exception 'CA33 falhou: sem pagamentos a fatura deveria estar aberta';
  end if;
  if pg_temp.gastos_do_mes('2026-10-01') <> 121320 then
    raise exception 'CA33/CA34 falhou: excluir pagamento mudou os gastos';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- CA27 — cancelar lista aberta não cria compra nem lançamento.
-- ---------------------------------------------------------------------------
do $$
declare lista uuid; nova uuid; compras_antes int; lanc_antes int;
begin
  select count(*) into compras_antes from compras where owner_id = auth.uid();
  select count(*) into lanc_antes from lancamentos_mensais where owner_id = auth.uid();

  insert into listas_mercado (owner_id, nome) values (auth.uid(), 'Churrasco do sábado') returning id into lista;
  insert into itens_lista (owner_id, lista_id, produto, quantidade, preco_unitario_centavos, confirmado, posicao)
  values (auth.uid(), lista, 'Carvão', 1, 2500, true, 0),
         (auth.uid(), lista, 'Picanha', 1.2, 8990, true, 1);

  nova := cancelar_lista(lista, 'nao_fui', false);

  if nova is not null then
    raise exception 'CA27 falhou: sem levar itens não deveria criar lista nova';
  end if;
  if (select situacao from listas_mercado where id = lista) <> 'cancelada'
     or (select motivo_cancelamento from listas_mercado where id = lista) <> 'nao_fui'
     or (select cancelada_em from listas_mercado where id = lista) is null
     or (select compra_id from listas_mercado where id = lista) is not null then
    raise exception 'CA27 falhou: lista não ficou cancelada com motivo e data';
  end if;
  if (select count(*) from compras where owner_id = auth.uid()) <> compras_antes
     or (select count(*) from lancamentos_mensais where owner_id = auth.uid()) <> lanc_antes then
    raise exception 'CA27 falhou: cancelar criou compra ou lançamento';
  end if;

  -- Cancelada pode ser reaberta; finalizada não pode ser cancelada.
  perform reabrir_lista(lista);
  if (select situacao from listas_mercado where id = lista) <> 'aberta'
     or (select motivo_cancelamento from listas_mercado where id = lista) is not null then
    raise exception 'CA27 falhou: reabrir não devolveu a lista para aberta';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- CA28 — cancelar levando os itens cria lista aberta com os mesmos produtos,
-- sem preço e sem confirmação.
-- ---------------------------------------------------------------------------
do $$
declare lista uuid; nova uuid;
begin
  insert into listas_mercado (owner_id, nome) values (auth.uid(), 'Compra do mês') returning id into lista;
  insert into itens_lista (owner_id, lista_id, produto, marca, quantidade, unidade, preco_unitario_centavos, confirmado, posicao)
  values (auth.uid(), lista, 'Arroz 5 kg', 'Tio João', 1, 'un', 2790, true, 0),
         (auth.uid(), lista, 'Banana prata', null, 0.75, 'kg', 690, true, 1),
         (auth.uid(), lista, 'Detergente', 'Ypê', 3, 'un', null, false, 2);

  nova := cancelar_lista(lista, null, true);

  if nova is null or (select situacao from listas_mercado where id = nova) <> 'aberta' then
    raise exception 'CA28 falhou: não criou lista aberta nova';
  end if;
  if (select situacao from listas_mercado where id = lista) <> 'cancelada' then
    raise exception 'CA28 falhou: a lista original deveria ficar cancelada';
  end if;
  if exists (
    select produto, marca, quantidade, unidade, posicao from itens_lista where lista_id = lista
    except
    select produto, marca, quantidade, unidade, posicao from itens_lista where lista_id = nova
  ) or (select count(*) from itens_lista where lista_id = nova) <> 3 then
    raise exception 'CA28 falhou: a lista nova não tem os mesmos produtos, marcas e quantidades';
  end if;
  if exists (select 1 from itens_lista where lista_id = nova and (preco_unitario_centavos is not null or confirmado)) then
    raise exception 'CA28 falhou: itens levados adiante não podem ter preço nem confirmação';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- CA29 / CA30 — desfazer lista finalizada remove a compra e todas as parcelas,
-- devolve o total do mês e não deixa nada órfão.
-- ---------------------------------------------------------------------------
do $$
declare cat uuid; lista uuid; compra uuid; antes bigint; depois_finalizar bigint;
begin
  select categoria_mercado_id into cat from perfis where id = auth.uid();
  antes := pg_temp.gastos_do_mes('2026-10-01');

  insert into listas_mercado (owner_id, nome) values (auth.uid(), 'Mercado do Bairro') returning id into lista;
  insert into itens_lista (owner_id, lista_id, produto, quantidade, preco_unitario_centavos, confirmado)
  values (auth.uid(), lista, 'Arroz', 1, 2790, true),
         (auth.uid(), lista, 'Café', 2, 1950, true),
         (auth.uid(), lista, 'Banana', 0.75, 690, true),   -- 5,175 → 5,18
         (auth.uid(), lista, 'Queijo', 0.3, 4200, false);  -- fora do total

  compra := finalizar_lista(lista, '2026-10-14', cat, 'pix');
  depois_finalizar := pg_temp.gastos_do_mes('2026-10-01');
  if depois_finalizar - antes <> 7208 then
    raise exception 'preparação: finalizar deveria somar R$ 72,08 ao mês (somou %)', depois_finalizar - antes;
  end if;

  perform desfazer_finalizacao(lista, 'aberta');

  -- CA29
  if pg_temp.gastos_do_mes('2026-10-01') <> antes then
    raise exception 'CA29 falhou: o total do mês não voltou ao valor anterior';
  end if;
  if exists (select 1 from lancamentos_mensais where compra_id = compra) then
    raise exception 'CA29 falhou: sobraram parcelas da compra desfeita';
  end if;
  -- CA30
  if exists (select 1 from compras where id = compra) then
    raise exception 'CA30 falhou: a compra continua existindo';
  end if;
  if (select compra_id from listas_mercado where id = lista) is not null
     or (select situacao from listas_mercado where id = lista) <> 'aberta'
     or (select finalizada_em from listas_mercado where id = lista) is not null then
    raise exception 'CA30 falhou: a lista ainda aponta para a compra ou não voltou para aberta';
  end if;
  if (select count(*) from itens_lista where lista_id = lista) <> 4 then
    raise exception 'CA29 falhou: itens e preços deveriam continuar na lista';
  end if;

  -- Refinalizar depois de desfazer gera uma compra nova normalmente
  -- (idempotência continua valendo dentro de cada finalização).
  compra := finalizar_lista(lista, '2026-10-14', cat, 'pix');
  if finalizar_lista(lista, '2026-10-14', cat, 'pix') <> compra then
    raise exception 'CA21 (regressão) falhou: refinalizar duas vezes gerou compras diferentes';
  end if;
  perform desfazer_finalizacao(lista, 'cancelada');
  if (select situacao from listas_mercado where id = lista) <> 'cancelada'
     or (select cancelada_em from listas_mercado where id = lista) is null then
    raise exception 'CA29 falhou: destino "cancelada" não foi aplicado';
  end if;
end $$;

-- CA29 / CA30 com crédito parcelado e fatura já paga: todas as parcelas saem
-- e as faturas com pagamento ficam marcadas como corrigidas.
do $$
declare cat uuid; cartao uuid; lista uuid; compra uuid; fatura_paga uuid; meses date[];
begin
  select categoria_mercado_id into cat from perfis where id = auth.uid();
  select id into cartao from cartoes where owner_id = auth.uid() and apelido = 'Nubank';

  insert into listas_mercado (owner_id, nome) values (auth.uid(), 'Compra grande') returning id into lista;
  insert into itens_lista (owner_id, lista_id, produto, quantidade, preco_unitario_centavos, confirmado)
  values (auth.uid(), lista, 'Geladeira', 1, 300000, true);

  compra := finalizar_lista(lista, '2026-11-20', cat, 'credito', cartao, 3::smallint);
  if (select count(*) from lancamentos_mensais where compra_id = compra) <> 3 then
    raise exception 'preparação: compra em 3x deveria ter 3 parcelas';
  end if;
  select array_agg(mes_competencia order by numero_parcela) into meses from lancamentos_mensais where compra_id = compra;
  select fatura_id into fatura_paga from lancamentos_mensais where compra_id = compra and numero_parcela = 1;
  insert into pagamentos_fatura (fatura_id, valor_centavos, meio) values (fatura_paga, 100000, 'pix');

  perform desfazer_finalizacao(lista, 'aberta');

  if exists (select 1 from lancamentos_mensais where compra_id = compra) or exists (select 1 from compras where id = compra) then
    raise exception 'CA29 falhou: parcelas ou compra do crédito sobraram';
  end if;
  if exists (select 1 from lancamentos_mensais where owner_id = auth.uid() and mes_competencia = any (meses) and valor_centavos = 100000) then
    raise exception 'CA29 falhou: alguma parcela de R$ 1.000,00 continua nos meses';
  end if;
  if not (select corrigida_apos_pagamento from faturas where id = fatura_paga) then
    raise exception 'CA29 falhou: fatura com pagamento deveria ficar marcada como corrigida';
  end if;
  if exists (select 1 from pagamentos_fatura where fatura_id = fatura_paga and valor_centavos <> 100000) then
    raise exception 'pagamento não pode ser alterado ao desfazer a compra';
  end if;
end $$;

-- CA30 — atomicidade: chamadas inválidas não mudam nada.
do $$
declare lista uuid; falhou boolean;
begin
  insert into listas_mercado (owner_id, nome) values (auth.uid(), 'Aberta') returning id into lista;

  falhou := false;
  begin
    perform desfazer_finalizacao(lista, 'aberta');
  exception when others then falhou := true;
  end;
  if not falhou or (select situacao from listas_mercado where id = lista) <> 'aberta' then
    raise exception 'CA30 falhou: desfazer uma lista aberta deveria falhar sem mudar nada';
  end if;

  falhou := false;
  begin
    perform reabrir_lista(lista);
  exception when others then falhou := true;
  end;
  if not falhou then
    raise exception 'CA30 falhou: reabrir só vale para lista cancelada';
  end if;

  if exists (
    select 1 from listas_mercado l
     where l.owner_id = auth.uid() and l.compra_id is not null
       and not exists (select 1 from compras c where c.id = l.compra_id)
  ) then
    raise exception 'CA30 falhou: há lista apontando para compra inexistente';
  end if;
  if exists (
    select 1 from compras c
     where c.owner_id = auth.uid() and c.origem = 'mercado'
       and not exists (select 1 from listas_mercado l where l.compra_id = c.id)
  ) then
    raise exception 'CA30 falhou: há compra de mercado órfã';
  end if;
end $$;

reset role;

do $$ begin raise notice 'Todos os testes de cancelamento e pagamentos (CA27–CA35) passaram.'; end $$;

rollback; -- não deixa dado de teste no banco
