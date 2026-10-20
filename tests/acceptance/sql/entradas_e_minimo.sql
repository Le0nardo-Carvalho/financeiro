-- ============================================================================
-- Testes de banco da alteração 10 — CA27-E a CA33-E (entradas, balancete e
-- mínimo mensal) e a regra "entradas, pagamentos de fatura e ajustes de
-- fatura nunca entram nos totais de gastos".
--
-- Os critérios do 10 reaproveitam os números CA27–CA33, que já existiam no 06
-- (cancelamento e pagamentos). Aqui eles levam o sufixo "-E" (entradas).
--
-- Requer as migrações 0001–0006 e 0008 aplicadas (0007 e 0009 são só dados
-- da conta real e não rodam num banco vazio). Contra um Postgres local comum,
-- aplique antes tests/acceptance/sql/supabase_local_shim.sql. Cada bloco
-- levanta exceção se a asserção falhar; rodar o arquivo inteiro sem erro =
-- suíte passou. Tudo termina em ROLLBACK.
-- ============================================================================

begin;

insert into auth.users (id, email) values
  ('44444444-4444-4444-4444-444444444444', 'teste-10a@teste.dev'),
  ('55555555-5555-5555-5555-555555555555', 'teste-10b@teste.dev')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claims" = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';

select semear_perfil();

create function pg_temp.gastos_do_mes(p_mes date) returns bigint language sql as $$
  select coalesce(sum(valor_centavos), 0) from lancamentos_mensais
   where owner_id = auth.uid() and mes_competencia = p_mes
$$;

-- Itens do mínimo como o 0008 cria para quem já tinha perfil: média de
-- Mercado (3 meses) + Claro 185 + Caesb 100 + Neoenergia 380.
insert into minimo_itens (nome, tipo, categoria_id, valor_centavos, meses_media, termo, posicao)
select v.nome, v.tipo, case when v.tipo = 'media_categoria' then p.categoria_mercado_id end, v.valor, 3, v.termo, v.pos
  from perfis p
 cross join (values
   ('Mercado',            'media_categoria', null::bigint, null::text,           0),
   ('Internet Claro',     'fixo',            18500,        'claro',              1),
   ('Água Caesb',         'fixo',            10000,        'caesb|saneamento',   2),
   ('Energia Neoenergia', 'fixo',            38000,        'neoenergia|\mceb\M', 3)
 ) as v(nome, tipo, valor, termo, pos)
 where p.id = auth.uid();

-- ---------------------------------------------------------------------------
-- Preparação — outubro/2026 com os números reais do 10 (§3, "Exemplo real").
-- ---------------------------------------------------------------------------
do $$
declare
  mercado uuid; outros uuid;
begin
  select categoria_mercado_id into mercado from perfis where id = auth.uid();
  select id into outros from categorias where owner_id = auth.uid() and nome <> 'Mercado' order by nome limit 1;

  -- CA29-E: mercado jul 687,10 · ago 620,49 · set 426,19.
  perform criar_compra('Supermercado', '2026-07-10', 68710, mercado, 'pix');
  perform criar_compra('Supermercado', '2026-08-10', 62049, mercado, 'pix');
  perform criar_compra('Supermercado', '2026-09-10', 42619, mercado, 'pix');

  -- Outubro: mercado 356,54 · Claro 186,34 · Neoenergia 479,78 · água nada.
  perform criar_compra('Supermercado', '2026-10-05', 35654, mercado, 'pix');
  perform criar_compra('Internet Claro', '2026-10-15', 18634, outros, 'pix');
  perform criar_compra('Conta de luz', '2026-10-15', 47978, outros, 'pix', null, 1::smallint, null, 'manual', 'Neoenergia');
  -- O resto do mês, até 3.141,87 de gastos.
  perform criar_compra('Outras despesas', '2026-10-08', 211921, outros, 'debito');

  if pg_temp.gastos_do_mes('2026-10-01') <> 314187 then
    raise exception 'preparação: gastos de outubro deveriam ser 3.141,87, deu %', pg_temp.gastos_do_mes('2026-10-01');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- CA27-E — entrada de R$ 3.000,00 não altera gastos do mês, categoria nem
-- fatura. Vale também para pagamento e ajuste de fatura.
-- ---------------------------------------------------------------------------
do $$
declare
  cat_mercado uuid; cartao uuid; compra uuid; fatura uuid;
  gastos_antes bigint; categoria_antes bigint; fatura_antes record; r record;
  bal_gastos_antes bigint; saude_gastos_antes bigint;
begin
  select categoria_mercado_id into cat_mercado from perfis where id = auth.uid();
  select id into cartao from cartoes where owner_id = auth.uid() and apelido = 'Nubank';

  -- Uma compra no crédito de 20/09 cai na fatura de outubro (fecha 5, vence 12).
  compra := criar_compra('Notebook', '2026-09-20', 78600, cat_mercado, 'credito', cartao);
  select fatura_id into fatura from lancamentos_mensais where compra_id = compra;

  gastos_antes := pg_temp.gastos_do_mes('2026-10-01');
  select coalesce(sum(valor_centavos), 0) into categoria_antes from lancamentos_mensais
   where owner_id = auth.uid() and mes_competencia = '2026-10-01' and categoria_id = cat_mercado;
  select * into fatura_antes from faturas_resumo where id = fatura;
  select gastos_centavos into bal_gastos_antes from balancete_mensal where owner_id = auth.uid() and mes = '2026-10-01';
  select gastos_centavos into saude_gastos_antes from saude_do_mes('2026-10-01');

  insert into entradas (descricao, data, valor_centavos, tipo, conta)
  values ('Teste CA27', '2026-10-07', 300000, 'renda', 'Banco do Brasil');
  insert into pagamentos_fatura (fatura_id, data, valor_centavos, meio, conta_origem)
  values (fatura, '2026-10-12', 78600, 'pix', 'Banco do Brasil');
  insert into ajustes_fatura (fatura_id, valor_centavos, tipo, descricao)
  values (fatura, 12345, 'saldo_anterior', 'Saldo do mês anterior');

  if pg_temp.gastos_do_mes('2026-10-01') <> gastos_antes then
    raise exception 'CA27-E falhou: entrada/pagamento/ajuste mudou os gastos do mês';
  end if;
  if (select coalesce(sum(valor_centavos), 0) from lancamentos_mensais
       where owner_id = auth.uid() and mes_competencia = '2026-10-01' and categoria_id = cat_mercado) <> categoria_antes then
    raise exception 'CA27-E falhou: entrada/pagamento/ajuste mudou o total da categoria';
  end if;
  if (select gastos_centavos from balancete_mensal where owner_id = auth.uid() and mes = '2026-10-01') <> bal_gastos_antes then
    raise exception 'CA27-E falhou: gastos do balancete mudaram';
  end if;
  if (select gastos_centavos from saude_do_mes('2026-10-01')) <> saude_gastos_antes then
    raise exception 'CA27-E falhou: gastos de saude_do_mes mudaram';
  end if;

  -- A entrada não abate a fatura; o ajuste compõe o total, mas não é gasto.
  select * into r from faturas_resumo where id = fatura;
  if r.gastos_centavos <> fatura_antes.gastos_centavos then
    raise exception 'CA27-E falhou: gastos da fatura mudaram (% → %)', fatura_antes.gastos_centavos, r.gastos_centavos;
  end if;
  if r.total_centavos <> fatura_antes.total_centavos + 12345 or r.ajustes_centavos <> 12345 then
    raise exception 'ajuste deveria compor o total da fatura (total=%, ajustes=%)', r.total_centavos, r.ajustes_centavos;
  end if;
  if r.situacao <> 'parcial' or r.saldo_centavos <> 12345 then
    raise exception 'com o ajuste, o pagamento de 786,00 deixa a fatura parcial com saldo 123,45 (situacao=%, saldo=%)', r.situacao, r.saldo_centavos;
  end if;

  -- Desfaz a preparação deste bloco: os blocos seguintes usam outubro "limpo".
  delete from entradas where descricao = 'Teste CA27';
  delete from compras where id = compra;
  delete from ajustes_fatura where fatura_id = fatura;
  delete from pagamentos_fatura where fatura_id = fatura;
  raise notice 'CA27-E ok';
end $$;

-- ---------------------------------------------------------------------------
-- CA29-E e CA30-E — mínimo de outubro, item a item.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  -- CA29-E: média de jul/ago/set = (687,10 + 620,49 + 426,19) / 3 = 577,93.
  select * into r from minimo_do_mes('2026-10-01') where nome = 'Mercado';
  if r.previsto_centavos <> 57793 then
    raise exception 'CA29-E falhou: previsto de mercado deveria ser 577,93, deu %', r.previsto_centavos;
  end if;
  if r.gasto_centavos <> 35654 or r.falta_centavos <> 22139 or r.coberto_centavos <> 35654 then
    raise exception 'mercado: gasto 356,54 e falta 221,39 (gasto=%, falta=%)', r.gasto_centavos, r.falta_centavos;
  end if;

  -- CA30-E: Neoenergia 479,78 de 380,00 → falta 0, excedente 99,78…
  select * into r from minimo_do_mes('2026-10-01') where nome = 'Energia Neoenergia';
  if r.falta_centavos <> 0 or r.excedente_centavos <> 9978 or r.coberto_centavos <> 38000 then
    raise exception 'CA30-E falhou: energia deveria ter falta 0 e excedente 99,78 (falta=%, excedente=%)', r.falta_centavos, r.excedente_centavos;
  end if;
  -- … e a falta da água continua 100,00 (excedente não abate outro item).
  select * into r from minimo_do_mes('2026-10-01') where nome = 'Água Caesb';
  if r.falta_centavos <> 10000 or r.gasto_centavos <> 0 then
    raise exception 'CA30-E falhou: água deveria ter falta 100,00, deu %', r.falta_centavos;
  end if;
  select * into r from minimo_do_mes('2026-10-01') where nome = 'Internet Claro';
  if r.falta_centavos <> 0 or r.gasto_centavos <> 18634 then
    raise exception 'Claro: pago 186,34, falta 0 (gasto=%, falta=%)', r.gasto_centavos, r.falta_centavos;
  end if;

  if (select sum(previsto_centavos) from minimo_do_mes('2026-10-01')) <> 124293 then
    raise exception 'mínimo de outubro deveria ser 1.242,93';
  end if;
  raise notice 'CA29-E e CA30-E ok';
end $$;

-- ---------------------------------------------------------------------------
-- CA31-E e CA32-E — nível de alerta.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  -- CA32-E (sem entradas): outubro ainda sem nenhuma entrada → não alerta.
  select * into r from saude_do_mes('2026-10-01');
  if r.nivel <> 'sem_entradas' then
    raise exception 'CA32-E falhou: sem entradas deveria dar "sem_entradas", deu %', r.nivel;
  end if;

  -- CA31-E: entradas 3.217,05 − gastos 3.141,87 = 75,18; falta 321,39 →
  -- "alto", faltam 246,21.
  insert into entradas (descricao, data, valor_centavos, tipo, conta, recorrente, dia_previsto) values
    ('M Dumont Bordados', '2026-10-07', 300000, 'renda', 'Banco do Brasil', true, 7),
    ('M Dumont Bordados', '2026-10-13',   6705, 'renda', 'Banco do Brasil', false, null),
    ('Marcelo Pedro',     '2026-10-06',  15000, 'outro', 'Banco do Brasil', false, null);
  select * into r from saude_do_mes('2026-10-01');
  if r.entradas_centavos <> 321705 or r.gastos_centavos <> 314187 or r.falta_minimo_centavos <> 32139
     or r.gasto_essencial_centavos <> 102266 or r.minimo_centavos <> 124293 then
    raise exception 'CA31-E falhou na preparação: %', row_to_json(r);
  end if;
  if r.sobra_centavos <> -24621 or r.nivel <> 'alto' then
    raise exception 'CA31-E falhou: esperado sobra −246,21 e nível alto (sobra=%, nivel=%)', r.sobra_centavos, r.nivel;
  end if;

  -- CA32-E: sobra entre 0 e a margem (300,00) → atenção.
  insert into entradas (descricao, data, valor_centavos, tipo) values ('Extra 1', '2026-10-16', 34621, 'extra');
  select * into r from saude_do_mes('2026-10-01');
  if r.sobra_centavos <> 10000 or r.nivel <> 'atencao' then
    raise exception 'CA32-E falhou: sobra 100,00 deveria dar atenção (sobra=%, nivel=%)', r.sobra_centavos, r.nivel;
  end if;

  -- Exatamente na margem (300,00) já é tranquilo.
  insert into entradas (descricao, data, valor_centavos, tipo) values ('Extra 2', '2026-10-17', 20000, 'extra');
  select * into r from saude_do_mes('2026-10-01');
  if r.sobra_centavos <> 30000 or r.nivel <> 'tranquilo' then
    raise exception 'CA32-E falhou: sobra igual à margem deveria dar tranquilo (sobra=%, nivel=%)', r.sobra_centavos, r.nivel;
  end if;

  -- A margem é editável (3c): com margem 500,00 a mesma sobra volta a "atenção".
  update perfis set margem_atencao_centavos = 50000 where id = auth.uid();
  select * into r from saude_do_mes('2026-10-01');
  if r.nivel <> 'atencao' or r.margem_centavos <> 50000 then
    raise exception 'CA32-E falhou: margem 500,00 deveria dar atenção (nivel=%)', r.nivel;
  end if;
  update perfis set margem_atencao_centavos = 30000 where id = auth.uid();

  delete from entradas where descricao in ('Extra 1', 'Extra 2');
  raise notice 'CA31-E e CA32-E ok';
end $$;

-- ---------------------------------------------------------------------------
-- CA28-E — balancete = entradas − lancamentos_mensais; acumulado reinicia em
-- janeiro.
-- ---------------------------------------------------------------------------
do $$
declare
  outros uuid; r record;
begin
  select id into outros from categorias where owner_id = auth.uid() and nome <> 'Mercado' order by nome limit 1;
  perform criar_compra('Presente', '2025-12-20', 50000, outros, 'pix');
  insert into entradas (descricao, data, valor_centavos, tipo) values ('Bico', '2025-12-10', 20000, 'extra');
  perform criar_compra('Farmácia', '2026-01-15', 10000, outros, 'pix');
  insert into entradas (descricao, data, valor_centavos, tipo) values ('Renda jan', '2026-01-05', 40000, 'renda');

  select * into r from balancete_mensal where owner_id = auth.uid() and mes = '2025-12-01';
  if r.resultado_centavos <> -30000 or r.acumulado_ano_centavos <> -30000 then
    raise exception 'CA28-E falhou em dez/2025: %', row_to_json(r);
  end if;
  -- Janeiro começa do zero: acumulado = resultado do próprio mês.
  select * into r from balancete_mensal where owner_id = auth.uid() and mes = '2026-01-01';
  if r.entradas_centavos <> 40000 or r.gastos_centavos <> 10000 or r.resultado_centavos <> 30000
     or r.acumulado_ano_centavos <> 30000 then
    raise exception 'CA28-E falhou: acumulado deveria reiniciar em janeiro: %', row_to_json(r);
  end if;

  -- Cada mês: entradas − soma de lancamentos_mensais do mês.
  for r in select * from balancete_mensal where owner_id = auth.uid() loop
    if r.gastos_centavos <> pg_temp.gastos_do_mes(r.mes)
       or r.entradas_centavos <> (select coalesce(sum(valor_centavos), 0) from entradas
                                   where owner_id = auth.uid() and date_trunc('month', data) = r.mes)
       or r.resultado_centavos <> r.entradas_centavos - r.gastos_centavos then
      raise exception 'CA28-E falhou em %: %', r.mes, row_to_json(r);
    end if;
  end loop;

  -- Acumulado de 2026 até outubro = soma dos resultados de jan a out.
  if (select acumulado_ano_centavos from balancete_mensal where owner_id = auth.uid() and mes = '2026-10-01')
     <> (select sum(resultado_centavos) from balancete_mensal where owner_id = auth.uid()
          and mes between '2026-01-01' and '2026-10-01') then
    raise exception 'CA28-E falhou: acumulado de outubro não bate com a soma do ano';
  end if;
  raise notice 'CA28-E ok';
end $$;

-- ---------------------------------------------------------------------------
-- CA33-E — recorrente do mês anterior não recebida aparece como prevista e
-- entra na sobra; ao lançar a entrada real, a prevista some. Usa outro
-- usuário e o mês corrente (a função só prevê do mês atual em diante).
-- ---------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select semear_perfil();

do $$
declare
  atual date := date_trunc('month', current_date)::date;
  anterior date := (date_trunc('month', current_date) - interval '1 month')::date;
  passado date := (date_trunc('month', current_date) - interval '2 month')::date;
  r record; sobra_antes bigint;
begin
  insert into entradas (descricao, data, valor_centavos, tipo, conta, recorrente, dia_previsto)
  values ('Salário', anterior + 6, 300000, 'renda', 'Banco do Brasil', true, 7);

  select * into r from saude_do_mes(atual);
  if r.previstas_centavos <> 300000 or r.entradas_centavos <> 0 then
    raise exception 'CA33-E falhou: a recorrente deveria aparecer como prevista (previstas=%, entradas=%)', r.previstas_centavos, r.entradas_centavos;
  end if;
  if r.nivel = 'sem_entradas' or r.sobra_centavos <> 300000 - r.gastos_centavos - r.falta_minimo_centavos then
    raise exception 'CA33-E falhou: a prevista deveria entrar na sobra (sobra=%, nivel=%)', r.sobra_centavos, r.nivel;
  end if;
  sobra_antes := r.sobra_centavos;

  -- Mês passado não ganha previstas (só o atual em diante).
  insert into entradas (descricao, data, valor_centavos, tipo, recorrente)
  values ('Aluguel recebido', passado + 2, 50000, 'renda', true);
  if (select previstas_centavos from saude_do_mes(anterior)) <> 0 then
    raise exception 'CA33-E falhou: mês já passado não deveria ter previstas';
  end if;

  -- A entrada real (descrição igual, sem diferenciar maiúsculas/espaços) apaga a prevista.
  insert into entradas (descricao, data, valor_centavos, tipo, conta)
  values ('  salário ', atual + 6, 300000, 'renda', 'Banco do Brasil');
  select * into r from saude_do_mes(atual);
  if r.previstas_centavos <> 0 or r.entradas_centavos <> 300000 or r.sobra_centavos <> sobra_antes then
    raise exception 'CA33-E falhou: depois da entrada real a prevista deveria sumir (previstas=%, entradas=%)', r.previstas_centavos, r.entradas_centavos;
  end if;
  raise notice 'CA33-E ok';
end $$;

-- ---------------------------------------------------------------------------
-- Isolamento: um usuário não vê entradas, itens do mínimo nem balancete do
-- outro.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from entradas where owner_id = '44444444-4444-4444-4444-444444444444')
     or exists (select 1 from minimo_itens where owner_id = '44444444-4444-4444-4444-444444444444')
     or exists (select 1 from balancete_mensal where owner_id = '44444444-4444-4444-4444-444444444444') then
    raise exception 'RLS falhou: usuário B enxerga dados do usuário A';
  end if;
  raise notice 'Isolamento ok';
end $$;

do $$ begin raise notice 'Todos os testes de entradas, balancete e mínimo (CA27-E–CA33-E) passaram.'; end $$;

rollback;
