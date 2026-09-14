-- ============================================================================
-- Aplicativo de finanças pessoais — esquema Postgres / Supabase
-- Dinheiro sempre em centavos inteiros. Um único proprietário por registro.
-- Execute na ordem; cada bloco é idempotente o suficiente para reexecução em dev.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tipos ----
do $$ begin
  create type forma_pagamento as enum ('pix', 'debito', 'credito');
exception when duplicate_object then null; end $$;

do $$ begin
  create type origem_compra as enum ('manual', 'mercado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_movimento as enum ('aporte', 'retirada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type situacao_lista as enum ('aberta', 'finalizada');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- perfis ------
create table if not exists perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  moeda text not null default 'BRL',
  fuso text not null default 'America/Sao_Paulo',
  categoria_mercado_id uuid,               -- FK adicionada depois de categorias
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- --------------------------------------------------------- categorias ------
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  cor text not null,
  descricao text,
  arquivada boolean not null default false,
  versao integer not null default 1,        -- controle de concorrência
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Impede duplicatas equivalentes do mesmo usuário, ignorando caixa e espaços.
create unique index if not exists categorias_owner_nome_unico
  on categorias (owner_id, lower(btrim(nome)));

alter table perfis
  drop constraint if exists perfis_categoria_mercado_fk,
  add constraint perfis_categoria_mercado_fk
  foreign key (categoria_mercado_id) references categorias (id) on delete set null;

-- ------------------------------------------------------------ cartões ------
create table if not exists cartoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  apelido text not null,
  dia_fechamento smallint not null check (dia_fechamento between 1 and 31),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  cor text not null default '#8fa073',
  arquivado boolean not null default false,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ------------------------------------------------------------ faturas ------
-- mes_referencia = primeiro dia do mês de VENCIMENTO. As datas ficam gravadas:
-- mudar o ciclo do cartão nunca reorganiza faturas já criadas.
create table if not exists faturas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  cartao_id uuid not null references cartoes (id) on delete cascade,
  mes_referencia date not null,
  data_fechamento date not null,
  data_vencimento date not null,
  paga boolean not null default false,
  paga_em date,
  corrigida_apos_pagamento boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (cartao_id, mes_referencia)
);

-- ------------------------------------------------------------ compras ------
create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  descricao text not null check (btrim(descricao) <> ''),
  data_compra date not null,
  valor_total_centavos bigint not null check (valor_total_centavos > 0),
  categoria_id uuid not null references categorias (id) on delete restrict,
  forma_pagamento forma_pagamento not null,
  cartao_id uuid references cartoes (id) on delete restrict,
  parcelas smallint not null default 1 check (parcelas >= 1),
  origem origem_compra not null default 'manual',
  estabelecimento text,
  observacoes text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint credito_exige_cartao check (
    (forma_pagamento = 'credito' and cartao_id is not null)
    or (forma_pagamento <> 'credito' and cartao_id is null and parcelas = 1)
  )
);

-- -------------------------------------------------- lançamentos mensais ----
-- Uma linha por mês de competência. Pix/débito geram 1; crédito, 1 por parcela.
-- Toda agregação (dashboard, categoria, fatura) lê desta tabela.
create table if not exists lancamentos_mensais (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  compra_id uuid not null references compras (id) on delete cascade,
  categoria_id uuid not null references categorias (id) on delete restrict,
  valor_centavos bigint not null check (valor_centavos > 0),
  mes_competencia date not null,            -- primeiro dia do mês
  numero_parcela smallint not null default 1,
  total_parcelas smallint not null default 1,
  fatura_id uuid references faturas (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (compra_id, numero_parcela)
);

create index if not exists lanc_owner_mes on lancamentos_mensais (owner_id, mes_competencia);
create index if not exists lanc_categoria_mes on lancamentos_mensais (categoria_id, mes_competencia);
create index if not exists lanc_fatura on lancamentos_mensais (fatura_id);

-- --------------------------------------------------------- objetivos -------
create table if not exists objetivos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  meta_centavos bigint not null check (meta_centavos > 0),
  prazo date,
  descricao text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists movimentos_objetivo (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  objetivo_id uuid not null references objetivos (id) on delete cascade,
  data date not null default current_date,
  valor_centavos bigint not null check (valor_centavos > 0),
  tipo tipo_movimento not null,
  criado_em timestamptz not null default now()
);

-- ----------------------------------------------------------- mercado -------
create table if not exists listas_mercado (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  situacao situacao_lista not null default 'aberta',
  compra_id uuid unique references compras (id) on delete set null,  -- trava de idempotência
  finalizada_em timestamptz,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists itens_lista (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  lista_id uuid not null references listas_mercado (id) on delete cascade,
  produto text not null,
  marca text,
  quantidade numeric(10,3) not null check (quantidade > 0),
  unidade text not null default 'un',
  preco_unitario_centavos bigint check (preco_unitario_centavos >= 0), -- NULL ≠ 0
  confirmado boolean not null default false,
  posicao integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint confirmado_exige_preco check (not confirmado or preco_unitario_centavos is not null)
);

-- ============================================================================
-- Row Level Security — tudo por proprietário
-- ============================================================================

alter table perfis                enable row level security;
alter table categorias            enable row level security;
alter table cartoes               enable row level security;
alter table faturas               enable row level security;
alter table compras               enable row level security;
alter table lancamentos_mensais   enable row level security;
alter table objetivos             enable row level security;
alter table movimentos_objetivo   enable row level security;
alter table listas_mercado        enable row level security;
alter table itens_lista           enable row level security;

drop policy if exists perfil_proprio on perfis;
create policy perfil_proprio on perfis
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'categorias','cartoes','faturas','compras','lancamentos_mensais',
    'objetivos','movimentos_objetivo','listas_mercado','itens_lista'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_proprio', t);
    execute format(
      'create policy %I on %I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      t || '_proprio', t);
  end loop;
end $$;

-- ============================================================================
-- Funções de apoio
-- ============================================================================

-- Dia seguro: se o dia não existir no mês, usa o último dia do mês.
create or replace function dia_seguro(ano int, mes int, dia int)
returns date language plpgsql immutable as $$
declare ultimo int;
begin
  ultimo := extract(day from (make_date(ano, mes, 1) + interval '1 month - 1 day'));
  return make_date(ano, mes, least(dia, ultimo));
end $$;

-- Primeira fatura de uma compra no crédito.
-- Convenção: compra feita NO dia do fechamento entra nessa fatura.
create or replace function primeira_fatura(p_cartao uuid, p_data_compra date)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c record; fech date; venc date; mes_ref date; f uuid;
begin
  select * into c from cartoes where id = p_cartao and owner_id = auth.uid();
  if not found then raise exception 'cartão inexistente ou de outro usuário'; end if;

  fech := dia_seguro(extract(year from p_data_compra)::int,
                     extract(month from p_data_compra)::int, c.dia_fechamento);
  if p_data_compra > fech then
    fech := dia_seguro(extract(year from fech + interval '1 month')::int,
                       extract(month from fech + interval '1 month')::int, c.dia_fechamento);
  end if;

  venc := dia_seguro(extract(year from fech)::int, extract(month from fech)::int, c.dia_vencimento);
  if venc <= fech then
    venc := dia_seguro(extract(year from fech + interval '1 month')::int,
                       extract(month from fech + interval '1 month')::int, c.dia_vencimento);
  end if;

  mes_ref := date_trunc('month', venc)::date;

  insert into faturas (owner_id, cartao_id, mes_referencia, data_fechamento, data_vencimento)
  values (auth.uid(), p_cartao, mes_ref, fech, venc)
  on conflict (cartao_id, mes_referencia) do update set atualizado_em = now()
  returning id into f;

  return f;
end $$;

-- Fatura seguinte (usada para as parcelas 2..N).
create or replace function fatura_seguinte(p_cartao uuid, p_fatura uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare c record; a record; fech date; venc date; mes_ref date; f uuid;
begin
  select * into c from cartoes where id = p_cartao and owner_id = auth.uid();
  select * into a from faturas where id = p_fatura and owner_id = auth.uid();

  mes_ref := (a.mes_referencia + interval '1 month')::date;
  fech := dia_seguro(extract(year from a.data_fechamento + interval '1 month')::int,
                     extract(month from a.data_fechamento + interval '1 month')::int, c.dia_fechamento);
  venc := dia_seguro(extract(year from mes_ref)::int, extract(month from mes_ref)::int, c.dia_vencimento);

  insert into faturas (owner_id, cartao_id, mes_referencia, data_fechamento, data_vencimento)
  values (auth.uid(), p_cartao, mes_ref, fech, venc)
  on conflict (cartao_id, mes_referencia) do update set atualizado_em = now()
  returning id into f;
  return f;
end $$;

-- Divide um total em N parcelas, com os centavos restantes nas primeiras.
create or replace function dividir_parcelas(total bigint, n int)
returns bigint[] language plpgsql immutable as $$
declare base bigint; resto int; r bigint[] := '{}'; i int;
begin
  if n < 1 or total < n then raise exception 'parcelamento inválido'; end if;
  base := total / n; resto := (total % n)::int;
  for i in 1..n loop
    r := array_append(r, base + case when i <= resto then 1 else 0 end);
  end loop;
  return r;
end $$;

-- ============================================================================
-- Criação de compra + lançamentos, em uma transação
-- ============================================================================
create or replace function criar_compra(
  p_descricao text,
  p_data_compra date,
  p_valor_total_centavos bigint,
  p_categoria_id uuid,
  p_forma forma_pagamento,
  p_cartao_id uuid default null,
  p_parcelas smallint default 1,
  p_primeira_fatura_id uuid default null,
  p_origem origem_compra default 'manual',
  p_estabelecimento text default null,
  p_observacoes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  nova_compra uuid; valores bigint[]; i int; fatura uuid; mes date;
begin
  if not exists (select 1 from categorias
                 where id = p_categoria_id and owner_id = auth.uid() and not arquivada) then
    raise exception 'categoria inválida, arquivada ou de outro usuário';
  end if;

  insert into compras (owner_id, descricao, data_compra, valor_total_centavos, categoria_id,
                       forma_pagamento, cartao_id, parcelas, origem, estabelecimento, observacoes)
  values (auth.uid(), p_descricao, p_data_compra, p_valor_total_centavos, p_categoria_id,
          p_forma, case when p_forma = 'credito' then p_cartao_id end,
          case when p_forma = 'credito' then p_parcelas else 1 end,
          p_origem, p_estabelecimento, p_observacoes)
  returning id into nova_compra;

  if p_forma <> 'credito' then
    insert into lancamentos_mensais (owner_id, compra_id, categoria_id, valor_centavos,
                                     mes_competencia, numero_parcela, total_parcelas)
    values (auth.uid(), nova_compra, p_categoria_id, p_valor_total_centavos,
            date_trunc('month', p_data_compra)::date, 1, 1);
    return nova_compra;
  end if;

  valores := dividir_parcelas(p_valor_total_centavos, p_parcelas);
  fatura  := coalesce(p_primeira_fatura_id, primeira_fatura(p_cartao_id, p_data_compra));

  for i in 1..p_parcelas loop
    if i > 1 then fatura := fatura_seguinte(p_cartao_id, fatura); end if;
    select mes_referencia into mes from faturas where id = fatura;
    insert into lancamentos_mensais (owner_id, compra_id, categoria_id, valor_centavos,
                                     mes_competencia, numero_parcela, total_parcelas, fatura_id)
    values (auth.uid(), nova_compra, p_categoria_id, valores[i], mes, i, p_parcelas, fatura);
  end loop;

  return nova_compra;
end $$;

-- ============================================================================
-- Finalização da lista de mercado — idempotente
-- Duas chamadas para a mesma lista retornam a MESMA compra.
-- ============================================================================
create or replace function finalizar_lista(
  p_lista_id uuid,
  p_data date,
  p_categoria_id uuid,
  p_forma forma_pagamento,
  p_cartao_id uuid default null,
  p_parcelas smallint default 1,
  p_primeira_fatura_id uuid default null,
  p_estabelecimento text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare lista record; total bigint; qtd int; nova uuid;
begin
  select * into lista from listas_mercado
    where id = p_lista_id and owner_id = auth.uid() for update;
  if not found then raise exception 'lista inexistente'; end if;

  if lista.compra_id is not null then          -- já finalizada: devolve a mesma compra
    return lista.compra_id;
  end if;

  select count(*), coalesce(sum(round(quantidade * preco_unitario_centavos)), 0)
    into qtd, total
    from itens_lista where lista_id = p_lista_id and confirmado;

  if qtd = 0 or total <= 0 then
    raise exception 'é preciso ao menos um item confirmado e total maior que zero';
  end if;

  nova := criar_compra(
    coalesce(p_estabelecimento, lista.nome), p_data, total, p_categoria_id, p_forma,
    p_cartao_id, p_parcelas, p_primeira_fatura_id, 'mercado', p_estabelecimento, null);

  update listas_mercado
     set compra_id = nova, situacao = 'finalizada', finalizada_em = now(),
         versao = versao + 1, atualizado_em = now()
   where id = p_lista_id;

  return nova;
end $$;

-- ============================================================================
-- Reclassificação de compra — atualiza compra e todos os lançamentos juntos
-- ============================================================================
create or replace function reclassificar_compra(p_compra_id uuid, p_categoria_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from categorias where id = p_categoria_id and owner_id = auth.uid()) then
    raise exception 'categoria inválida';
  end if;
  update compras set categoria_id = p_categoria_id, versao = versao + 1, atualizado_em = now()
    where id = p_compra_id and owner_id = auth.uid();
  update lancamentos_mensais set categoria_id = p_categoria_id, atualizado_em = now()
    where compra_id = p_compra_id and owner_id = auth.uid();
end $$;

-- ============================================================================
-- Dados iniciais do usuário (app começa vazio de lançamentos)
-- Chamar uma vez, logo após o primeiro login.
-- ============================================================================
create or replace function semear_perfil()
returns void language plpgsql security definer set search_path = public as $$
declare mercado uuid;
begin
  insert into perfis (id) values (auth.uid()) on conflict (id) do nothing;
  if exists (select 1 from categorias where owner_id = auth.uid()) then return; end if;

  insert into categorias (owner_id, nome, cor) values
    (auth.uid(), 'Mercado',     '#d67f48'),
    (auth.uid(), 'Alimentação', '#8fa073'),
    (auth.uid(), 'Transporte',  '#8c491a'),
    (auth.uid(), 'Moradia',     '#a19786'),
    (auth.uid(), 'Saúde',       '#dcd3c4'),
    (auth.uid(), 'Educação',    '#aebf92'),
    (auth.uid(), 'Lazer',       '#ffc6a5'),
    (auth.uid(), 'Assinaturas', '#c0b6a5'),
    (auth.uid(), 'Presentes',   '#f6a06b'),
    (auth.uid(), 'Ágata',       '#56633f'),
    (auth.uid(), 'Outros',      '#82796a');

  select id into mercado from categorias where owner_id = auth.uid() and nome = 'Mercado';
  update perfis set categoria_mercado_id = mercado where id = auth.uid();

  -- Cartão informado pelo proprietário: Nubank, fecha dia 5, vence dia 12.
  insert into cartoes (owner_id, apelido, dia_fechamento, dia_vencimento, cor)
  values (auth.uid(), 'Nubank', 5, 12, '#8fa073');
end $$;
