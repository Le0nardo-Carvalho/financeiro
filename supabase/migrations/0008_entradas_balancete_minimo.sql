-- ============================================================================
-- 0008 — entradas, balancete e mínimo mensal
-- Rode depois do 0006/0007 e antes do 0009. Seguro para reexecutar.
-- Entradas NUNCA somam a gastos e nunca abatem fatura.
-- ============================================================================

do $$ begin
  create type tipo_entrada as enum ('renda','extra','reembolso','ajuda','outro');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------ entradas -----
create table if not exists entradas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  descricao text not null check (btrim(descricao) <> ''),
  data date not null,
  valor_centavos bigint not null check (valor_centavos > 0),
  tipo tipo_entrada not null default 'outro',
  conta text,                              -- 'Banco do Brasil' | 'Nubank' | 'Dinheiro' | …
  recorrente boolean not null default false,
  dia_previsto smallint check (dia_previsto between 1 and 31),
  observacoes text,
  id_externo text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists entradas_owner_data on entradas (owner_id, data);
create unique index if not exists entradas_id_externo_unico
  on entradas (owner_id, id_externo) where id_externo is not null;

alter table entradas enable row level security;
drop policy if exists entradas_proprio on entradas;
create policy entradas_proprio on entradas
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- -------------------------------------------------------- mínimo mensal ----
-- media_categoria: previsto = média dos últimos N meses FECHADOS da categoria.
-- fixo: previsto = valor; o gasto do mês é reconhecido por "termo" (regex,
-- sem diferenciar maiúsculas) na descrição ou no estabelecimento da compra.
create table if not exists minimo_itens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  tipo text not null check (tipo in ('media_categoria','fixo')),
  categoria_id uuid references categorias (id) on delete set null,
  valor_centavos bigint check (valor_centavos >= 0),
  meses_media smallint not null default 3 check (meses_media between 1 and 12),
  termo text,
  posicao integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint fixo_tem_valor check (tipo <> 'fixo' or valor_centavos is not null),
  constraint media_tem_categoria check (tipo <> 'media_categoria' or categoria_id is not null)
);

alter table minimo_itens enable row level security;
drop policy if exists minimo_itens_proprio on minimo_itens;
create policy minimo_itens_proprio on minimo_itens
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table perfis add column if not exists margem_atencao_centavos bigint not null default 30000
  check (margem_atencao_centavos >= 0);

-- Itens iniciais: média de Mercado (3 meses) + Claro 185 + Caesb 100 + Neoenergia 380.
insert into minimo_itens (owner_id, nome, tipo, categoria_id, valor_centavos, meses_media, termo, posicao)
select p.id, v.nome, v.tipo,
       case when v.tipo = 'media_categoria' then coalesce(p.categoria_mercado_id,
            (select c.id from categorias c where c.owner_id = p.id and lower(btrim(c.nome)) = 'mercado' limit 1)) end,
       v.valor, 3, v.termo, v.pos
  from perfis p
 cross join (values
   ('Mercado',            'media_categoria', null::bigint, null::text,             0),
   ('Internet Claro',     'fixo',            18500,        'claro',                1),
   ('Água Caesb',         'fixo',            10000,        'caesb|saneamento',     2),
   ('Energia Neoenergia', 'fixo',            38000,        'neoenergia|\mceb\M',   3)
 ) as v(nome, tipo, valor, termo, pos)
 where not exists (select 1 from minimo_itens m where m.owner_id = p.id);

-- Mínimo do mês, item a item.
--   coberto = menor(gasto, previsto); falta = maior(previsto − gasto, 0);
--   excedente = maior(gasto − previsto, 0). Excedente de um item não reduz a falta de outro.
create or replace function minimo_do_mes(p_mes date)
returns table (item_id uuid, nome text, tipo text, previsto_centavos bigint,
               gasto_centavos bigint, coberto_centavos bigint, falta_centavos bigint,
               excedente_centavos bigint, ultimo_lancamento date)
language sql stable security invoker set search_path = public as $$
  with m as (select date_trunc('month', p_mes)::date as ini),
  it as (select * from minimo_itens where owner_id = auth.uid() and ativo),
  media as (
    select i.id, coalesce(round(avg(t.v)), 0)::bigint as prev
      from it i cross join m
      left join lateral (
        select l.mes_competencia, sum(l.valor_centavos) v
          from lancamentos_mensais l
         where l.owner_id = auth.uid() and l.categoria_id = i.categoria_id
           and l.mes_competencia >= (m.ini - make_interval(months => i.meses_media))::date
           and l.mes_competencia <  m.ini
         group by l.mes_competencia) t on true
     where i.tipo = 'media_categoria'
     group by i.id),
  gasto as (
    select i.id, sum(l.valor_centavos)::bigint as g, max(c.data_compra) as ult
      from it i cross join m
      join lancamentos_mensais l on l.owner_id = auth.uid() and l.mes_competencia = m.ini
      join compras c on c.id = l.compra_id
     where (i.tipo = 'media_categoria' and l.categoria_id = i.categoria_id)
        or (i.tipo = 'fixo' and i.termo is not null
            and (c.descricao ~* i.termo or coalesce(c.estabelecimento, '') ~* i.termo)
            and (i.categoria_id is null or l.categoria_id = i.categoria_id))
     group by i.id)
  select i.id, i.nome, i.tipo, p.prev,
         coalesce(g.g, 0),
         least(coalesce(g.g, 0), p.prev),
         greatest(p.prev - coalesce(g.g, 0), 0),
         greatest(coalesce(g.g, 0) - p.prev, 0),
         g.ult
    from it i
    cross join lateral (select case when i.tipo = 'fixo' then i.valor_centavos
                                    else coalesce((select prev from media where media.id = i.id), 0) end as prev) p
    left join gasto g on g.id = i.id
   order by i.posicao;
$$;

-- Saúde do mês: o que entrou, o que saiu, o que falta do mínimo e o nível de alerta.
--   sobra = entradas + previstas − gastos − falta do mínimo
--   nível: sem_entradas | alto (sobra < 0) | atencao (sobra < margem) | tranquilo
--   previstas: recorrentes do mês anterior ainda não recebidas (só mês atual/futuro).
create or replace function saude_do_mes(p_mes date)
returns table (mes date, entradas_centavos bigint, previstas_centavos bigint, gastos_centavos bigint,
               minimo_centavos bigint, gasto_essencial_centavos bigint, falta_minimo_centavos bigint,
               sobra_centavos bigint, margem_centavos bigint, nivel text)
language sql stable security invoker set search_path = public as $$
  with m as (select date_trunc('month', p_mes)::date as ini),
  e as (select coalesce(sum(valor_centavos), 0)::bigint v from entradas, m
         where owner_id = auth.uid() and date_trunc('month', data)::date = m.ini),
  pr as (select coalesce(sum(a.valor_centavos), 0)::bigint v from entradas a, m
          where a.owner_id = auth.uid() and a.recorrente
            and m.ini >= date_trunc('month', current_date)::date
            and date_trunc('month', a.data)::date = (m.ini - interval '1 month')::date
            and not exists (select 1 from entradas b
                             where b.owner_id = a.owner_id and date_trunc('month', b.data)::date = m.ini
                               and lower(btrim(b.descricao)) = lower(btrim(a.descricao)))),
  g as (select coalesce(sum(valor_centavos), 0)::bigint v from lancamentos_mensais, m
         where owner_id = auth.uid() and mes_competencia = m.ini),
  mn as (select coalesce(sum(previsto_centavos), 0)::bigint prev,
                coalesce(sum(gasto_centavos), 0)::bigint gasto,
                coalesce(sum(falta_centavos), 0)::bigint falta
           from m, minimo_do_mes(m.ini)),
  pf as (select coalesce((select margem_atencao_centavos from perfis where id = auth.uid()), 30000)::bigint margem)
  select m.ini, e.v, pr.v, g.v, mn.prev, mn.gasto, mn.falta,
         e.v + pr.v - g.v - mn.falta, pf.margem,
         case when e.v + pr.v = 0 then 'sem_entradas'
              when e.v + pr.v - g.v - mn.falta < 0 then 'alto'
              when e.v + pr.v - g.v - mn.falta < pf.margem then 'atencao'
              else 'tranquilo' end
    from m, e, pr, g, mn, pf;
$$;

-- Balancete por mês (competência dos gastos = a mesma do dashboard).
create or replace view balancete_mensal with (security_invoker = true) as
with e as (select owner_id, date_trunc('month', data)::date mes, sum(valor_centavos) v
             from entradas group by 1, 2),
     g as (select owner_id, mes_competencia mes, sum(valor_centavos) v
             from lancamentos_mensais group by 1, 2),
     j as (select coalesce(e.owner_id, g.owner_id) owner_id, coalesce(e.mes, g.mes) mes,
                  coalesce(e.v, 0) entradas, coalesce(g.v, 0) gastos
             from e full join g on e.owner_id = g.owner_id and e.mes = g.mes)
select owner_id, mes,
       entradas as entradas_centavos,
       gastos as gastos_centavos,
       entradas - gastos as resultado_centavos,
       sum(entradas - gastos) over (partition by owner_id, extract(year from mes) order by mes)
         as acumulado_ano_centavos
  from j;
