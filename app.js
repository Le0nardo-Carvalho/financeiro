const STORAGE_KEY = "controleFinanceiroDados";
const LOGIN = { user: "Léo", pass: "2104" };

let dados = null;

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const bancoLabels = {
  "": "Não informado",
  nubank: "Nubank",
  bb: "Banco do Brasil",
  inter: "Inter"
};

const tipoContaLabels = {
  corrente: "Corrente",
  poupanca: "Poupança",
  credito: "Crédito",
  carteira: "Carteira digital",
  outro: "Outro"
};

const $ = (id) => document.getElementById(id);

const moeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const hojeISO = () => new Date().toISOString().slice(0, 10);

function parseISO(dataISO) {
  const [ano, mes, dia] = String(dataISO || "").split("-").map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

function toISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function ultimoDiaDoMes(ano, mesZeroBased) {
  return new Date(ano, mesZeroBased + 1, 0).getDate();
}

function adicionarMeses(dataISO, quantidade) {
  const base = parseISO(dataISO);
  const diaOriginal = base.getDate();
  const alvo = new Date(base.getFullYear(), base.getMonth() + quantidade, 1);
  const ultimoDia = ultimoDiaDoMes(alvo.getFullYear(), alvo.getMonth());
  alvo.setDate(Math.min(diaOriginal, ultimoDia));
  return toISO(alvo);
}

function chaveMes(dataISO) {
  const data = parseISO(dataISO);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function chaveMesPorNumero(mes, ano) {
  return `${Number(ano)}-${String(Number(mes)).padStart(2, "0")}`;
}

function dataDoMesCredito(mesCredito) {
  return `${mesCredito}-01`;
}

function labelMesAno(dataISO) {
  const data = parseISO(dataISO);
  return `${meses[data.getMonth()]} de ${data.getFullYear()}`;
}

function nomeFaturaPorMes(mesCredito) {
  return `Crédito ${labelMesAno(dataDoMesCredito(mesCredito))}`;
}

function vencimentoCredito(dataCompetenciaISO) {
  const data = parseISO(dataCompetenciaISO);
  const vencimento = new Date(data.getFullYear(), data.getMonth() + 1, 12);
  return toISO(vencimento);
}

function competenciaCredito(dataCompraISO) {
  const compra = parseISO(dataCompraISO);
  const diaCompra = compra.getDate();

  // Regra de fechamento:
  // dias 01 a 04 entram na fatura do mês anterior;
  // dia 05 em diante entra na fatura do mês da compra.
  const deslocamentoMes = diaCompra < 5 ? -1 : 0;
  const competencia = new Date(compra.getFullYear(), compra.getMonth() + deslocamentoMes, 1);
  const ultimoDia = ultimoDiaDoMes(competencia.getFullYear(), competencia.getMonth());
  competencia.setDate(Math.min(diaCompra, ultimoDia));

  return toISO(competencia);
}

function labelCredito(l) {
  if (!ehCredito(l)) return "";
  const competencia = l.competenciaCredito || competenciaCredito(l.data);
  const vencimento = l.vencimentoCredito || vencimentoCredito(competencia);
  return `${nomeFaturaPorMes(chaveMes(competencia))} · vence em ${formatarData(vencimento)}`;
}

function parseTotalParcelas(valor) {
  const texto = normalizarTexto(valor || "").trim();

  if (!texto || texto.includes("vista")) return 1;

  const matchX = texto.match(/(\d+)\s*x/);
  if (matchX) return Math.max(1, Number(matchX[1]));

  const matchBarra = texto.match(/(\d+)\s*\/\s*(\d+)/);
  if (matchBarra) return Math.max(1, Number(matchBarra[2]));

  const matchNumero = texto.match(/^(\d+)$/);
  if (matchNumero) return Math.max(1, Number(matchNumero[1]));

  return 1;
}

function valorParcela(valorTotal, parcelaAtual, totalParcelas) {
  const totalCentavos = Math.round(Number(valorTotal || 0) * 100);
  const baseCentavos = Math.floor(totalCentavos / totalParcelas);
  const resto = totalCentavos - baseCentavos * totalParcelas;
  const centavos = baseCentavos + (parcelaAtual === totalParcelas ? resto : 0);
  return Number((centavos / 100).toFixed(2));
}

function ehCredito(l) {
  return l &&
    l.tipo === "Despesa" &&
    bancoKey(l.banco) === "nubank" &&
    (
      l.tipoConta === "credito" ||
      normalizarTexto(l.formaPagamento).includes("credito")
    );
}

function gerarParcelasCredito(itemBase, valorTotal, totalParcelas) {
  const grupo = `cred_${Date.now()}`;
  const parcelas = [];
  const primeiraCompetencia = competenciaCredito(itemBase.data);

  for (let i = 1; i <= totalParcelas; i++) {
    const competencia = adicionarMeses(primeiraCompetencia, i - 1);
    const mesCredito = chaveMes(competencia);
    const vencimento = vencimentoCredito(competencia);

    parcelas.push({
      ...itemBase,
      id: `${grupo}_${i}`,
      grupoParcelamento: grupo,
      compraOriginal: itemBase.data,
      competenciaCredito: competencia,
      mesCredito,
      vencimentoCredito: vencimento,
      nomeFatura: nomeFaturaPorMes(mesCredito),
      valor: valorParcela(valorTotal, i, totalParcelas),
      valorTotalCompra: Number(valorTotal || 0),
      parcelaAtual: i,
      totalParcelas,
      parcelas: `${i}/${totalParcelas}`,
      status: itemBase.status === "Cancelado" ? "Cancelado" : "Pendente",
      observacoes: totalParcelas > 1
        ? `Compra parcelada em ${totalParcelas}x. Esta é a parcela ${i}/${totalParcelas}.`
        : "Compra no crédito com vencimento no dia 12 após o fechamento da fatura."
    });
  }

  return parcelas;
}

function ehCategoriaEssencial(categoria) {
  const c = normalizarTexto(categoria);
  return [
    "mercado", "comida", "agua", "energia", "luz", "internet",
    "mei", "emprestimo", "higiene"
  ].includes(c);
}

function ehLancamentoEssencial(l) {
  return (l.categorias || []).some(ehCategoriaEssencial);
}

function minimoSobrevivencia() {
  return dados.gastosEssenciais.reduce((t, g) => {
    return t + Number(g.valor || 0) * Number(g.multiplicadorMensal || 1);
  }, 0);
}

function essenciaisDoMes(lista) {
  return {
    pagos: soma(lista, (l) =>
      l.tipo === "Despesa" &&
      l.status === "Pago" &&
      ehLancamentoEssencial(l)
    ),
    pendentes: soma(lista, (l) =>
      l.tipo === "Despesa" &&
      ["Pendente", "Atrasado"].includes(l.status) &&
      ehLancamentoEssencial(l)
    )
  };
}

function garantirFaturasCredito() {
  if (!Array.isArray(dados.faturasCredito)) dados.faturasCredito = [];

  const mesAtual = chaveMesPorNumero(dados.configuracoes.mesAtual || 6, dados.configuracoes.anoAtual || 2026);
  const valorMigrado = Number(
    dados.configuracoes.creditoEmAbertoInicial ||
    dados.configuracoes.creditoAtual ||
    0
  );

  const existeFaturaInicial = dados.faturasCredito.some((f) => f.mesCredito === mesAtual);

  if (valorMigrado > 0 && !existeFaturaInicial) {
    dados.faturasCredito.push({
      id: `fat_${mesAtual}_inicial`,
      mesCredito: mesAtual,
      competencia: dataDoMesCredito(mesAtual),
      nome: nomeFaturaPorMes(mesAtual),
      vencimento: vencimentoCredito(dataDoMesCredito(mesAtual)),
      valorInicial: valorMigrado,
      status: "Pendente",
      origem: "Crédito em aberto antes do início do controle"
    });
  }
}

function faturasCredito() {
  garantirFaturasCredito();

  const grupos = new Map();

  dados.faturasCredito.forEach((f) => {
    const mesCredito = f.mesCredito || chaveMes(f.competencia || f.data || hojeISO());
    const competencia = f.competencia || dataDoMesCredito(mesCredito);
    const vencimento = f.vencimento || vencimentoCredito(competencia);
    const totalBase = Number(f.valorInicial || f.valor || 0);
    const statusBase = f.status || "Pendente";

    grupos.set(mesCredito, {
      id: f.id || `fat_${mesCredito}`,
      mesCredito,
      competencia,
      vencimento,
      nome: f.nome || nomeFaturaPorMes(mesCredito),
      total: totalBase,
      valorInicial: totalBase,
      pago: statusBase === "Pago" ? totalBase : 0,
      pendente: ["Pago", "Cancelado"].includes(statusBase) ? 0 : totalBase,
      statusBase,
      status: statusBase,
      quantidade: totalBase > 0 ? 1 : 0,
      lancamentos: []
    });
  });

  dados.lancamentos
    .filter((l) => ehCredito(l) && l.status !== "Cancelado")
    .forEach((l) => {
      const competencia = l.competenciaCredito || competenciaCredito(l.data);
      const mesCredito = l.mesCredito || chaveMes(competencia);
      const vencimento = l.vencimentoCredito || vencimentoCredito(competencia);

      if (!grupos.has(mesCredito)) {
        grupos.set(mesCredito, {
          id: `fat_${mesCredito}`,
          mesCredito,
          competencia: dataDoMesCredito(mesCredito),
          vencimento,
          nome: nomeFaturaPorMes(mesCredito),
          total: 0,
          valorInicial: 0,
          pago: 0,
          pendente: 0,
          statusBase: "Pendente",
          status: "Pendente",
          quantidade: 0,
          lancamentos: []
        });
      }

      const grupo = grupos.get(mesCredito);
      const valor = Number(l.valor || 0);

      grupo.total += valor;
      grupo.quantidade += 1;
      grupo.lancamentos.push(l.id);

      if (["Pago", "Recebido"].includes(l.status)) grupo.pago += valor;
      else grupo.pendente += valor;
    });

  return [...grupos.values()]
    .map((f) => {
      if (f.pendente > 0) f.status = "Pendente";
      else if (f.total > 0) f.status = "Pago";
      else f.status = f.statusBase || "Pendente";

      return f;
    })
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

function faturaDoMes(mes = dados.configuracoes.mesAtual, ano = dados.configuracoes.anoAtual) {
  const mesCredito = chaveMesPorNumero(mes, ano);
  return faturasCredito().find((f) => f.mesCredito === mesCredito) || {
    mesCredito,
    competencia: dataDoMesCredito(mesCredito),
    vencimento: vencimentoCredito(dataDoMesCredito(mesCredito)),
    nome: nomeFaturaPorMes(mesCredito),
    total: 0,
    pago: 0,
    pendente: 0,
    status: "Pendente",
    quantidade: 0
  };
}

function creditoEmAbertoTotal() {
  return faturasCredito()
    .filter((f) => f.status !== "Pago" && f.status !== "Cancelado")
    .reduce((total, f) => total + Number(f.total || 0), 0);
}

function marcarFaturaPaga(mesCredito) {
  garantirFaturasCredito();

  let fatura = dados.faturasCredito.find((f) => f.mesCredito === mesCredito);

  if (!fatura) {
    fatura = {
      id: `fat_${mesCredito}`,
      mesCredito,
      competencia: dataDoMesCredito(mesCredito),
      nome: nomeFaturaPorMes(mesCredito),
      vencimento: vencimentoCredito(dataDoMesCredito(mesCredito)),
      valorInicial: 0,
      status: "Pago"
    };
    dados.faturasCredito.push(fatura);
  }

  fatura.status = "Pago";
  fatura.dataPagamento = hojeISO();

  dados.lancamentos.forEach((l) => {
    if (ehCredito(l) && (l.mesCredito || chaveMes(l.competenciaCredito || competenciaCredito(l.data))) === mesCredito) {
      l.status = "Pago";
    }
  });

  salvar();
  atualizarTudo();
}

function reabrirFatura(mesCredito) {
  garantirFaturasCredito();

  const fatura = dados.faturasCredito.find((f) => f.mesCredito === mesCredito);
  if (fatura) {
    fatura.status = "Pendente";
    delete fatura.dataPagamento;
  }

  dados.lancamentos.forEach((l) => {
    if (ehCredito(l) && (l.mesCredito || chaveMes(l.competenciaCredito || competenciaCredito(l.data))) === mesCredito) {
      l.status = "Pendente";
    }
  });

  salvar();
  atualizarTudo();
}

function renderCreditoCalendario() {
  const el = $("creditoCalendario");
  if (!el) return;

  const faturas = faturasCredito();
  const limite = Number(dados.configuracoes.creditoMensalDisponivel || 1800);

  if (!faturas.length) {
    el.innerHTML = `
      <div class="credit-calendar-header">
        <div>
          <h2 class="credit-calendar-title">Calendário de faturas de crédito</h2>
          <p class="credit-calendar-sub">Compras no Nubank Crédito aparecerão aqui com vencimento sempre no dia 12.</p>
        </div>
      </div>
      <p class="muted">Nenhuma fatura de crédito registrada.</p>
    `;
    return;
  }

  el.innerHTML = `
    <div class="credit-calendar-header">
      <div>
        <h2 class="credit-calendar-title">Calendário de faturas de crédito</h2>
        <p class="credit-calendar-sub">Fechamento no dia 05. Vencimento sempre no dia 12 do mês seguinte.</p>
      </div>
    </div>
    <div class="credit-list">
      ${faturas.map((f) => {
        const saldoLimite = f.status === "Pago" ? limite : limite - Number(f.total || 0);
        return `
          <div class="credit-row">
            <div>
              <strong>${f.nome}</strong>
              <span>${f.quantidade} item(ns) · ${statusBadge(f.status)}</span>
            </div>
            <div>
              <span>Vencimento</span>
              <strong>${formatarData(f.vencimento)}</strong>
            </div>
            <div>
              <span>Saldo do limite</span>
              <strong>${moeda(saldoLimite)}</strong>
            </div>
            <div class="credit-total">${moeda(f.total)}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderCreditoEmAbertoLancamentos() {
  const el = $("creditoEmAbertoLancamentos");
  if (!el) return;

  const faturas = faturasCredito();
  const abertas = faturas.filter((f) => f.status !== "Pago" && f.status !== "Cancelado" && Number(f.total || 0) > 0);
  const limite = Number(dados.configuracoes.creditoMensalDisponivel || 1800);
  const totalAberto = abertas.reduce((total, f) => total + Number(f.total || 0), 0);

  el.innerHTML = `
    <div class="credit-open-header">
      <div>
        <h2 class="credit-open-title">Crédito em aberto</h2>
        <p class="credit-open-sub">Faturas pendentes. Fechamento no dia 05 e vencimento no dia 12.</p>
      </div>
    </div>

    <div class="credit-open-grid">
      <div class="credit-open-mini danger">
        <span>Total em aberto</span>
        <strong>${moeda(totalAberto)}</strong>
      </div>
      <div class="credit-open-mini">
        <span>Limite mensal</span>
        <strong>${moeda(limite)}</strong>
      </div>
      <div class="credit-open-mini ${totalAberto > limite ? "danger" : "ok"}">
        <span>Diferença vs. limite</span>
        <strong>${moeda(limite - totalAberto)}</strong>
      </div>
    </div>

    ${abertas.length ? `
      <div class="credit-open-list">
        ${abertas.map((f) => `
          <div class="credit-open-row">
            <div>
              <strong>${f.nome}</strong>
              <span>${f.quantidade} item(ns) · ${statusBadge(f.status)}</span>
            </div>
            <div>
              <span>Vencimento</span>
              <strong>${formatarData(f.vencimento)}</strong>
            </div>
            <div>
              <span>Limite restante</span>
              <strong>${moeda(limite - Number(f.total || 0))}</strong>
            </div>
            <div class="credit-open-total">${moeda(f.total)}</div>
            <div class="actions">
              <button class="btn-action" onclick="marcarFaturaPaga('${f.mesCredito}')">Marcar como paga</button>
            </div>
          </div>
        `).join("")}
      </div>
    ` : `<p class="muted">Nenhuma fatura pendente no crédito.</p>`}
  `;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function bancoKey(valor) {
  const texto = normalizarTexto(valor);

  if (!texto || texto === "nao informado") return "";
  if (texto.includes("nubank") || texto === "nu") return "nubank";
  if (texto.includes("banco do brasil") || texto === "bb") return "bb";
  if (texto.includes("inter")) return "inter";

  return "";
}

function bancoLabel(valor) {
  const key = bancoKey(valor);
  return bancoLabels[key] || "Outro";
}

function bancoBadge(valor) {
  const key = bancoKey(valor);
  const classe = key || "outro";
  return `<span class="bank-badge bank-${classe}"><span class="bank-dot"></span>${bancoLabels[key] || "Outro"}</span>`;
}

function statusBadge(status) {
  const classe = normalizarTexto(status).replace(/\s+/g, "-") || "pendente";
  return `<span class="badge badge-${classe}">${status || "Pendente"}</span>`;
}

function tipoBadge(tipo) {
  const classe = tipo === "Receita" ? "receita" : "despesa";
  return `<span class="badge badge-${classe}">${tipo}</span>`;
}

function formatarData(dataISO) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  if (!ano || !mes || !dia) return dataISO;
  return `${dia}/${mes}/${ano}`;
}

function inferirBanco(l) {
  if (l.banco) return bancoKey(l.banco);
  const origem = normalizarTexto(l.origemArquivo);
  const conta = normalizarTexto(l.conta);
  const canal = normalizarTexto(l.canal);
  const descricao = normalizarTexto(l.descricao);

  if (origem.includes("nubank_") || conta.includes("nubank") || canal.includes("nubank") || descricao.includes("nu pagamentos")) {
    return "nubank";
  }

  if (origem.includes("extrato conta corrente") || conta.includes("conta corrente")) {
    return "bb";
  }

  return "";
}

function inferirTipoConta(l) {
  const conta = normalizarTexto(l.conta);
  const forma = normalizarTexto(l.formaPagamento);

  if (conta.includes("credito") || forma.includes("credito")) return "credito";
  if (conta.includes("poupanca")) return "poupanca";
  if (conta.includes("carteira")) return "carteira";
  if (conta.includes("corrente")) return "corrente";
  return l.tipoConta || "corrente";
}

function contaLabel(l) {
  const banco = bancoLabel(l.banco || inferirBanco(l));
  const tipoConta = tipoContaLabels[l.tipoConta || inferirTipoConta(l)] || "Conta";
  return `${banco} · ${tipoConta}`;
}

function baseVazia() {
  return {
    configuracoes: {
      moeda: "BRL",
      saldoInicial: 0,
      mesAtual: 6,
      anoAtual: 2026,
      creditoMensalDisponivel: 1800.00,
      saldoBancoBrasilAtual: 8.72,
      versaoBase: "credito-v7"
    },
    cartaoCredito: {
      banco: "nubank",
      nome: "Nubank Crédito",
      diaFechamento: 5,
      diaVencimento: 12
    },
    categorias: {
      receitas: ["Matizes Dumont", "Freelas", "Empréstimo", "Doação Familiar"],
      despesas: ["Mercado", "Comida", "Higiene", "Lazer", "Luz", "Internet"]
    },
    contas: ["Nubank", "Banco do Brasil", "Inter"],
    faturasCredito: [
      {
        id: "fat_2026-06_inicial",
        mesCredito: "2026-06",
        competencia: "2026-06-01",
        nome: "Crédito Junho de 2026",
        vencimento: "2026-07-12",
        valorInicial: 2726.48,
        status: "Pendente",
        origem: "Crédito em aberto antes do início do controle"
      }
    ],
    lancamentos: [],
    gastosEssenciais: [
      { nome: "Compras básicas semanais", valor: 200, frequencia: "Semanal", multiplicadorMensal: 4.33, categoria: "Mercado" },
      { nome: "Água", valor: 0, frequencia: "Mensal", multiplicadorMensal: 1, categoria: "Água" },
      { nome: "Energia", valor: 0, frequencia: "Mensal", multiplicadorMensal: 1, categoria: "Luz" },
      { nome: "Internet", valor: 0, frequencia: "Mensal", multiplicadorMensal: 1, categoria: "Internet" },
      { nome: "MEI", valor: 0, frequencia: "Mensal", multiplicadorMensal: 1, categoria: "Impostos" },
      { nome: "Empréstimos", valor: 0, frequencia: "Mensal", multiplicadorMensal: 1, categoria: "Empréstimo" }
    ]
  };
}

function normalizarDados() {
  const base = baseVazia();

  if (!dados) dados = base;
  if (!dados.configuracoes) dados.configuracoes = base.configuracoes;

  dados.configuracoes.creditoMensalDisponivel = Number(dados.configuracoes.creditoMensalDisponivel || 1800);
  dados.configuracoes.saldoBancoBrasilAtual = Number(dados.configuracoes.saldoBancoBrasilAtual || 8.72);

  if (!dados.cartaoCredito) dados.cartaoCredito = base.cartaoCredito;
  if (!dados.categorias) dados.categorias = base.categorias;
  if (!Array.isArray(dados.categorias.receitas)) dados.categorias.receitas = [];
  if (!Array.isArray(dados.categorias.despesas)) dados.categorias.despesas = [];
  if (!dados.categorias.despesas.includes("Mercado")) dados.categorias.despesas.unshift("Mercado");

  if (!Array.isArray(dados.lancamentos)) dados.lancamentos = [];
  if (!Array.isArray(dados.gastosEssenciais)) dados.gastosEssenciais = base.gastosEssenciais;
  if (!Array.isArray(dados.faturasCredito)) dados.faturasCredito = [];

  garantirFaturasCredito();

  dados.faturasCredito.forEach((f) => {
    f.mesCredito = f.mesCredito || chaveMes(f.competencia || hojeISO());
    f.competencia = f.competencia || dataDoMesCredito(f.mesCredito);
    f.nome = f.nome || nomeFaturaPorMes(f.mesCredito);
    f.vencimento = f.vencimento || vencimentoCredito(f.competencia);
    f.valorInicial = Number(f.valorInicial || f.valor || 0);
    f.status = f.status || "Pendente";
  });

  dados.lancamentos.forEach((l) => {
    l.banco = bancoKey(l.banco || inferirBanco(l));
    l.tipoConta = l.tipoConta || inferirTipoConta(l);
    l.conta = l.conta || contaLabel(l);
    l.categorias = Array.isArray(l.categorias)
      ? l.categorias
      : String(l.categorias || "").split(",").map((c) => c.trim()).filter(Boolean);
    l.valor = Number(l.valor || 0);

    if (ehCredito(l)) {
      l.competenciaCredito = l.competenciaCredito || competenciaCredito(l.data);
      l.mesCredito = l.mesCredito || chaveMes(l.competenciaCredito);
      l.vencimentoCredito = l.vencimentoCredito || vencimentoCredito(l.competenciaCredito);
      l.nomeFatura = l.nomeFatura || nomeFaturaPorMes(l.mesCredito);
    }
  });
}

async function carregarDados() {
  const local = localStorage.getItem(STORAGE_KEY);

  async function carregarJsonDoRepositorio() {
    try {
      const resposta = await fetch(`financeiro.json?v=${Date.now()}`, { cache: "no-store" });
      return resposta.ok ? await resposta.json() : null;
    } catch {
      return null;
    }
  }

  const remoto = await carregarJsonDoRepositorio();

  if (local) {
    try {
      const localParseado = JSON.parse(local);
      const localTemLancamentos = Array.isArray(localParseado.lancamentos) && localParseado.lancamentos.length > 0;
      const remotoTemLancamentos = remoto && Array.isArray(remoto.lancamentos) && remoto.lancamentos.length > 0;
      const versaoLocal = localParseado?.configuracoes?.versaoBase || localParseado?.metadadosImportacao?.versao || "";
      const versaoRemota = remoto?.configuracoes?.versaoBase || remoto?.metadadosImportacao?.versao || "";

      if (remoto && versaoRemota && versaoRemota !== versaoLocal) {
        dados = remoto;
      } else {
        dados = (!localTemLancamentos && remotoTemLancamentos) ? remoto : localParseado;
      }
    } catch {
      dados = remoto || baseVazia();
    }
  } else {
    dados = remoto || baseVazia();
  }

  normalizarDados();
  salvar();
}

function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function lancamentosDoMes(mes = dados.configuracoes.mesAtual, ano = dados.configuracoes.anoAtual) {
  return dados.lancamentos.filter((l) => {
    const dataReferencia = ehCredito(l)
      ? (l.competenciaCredito || competenciaCredito(l.data))
      : l.data;

    const data = new Date(dataReferencia + "T00:00:00");
    return data.getMonth() + 1 === Number(mes) && data.getFullYear() === Number(ano);
  });
}

function soma(lista, teste) {
  return lista.filter(teste).reduce((total, item) => total + Number(item.valor || 0), 0);
}

function calcularResumo(lista = lancamentosDoMes()) {
  const limiteMensalCredito = Number(dados.configuracoes.creditoMensalDisponivel || 1800);
  const faturaMes = faturaDoMes(dados.configuracoes.mesAtual, dados.configuracoes.anoAtual);
  const faturaCreditoDoMes = Number(faturaMes.total || 0);
  const faturaAbertaDoMes = faturaMes.status !== "Pago" && faturaMes.status !== "Cancelado";
  const saldoLimiteMes = limiteMensalCredito - (faturaAbertaDoMes ? faturaCreditoDoMes : 0);
  const creditoAberto = creditoEmAbertoTotal();

  const saldoBancoBrasilAtual = Number(dados.configuracoes.saldoBancoBrasilAtual || 0);
  const saldoInicial = Number(dados.configuracoes.saldoInicial || 0);
  const entradas = soma(lista, (l) => l.tipo === "Receita" && ["Recebido", "Pago"].includes(l.status));
  const saidas = soma(lista, (l) => l.tipo === "Despesa" && !ehCredito(l) && l.status === "Pago");
  const receber = soma(lista, (l) => l.tipo === "Receita" && l.status === "Pendente");

  const contasPagarSemCredito = soma(lista, (l) =>
    l.tipo === "Despesa" &&
    !ehCredito(l) &&
    ["Pendente", "Atrasado"].includes(l.status)
  );

  const faturaPagarMes = faturaAbertaDoMes ? faturaCreditoDoMes : 0;
  const pagar = contasPagarSemCredito + faturaPagarMes;

  const minimo = minimoSobrevivencia();
  const essenciais = essenciaisDoMes(lista);
  const restanteSobrevivencia = Math.max(0, minimo - essenciais.pagos);
  const saldoFinal = saldoInicial + entradas - saidas;

  const gastosMercado = soma(lista, (l) =>
    l.tipo === "Despesa" &&
    l.status !== "Cancelado" &&
    (l.categorias || []).some((c) => normalizarTexto(c) === "mercado")
  );

  return [
    ["Crédito em aberto", creditoAberto, "despesa"],
    ["Limite mensal de crédito", limiteMensalCredito, ""],
    ["Fatura de Crédito do mês", faturaCreditoDoMes, "despesa"],
    ["Saldo do limite do mês", saldoLimiteMes, saldoLimiteMes < 0 ? "despesa" : "receita"],
    ["Saldo Banco do Brasil atual", saldoBancoBrasilAtual, ""],
    ["Entradas", entradas, "receita"],
    ["Saídas pagas", saidas, "despesa"],
    ["Saldo final", saldoFinal, ""],
    ["Valores a receber", receber, "receita"],
    ["Contas a pagar", pagar, "despesa"],
    ["Resultado previsto", saldoFinal + receber - pagar, ""],
    ["Gastos em Mercado", gastosMercado, "despesa"],
    ["Mínimo para Sobrevivência", minimo, "despesa"],
    ["Essenciais já pagos", essenciais.pagos, "despesa"],
    ["Sobrevivência ainda não coberta", restanteSobrevivencia, restanteSobrevivencia > 0 ? "despesa" : "receita"]
  ];
}

function renderDashboard() {
  $("cards").innerHTML = calcularResumo()
    .map(([nome, valor, classe]) => `
      <article class="metric ${classe}">
        <span class="label">${nome}</span>
        <strong>${moeda(valor)}</strong>
      </article>
    `)
    .join("");

  renderCreditoCalendario();
}

function renderLancamentos() {
  const tbody = $("linhas");
  const filtroTipo = $("tFiltroTipo")?.value || "";
  const filtroStatus = $("tFiltroStatus")?.value || "";

  const lista = dados.lancamentos
    .filter((l) => !filtroTipo || l.tipo === filtroTipo)
    .filter((l) => !filtroStatus || l.status === filtroStatus)
    .slice()
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="9">Nenhum lançamento cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map((l) => `
    <tr>
      <td>${formatarData(l.data)}</td>
      <td>${tipoBadge(l.tipo)}</td>
      <td>${l.descricao || ""}</td>
      <td>${(l.categorias || []).join(", ")}</td>
      <td>${bancoBadge(l.banco)}<div class="small muted">${ehCredito(l) ? labelCredito(l) : (tipoContaLabels[l.tipoConta] || "")}</div></td>
      <td>${l.canal || ""}</td>
      <td>${statusBadge(l.status)}</td>
      <td class="col-valor">${moeda(l.valor)}</td>
      <td class="actions">
        <button class="btn-action" onclick="editar('${l.id}')">Editar</button>
        <button class="btn-action" onclick="duplicar('${l.id}')">Duplicar</button>
        <button class="btn-action" onclick="marcarPago('${l.id}')">Pago</button>
        <button class="btn-danger-soft" onclick="excluir('${l.id}')">Excluir</button>
      </td>
    </tr>
  `).join("");
}

function renderCategorias() {
  $("catList").innerHTML = `
    <div class="cat-columns">
      <div>
        <h3>Receitas</h3>
        <div class="cat-chips">
          ${dados.categorias.receitas.map((c) => `<span class="badge badge-receita">${c}</span>`).join("")}
        </div>
      </div>
      <div>
        <h3>Despesas</h3>
        <div class="cat-chips">
          ${dados.categorias.despesas.map((c) => `<span class="badge badge-despesa">${c}</span>`).join("")}
        </div>
      </div>
    </div>
  `;

  const todasCategorias = ["", ...dados.categorias.receitas, ...dados.categorias.despesas];
  $("fCategoria").innerHTML = todasCategorias
    .map((c) => `<option value="${c}">${c || "Todas as categorias"}</option>`)
    .join("");

  const bancos = ["", ...new Set(dados.lancamentos.map((l) => bancoKey(l.banco)).filter(Boolean))];
  $("fBanco").innerHTML = bancos
    .map((b) => `<option value="${b}">${b ? bancoLabels[b] : "Todos os bancos"}</option>`)
    .join("");

  const canais = ["", ...new Set(dados.lancamentos.map((l) => l.canal).filter(Boolean))];
  $("fCanal").innerHTML = canais
    .map((c) => `<option value="${c}">${c || "Todos os canais"}</option>`)
    .join("");
}

function preencherFiltros() {
  $("fMes").innerHTML = meses.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
  $("fMes").value = dados.configuracoes.mesAtual || new Date().getMonth() + 1;
  $("fAno").value = dados.configuracoes.anoAtual || new Date().getFullYear();
}

function listaRelatorioFiltrada() {
  const mes = Number($("fMes").value || dados.configuracoes.mesAtual);
  const ano = Number($("fAno").value || dados.configuracoes.anoAtual);
  const categoria = $("fCategoria").value;
  const banco = $("fBanco").value;
  const canal = $("fCanal").value;
  const status = $("fStatus").value;

  return lancamentosDoMes(mes, ano).filter((l) => {
    const okCategoria = !categoria || (l.categorias || []).includes(categoria);
    const okBanco = !banco || bancoKey(l.banco) === banco;
    const okCanal = !canal || l.canal === canal;
    const okStatus = !status || l.status === status;
    return okCategoria && okBanco && okCanal && okStatus;
  });
}

function renderRelatorio() {
  const lista = listaRelatorioFiltrada();

  const receitas = soma(lista, (l) => l.tipo === "Receita" && l.status !== "Cancelado");
  const despesas = soma(lista, (l) => l.tipo === "Despesa" && l.status !== "Cancelado");
  const pendente = soma(lista, (l) => l.status === "Pendente");
  const atrasado = soma(lista, (l) => l.status === "Atrasado");

  $("relCards").innerHTML = [
    ["Total de receitas", receitas, "receita"],
    ["Total de despesas", despesas, "despesa"],
    ["Saldo do período", receitas - despesas, ""],
    ["Total pendente", pendente, ""],
    ["Total atrasado", atrasado, "despesa"]
  ].map(([nome, valor, classe]) => `
    <article class="metric ${classe}">
      <span class="label">${nome}</span>
      <strong>${moeda(valor)}</strong>
    </article>
  `).join("");

  $("relTabelas").innerHTML = `
    <h3 class="form-title">Lançamentos filtrados</h3>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th>
            <th>Banco</th><th>Canal</th><th>Status</th><th class="col-valor">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map((l) => `
            <tr>
              <td>${formatarData(l.data)}</td>
              <td>${tipoBadge(l.tipo)}</td>
              <td>${l.descricao || ""}</td>
              <td>${(l.categorias || []).join(", ")}</td>
              <td>${bancoBadge(l.banco)}<div class="small muted">${ehCredito(l) ? labelCredito(l) : ""}</div></td>
              <td>${l.canal || ""}</td>
              <td>${statusBadge(l.status)}</td>
              <td class="col-valor">${moeda(l.valor)}</td>
            </tr>
          `).join("") || `<tr><td colspan="8">Nenhum resultado.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function atualizarTudo() {
  renderDashboard();
  renderCreditoEmAbertoLancamentos();
  renderLancamentos();
  renderCategorias();
  renderRelatorio();
}

function limparFormulario() {
  $("form").reset();
  $("id").value = "";
  $("data").value = hojeISO();
  $("formTitle").textContent = "Novo lançamento";
  $("btnSalvar").textContent = "Salvar lançamento";
  $("cancelEdit").classList.add("hidden");
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if ($("user").value === LOGIN.user && $("pass").value === LOGIN.pass) {
    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");

    await carregarDados();
    preencherFiltros();
    limparFormulario();
    atualizarTudo();
  } else {
    alert("Usuário ou senha inválidos.");
  }
});

$("logout").addEventListener("click", () => location.reload());

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));

    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
  });
});

$("form").addEventListener("submit", (e) => {
  e.preventDefault();

  const editando = Boolean($("id").value);
  const id = $("id").value || `lan_${Date.now()}`;
  const banco = $("banco").value || "";
  const tipoConta = $("tipoConta").value || "corrente";
  const valorTotal = Number($("valor").value || 0);
  const totalParcelas = parseTotalParcelas($("parcelas").value);

  const item = {
    id,
    data: $("data").value,
    tipo: $("tipo").value,
    descricao: $("descricao").value,
    categorias: $("categoriasLanc").value.split(",").map((c) => c.trim()).filter(Boolean),
    banco,
    tipoConta,
    conta: `${bancoLabels[banco] || "Não informado"} · ${tipoContaLabels[tipoConta] || "Conta"}`,
    canal: $("canal").value || "",
    formaPagamento: $("forma").value,
    parcelas: $("parcelas").value || "À vista",
    status: $("status").value,
    valor: valorTotal
  };

  const compraCredito = item.tipo === "Despesa" && item.banco === "nubank" && item.tipoConta === "credito";

  if (!editando && compraCredito) {
    const parcelasCredito = gerarParcelasCredito(item, valorTotal, totalParcelas);
    dados.lancamentos.push(...parcelasCredito);
  } else {
    if (compraCredito) {
      item.competenciaCredito = item.competenciaCredito || competenciaCredito(item.data);
      item.mesCredito = chaveMes(item.competenciaCredito);
      item.vencimentoCredito = item.vencimentoCredito || vencimentoCredito(item.competenciaCredito);
      item.nomeFatura = item.nomeFatura || nomeFaturaPorMes(item.mesCredito);
      item.status = item.status === "Cancelado" ? "Cancelado" : item.status;
    }

    const i = dados.lancamentos.findIndex((l) => l.id === id);
    if (i >= 0) dados.lancamentos[i] = item;
    else dados.lancamentos.push(item);
  }

  garantirFaturasCredito();
  salvar();
  limparFormulario();
  atualizarTudo();
});

function editar(id) {
  const l = dados.lancamentos.find((x) => x.id === id);
  if (!l) return;

  $("id").value = l.id;
  $("data").value = l.data;
  $("tipo").value = l.tipo;
  $("status").value = l.status;
  $("descricao").value = l.descricao;
  $("categoriasLanc").value = (l.categorias || []).join(", ");
  $("banco").value = bancoKey(l.banco) || "";
  $("tipoConta").value = l.tipoConta || inferirTipoConta(l);
  $("canal").value = l.canal || "";
  $("forma").value = l.formaPagamento || "Outro";
  $("parcelas").value = l.parcelas || "À vista";
  $("valor").value = l.valor;

  $("formTitle").textContent = "Editar lançamento";
  $("btnSalvar").textContent = "Salvar alterações";
  $("cancelEdit").classList.remove("hidden");

  document.querySelector('[data-tab="lancamentos"]').click();
  $("form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function excluir(id) {
  if (!confirm("Excluir este lançamento?")) return;
  dados.lancamentos = dados.lancamentos.filter((l) => l.id !== id);
  salvar();
  atualizarTudo();
}

function duplicar(id) {
  const l = dados.lancamentos.find((x) => x.id === id);
  if (!l) return;
  const copia = { ...l, id: `lan_${Date.now()}`, descricao: `${l.descricao} (cópia)` };
  delete copia.grupoParcelamento;
  dados.lancamentos.push(copia);
  salvar();
  atualizarTudo();
}

function marcarPago(id) {
  const l = dados.lancamentos.find((x) => x.id === id);
  if (!l) return;
  l.status = l.tipo === "Receita" ? "Recebido" : "Pago";
  salvar();
  atualizarTudo();
}

$("cancelEdit").addEventListener("click", limparFormulario);

$("catForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const nome = $("catNome").value.trim();
  const tipo = $("catTipo").value;

  if (nome && !dados.categorias[tipo].includes(nome)) {
    dados.categorias[tipo].push(nome);
  }

  e.target.reset();
  salvar();
  atualizarTudo();
});

["fMes", "fAno", "fCategoria", "fBanco", "fCanal", "fStatus"].forEach((id) => {
  $(id).addEventListener("change", renderRelatorio);
});

["tFiltroTipo", "tFiltroStatus"].forEach((id) => {
  $(id).addEventListener("change", renderLancamentos);
});

$("exportJson").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  baixar(blob, `financeiro-${hojeISO()}.json`);
});

$("importJson").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  dados = JSON.parse(await file.text());
  normalizarDados();
  salvar();
  preencherFiltros();
  atualizarTudo();
});

$("exportCsv").addEventListener("click", () => {
  const lista = listaRelatorioFiltrada();
  const linhas = [["Data", "Tipo", "Descrição", "Categorias", "Banco", "Tipo de conta", "Canal", "Status", "Valor", "Parcela", "Fatura de crédito", "Vencimento do crédito"]];

  lista.forEach((l) => {
    linhas.push([
      l.data,
      l.tipo,
      l.descricao,
      (l.categorias || []).join("; "),
      bancoLabel(l.banco),
      tipoContaLabels[l.tipoConta] || "",
      l.canal,
      l.status,
      l.valor,
      l.parcelas || "",
      l.nomeFatura || "",
      l.vencimentoCredito || ""
    ]);
  });

  const csv = linhas.map((linha) =>
    linha.map((celula) => `"${String(celula ?? "").replaceAll('"', '""')}"`).join(",")
  ).join("\n");

  baixar(new Blob([csv], { type: "text/csv;charset=utf-8" }), `relatorio-${hojeISO()}.csv`);
});

function baixar(blob, nome) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}

$("data").value = hojeISO();
