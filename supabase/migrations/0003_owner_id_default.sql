-- ============================================================================
-- owner_id default auth.uid() — corrige inserções diretas de tabela
--
-- Bug real: owner_id é NOT NULL e exigido pela política de RLS
-- (`with check (owner_id = auth.uid())`), mas só as funções RPC
-- (criar_compra, finalizar_lista, semear_perfil...) preenchiam esse campo
-- explicitamente. Qualquer insert direto do cliente — categorias, cartões,
-- objetivos, movimentos, listas de mercado, itens — falhava com violação de
-- NOT NULL / RLS, porque nenhum desses insere owner_id manualmente.
--
-- Com o default, auth.uid() (lido do JWT da requisição autenticada) preenche
-- owner_id automaticamente sempre que o cliente não o enviar. Não afeta as
-- funções RPC, que continuam definindo owner_id explicitamente.
-- ============================================================================

alter table categorias          alter column owner_id set default auth.uid();
alter table cartoes             alter column owner_id set default auth.uid();
alter table faturas             alter column owner_id set default auth.uid();
alter table compras             alter column owner_id set default auth.uid();
alter table lancamentos_mensais alter column owner_id set default auth.uid();
alter table objetivos           alter column owner_id set default auth.uid();
alter table movimentos_objetivo alter column owner_id set default auth.uid();
alter table listas_mercado      alter column owner_id set default auth.uid();
alter table itens_lista         alter column owner_id set default auth.uid();
