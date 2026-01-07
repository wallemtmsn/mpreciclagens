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

const btnNovaCompra = document.getElementById("btnNovaCompra");
const btnFinalizarCompra = document.getElementById("btnFinalizarCompra");

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
  atualizarEstadoUI();

  // Event listeners
  materialSelect.addEventListener("change", syncPriceAndTotal);
  pesoInput.addEventListener("input", syncPriceAndTotal);
  
  // Adiciona foco ao peso quando material é selecionado
  materialSelect.addEventListener("change", () => {
    if (compraAtiva) {
      pesoInput.focus();
    }
  });

  formItem.addEventListener("submit", e => {
    e.preventDefault();
    addItem();
  });

  btnClearInputs.addEventListener("click", () => {
    pesoInput.value = "";
    syncPriceAndTotal();
  });

  // Cancelar compra
  btnClearAll.addEventListener("click", () => {
    if (!compraAtiva) return;
    if (!confirm("Cancelar a compra atual?")) return;
    compraAtiva = null;
    saveCompraAtiva();
    renderItens();
    updateTotais();
    atualizarEstadoUI();
  });

  // Event listeners para botões principais
  btnNovaCompra.addEventListener("click", novaCompra);
  btnFinalizarCompra.addEventListener("click", finalizarCompra);

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
    renderMaterialOptions();
    syncPriceAndTotal();
    pricesDialog.close();
  });

  btnResetPrices.addEventListener("click", () => {
    prices = { ...defaultPrices };
    savePrices();
    renderPricesEditor();
    renderMaterialOptions();
    syncPriceAndTotal();
  });
}

// ---------- RENDERIZAÇÃO ----------
function renderMaterialOptions() {
  const current = materialSelect.value;
  materialSelect.innerHTML = "";

  Object.keys(prices).forEach(mat => {
    const option = document.createElement("option");
    option.value = mat;
    option.textContent = `${mat} (${formatBRL(prices[mat])}/kg)`;
    materialSelect.appendChild(option);
  });

  // Restaura seleção anterior se ainda existir
  if (Object.keys(prices).includes(current)) {
    materialSelect.value = current;
  } else if (Object.keys(prices).length > 0) {
    materialSelect.value = Object.keys(prices)[0];
  }
}

function renderPricesEditor() {
  pricesForm.innerHTML = "";
  
  Object.keys(prices).forEach(mat => {
    const div = document.createElement("div");
    div.className = "field";
    
    div.innerHTML = `
      <span>${mat}</span>
      <input 
        type="number" 
        step="0.01" 
        min="0" 
        value="${prices[mat].toFixed(2).replace('.', ',')}"
        data-material="${mat}"
        placeholder="R$/kg"
      >
    `;
    
    pricesForm.appendChild(div);
  });
}

// ---------- CONTROLE DE ESTADO UI ----------
function atualizarEstadoUI() {
  const temCompraAtiva = !!compraAtiva;

  btnNovaCompra.disabled = temCompraAtiva;
  btnFinalizarCompra.disabled =
    !temCompraAtiva || compraAtiva.itens.length === 0;

  // Material sempre visível
  materialSelect.disabled = false;

  // Peso e ações só com compra ativa
  pesoInput.disabled = !temCompraAtiva;

  formItem.querySelectorAll("button").forEach(btn => {
    btn.disabled = !temCompraAtiva;
  });
}

// ---------- COMPRA ----------
function novaCompra() {
  if (compraAtiva) return;

  const seq = getNextSeqDia();
  compraAtiva = {
    idCompra: seq,
    itens: []
  };

  saveCompraAtiva();
  renderItens();
  updateTotais();
  atualizarEstadoUI();
}

function finalizarCompra() {
  if (!compraAtiva || compraAtiva.itens.length === 0) return;

  compraAtiva.totalCompra = compraAtiva.itens.reduce((s, i) => s + i.total, 0);
  comprasDia.push(compraAtiva);

  saveComprasDia();
  compraAtiva = null;
  saveCompraAtiva();

  renderItens();
  updateTotais();
  atualizarEstadoUI();
}

// ---------- Itens ----------
function addItem() {
  if (!compraAtiva) return;

  const material = materialSelect.value;
  const precoKg = prices[material] || 0;
  const pesoKg = parseNumber(pesoInput.value);

  // Validações
  if (!material || !prices[material]) {
    alert("Selecione um material válido.");
    return;
  }

  if (!pesoKg || pesoKg <= 0) {
    alert("Informe um peso válido. Ex.: 1,300");
    return;
  }

  compraAtiva.itens.push({
    material,
    pesoKg,
    precoKg,
    total: pesoKg * precoKg
  });

  saveCompraAtiva();
  renderItens();
  updateTotais();
  atualizarEstadoUI();

  pesoInput.value = "";
  syncPriceAndTotal();
  pesoInput.focus(); // Foco automático para próximo item
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
      atualizarEstadoUI();
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

  // Reset se for outro dia
  if (saved.date !== hoje) {
    saved.date = hoje;
    saved.seq = 1;
  } else {
    saved.seq = (saved.seq || 0) + 1;
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
    
    // Garante que todos os materiais padrão existam
    const merged = { ...defaultPrices, ...saved };
    localStorage.setItem(STORAGE_KEY_PRECOS, JSON.stringify(merged));
    return merged;
    
  } catch {
    localStorage.setItem(STORAGE_KEY_PRECOS, JSON.stringify(defaultPrices));
    return { ...defaultPrices };
  }
}