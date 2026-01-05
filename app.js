// MP Reciclagem • Calculadora de compra
// Mobile-first, com lista de itens e total geral. Preços persistem no LocalStorage.

const STORAGE_KEY = "mp_reciclagem_precos_v1";

const defaultPrices = {
  "Plástico": 2.50,
  "Ferro": 0.70,
  "Alumínio": 6.50,
  "Papelão": 0.35,
  "Antimônio": 0.00, // ajuste conforme tabela real
  "Cobre": 28.00,
  "Latão": 18.00,
  "Inox": 4.50,
  "Vidro": 0.10
};

let prices = loadPrices();
let itens = [];

const materialSelect = document.getElementById("materialSelect");
const pesoInput = document.getElementById("pesoInput");
const precoKgEl = document.getElementById("precoKg");
const totalItemEl = document.getElementById("totalItem");
const itensList = document.getElementById("itensList");
const totalGeralEl = document.getElementById("totalGeral");

const formItem = document.getElementById("formItem");
const btnClearInputs = document.getElementById("btnClearInputs");
const btnClearAll = document.getElementById("btnClearAll");

// dialog
const pricesDialog = document.getElementById("pricesDialog");
const btnOpenPrices = document.getElementById("btnOpenPrices");
const pricesForm = document.getElementById("pricesForm");
const btnSavePrices = document.getElementById("btnSavePrices");
const btnResetPrices = document.getElementById("btnResetPrices");

init();

function init() {
  renderMaterialOptions();
  syncPriceAndTotal();

  materialSelect.addEventListener("change", syncPriceAndTotal);
pesoInput.addEventListener("input", syncPriceAndTotal);

  formItem.addEventListener("submit", (e) => {
    e.preventDefault();
    addItem();
  });

  btnClearInputs.addEventListener("click", () => {
    pesoInput.value = "";
    syncPriceAndTotal();
    pesoInput.focus();
  });

  btnClearAll.addEventListener("click", () => {
    itens = [];
    renderItens();
    updateTotalGeral();
  });

  // Modal de preços
  btnOpenPrices.addEventListener("click", () => {
    renderPricesEditor();
    pricesDialog.showModal();
  });

  btnSavePrices.addEventListener("click", () => {
    const newPrices = {};
    const inputs = pricesForm.querySelectorAll("input[data-material]");
    inputs.forEach((inp) => {
      const material = inp.dataset.material;
      const val = parseNumber(inp.value);
      newPrices[material] = isFinite(val) && val >= 0 ? val : 0;
    });

    prices = newPrices;
    savePrices(prices);
    renderMaterialOptions(true);
    syncPriceAndTotal();
    pricesDialog.close();
  });

  btnResetPrices.addEventListener("click", () => {
    prices = { ...defaultPrices };
    savePrices(prices);
    renderPricesEditor();
    renderMaterialOptions(true);
    syncPriceAndTotal();
  });
}

function renderMaterialOptions(keepSelection = false) {
  const current = keepSelection ? materialSelect.value : null;

  materialSelect.innerHTML = "";
  Object.keys(prices).forEach((material) => {
    const opt = document.createElement("option");
    opt.value = material;
    opt.textContent = material;
    materialSelect.appendChild(opt);
  });

  if (keepSelection && current && prices[current] !== undefined) {
    materialSelect.value = current;
  }
}

function syncPriceAndTotal() {
  const material = materialSelect.value;
  const priceKg = prices[material] ?? 0;

  const pesoKg = parseNumber(pesoInput.value);
  const total = (isFinite(pesoKg) ? pesoKg : 0) * priceKg;

  precoKgEl.textContent = formatBRL(priceKg);
  totalItemEl.textContent = formatBRL(total);
}

function addItem() {
  const material = materialSelect.value;
  const priceKg = prices[material] ?? 0;
  const pesoKg = parseNumber(pesoInput.value);
if (!isFinite(pesoKg) || pesoKg <= 0) {
    alert("Informe um peso válido maior que zero.");
    pesoInput.focus();
    return;
  }

  const total = pesoKg * priceKg;
  itens.unshift({
    id: crypto.randomUUID(),
    material,
pesoKg,
    priceKg,
    total
  });

  renderItens();
  updateTotalGeral();

  pesoInput.value = "";
  syncPriceAndTotal();
  pesoInput.focus();
}

function renderItens() {
  itensList.innerHTML = "";

  if (itens.length === 0) {
    const empty = document.createElement("li");
    empty.className = "item";
    empty.innerHTML = `
      <div class="meta">
        <div class="title">Nenhum item adicionado</div>
        <div class="sub">Adicione materiais para calcular o total do atendimento.</div>
      </div>
      <div></div>
    `;
    itensList.appendChild(empty);
    return;
  }

  itens.forEach((it) => {
    const li = document.createElement("li");
    li.className = "item";

    // Desktop mostra colunas; mobile mostra resumo
    li.innerHTML = `
      <div class="meta">
        <div class="title">${escapeHtml(it.material)}</div>
        <div class="sub">
          <span>Peso: <b>${formatPesoDetalhado(it.pesoKg)}</b></span>
          <span>Preço/kg: <b>${formatBRL(it.priceKg)}</b></span>
          <span>Total: <b>${formatBRL(it.total)}</b></span>
        </div>
      </div>

      <div class="right desktop-only">${formatPesoDetalhado(it.pesoKg)}</div>
      <div class="right desktop-only">${formatBRL(it.priceKg)}</div>
      <div class="right desktop-only"><b>${formatBRL(it.total)}</b></div>

      <button class="icon-btn" type="button" aria-label="Remover">🗑</button>
    `;

    // Ajuste para desktop: inserir colunas extras via CSS (desktop-only)
    // Em mobile, as colunas extras não aparecem (por grid 1fr auto), então mantemos só meta+botão.
    // Para desktop, o CSS redefine as colunas e as divs desktop-only entram como células.
    const removeBtn = li.querySelector("button");
    removeBtn.addEventListener("click", () => {
      itens = itens.filter(x => x.id !== it.id);
      renderItens();
      updateTotalGeral();
    });

    // Em mobile, esconder as divs desktop-only:
    li.querySelectorAll(".desktop-only").forEach(el => {
      el.style.display = "none";
    });

    // Em desktop, o CSS esconde .sub e mostra as colunas — então reexibimos via media query usando JS:
    // (solução simples: ao redimensionar, re-renderiza)
    itensList.appendChild(li);
  });

  // Re-render ao mudar para desktop
  window.onresize = () => {
    const isDesktop = window.matchMedia("(min-width: 900px)").matches;
    itensList.querySelectorAll(".desktop-only").forEach(el => {
      el.style.display = isDesktop ? "block" : "none";
    });
  };
  window.onresize();
}

function updateTotalGeral() {
  const total = itens.reduce((acc, it) => acc + it.total, 0);
  totalGeralEl.textContent = formatBRL(total);
}


function renderPricesEditor() {
  pricesForm.innerHTML = "";
  Object.entries(prices).forEach(([material, price]) => {
    const wrap = document.createElement("label");
    wrap.className = "field";
    wrap.innerHTML = `
      <span>${escapeHtml(material)}</span>
      <input data-material="${escapeHtml(material)}" type="number" step="0.01" min="0" value="${price}" />
    `;
    pricesForm.appendChild(wrap);
  });
}

// Helpers
function formatBRL(value) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatKg(value) {
  return (value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " kg";
}

function formatPesoDetalhado(pesoKg) {
  const kgText = formatKg(pesoKg);
  if (!isFinite(pesoKg) || pesoKg <= 0) return kgText;

  // Quebra em kg + gramas (3 casas decimais) para leitura rápida
  let kgInt = Math.floor(pesoKg);
  let gramas = Math.round((pesoKg - kgInt) * 1000);

  // Ajuste de arredondamento (ex.: 1,9995 -> 2,000)
  if (gramas === 1000) {
    kgInt += 1;
    gramas = 0;
  }

  // Exibe também em gramas quando for menos que 1 kg
  if (kgInt === 0) {
    return `${kgText} (${gramas} g)`;
  }

  return `${kgText} (${kgInt} kg ${gramas} g)`;
}

function parseNumber(raw) {
  if (raw === null || raw === undefined) return NaN;

  // Aceita formatos pt-BR e en-US:
  // - "1,300" => 1.300  (1 kg e 300 g)
  // - "0,250" => 0.250  (250 g)
  // - "1.300" => 1.300  (ponto como decimal)
  // - "1 300,50" => 1300.50
  const s0 = String(raw).trim().replace(/\s+/g, "");
  if (!s0) return NaN;

  // Se tem vírgula, assume vírgula como decimal e remove pontos (milhar)
  if (s0.includes(",")) {
    const s = s0.replace(/\./g, "").replace(",", ".");
    return Number(s);
  }

  // Se não tem vírgula, assume ponto como decimal (não remove pontos)
  const s = s0.replace(/,/g, "");
  return Number(s);
}

function savePrices(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}
function loadPrices() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return { ...defaultPrices };
    const parsed = JSON.parse(s);
    // garante que seja um objeto básico
    if (!parsed || typeof parsed !== "object") return { ...defaultPrices };
    return parsed;
  } catch {
    return { ...defaultPrices };
  }
}
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
