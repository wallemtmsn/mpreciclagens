/* =====================================================
   MP RECICLAGEM - CALCULADORA DE COMPRA
   - Compras separadas por atendimento
   - Peso digitado como na balança (1,300 = 1kg 300g)
   - Persistência em localStorage
   - Envio automático para WhatsApp fixo
   - Histórico de compras com detalhes
===================================================== */

const WHATSAPP_NUMBER = "5522998303157";
const WHATSAPP_SUPORTE = "5522998303157";
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
const btnSuporte = document.getElementById("btnSuporte");

const materialSelect = document.getElementById("materialSelect");
const pesoInput = document.getElementById("pesoInput");
const precoKgEl = document.getElementById("precoKg");
const totalItemEl = document.getElementById("totalItem");
const itensList = document.getElementById("itensList");
const totalGeralEl = document.getElementById("totalGeral");
const totalDiaEl = document.getElementById("totalDia");
const contadorComprasEl = document.getElementById("contadorCompras");
const comprasList = document.getElementById("comprasList");

const formItem = document.getElementById("formItem");
const btnAddItem = document.getElementById("btnAddItem");
const btnClearInputs = document.getElementById("btnClearInputs");
const btnClearAll = document.getElementById("btnClearAll");

const btnNovaCompra = document.getElementById("btnNovaCompra");
const btnFinalizarCompra = document.getElementById("btnFinalizarCompra");
const btnFecharDia = document.getElementById("btnFecharDia");

const pricesDialog = document.getElementById("pricesDialog");
const btnOpenPrices = document.getElementById("btnOpenPrices");
const pricesForm = document.getElementById("pricesForm");
const btnSavePrices = document.getElementById("btnSavePrices");
const btnResetPrices = document.getElementById("btnResetPrices");

const detalhesDialog = document.getElementById("detalhesDialog");
const detalhesTitulo = document.getElementById("detalhesTitulo");
const detalhesConteudo = document.getElementById("detalhesConteudo");

// ---------- Inicialização ----------
init();

function init() {
  renderMaterialOptions();
  renderItens();
  renderComprasDia();
  updateTotais();
  syncPriceAndTotal();
  atualizarEstadoUI();

  // Event listeners
  materialSelect.addEventListener("change", syncPriceAndTotal);
  pesoInput.addEventListener("input", syncPriceAndTotal);
  btnSuporte.addEventListener("click", abrirSuporteWhatsApp)
  
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
    if (!confirm("Cancelar a compra atual? Todos os itens serão perdidos.")) return;
    compraAtiva = null;
    saveCompraAtiva();
    renderItens();
    updateTotais();
    atualizarEstadoUI();
  });

  // Event listeners para botões principais
  btnNovaCompra.addEventListener("click", novaCompra);
  btnFinalizarCompra.addEventListener("click", finalizarCompra);
  btnFecharDia.addEventListener("click", fecharDiaWhatsApp);

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
// ---------- FUNÇÃO DE SUPORTE ----------
function abrirSuporteWhatsApp() {
  const mensagem = `Olá! Preciso de suporte com o sistema MP Reciclagem.`;
  const url = `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
}

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

function renderComprasDia() {
  comprasList.innerHTML = "";
  
  if (comprasDia.length === 0) {
    comprasList.innerHTML = `
      <li class="item">
        <div class="meta">
          <div class="title">Nenhuma compra finalizada</div>
          <div class="item-info">As compras finalizadas aparecerão aqui</div>
        </div>
      </li>
    `;
    contadorComprasEl.textContent = "0 compras";
    return;
  }
  
  contadorComprasEl.textContent = `${comprasDia.length} compra${comprasDia.length !== 1 ? 's' : ''}`;
  
  // Ordena por ID (mais recente primeiro)
  const comprasOrdenadas = [...comprasDia].sort((a, b) => {
    return parseInt(b.idCompra) - parseInt(a.idCompra);
  });
  
  comprasOrdenadas.forEach((compra, idx) => {
    const li = document.createElement("li");
    li.className = "item";
    li.style.cursor = "pointer";
    
    // Conta quantos itens de cada material
    const resumoMateriais = {};
    compra.itens.forEach(item => {
      resumoMateriais[item.material] = (resumoMateriais[item.material] || 0) + 1;
    });
    
    const resumoTexto = Object.entries(resumoMateriais)
      .map(([mat, qtd]) => `${qtd}× ${mat}`)
      .join(", ");
    
    li.innerHTML = `
      <div class="meta">
        <div class="title">Compra #${compra.idCompra}</div>
        <div class="item-info">
          <div><b>Total:</b> ${formatBRL(compra.totalCompra || 0)}</div>
          <div><b>Itens:</b> ${compra.itens.length} (${resumoTexto})</div>
          <div><small>Clique para ver detalhes</small></div>
        </div>
      </div>
      <button class="icon-btn btn-remover-compra" data-index="${idx}" aria-label="Remover compra">🗑</button>
    `;
    
    // Clique para ver detalhes
    li.querySelector(".meta").addEventListener("click", () => {
      mostrarDetalhesCompra(compra);
    });
    
    // Botão para remover compra
    li.querySelector(".btn-remover-compra").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Remover a compra #${compra.idCompra}?`)) {
        comprasDia.splice(idx, 1);
        saveComprasDia();
        renderComprasDia();
        updateTotais();
      }
    });
    
    comprasList.appendChild(li);
  });
}

function mostrarDetalhesCompra(compra) {
  detalhesTitulo.textContent = `Compra #${compra.idCompra} - ${formatBRL(compra.totalCompra || 0)}`;
  
  let html = `
    <div class="detalhes-header">
      <div class="detalhes-info">
        <div><strong>ID:</strong> ${compra.idCompra}</div>
        <div><strong>Total:</strong> ${formatBRL(compra.totalCompra || 0)}</div>
        <div><strong>Quantidade de itens:</strong> ${compra.itens.length}</div>
      </div>
    </div>
    
    <div class="detalhes-itens">
      <h4>Itens da compra:</h4>
  `;
  
  if (compra.itens.length === 0) {
    html += `<p class="detalhes-vazio">Nenhum item nesta compra.</p>`;
  } else {
    html += `<ul class="list-detalhes">`;
    
    compra.itens.forEach((item, idx) => {
      html += `
        <li class="item-detalhe">
          <div class="detalhe-meta">
            <div class="detalhe-title">${item.material}</div>
            <div class="detalhe-info">
              <div><b>Peso:</b> ${formatKg(item.pesoKg)}</div>
              <div><b>Preço/kg:</b> ${formatBRL(item.precoKg)}</div>
              <div><b>Subtotal:</b> ${formatBRL(item.total)}</div>
            </div>
          </div>
        </li>
      `;
    });
    
    html += `</ul>`;
  }
  
  html += `</div>`;
  detalhesConteudo.innerHTML = html;
  detalhesDialog.showModal();
}

// ---------- CONTROLE DE ESTADO UI ----------
function atualizarEstadoUI() {
  const temCompraAtiva = !!compraAtiva;

  btnNovaCompra.disabled = temCompraAtiva;
  btnFinalizarCompra.disabled = !temCompraAtiva || compraAtiva.itens.length === 0;
  
  // Material sempre visível
  materialSelect.disabled = false;

  // Peso e ações só com compra ativa
  pesoInput.disabled = !temCompraAtiva;
  btnAddItem.disabled = !temCompraAtiva;
  btnClearInputs.disabled = !temCompraAtiva;
  
  // Mostra/oculta seção de compras finalizadas
  const comprasSection = document.getElementById("comprasFinalizadasSection");
  comprasSection.style.display = comprasDia.length === 0 ? "none" : "block";
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
  
  // Feedback visual
  showToast(`📋 Compra #${seq} iniciada`, "info");
  materialSelect.focus();
}

// Na função finalizarCompra():
function finalizarCompra() {
  if (!compraAtiva || compraAtiva.itens.length === 0) return;

  compraAtiva.totalCompra = compraAtiva.itens.reduce((s, i) => s + i.total, 0);
  compraAtiva.dataFinalizacao = new Date().toISOString();
  comprasDia.push(compraAtiva);

  saveComprasDia();
  
  const idCompra = compraAtiva.idCompra;
  const totalCompra = compraAtiva.totalCompra;
  
  compraAtiva = null;
  saveCompraAtiva();

  renderItens();
  renderComprasDia();
  updateTotais();
  atualizarEstadoUI();
  
  // Feedback
  showToast(`✅ Compra #${idCompra} finalizada: ${formatBRL(totalCompra)}`, "sucesso");
}

// Na função fecharDiaWhatsApp():
function fecharDiaWhatsApp() {
  if (comprasDia.length === 0) {
    // Toast de erro se não houver compras
    showToast("⚠️ Nenhuma compra finalizada no dia.", "erro");
    return;
  }
  
  // ... resto do código ...
  
  // No final, após limpar:
  showToast("📤 Relatório enviado para WhatsApp!", "sucesso");
}

// Na função finalizarCompra():
function finalizarCompra() {
  if (!compraAtiva || compraAtiva.itens.length === 0) return;

  compraAtiva.totalCompra = compraAtiva.itens.reduce((s, i) => s + i.total, 0);
  compraAtiva.dataFinalizacao = new Date().toISOString();
  comprasDia.push(compraAtiva);

  saveComprasDia();
  
  const idCompra = compraAtiva.idCompra;
  const totalCompra = compraAtiva.totalCompra;
  
  compraAtiva = null;
  saveCompraAtiva();

  renderItens();
  renderComprasDia();
  updateTotais();
  atualizarEstadoUI();
  
  // Feedback
  showToast(`✅ Compra #${idCompra} finalizada: ${formatBRL(totalCompra)}`, "sucesso");
}

// Na função fecharDiaWhatsApp():
function fecharDiaWhatsApp() {
  if (comprasDia.length === 0) {
    // Toast de erro se não houver compras
    showToast("⚠️ Nenhuma compra finalizada no dia.", "erro");
    return;
  }
  
  // ... resto do código ...
  
  // No final, após limpar:
  showToast("📤 Relatório enviado para WhatsApp!", "sucesso");
}

function finalizarCompra() {
  if (!compraAtiva || compraAtiva.itens.length === 0) return;

  compraAtiva.totalCompra = compraAtiva.itens.reduce((s, i) => s + i.total, 0);
  compraAtiva.dataFinalizacao = new Date().toISOString();
  comprasDia.push(compraAtiva);

  saveComprasDia();
  
  const idCompra = compraAtiva.idCompra;
  const totalCompra = compraAtiva.totalCompra;
  
  compraAtiva = null;
  saveCompraAtiva();

  renderItens();
  renderComprasDia();
  updateTotais();
  atualizarEstadoUI();
  
  // Feedback
  showToast(`Compra #${idCompra} finalizada: ${formatBRL(totalCompra)}`);
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

  // Calcula total antes de adicionar
  const totalItem = pesoKg * precoKg;

  compraAtiva.itens.push({
    material,
    pesoKg,
    precoKg,
    total: totalItem
  });

  saveCompraAtiva();
  renderItens();
  updateTotais();
  atualizarEstadoUI();

  // FEEDBACK VISUAL - TOAST
  showToast(`✅ ${material} adicionado: ${formatKg(pesoKg)} = ${formatBRL(totalItem)}`);

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
          <div class="item-info">Inicie uma nova compra para começar</div>
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
      <button class="icon-btn" aria-label="Remover item">🗑</button>
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
  totalDiaEl.textContent = formatBRL(totalDia);
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
    msg += `*Compra #${c.idCompra}*\n`;
    msg += `• Itens: ${c.itens.length}\n`;
    
    // Resumo por material
    const resumo = {};
    c.itens.forEach(item => {
      resumo[item.material] = (resumo[item.material] || 0) + 1;
    });
    
    Object.entries(resumo).forEach(([mat, qtd]) => {
      msg += `  - ${qtd}x ${mat}\n`;
    });
    
    msg += `• Total: ${formatBRL(c.totalCompra)}\n\n`;
  });

  const totalDia = comprasDia.reduce((s, c) => s + c.totalCompra, 0);
  msg += `────────────────\n💰 *TOTAL DO DIA:* ${formatBRL(totalDia)}\n`;
  msg += `📊 *Total de compras:* ${comprasDia.length}`;

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
    "_blank"
  );

  // Limpa após enviar
  comprasDia = [];
  localStorage.removeItem(STORAGE_KEY_COMPRAS_DIA);
  localStorage.removeItem(STORAGE_KEY_SEQ_DIA);
  
  renderComprasDia();
  updateTotais();
  atualizarEstadoUI();
  
  showToast("Dia fechado e enviado para WhatsApp!");
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

function showToast(mensagem, tipo = "sucesso") {
  // Cria toast se não existir
  let toast = document.getElementById("toast");
  
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  
  // Define cores baseadas no tipo
  let bgColor, textColor;
  switch(tipo) {
    case "sucesso":
      bgColor = "var(--primary)"; // Verde
      textColor = "white";
      break;
    case "erro":
      bgColor = "var(--danger)"; // Vermelho
      textColor = "white";
      break;
    case "info":
      bgColor = "rgba(59, 130, 246, 0.9)"; // Azul
      textColor = "white";
      break;
    default:
      bgColor = "var(--primary)";
      textColor = "white";
  }
  
  // Aplica estilos
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: ${textColor};
    padding: 12px 20px;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    z-index: 1000;
    opacity: 0;
    transform: translateX(100px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
    word-break: break-word;
    border-left: 4px solid rgba(255,255,255,0.3);
  `;
  
  toast.textContent = mensagem;
  
  // Anima entrada
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  }, 10);
  
  // Remove após 3 segundos
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100px)";
    
    // Remove completamente após animação
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
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