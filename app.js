/* =====================================================
   MP RECICLAGEM - CALCULADORA DE COMPRA
   - Peso digitado como na balança (1,300 = 1kg 300g)
   - Persistência em localStorage
   - Confirmação de fechamento
   - Envio automático para WhatsApp fixo
===================================================== */

const WHATSAPP_NUMBER = "5522998303157";
const STORAGE_KEY_ITENS = "mp_itens_dia";
const STORAGE_KEY_PRECOS = "mp_precos";

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
let itens = loadItens();

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
  updateTotalGeral();
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
    pesoInput.focus();
  });

  btnClearAll.addEventListener("click", () => {
    if (!confirm("Deseja zerar todos os itens do dia?")) return;
    itens = [];
    saveItens();
    renderItens();
    updateTotalGeral();
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

// ---------- Funções principais ----------
function addItem() {
  const material = materialSelect.value;
  const precoKg = prices[material] || 0;
  const pesoKg = parseNumber(pesoInput.value);

  if (!pesoKg || pesoKg <= 0) {
    alert("Informe um peso válido. Ex.: 1,300");
    return;
  }

  const total = pesoKg * precoKg;

  itens.push({
    id: crypto.randomUUID(),
    material,
    pesoKg,
    precoKg,
    total
  });

  saveItens();
  renderItens();
  updateTotalGeral();

  pesoInput.value = "";
  syncPriceAndTotal();
  pesoInput.focus();
}

function renderItens() {
  itensList.innerHTML = "";

  if (itens.length === 0) {
    itensList.innerHTML = `
      <li class="item">
        <div class="meta">
          <div class="title">Nenhum item lançado</div>
        </div>
      </li>
    `;
    return;
  }

  itens.forEach(item => {
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

      <button class="icon-btn" title="Remover item">🗑</button>
    `;

    li.querySelector("button").onclick = () => {
      itens = itens.filter(i => i.id !== item.id);
      saveItens();
      renderItens();
      updateTotalGeral();
    };

    itensList.appendChild(li);
  });
}

function updateTotalGeral() {
  const total = itens.reduce((s, i) => s + i.total, 0);
  totalGeralEl.textContent = formatBRL(total);
}

function syncPriceAndTotal() {
  const material = materialSelect.value;
  const precoKg = prices[material] || 0;
  const pesoKg = parseNumber(pesoInput.value) || 0;

  precoKgEl.textContent = formatBRL(precoKg);
  totalItemEl.textContent = formatBRL(pesoKg * precoKg);
}

// ---------- WhatsApp ----------
function abrirConfirmacaoFechamento() {
  if (itens.length === 0) {
    alert("Não há itens para fechar o dia.");
    return;
  }

  const total = itens.reduce((s, i) => s + i.total, 0);

  if (!confirm(`Fechar o dia?\n\nItens: ${itens.length}\nTotal: ${formatBRL(total)}`)) {
    return;
  }

  enviarResumoWhatsApp();
}

function enviarResumoWhatsApp() {
  const data = new Date().toLocaleDateString("pt-BR");
  const hora = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  let msg = `♻️ *MP RECICLAGEM*\n`;
  msg += `📅 *Resumo do dia:* ${data}\n\n`;
  msg += `────────────────\n📦 *ITENS COMPRADOS*\n\n`;

  itens.forEach(i => {
    msg += `• *${i.material}*\n`;
    msg += `  Peso: ${formatKg(i.pesoKg)}\n`;
    msg += `  Valor/kg: ${formatBRL(i.precoKg)}\n`;
    msg += `  Total: ${formatBRL(i.total)}\n\n`;
  });

  const totalGeral = itens.reduce((s, i) => s + i.total, 0);

  msg += `────────────────\n💰 *TOTAL DO DIA:* ${formatBRL(totalGeral)}\n`;
  msg += `🕒 Fechamento: ${hora}`;

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
    "_blank"
  );

  itens = [];
  saveItens();
  renderItens();
  updateTotalGeral();
}

// ---------- Utilidades ----------
function formatBRL(v) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
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

// ---------- Materiais ----------
function renderMaterialOptions(keep) {
  const atual = keep ? materialSelect.value : null;
  materialSelect.innerHTML = "";

  Object.keys(prices).forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    materialSelect.appendChild(opt);
  });

  if (atual && prices[atual] !== undefined) {
    materialSelect.value = atual;
  }
}

function renderPricesEditor() {
  pricesForm.innerHTML = "";
  Object.entries(prices).forEach(([m, v]) => {
    pricesForm.innerHTML += `
      <label class="field">
        <span>${m}</span>
        <input type="number" step="0.01" value="${v}" data-material="${m}">
      </label>
    `;
  });
}

// ---------- Storage (à prova de erro) ----------
function saveItens() {
  localStorage.setItem(STORAGE_KEY_ITENS, JSON.stringify(itens));
}

function loadItens() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_ITENS)) || [];
}

function savePrices() {
  localStorage.setItem(STORAGE_KEY_PRECOS, JSON.stringify(prices));
}

function loadPrices() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_PRECOS));

    if (!saved || Object.keys(saved).length === 0) {
      localStorage.setItem(
        STORAGE_KEY_PRECOS,
        JSON.stringify(defaultPrices)
      );
      return { ...defaultPrices };
    }

    return saved;
  } catch {
    localStorage.setItem(
      STORAGE_KEY_PRECOS,
      JSON.stringify(defaultPrices)
    );
    return { ...defaultPrices };
  }
}
