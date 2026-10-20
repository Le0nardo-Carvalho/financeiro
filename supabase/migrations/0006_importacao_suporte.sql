-- ============================================================================
-- 0006 — suporte à importação de extratos (OFX Nubank + Banco do Brasil)
-- Rode ANTES do 0007. Seguro para reexecutar.
-- ============================================================================

-- Origem nova para compras vindas de extrato.
alter type origem_compra add value if not exists 'importacao';

-- Chave externa: impede importar a mesma linha duas vezes.
alter table compras            add column if not exists id_externo text;
alter table pagamentos_fatura  add column if not exists id_externo text;
create unique index if not exists compras_id_externo_unico
  on compras (owner_id, id_externo) where id_externo is not null;
create unique index if not exists pagamentos_id_externo_unico
  on pagamentos_fatura (owner_id, id_externo) where id_externo is not null;

-- Ajustes de fatura: valores que COMPÕEM o total da fatura mas NÃO são gasto
-- (saldo rotativo trazido do mês anterior, principal de parcelamento de fatura).
-- Nunca entram em dashboard, categoria ou histórico — só no total da fatura.
create table if not exists ajustes_fatura (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fatura_id uuid not null references faturas (id) on delete cascade,
  valor_centavos bigint not null check (valor_centavos <> 0),
  tipo text not null check (tipo in ('saldo_anterior','principal_parcelamento','outro')),
  descricao text not null,
  id_externo text,
  criado_em timestamptz not null default now()
);
create index if not exists ajustes_fatura_idx on ajustes_fatura (fatura_id);
create unique index if not exists ajustes_id_externo_unico
  on ajustes_fatura (owner_id, id_externo) where id_externo is not null;

alter table ajustes_fatura enable row level security;
drop policy if exists ajustes_fatura_proprio on ajustes_fatura;
create policy ajustes_fatura_proprio on ajustes_fatura
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Total da fatura = gastos (lançamentos) + ajustes. Mesmas colunas de antes,
-- mais gastos_centavos e ajustes_centavos no fim.
create or replace view faturas_resumo with (security_invoker = true) as
select f.*,
       coalesce(t.total,0) + coalesce(a.total,0) as total_centavos,
       coalesce(p.pago, 0) as pago_centavos,
       greatest(coalesce(t.total,0) + coalesce(a.total,0) - coalesce(p.pago,0), 0) as saldo_centavos,
       case
         when coalesce(p.pago,0) = 0 then 'aberta'
         when coalesce(p.pago,0) < coalesce(t.total,0) + coalesce(a.total,0) then 'parcial'
         else 'paga'
       end as situacao,
       coalesce(t.total,0) as gastos_centavos,
       coalesce(a.total,0) as ajustes_centavos
  from faturas f
  left join (select fatura_id, sum(valor_centavos) total
               from lancamentos_mensais group by fatura_id) t on t.fatura_id = f.id
  left join (select fatura_id, sum(valor_centavos) total
               from ajustes_fatura group by fatura_id) a on a.fatura_id = f.id
  left join (select fatura_id, sum(valor_centavos) pago
               from pagamentos_fatura group by fatura_id) p on p.fatura_id = f.id;

drop trigger if exists trg_ajuste_fatura on ajustes_fatura;
create trigger trg_ajuste_fatura
  after insert or update or delete on ajustes_fatura
  for each row execute function sincronizar_fatura_paga();

-- Categoria para DAS/MEI e Receita Federal.
insert into categorias (owner_id, nome, cor)
select p.id, 'Impostos', '#ddd5ff' from perfis p
 where not exists (select 1 from categorias c
                    where c.owner_id = p.id and lower(btrim(c.nome)) = 'impostos');
