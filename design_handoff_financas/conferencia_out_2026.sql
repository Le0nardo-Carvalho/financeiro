-- ============================================================================
-- Conferência depois de rodar 0004–0009. SÓ LEITURA — não altera nada.
-- Cole tudo no SQL Editor e clique em Run. Cada bloco mostra um resultado;
-- os valores esperados estão nos comentários.
-- ============================================================================

-- As funções do app usam o usuário logado. Aqui simulamos o login da Ágata
-- só durante esta consulta.
select set_config('request.jwt.claims',
                  json_build_object('sub', (select id from perfis limit 1), 'role', 'authenticated')::text,
                  false);

-- 1) Faturas. Esperado: jan–out = paga · nov = aberta (1.433,04 — inclui Super Adega 157,59 e Compras 18/10 101,10 lançadas no app) · dez/26–fev/27 = parcelas futuras.
select to_char(mes_referencia, 'YYYY-MM') as mes,
       total_centavos / 100.0   as total,
       gastos_centavos / 100.0  as gastos,
       ajustes_centavos / 100.0 as ajustes,
       pago_centavos / 100.0    as pago,
       situacao
  from faturas_resumo
 order by mes_referencia;

-- 2) Balancete 2026. Esperado em out: entrou 3.217,05 · gastou 3.141,87 · resultado +75,18 · acumulado −898,59 (setembro inclui o Empréstimo Ágata de 333,36).
select to_char(mes, 'YYYY-MM') as mes,
       entradas_centavos / 100.0      as entrou,
       gastos_centavos / 100.0        as gastou,
       resultado_centavos / 100.0     as resultado,
       acumulado_ano_centavos / 100.0 as acumulado
  from balancete_mensal
 where mes between '2026-01-01' and '2026-10-01'
 order by mes;

-- 3) Mínimo de outubro. Esperado:
--    Mercado 577,93 previsto · 356,54 gasto · falta 221,39
--    Claro 185,00 · 186,34 · falta 0 · Água 100,00 · 0 · falta 100,00
--    Neoenergia 380,00 · 479,78 · falta 0 · excedente 99,78
select nome,
       previsto_centavos / 100.0  as previsto,
       gasto_centavos / 100.0     as gasto,
       falta_centavos / 100.0     as falta,
       excedente_centavos / 100.0 as acima
  from minimo_do_mes('2026-10-01');

-- 4) Saúde de outubro. Esperado: mínimo 1.242,93 · falta 321,39 · sobra −246,21 · nível "alto".
select entradas_centavos / 100.0     as entrou,
       gastos_centavos / 100.0       as gastou,
       minimo_centavos / 100.0       as minimo,
       falta_minimo_centavos / 100.0 as falta,
       sobra_centavos / 100.0        as sobra,
       nivel
  from saude_do_mes('2026-10-01');

-- 5) Contagens. Esperado: 689 compras importadas · 6 mantidas · 31 pagamentos · 7 ajustes · 45 entradas.
select (select count(*) from compras where id_externo like 'imp2026:%')       as compras_importadas,
       (select count(*) from compras where id_externo like 'manual:%')        as compras_mantidas,
       (select count(*) from pagamentos_fatura where id_externo like 'imp2026:%') as pagamentos,
       (select count(*) from ajustes_fatura where id_externo like 'imp2026:%')    as ajustes,
       (select count(*) from entradas where id_externo like 'imp2026e:%')         as entradas;
