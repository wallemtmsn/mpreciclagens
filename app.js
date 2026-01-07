/* =====================================================
   MP RECICLAGEM - CALCULADORA DE COMPRA
   - Compras separadas por atendimento
   - Peso digitado como na balança (1,300 = 1kg 300g)
   - Persistência em localStorage
   - Envio automático para WhatsApp fixo
===================================================== */

const WHATSAPP_NUMBER = "5522998303157";

const STORAGE_KEY_PRECOS = "mp_precos";
const STORAGE_KEY_COMPRAS_DIA = "mp_compras_dia";
const STORAGE_KEY_COMPRA_ATIVA = "mp_compra_ativa";
const STORAGE_KEY_SEQ_DIA = "mp_seq_dia";

// Preços padrão (R$/kg)
const defaultPrices = {
  "Plástico": 2.50,
  "Ferro": 0.70,
  "Alumínio": 6.50,
  "Papelão": 0.35,
  "Antimônio": 0.00,
  "Cobre": 28.00,
  "Latão": 18.00,
  "Inox": 4.50
};

// ---------- Estado ----------
let prices = loadPrices();
let compraAtiva = loadCompraAtiva();
let comprasDia = loadComprasDia();

// ---------- Elementos ----------
const materialSelect = document.getElementById("materialSelect");
const pesoInput = document.getElementById("pesoInput");
const precoKgEl = document.getElementById("precoKg");
const totalItemEl = document.getElementById("totalItem");
const itensList = document.getElementById("itensList");
const totalGeralEl = document.getElementById("totalGeral");

const formItem = document.getElementById("formItem");
const btnClearInputs = document.getElementById("btnClearInputs");
const btnClearAll = document.getElementById("btnClearAll");

const pricesDialog = document.getElementById("pricesDialog");
const btnOpenPrices = document.getElementById("btnOpenPrices");
const pricesForm = document.getElementById("pricesForm");
const btnSavePrices = document.getElementById("btnSavePrices");
const btnResetPrices = document.getElementById("btnResetPrices");

// ---------- Inicialização ----------
init();

function init() {
  renderMaterialOptions();
  renderItens();
  updateTotais();
  syncPriceAndTotal();

  materialSelect.addEventListener("change", syncPriceAndTotal);
  pesoInput.addEventListener("input", syncPriceAndTotal);

  formItem.addEventListener("submit", e => {
    e.preventDefault();
    addItem();
  });

  btnClearInputs.addEventListener("click", () => {
    pesoInput.value = "";
    syncPriceAndTotal();
  });

  btnClearAll.addEventListener("click", () => {
    if (!confirm("Cancelar a compra atual?")) return;
    compraAtiva = null;
    saveCompraAtiva();
    renderItens();
    updateTotais();
  });

  // Preços
  btnOpenPrices.addEventListener("click", () => {
    renderPricesEditor();
    pricesDialog.showModal();
  });

  btnSavePrices.addEventListener("click", () => {
    const novos = {};
    pricesForm.querySelectorAll("input").forEach(inp => {
      novos[inp.dataset.material] = parseNumber(inp.value) || 0;
    });
    prices = novos;
    savePrices();
    renderMaterialOptions(true);
    syncPriceAndTotal();
    pricesDialog.close();
  });

  btnResetPrices.addEventListener("click", () => {
    prices = { ...defaultPrices };
    savePrices();
    renderPricesEditor();
    renderMaterialOptions(true);
    syncPriceAndTotal();
  });
}

// ---------- COMPRA ----------
function novaCompra() {
  const seq = getNextSeqDia();
  compraAtiva = {
    idCompra: seq,
    nomeVendedor: "",
    itens: []
  };
  saveCompraAtiva();
  renderItens();
  updateTotais();
}

function finalizarCompra() {
  if (!compraAtiva || compraAtiva.itens.length === 0) {
    alert("Não há itens nesta compra.");
    return;
  }

  compraAtiva.totalCompra = compraAtiva.itens.reduce((s, i) => s + i.total, 0);
  comprasDia.push(compraAtiva);

  saveComprasDia();
  compraAtiva = null;
  saveCompraAtiva();

  renderItens();
  updateTotais();
}

// ---------- Itens ----------
function addItem() {
  if (!compraAtiva) {
    alert("Inicie uma nova compra.");
    return;
  }

  const material = materialSelect.value;
  const precoKg = prices[material] || 0;
  const pesoKg = parseNumber(pesoInput.value);

  if (!pesoKg || pesoKg <= 0) {
    alert("Informe um peso válido. Ex.: 1,300");
    return;
  }

  const total = pesoKg * precoKg;

  compraAtiva.itens.push({
    material,
    pesoKg,
    precoKg,
    total
  });

  saveCompraAtiva();
  renderItens();
  updateTotais();

  pesoInput.value = "";
  syncPriceAndTotal();
}

function renderItens() {
  itensList.innerHTML = "";

  if (!compraAtiva) {
    itensList.innerHTML = `
      <li class="item">
        <div class="meta">
          <div class="title">Nenhuma compra ativa</div>
        </div>
      </li>
    `;
    return;
  }

  if (compraAtiva.itens.length === 0) {
    itensList.innerHTML = `
      <li class="item">
        <div class="meta">
          <div class="title">Compra #${compraAtiva.idCompra}</div>
          <div class="item-info">Nenhum item lançado</div>
        </div>
      </li>
    `;
    return;
  }

  compraAtiva.itens.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "item";

    li.innerHTML = `
      <div class="meta">
        <div class="title">${item.material}</div>
        <div class="item-info">
          <div><b>Peso:</b> ${formatKg(item.pesoKg)}</div>
          <div><b>Valor/kg:</b> ${formatBRL(item.precoKg)}</div>
          <div><b>Total:</b> ${formatBRL(item.total)}</div>
        </div>
      </div>
      <button class="icon-btn">🗑</button>
    `;

    li.querySelector("button").onclick = () => {
      compraAtiva.itens.splice(idx, 1);
      saveCompraAtiva();
      renderItens();
      updateTotais();
    };

    itensList.appendChild(li);
  });
}

// ---------- Totais ----------
function updateTotais() {
  const totalCompra = compraAtiva
    ? compraAtiva.itens.reduce((s, i) => s + i.total, 0)
    : 0;

  const totalDia = comprasDia.reduce((s, c) => s + c.totalCompra, 0);

  totalGeralEl.textContent = formatBRL(totalDia + totalCompra);
}

function syncPriceAndTotal() {
  const material = materialSelect.value;
  const precoKg = prices[material] || 0;
  const pesoKg = parseNumber(pesoInput.value) || 0;

  precoKgEl.textContent = formatBRL(precoKg);
  totalItemEl.textContent = formatBRL(pesoKg * precoKg);
}

// ---------- WhatsApp ----------
function fecharDiaWhatsApp() {
  if (comprasDia.length === 0) {
    alert("Nenhuma compra finalizada no dia.");
    return;
  }

  const data = new Date().toLocaleDateString("pt-BR");
  let msg = `♻️ *MP RECICLAGEM*\n📅 *Fechamento do dia:* ${data}\n\n`;
  msg += `────────────────\n🧾 *COMPRAS DO DIA*\n\n`;

  comprasDia.forEach(c => {
    msg += `Compra #${c.idCompra}\n`;
    msg += `Total: ${formatBRL(c.totalCompra)}\n\n`;
  });

  const totalDia = comprasDia.reduce((s, c) => s + c.totalCompra, 0);

  msg += `────────────────\n💰 *TOTAL DO DIA:* ${formatBRL(totalDia)}`;

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
    "_blank"
  );

  comprasDia = [];
  localStorage.removeItem(STORAGE_KEY_COMPRAS_DIA);
  localStorage.removeItem(STORAGE_KEY_SEQ_DIA);
}

// ---------- Utilidades ----------
function formatBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatKg(v) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }) + " kg";
}

function parseNumber(v) {
  if (!v) return 0;
  return Number(String(v).replace(",", "."));
}

// ---------- Sequência diária ----------
function getNextSeqDia() {
  const hoje = new Date().toISOString().slice(0, 10);
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SEQ_DIA)) || {};

  if (saved.date !== hoje) {
    saved.date = hoje;
    saved.seq = 1;
  } else {
    saved.seq++;
  }

  localStorage.setItem(STORAGE_KEY_SEQ_DIA, JSON.stringify(saved));
  return String(saved.seq).padStart(3, "0");
}

// ---------- Storage ----------
function saveCompraAtiva() {
  localStorage.setItem(STORAGE_KEY_COMPRA_ATIVA, JSON.stringify(compraAtiva));
}

function loadCompraAtiva() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_COMPRA_ATIVA));
}

function saveComprasDia() {
  localStorage.setItem(STORAGE_KEY_COMPRAS_DIA, JSON.stringify(comprasDia));
}

function loadComprasDia() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_COMPRAS_DIA)) || [];
}

function savePrices() {
  localStorage.setItem(STORAGE_KEY_PRECOS, JSON.stringify(prices));
}

function loadPrices() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_PRECOS));
    if (!saved || Object.keys(saved).length === 0) {
      localStorage.setItem(STORAGE_KEY_PRECOS, JSON.stringify(defaultPrices));
      return { ...defaultPrices };
    }
    return saved;
  } catch {
    localStorage.setItem(STORAGE_KEY_PRECOS, JSON.stringify(defaultPrices));
    return { ...defaultPrices };
  }
}
