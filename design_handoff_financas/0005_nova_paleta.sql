-- ============================================================================
-- 0005 — nova paleta (berinjela, coral, lilás)
-- Troca as cores antigas das categorias e cartões já cadastrados e atualiza
-- as cores usadas por semear_perfil() para novos perfis.
-- Pode ser executada mais de uma vez sem efeito colateral.
-- Requer 0004 aplicada antes (categoria Encargos).
-- ============================================================================

create temporary table _mapa_cor (antiga text primary key, nova text not null) on commit drop;
insert into _mapa_cor values
  ('#d67f48', '#f2734f'),  -- Mercado
  ('#8fa073', '#a594f5'),  -- Alimentação / cartão
  ('#8c491a', '#ffb59c'),  -- Transporte
  ('#a19786', '#9a8898'),  -- Moradia
  ('#dcd3c4', '#6f5cc0'),  -- Saúde
  ('#aebf92', '#c2b5ff'),  -- Educação
  ('#ffc6a5', '#e58fb3'),  -- Lazer
  ('#c0b6a5', '#8a76e0'),  -- Assinaturas
  ('#f6a06b', '#ff9273'),  -- Presentes
  ('#56633f', '#ffd7c9'),  -- Ágata
  ('#82796a', '#c3b3c1'),  -- Outros
  ('#645c50', '#cf593a');  -- Encargos

update categorias c
   set cor = m.nova, versao = c.versao + 1, atualizado_em = now()
  from _mapa_cor m
 where lower(c.cor) = m.antiga;

update cartoes c
   set cor = m.nova, versao = c.versao + 1, atualizado_em = now()
  from _mapa_cor m
 where lower(c.cor) = m.antiga;

alter table cartoes alter column cor set default '#a594f5';

create or replace function semear_perfil()
returns void language plpgsql security definer set search_path = public as $$
declare mercado uuid;
begin
  insert into perfis (id) values (auth.uid()) on conflict (id) do nothing;
  if exists (select 1 from categorias where owner_id = auth.uid()) then return; end if;

  insert into categorias (owner_id, nome, cor) values
    (auth.uid(), 'Mercado',     '#f2734f'),
    (auth.uid(), 'Alimentação', '#a594f5'),
    (auth.uid(), 'Transporte',  '#ffb59c'),
    (auth.uid(), 'Moradia',     '#9a8898'),
    (auth.uid(), 'Saúde',       '#6f5cc0'),
    (auth.uid(), 'Educação',    '#c2b5ff'),
    (auth.uid(), 'Lazer',       '#e58fb3'),
    (auth.uid(), 'Assinaturas', '#8a76e0'),
    (auth.uid(), 'Presentes',   '#ff9273'),
    (auth.uid(), 'Ágata',       '#ffd7c9'),
    (auth.uid(), 'Encargos',    '#cf593a'),
    (auth.uid(), 'Outros',      '#c3b3c1');

  select id into mercado from categorias where owner_id = auth.uid() and nome = 'Mercado';
  update perfis set categoria_mercado_id = mercado where id = auth.uid();

  insert into cartoes (owner_id, apelido, dia_fechamento, dia_vencimento, cor)
  values (auth.uid(), 'Nubank', 5, 12, '#a594f5');
end $$;
