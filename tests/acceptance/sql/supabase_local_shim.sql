-- ============================================================================
-- Imitação mínima do Supabase para rodar os testes SQL num Postgres local
-- comum (sem Docker, sem `supabase start`). Cria só o que as migrações e os
-- testes usam: papéis authenticated/anon, o esquema auth, auth.users e
-- auth.uid() lendo o "sub" de request.jwt.claims — o mesmo que o Supabase faz.
--
-- NUNCA rode isto no projeto Supabase de verdade: lá tudo isso já existe.
--
-- Uso (banco vazio):
--   psql -d teste -f tests/acceptance/sql/supabase_local_shim.sql
--   for f in supabase/migrations/*.sql; do psql -d teste -1 -v ON_ERROR_STOP=1 -f "$f"; done   # -1: uma transação por arquivo, como o SQL Editor
--   psql -d teste -v ON_ERROR_STOP=1 -f tests/acceptance/sql/rls_e_idempotencia.sql
--   psql -d teste -v ON_ERROR_STOP=1 -f tests/acceptance/sql/cancelamento_e_pagamentos.sql
-- ============================================================================

do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;

grant usage on schema auth to authenticated, anon;
grant select on auth.users to authenticated;
grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
