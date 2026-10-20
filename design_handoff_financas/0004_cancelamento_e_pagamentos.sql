-- ============================================================================
-- 0004 — cancelamento de listas de mercado e pagamentos de fatura em partes
-- Gasto = lancamentos_mensais (inalterado). Pagamento = pagamentos_fatura
-- (nunca somado a gastos). Situação da fatura é derivada.
-- ============================================================================

-- ------------------------------------------------- mercado: cancelamento ----
alter type situacao_lista add value if not exists 'cancelada';

alter table listas_mercado
  add column if not exists cancelada_em timestamptz,
  add column if not exists motivo_cancelamento text
    check (motivo_cancelamento in ('nao_fui','comprei_em_outro_lugar','desisti','outro'));

create or replace function cancelar_lista(
  p_lista_id uuid,
  p_motivo text default null,
  p_levar_itens boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare lista record; nova uuid;
begin
  select * into lista from listas_mercado
    where id = p_lista_id and owner_id = auth.uid() for update;
  if not found then raise exception 'lista inexistente'; end if;
  if lista.situacao <> 'aberta' then
    raise exception 'só listas abertas podem ser canceladas; use desfazer_finalizacao';
  end if;

  update listas_mercado
     set situacao = 'cancelada', cancelada_em = now(), motivo_cancelamento = p_motivo,
         versao = versao + 1, atualizado_em = now()
   where id = p_lista_id;

  if p_levar_itens then
    insert into listas_mercado (owner_id, nome)
    values (auth.uid(), lista.nome) returning id into nova;
    insert into itens_lista (owner_id, lista_id, produto, marca, quantidade, unidade, posicao)
    select auth.uid(), nova, produto, marca, quantidade, unidade, posicao
      from itens_lista where lista_id = p_lista_id;
  end if;

  return nova;   -- null quando não leva itens
end $$;

create or replace function reabrir_lista(p_lista_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update listas_mercado
     set situacao = 'aberta', cancelada_em = null, motivo_cancelamento = null,
         versao = versao + 1, atualizado_em = now()
   where id = p_lista_id and owner_id = auth.uid() and situacao = 'cancelada';
  if not found then raise exception 'só listas canceladas podem ser reabertas'; end if;
end $$;

-- Desfaz uma lista finalizada: remove a compra (parcelas em cascata) e
-- devolve a lista para 'aberta' ou 'cancelada'. Tudo em uma transação.
create or replace function desfazer_finalizacao(
  p_lista_id uuid,
  p_destino text default 'aberta'   -- 'aberta' | 'cancelada'
) returns void language plpgsql security definer set search_path = public as $$
declare lista record;
begin
  if p_destino not in ('aberta','cancelada') then raise exception 'destino inválido'; end if;

  select * into lista from listas_mercado
    where id = p_lista_id and owner_id = auth.uid() for update;
  if not found or lista.situacao <> 'finalizada' or lista.compra_id is null then
    raise exception 'lista não está finalizada';
  end if;

  update faturas f set corrigida_apos_pagamento = true, atualizado_em = now()
   where f.id in (select fatura_id from lancamentos_mensais where compra_id = lista.compra_id)
     and exists (select 1 from pagamentos_fatura p where p.fatura_id = f.id);

  update listas_mercado
     set compra_id = null, situacao = p_destino::situacao_lista, finalizada_em = null,
         cancelada_em = case when p_destino = 'cancelada' then now() end,
         versao = versao + 1, atualizado_em = now()
   where id = p_lista_id;

  delete from compras where id = lista.compra_id and owner_id = auth.uid();
end $$;

-- --------------------------------------------- cartão: pagamentos ----------
do $$ begin
  create type meio_pagamento_fatura as enum
    ('pix','boleto','debito_automatico','transferencia','outro');
exception when duplicate_object then null; end $$;

create table if not exists pagamentos_fatura (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fatura_id uuid not null references faturas (id) on delete cascade,
  data date not null default current_date,
  valor_centavos bigint not null check (valor_centavos > 0),
  meio meio_pagamento_fatura not null,
  conta_origem text,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists pag_fatura on pagamentos_fatura (fatura_id);

alter table pagamentos_fatura enable row level security;
drop policy if exists pagamentos_fatura_proprio on pagamentos_fatura;
create policy pagamentos_fatura_proprio on pagamentos_fatura
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Pix/débito atribuídos a uma conta, para o quadro "Saiu das contas".
alter table compras add column if not exists conta_origem text;

-- Situação derivada. A coluna faturas.paga deixa de ser escrita pelo app;
-- mantida por compatibilidade e sincronizada abaixo.
-- Só cria a view se ela ainda não existir: o 0006 a amplia (ajustes de fatura) e
-- reexecutar este arquivo depois dele não pode desfazer isso.
do $view$ begin
if to_regclass('public.faturas_resumo') is null then
execute $sql$
create view faturas_resumo with (security_invoker = true) as
select f.*,
       coalesce(t.total, 0)  as total_centavos,
       coalesce(p.pago, 0)   as pago_centavos,
       greatest(coalesce(t.total,0) - coalesce(p.pago,0), 0) as saldo_centavos,
       case
         when coalesce(p.pago,0) = 0 then 'aberta'
         when coalesce(p.pago,0) < coalesce(t.total,0) then 'parcial'
         else 'paga'
       end as situacao
  from faturas f
  left join (select fatura_id, sum(valor_centavos) total
               from lancamentos_mensais group by fatura_id) t on t.fatura_id = f.id
  left join (select fatura_id, sum(valor_centavos) pago
               from pagamentos_fatura group by fatura_id) p on p.fatura_id = f.id
$sql$;
end if;
end $view$;

create or replace function sincronizar_fatura_paga()
returns trigger language plpgsql security definer set search_path = public as $$
declare fid uuid := coalesce(new.fatura_id, old.fatura_id); r record;
begin
  select * into r from faturas_resumo where id = fid;
  update faturas
     set paga = (r.situacao = 'paga'),
         paga_em = case when r.situacao = 'paga'
                        then (select max(data) from pagamentos_fatura where fatura_id = fid) end,
         atualizado_em = now()
   where id = fid;
  return null;
end $$;

drop trigger if exists trg_pagamento_fatura on pagamentos_fatura;
create trigger trg_pagamento_fatura
  after insert or update or delete on pagamentos_fatura
  for each row execute function sincronizar_fatura_paga();

-- Saídas por conta e mês: compras Pix/débito + pagamentos de fatura.
-- Uso exclusivo do quadro "Saiu das contas"; NUNCA somar aos gastos.
create or replace view saidas_por_conta with (security_invoker = true) as
select owner_id, date_trunc('month', data_compra)::date as mes,
       coalesce(conta_origem, 'Conta não informada') as conta,
       forma_pagamento::text as tipo, sum(valor_total_centavos) as valor_centavos
  from compras where forma_pagamento in ('pix','debito')
 group by 1,2,3,4
union all
select owner_id, date_trunc('month', data)::date,
       coalesce(conta_origem, 'Conta não informada'),
       'pagamento_fatura', sum(valor_centavos)
  from pagamentos_fatura
 group by 1,2,3,4;

-- Categoria de encargos (juros/IOF do rotativo são gastos reais).
insert into categorias (owner_id, nome, cor)
select p.id, 'Encargos', '#645c50' from perfis p
 where not exists (select 1 from categorias c
                    where c.owner_id = p.id and lower(btrim(c.nome)) = 'encargos');
