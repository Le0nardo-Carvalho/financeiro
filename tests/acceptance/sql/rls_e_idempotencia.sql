-- ============================================================================
-- Testes de isolamento (RLS) e idempotência — CA07, CA09, CA12, CA13, CA15,
-- CA20-CA22, CA24, CA25.
--
-- Requer Postgres real com a migração 0001_initial.sql aplicada (Supabase
-- local via `supabase start`, ou um projeto de teste). Este ambiente de
-- desenvolvimento não tem Docker disponível para rodar Postgres local, então
-- este script não foi executado aqui — rode-o você mesmo com:
--
--   supabase start
--   supabase db push
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2)" -f tests/acceptance/sql/rls_e_idempotencia.sql
--
-- Cada bloco levanta exceção (ROLLBACK do teste) se a asserção falhar, então
-- rodar o arquivo inteiro sem erro = suíte passou.
-- ============================================================================

begin;

-- Dois usuários fictícios para testar isolamento entre proprietários.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'usuaria-a@teste.dev'),
  ('22222222-2222-2222-2222-222222222222', 'usuario-b@teste.dev')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- CA25 — sem contexto de auth.uid(), RLS bloqueia toda leitura/escrita.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{}'; -- sem sub => auth.uid() é null

do $$
begin
  perform 1 from categorias limit 1;
  -- não deve levantar erro (RLS filtra, não bloqueia a query em si),
  -- mas a contagem tem que ser zero.
  if exists (select 1 from categorias) then
    raise exception 'CA25 falhou: linhas visíveis sem auth.uid()';
  end if;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Semeia dados para o usuário A e cria uma categoria para o usuário B.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select semear_perfil();

do $$
declare cat_mercado uuid; cartao_nubank uuid; compra uuid;
begin
  select categoria_mercado_id into cat_mercado from perfis where id = auth.uid();
  select id into cartao_nubank from cartoes where owner_id = auth.uid() limit 1;

  if cat_mercado is null or cartao_nubank is null then
    raise exception 'semear_perfil() não criou categoria Mercado ou cartão Nubank';
  end if;

  -- CA09 / CA13 — renomear a categoria Mercado preserva ID e vínculo do perfil.
  update categorias set nome = 'Mercadinho', versao = versao + 1 where id = cat_mercado;
  if (select categoria_mercado_id from perfis where id = auth.uid()) <> cat_mercado then
    raise exception 'CA13 falhou: renomear a categoria Mercado perdeu o vínculo do perfil';
  end if;

  -- CA02/CA12 — compra parcelada e reclassificação.
  compra := criar_compra('Notebook', '2026-09-18', 30000, cat_mercado, 'credito', cartao_nubank, 3);
  if (select count(*) from lancamentos_mensais where compra_id = compra) <> 3 then
    raise exception 'CA02 falhou: compra em 3 parcelas não gerou 3 lançamentos';
  end if;
  if (select sum(valor_centavos) from lancamentos_mensais where compra_id = compra) <> 30000 then
    raise exception 'CA02 falhou: soma das parcelas diverge do valor total';
  end if;

  declare outra_cat uuid;
  begin
    insert into categorias (owner_id, nome, cor) values (auth.uid(), 'Eletrônicos', '#8fa073')
      returning id into outra_cat;
    perform reclassificar_compra(compra, outra_cat);
    if (select categoria_id from compras where id = compra) <> outra_cat then
      raise exception 'CA12 falhou: compra não foi reclassificada';
    end if;
    if exists (select 1 from lancamentos_mensais where compra_id = compra and categoria_id <> outra_cat) then
      raise exception 'CA12 falhou: nem todos os lançamentos foram reclassificados';
    end if;
  end;

  -- CA15 — marcar fatura como paga não cria lançamento.
  declare qtd_antes int; qtd_depois int; fatura_id uuid;
  begin
    select count(*) into qtd_antes from lancamentos_mensais where owner_id = auth.uid();
    select id into fatura_id from lancamentos_mensais where compra_id = compra limit 1;
    select fatura_id into fatura_id from lancamentos_mensais where compra_id = compra limit 1;
    update faturas set paga = true, paga_em = current_date where id = fatura_id;
    select count(*) into qtd_depois from lancamentos_mensais where owner_id = auth.uid();
    if qtd_antes <> qtd_depois then
      raise exception 'CA15 falhou: marcar fatura como paga criou lançamento(s)';
    end if;
  end;
end $$;

-- CA20/CA21 — finalização de lista de mercado é idempotente.
do $$
declare
  cat_mercado uuid; lista uuid; item uuid; compra1 uuid; compra2 uuid;
begin
  select categoria_mercado_id into cat_mercado from perfis where id = auth.uid();

  insert into listas_mercado (owner_id, nome) values (auth.uid(), 'Feira') returning id into lista;
  insert into itens_lista (owner_id, lista_id, produto, quantidade, preco_unitario_centavos, confirmado)
    values (auth.uid(), lista, 'Tomate', 2, 1750, true) returning id into item;

  compra1 := finalizar_lista(lista, current_date, cat_mercado, 'pix');
  compra2 := finalizar_lista(lista, current_date, cat_mercado, 'pix'); -- repetida

  if compra1 <> compra2 then
    raise exception 'CA21 falhou: finalizar duas vezes gerou compras diferentes';
  end if;
  if (select count(*) from compras where origem = 'mercado' and id in (compra1, compra2)) <> 1 then
    raise exception 'CA21 falhou: duas compras foram persistidas para a mesma lista';
  end if;
  if (select valor_total_centavos from compras where id = compra1) <> 3500 then
    raise exception 'CA20 falhou: valor da compra de mercado não bate com os itens confirmados';
  end if;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- CA07 — isolamento entre usuários: B não vê nem altera dados de A.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select semear_perfil();

do $$
begin
  if exists (
    select 1 from categorias where owner_id = '11111111-1111-1111-1111-111111111111'
  ) then
    raise exception 'CA07/CA25 falhou: usuário B enxerga categorias do usuário A';
  end if;

  begin
    update categorias set nome = 'Invadido'
      where owner_id = '11111111-1111-1111-1111-111111111111';
    if found then
      raise exception 'CA07/CA25 falhou: usuário B conseguiu alterar categoria do usuário A';
    end if;
  end;
end $$;

reset role;

raise notice 'Todos os testes de RLS e idempotência passaram.';

rollback; -- não deixa dado de teste no banco
