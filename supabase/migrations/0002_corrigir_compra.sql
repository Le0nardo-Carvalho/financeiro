-- ============================================================================
-- Correção de compra existente — complemento a 02-modelo-de-dados.sql.
--
-- O pacote de handoff definiu criar_compra, finalizar_lista e
-- reclassificar_compra, mas não uma função para corrigir valor, data,
-- cartão ou parcelamento de uma compra já registrada (RF exigido pela
-- especificação §6.2 e pelas regras de cálculo §5, tela `3a`). Esta função
-- fecha essa lacuna, seguindo exatamente o mesmo padrão das outras: mesma
-- transação, mesmo ID de compra preservado, mesma forma de dividir parcelas.
-- ============================================================================

create or replace function corrigir_compra(
  p_compra_id uuid,
  p_descricao text,
  p_data_compra date,
  p_valor_total_centavos bigint,
  p_forma forma_pagamento,
  p_cartao_id uuid default null,
  p_parcelas smallint default 1,
  p_primeira_fatura_id uuid default null,
  p_estabelecimento text default null,
  p_observacoes text default null,
  p_versao_lida integer default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  atual record; valores bigint[]; i int; fatura uuid; mes date;
begin
  select * into atual from compras where id = p_compra_id and owner_id = auth.uid() for update;
  if not found then raise exception 'compra inexistente ou de outro usuário'; end if;

  if p_versao_lida is not null and atual.versao <> p_versao_lida then
    raise exception 'conflito de versão: registro foi alterado por outro dispositivo'
      using errcode = '40001';
  end if;

  -- Se algum mês afetado pertencer a uma fatura já paga, destacar o efeito
  -- marcando a fatura como corrigida_apos_pagamento (03-regras-de-calculo.md, §5).
  update faturas set corrigida_apos_pagamento = true
    where paga = true
      and id in (select fatura_id from lancamentos_mensais where compra_id = p_compra_id and fatura_id is not null);

  delete from lancamentos_mensais where compra_id = p_compra_id;

  update compras set
    descricao = p_descricao,
    data_compra = p_data_compra,
    valor_total_centavos = p_valor_total_centavos,
    forma_pagamento = p_forma,
    cartao_id = case when p_forma = 'credito' then p_cartao_id end,
    parcelas = case when p_forma = 'credito' then p_parcelas else 1 end,
    estabelecimento = p_estabelecimento,
    observacoes = p_observacoes,
    versao = versao + 1,
    atualizado_em = now()
  where id = p_compra_id;

  if p_forma <> 'credito' then
    insert into lancamentos_mensais (owner_id, compra_id, categoria_id, valor_centavos,
                                     mes_competencia, numero_parcela, total_parcelas)
    values (auth.uid(), p_compra_id, atual.categoria_id, p_valor_total_centavos,
            date_trunc('month', p_data_compra)::date, 1, 1);
    return p_compra_id;
  end if;

  valores := dividir_parcelas(p_valor_total_centavos, p_parcelas);
  fatura  := coalesce(p_primeira_fatura_id, primeira_fatura(p_cartao_id, p_data_compra));

  for i in 1..p_parcelas loop
    if i > 1 then fatura := fatura_seguinte(p_cartao_id, fatura); end if;
    select mes_referencia into mes from faturas where id = fatura;
    insert into lancamentos_mensais (owner_id, compra_id, categoria_id, valor_centavos,
                                     mes_competencia, numero_parcela, total_parcelas, fatura_id)
    values (auth.uid(), p_compra_id, atual.categoria_id, valores[i], mes, i, p_parcelas, fatura);
  end loop;

  return p_compra_id;
end $$;
