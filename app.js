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

// Materiais padrão que NÃO podem ser removidos
const MATERIAIS_PADRAO = ["Plástico", "Ferro", "Alumínio", "Papelão", "Antimônio", "Cobre", "Latão", "Inox"];

// Preços padrão (R$/kg)
const defaultPrices = {
  "Plástico": 2.50,
  "Ferro": 0.70,
  "Alumínio": 6.50,
  "Papelão": 0.35,
  "Antimônio": 2.00,
  "Cobre": 28.00,
  "Latão": 18.00,
  "Inox": 4.50
};

// ---------- Estado ----------
let prices = {};
let compraAtiva = null;
let comprasDia = [];

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
const detalhesDialog = document.getElementById("detalhesDialog");
const detalhesTitulo = document.getElementById("detalhesTitulo");
const detalhesConteudo = document.getElementById("detalhesConteudo");
const materiaisDialog = document.getElementById("materiaisDialog");
const btnGerenciarMateriais = document.getElementById("btnGerenciarMateriais");
const materiaisList = document.getElementById("materiaisList");
const novoMaterialNome = document.getElementById("novoMaterialNome");
const novoMaterialPreco = document.getElementById("novoMaterialPreco");
const btnAddMaterial = document.getElementById("btnAddMaterial");
const btnFecharMateriais = document.getElementById("btnFecharMateriais");

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log("Inicializando MP Reciclagem...");
  
  // Carrega dados
  loadAllData();
  
  // Verifica elementos DOM
  if (!materialSelect || !pesoInput || !precoKgEl) {
    console.error("Elementos DOM críticos não encontrados!");
    setTimeout(init, 500);
    return;
  }
  
  // Renderiza interface
  renderMaterialOptions();
  renderItens();
  renderComprasDia();
  updateTotais();
  syncPriceAndTotal();
  atualizarEstadoUI();

  // Configura eventos
  setupEventListeners();
  
  console.log("Sistema inicializado com sucesso!");
  console.log("Materiais carregados:", Object.keys(prices).length);
}

function loadAllData() {
  try {
    // Carrega preços
    prices = loadPrices();
    console.log("Preços carregados:", prices);
    
    // Carrega compra ativa
    const compraAtivaData = localStorage.getItem(STORAGE_KEY_COMPRA_ATIVA);
    if (compraAtivaData) {
      compraAtiva = JSON.parse(compraAtivaData);
    }
    
    // Carrega compras do dia
    const comprasDiaData = localStorage.getItem(STORAGE_KEY_COMPRAS_DIA);
    if (comprasDiaData) {
      comprasDia = JSON.parse(comprasDiaData) || [];
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    prices = { ...defaultPrices };
    compraAtiva = null;
    comprasDia = [];
    savePrices();
  }
}

function setupEventListeners() {
  // Event listeners básicos
  if (materialSelect) materialSelect.addEventListener("change", syncPriceAndTotal);
  if (pesoInput) {
    pesoInput.addEventListener("input", syncPriceAndTotal);
    pesoInput.addEventListener("touchstart", syncPriceAndTotal);
  }
  
  if (btnSuporte) {
    btnSuporte.addEventListener("click", abrirSuporteWhatsApp);
    btnSuporte.addEventListener("touchstart", (e) => {
      e.preventDefault();
      abrirSuporteWhatsApp();
    });
  }
  
  // Foco no peso quando material é selecionado
  if (materialSelect) {
    materialSelect.addEventListener("change", () => {
      if (compraAtiva && pesoInput) {
        setTimeout(() => pesoInput.focus(), 100);
      }
    });
  }

  // Formulário de item
  if (formItem) {
    formItem.addEventListener("submit", e => {
      e.preventDefault();
      addItem();
    });
  }

  // Botões de limpeza
  if (btnClearInputs) {
    btnClearInputs.addEventListener("click", () => {
      if (pesoInput) pesoInput.value = "";
      syncPriceAndTotal();
    });
    btnClearInputs.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (pesoInput) pesoInput.value = "";
      syncPriceAndTotal();
    });
  }

  // Cancelar compra
  if (btnClearAll) {
    btnClearAll.addEventListener("click", cancelarCompra);
    btnClearAll.addEventListener("touchstart", (e) => {
      e.preventDefault();
      cancelarCompra();
    });
  }

  // Botões principais
  if (btnNovaCompra) {
    btnNovaCompra.addEventListener("click", novaCompra);
    btnNovaCompra.addEventListener("touchstart", (e) => {
      e.preventDefault();
      novaCompra();
    });
  }
  
  if (btnFinalizarCompra) {
    btnFinalizarCompra.addEventListener("click", finalizarCompra);
    btnFinalizarCompra.addEventListener("touchstart", (e) => {
      e.preventDefault();
      finalizarCompra();
    });
  }
  
  if (btnFecharDia) {
    btnFecharDia.addEventListener("click", fecharDiaWhatsApp);
    btnFecharDia.addEventListener("touchstart", (e) => {
      e.preventDefault();
      fecharDiaWhatsApp();
    });
  }

  // Gerenciamento de materiais
  if (btnGerenciarMateriais) {
    btnGerenciarMateriais.addEventListener("click", () => {
      renderMateriaisList();
      if (materiaisDialog && typeof materiaisDialog.showModal === 'function') {
        materiaisDialog.showModal();
      }
    });
    
    btnGerenciarMateriais.addEventListener("touchstart", (e) => {
      e.preventDefault();
      renderMateriaisList();
      if (materiaisDialog && typeof materiaisDialog.showModal === 'function') {
        materiaisDialog.showModal();
      }
    });
  }
  
  if (btnAddMaterial) {
    btnAddMaterial.addEventListener("click", adicionarNovoMaterial);
    btnAddMaterial.addEventListener("touchstart", (e) => {
      e.preventDefault();
      adicionarNovoMaterial();
    });
  }
  
  if (btnFecharMateriais) {
    btnFecharMateriais.addEventListener("click", () => {
      if (materiaisDialog) materiaisDialog.close();
      // ATUALIZAÇÃO IMEDIATA: Atualiza a lista principal após fechar
      atualizarInterfaceAposEdicao();
    });
    btnFecharMateriais.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (materiaisDialog) materiaisDialog.close();
      // ATUALIZAÇÃO IMEDIATA: Atualiza a lista principal após fechar
      atualizarInterfaceAposEdicao();
    });
  }
  
  // Enter nos campos adiciona material
  if (novoMaterialNome) {
    novoMaterialNome.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        adicionarNovoMaterial();
      }
    });
  }
  
  if (novoMaterialPreco) {
    novoMaterialPreco.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        adicionarNovoMaterial();
      }
    });
  }
}

// ---------- FUNÇÃO DE SUPORTE ----------
function abrirSuporteWhatsApp() {
  const mensagem = `Olá! Preciso de suporte com o sistema MP Reciclagem.`;
  const url = `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
}

// ---------- RENDERIZAÇÃO ----------
function renderMaterialOptions() {
  if (!materialSelect) return;
  
  console.log("Renderizando materiais. Preços disponíveis:", Object.keys(prices));
  
  // Se não houver preços, usa padrão
  if (Object.keys(prices).length === 0) {
    console.warn("Sem preços, usando padrão...");
    prices = { ...defaultPrices };
    savePrices();
  }
  
  const current = materialSelect.value;
  materialSelect.innerHTML = "";

  // Ordena materiais alfabeticamente
  const materiaisOrdenados = Object.keys(prices).sort((a, b) => 
    a.localeCompare(b, 'pt-BR')
  );

  if (materiaisOrdenados.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nenhum material cadastrado";
    option.disabled = true;
    materialSelect.appendChild(option);
    return;
  }

  materiaisOrdenados.forEach(mat => {
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
  
  console.log(`Materiais renderizados: ${materialSelect.options.length} opções`);
}

// ---------- GERENCIAMENTO DE MATERIAIS ----------
function renderMateriaisList() {
  if (!materiaisList) return;
  
  materiaisList.innerHTML = "";
  
  // Ordena materiais alfabeticamente
  const materiaisOrdenados = Object.keys(prices).sort((a, b) => 
    a.localeCompare(b, 'pt-BR')
  );
  
  if (materiaisOrdenados.length === 0) {
    const mensagem = document.createElement("div");
    mensagem.className = "material-item";
    mensagem.style.textAlign = "center";
    mensagem.style.color = "var(--muted)";
    mensagem.style.padding = "20px";
    mensagem.innerHTML = `
      <div class="material-info">
        <div class="material-name">Nenhum material cadastrado</div>
        <div class="material-price">Adicione materiais acima</div>
      </div>
    `;
    materiaisList.appendChild(mensagem);
    return;
  }
  
  materiaisOrdenados.forEach(material => {
    const isPadrao = MATERIAIS_PADRAO.includes(material);
    const precoAtual = prices[material] || 0;
    
    const item = document.createElement("div");
    item.className = "material-item";
    
    item.innerHTML = `
      <div class="material-info">
        <div>
          <span class="material-name">${material}</span>
          ${isPadrao ? '<span class="material-default">Padrão</span>' : ''}
        </div>
        <div class="material-price-edit">
          <span>Preço/kg:</span>
          <input 
            type="number" 
            step="0.01" 
            min="0" 
            value="${precoAtual.toFixed(2).replace('.', ',')}"
            data-material="${material}"
            placeholder="R$/kg"
            class="price-input"
          />
          <button class="btn-save-price" data-material="${material}">
            Salvar
          </button>
        </div>
      </div>
      <div class="material-actions">
        <button 
          class="btn-remove-material"
          data-material="${material}"
          ${isPadrao ? 'title="Material padrão - Clique para remover"' : ''}
        >
          Remover
        </button>
      </div>
    `;
    
    // Event listener para salvar preço
    const btnSalvar = item.querySelector(".btn-save-price");
    const inputPreco = item.querySelector(".price-input");
    
    if (btnSalvar && inputPreco) {
      btnSalvar.addEventListener("click", () => {
        const novoPreco = parseNumber(inputPreco.value);
        if (novoPreco > 0) {
          // Atualiza o preço no objeto global
          prices[material] = novoPreco;
          savePrices();
          
          // Atualiza visualmente no modal
          inputPreco.value = novoPreco.toFixed(2).replace('.', ',');
          btnSalvar.textContent = "✓ Salvo";
          btnSalvar.style.background = "rgba(34,197,94,0.2)";
          
          // ATUALIZAÇÃO IMEDIATA: Atualiza a interface principal
          atualizarInterfaceAposEdicao();
          
          setTimeout(() => {
            btnSalvar.textContent = "Salvar";
            btnSalvar.style.background = "";
          }, 1500);
          
          showToast(`✅ Preço de "${material}" atualizado: ${formatBRL(novoPreco)}/kg`, "sucesso");
        } else {
          showToast("⚠️ Informe um preço válido", "erro");
          inputPreco.focus();
        }
      });
      
      // Salvar com Enter
      inputPreco.addEventListener("keypress", (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          btnSalvar.click();
        }
      });
    }
    
    // Event listener para remover material
    const btnRemover = item.querySelector(".btn-remove-material");
    if (btnRemover) {
      btnRemover.addEventListener("click", () => {
        removerMaterial(material);
      });
      btnRemover.addEventListener("touchstart", (e) => {
        e.preventDefault();
        removerMaterial(material);
      });
    }
    
    materiaisList.appendChild(item);
  });
}

// NOVA FUNÇÃO: Atualiza a interface principal após edição
function atualizarInterfaceAposEdicao() {
  console.log("Atualizando interface após edição...");
  
  // 1. Atualiza a lista de materiais no select principal
  renderMaterialOptions();
  
  // 2. Atualiza o preço exibido se o material selecionado foi editado
  syncPriceAndTotal();
  
  // 3. Atualiza todos os itens na compra ativa (se houver)
  if (compraAtiva && compraAtiva.itens.length > 0) {
    compraAtiva.itens.forEach(item => {
      // Atualiza o preço/kg dos itens existentes
      if (prices[item.material]) {
        item.precoKg = prices[item.material];
        item.total = item.pesoKg * item.precoKg;
      }
    });
    
    // Recalcula o total da compra
    compraAtiva.totalCompra = compraAtiva.itens.reduce((s, i) => s + i.total, 0);
    saveCompraAtiva();
    
    // Re-renderiza os itens
    renderItens();
    updateTotais();
  }
  
  // 4. Atualiza as compras do dia (histórico)
  if (comprasDia.length > 0) {
    comprasDia.forEach(compra => {
      compra.itens.forEach(item => {
        // Atualiza o preço/kg dos itens no histórico
        if (prices[item.material]) {
          item.precoKg = prices[item.material];
          item.total = item.pesoKg * item.precoKg;
        }
      });
      
      // Recalcula o total da compra no histórico
      compra.totalCompra = compra.itens.reduce((s, i) => s + i.total, 0);
    });
    
    saveComprasDia();
    renderComprasDia();
    updateTotais();
  }
  
  console.log("Interface atualizada com sucesso!");
}

function adicionarNovoMaterial() {
  const nome = novoMaterialNome ? novoMaterialNome.value.trim() : "";
  const preco = novoMaterialPreco ? parseNumber(novoMaterialPreco.value) : 0;
  
  // Validações
  if (!nome) {
    showToast("⚠️ Informe o nome do material", "erro");
    if (novoMaterialNome) novoMaterialNome.focus();
    return;
  }
  
  if (nome.length > 30) {
    showToast("⚠️ Nome muito longo (máx. 30 caracteres)", "erro");
    if (novoMaterialNome) novoMaterialNome.focus();
    return;
  }
  
  if (preco === 0 || isNaN(preco)) {
    showToast("⚠️ Informe um preço válido", "erro");
    if (novoMaterialPreco) novoMaterialPreco.focus();
    return;
  }
  
  // Verifica se material já existe
  if (prices[nome]) {
    showToast(`⚠️ O material "${nome}" já existe`, "erro");
    if (novoMaterialNome) novoMaterialNome.focus();
    return;
  }
  
  // Adiciona novo material
  prices[nome] = preco;
  savePrices();
  
  // Atualiza interface
  renderMateriaisList();
  
  // Limpa campos
  if (novoMaterialNome) novoMaterialNome.value = "";
  if (novoMaterialPreco) novoMaterialPreco.value = "";
  
  // Feedback
  showToast(`✅ Material "${nome}" adicionado: ${formatBRL(preco)}/kg`, "sucesso");
  if (novoMaterialNome) novoMaterialNome.focus();
  
  // ATUALIZAÇÃO IMEDIATA: Atualiza a lista principal
  atualizarInterfaceAposEdicao();
}

function removerMaterial(material) {
  // Verifica se o material está sendo usado em compras
  let emUso = false;
  let ondeEstaSendoUsado = "";
  
  // Verifica na compra ativa
  if (compraAtiva && compraAtiva.itens) {
    const itensNaCompraAtiva = compraAtiva.itens.filter(item => item.material === material);
    if (itensNaCompraAtiva.length > 0) {
      emUso = true;
      ondeEstaSendoUsado = `compra ativa #${compraAtiva.idCompra} (${itensNaCompraAtiva.length} itens)`;
    }
  }
  
  // Verifica nas compras do dia
  if (!emUso) {
    const comprasComMaterial = comprasDia.filter(compra => 
      compra.itens && compra.itens.some(item => item.material === material)
    );
    if (comprasComMaterial.length > 0) {
      emUso = true;
      const totalItens = comprasComMaterial.reduce((total, compra) => {
        return total + compra.itens.filter(item => item.material === material).length;
      }, 0);
      ondeEstaSendoUsado = `histórico (${comprasComMaterial.length} compras, ${totalItens} itens)`;
    }
  }
  
  if (emUso) {
    showToast(`⚠️ Não é possível remover "${material}" porque está sendo usado em ${ondeEstaSendoUsado}`, "erro");
    return;
  }
  
  // Verifica se é um material padrão
  const isPadrao = MATERIAIS_PADRAO.includes(material);
  
  if (isPadrao) {
    if (!confirm(`"${material}" é um material padrão.\n\nRemover apenas das configurações atuais?`)) {
      return;
    }
  } else {
    if (!confirm(`Remover o material "${material}"?`)) {
      return;
    }
  }
  
  // Remove do objeto de preços
  delete prices[material];
  savePrices();
  
  // Atualiza interface
  renderMateriaisList();
  
  // Feedback
  showToast(`🗑️ Material "${material}" removido`, "info");
  
  // ATUALIZAÇÃO IMEDIATA: Atualiza a lista principal
  atualizarInterfaceAposEdicao();
}

// ---------- Storage ----------
function loadPrices() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PRECOS);
    
    if (!saved) {
      console.log("Nenhum preço salvo, usando padrão");
      const defaultCopy = { ...defaultPrices };
      savePrices();
      return defaultCopy;
    }
    
    const parsed = JSON.parse(saved);
    
    if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
      console.log("Preços inválidos, usando padrão");
      const defaultCopy = { ...defaultPrices };
      savePrices();
      return defaultCopy;
    }
    
    console.log("Preços carregados do localStorage:", parsed);
    return parsed;
    
  } catch (error) {
    console.error("Erro ao carregar preços:", error);
    const defaultCopy = { ...defaultPrices };
    savePrices();
    return defaultCopy;
  }
}

function savePrices() {
  const paraSalvar = {};
  Object.keys(prices).forEach(key => {
    if (typeof key === 'string' && key.trim() !== '') {
      paraSalvar[key] = prices[key];
    }
  });
  
  localStorage.setItem(STORAGE_KEY_PRECOS, JSON.stringify(paraSalvar));
  console.log("Preços salvos:", paraSalvar);
}

// ... (o resto das funções permanece igual)

// ---------- COMPRAS ----------
function cancelarCompra() {
  if (!compraAtiva) {
    showToast("ℹ️ Nenhuma compra ativa para cancelar", "info");
    return;
  }
  
  if (!confirm("Cancelar a compra atual? Todos os itens serão perdidos.")) return;
  
  const idCompra = compraAtiva.idCompra;
  const numItens = compraAtiva.itens.length;
  const totalCompra = compraAtiva.itens.reduce((s, i) => s + i.total, 0);
  
  const materiais = {};
  compraAtiva.itens.forEach(item => {
    materiais[item.material] = (materiais[item.material] || 0) + 1;
  });
  
  const materiaisTexto = Object.entries(materiais)
    .map(([mat, qtd]) => `${qtd}× ${mat}`)
    .join(", ");
  
  compraAtiva = null;
  saveCompraAtiva();
  renderItens();
  updateTotais();
  atualizarEstadoUI();
  
  if (numItens > 0) {
    showToast(`🗑️ Compra #${idCompra} cancelada\n${numItens} itens (${materiaisTexto})\nTotal: ${formatBRL(totalCompra)}`, "info", 4000);
  } else {
    showToast(`🗑️ Compra #${idCompra} cancelada`, "info");
  }
}

function renderComprasDia() {
  if (!comprasList) return;
  
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
    if (contadorComprasEl) contadorComprasEl.textContent = "0 compras";
    return;
  }
  
  if (contadorComprasEl) {
    contadorComprasEl.textContent = `${comprasDia.length} compra${comprasDia.length !== 1 ? 's' : ''}`;
  }
  
  const comprasOrdenadas = [...comprasDia].sort((a, b) => {
    return parseInt(b.idCompra) - parseInt(a.idCompra);
  });
  
  comprasOrdenadas.forEach((compra, idx) => {
    const li = document.createElement("li");
    li.className = "item";
    li.style.cursor = "pointer";
    
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
    
    const metaElement = li.querySelector(".meta");
    if (metaElement) {
      metaElement.addEventListener("click", () => {
        mostrarDetalhesCompra(compra);
      });
      metaElement.addEventListener("touchstart", (e) => {
        e.preventDefault();
        mostrarDetalhesCompra(compra);
      });
    }
    
    const btnRemover = li.querySelector(".btn-remover-compra");
    if (btnRemover) {
      btnRemover.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Remover a compra #${compra.idCompra}?`)) {
          const compraRemovida = comprasDia[idx];
          const totalCompra = compraRemovida.totalCompra || 0;
          
          comprasDia.splice(idx, 1);
          saveComprasDia();
          renderComprasDia();
          updateTotais();
          
          showToast(`🗑️ Compra #${compra.idCompra} removida do histórico\nTotal: ${formatBRL(totalCompra)}`, "info");
        }
      });
      btnRemover.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (confirm(`Remover a compra #${compra.idCompra}?`)) {
          const compraRemovida = comprasDia[idx];
          const totalCompra = compraRemovida.totalCompra || 0;
          
          comprasDia.splice(idx, 1);
          saveComprasDia();
          renderComprasDia();
          updateTotais();
          
          showToast(`🗑️ Compra #${compra.idCompra} removida do histórico\nTotal: ${formatBRL(totalCompra)}`, "info");
        }
      });
    }
    
    comprasList.appendChild(li);
  });
}

function mostrarDetalhesCompra(compra) {
  if (!detalhesTitulo || !detalhesConteudo) return;
  
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
  if (detalhesDialog && typeof detalhesDialog.showModal === 'function') {
    detalhesDialog.showModal();
  }
}

// ---------- CONTROLE DE ESTADO UI ----------
function atualizarEstadoUI() {
  const temCompraAtiva = !!compraAtiva;

  if (btnNovaCompra) btnNovaCompra.disabled = temCompraAtiva;
  if (btnFinalizarCompra) btnFinalizarCompra.disabled = !temCompraAtiva || (compraAtiva && compraAtiva.itens.length === 0);
  
  if (materialSelect) materialSelect.disabled = false;
  if (pesoInput) pesoInput.disabled = !temCompraAtiva;
  if (btnAddItem) btnAddItem.disabled = !temCompraAtiva;
  if (btnClearInputs) btnClearInputs.disabled = !temCompraAtiva;
  
  const comprasSection = document.getElementById("comprasFinalizadasSection");
  if (comprasSection) {
    comprasSection.style.display = comprasDia.length === 0 ? "none" : "block";
  }
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
  
  showToast(`📋 Compra #${seq} iniciada`, "info");
  if (materialSelect) materialSelect.focus();
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
  
  showToast(`✅ Compra #${idCompra} finalizada: ${formatBRL(totalCompra)}`, "sucesso");
}

// ---------- Itens ----------
function addItem() {
  if (!compraAtiva) return;

  const material = materialSelect ? materialSelect.value : "";
  const precoKg = prices[material] || 0;
  const pesoKg = pesoInput ? parseNumber(pesoInput.value) : 0;

  if (!material || !prices[material]) {
    showToast("⚠️ Material não encontrado. Atualize a lista.", "erro");
    renderMaterialOptions();
    return;
  }

  if (!pesoKg || pesoKg <= 0) {
    alert("Informe um peso válido. Ex.: 1,300");
    return;
  }

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

  showToast(`✅ ${material} adicionado: ${formatKg(pesoKg)} = ${formatBRL(totalItem)}`, "sucesso");

  if (pesoInput) pesoInput.value = "";
  syncPriceAndTotal();
  if (pesoInput) pesoInput.focus();
}

function renderItens() {
  if (!itensList) return;
  
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

    const btnRemover = li.querySelector("button");
    if (btnRemover) {
      btnRemover.onclick = () => {
        const itemRemovido = compraAtiva.itens[idx];
        
        compraAtiva.itens.splice(idx, 1);
        saveCompraAtiva();
        renderItens();
        updateTotais();
        atualizarEstadoUI();
        
        showToast(`🗑️ Item removido: ${itemRemovido.material} (${formatKg(itemRemovido.pesoKg)})`, "info");
      };
      
      btnRemover.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const itemRemovido = compraAtiva.itens[idx];
        
        compraAtiva.itens.splice(idx, 1);
        saveCompraAtiva();
        renderItens();
        updateTotais();
        atualizarEstadoUI();
        
        showToast(`🗑️ Item removido: ${itemRemovido.material} (${formatKg(itemRemovido.pesoKg)})`, "info");
      });
    }

    itensList.appendChild(li);
  });
}

// ---------- Totais ----------
function updateTotais() {
  const totalCompra = compraAtiva
    ? compraAtiva.itens.reduce((s, i) => s + i.total, 0)
    : 0;

  const totalDia = comprasDia.reduce((s, c) => s + (c.totalCompra || 0), 0);

  if (totalGeralEl) totalGeralEl.textContent = formatBRL(totalDia + totalCompra);
  if (totalDiaEl) totalDiaEl.textContent = formatBRL(totalDia);
}

function syncPriceAndTotal() {
  const material = materialSelect ? materialSelect.value : "";
  const precoKg = prices[material] || 0;
  const pesoKg = pesoInput ? parseNumber(pesoInput.value) : 0;

  if (precoKgEl) precoKgEl.textContent = formatBRL(precoKg);
  if (totalItemEl) totalItemEl.textContent = formatBRL(pesoKg * precoKg);
}

// ---------- WhatsApp ----------
function fecharDiaWhatsApp() {
  if (comprasDia.length === 0) {
    showToast("⚠️ Nenhuma compra finalizada no dia.", "erro");
    return;
  }

  const data = new Date().toLocaleDateString("pt-BR");
  let msg = `♻️ *MP RECICLAGEM*\n📅 *Fechamento do dia:* ${data}\n\n`;
  msg += `────────────────\n🧾 *COMPRAS DO DIA*\n\n`;

  comprasDia.forEach((c, index) => {
    msg += `*Compra #${c.idCompra}*\n`;
    msg += `• Itens: ${c.itens.length}\n`;
    
    const resumoPorMaterial = {};
    
    c.itens.forEach(item => {
      if (!resumoPorMaterial[item.material]) {
        resumoPorMaterial[item.material] = {
          quantidade: 0,
          pesoTotal: 0,
          valorTotal: 0
        };
      }
      
      resumoPorMaterial[item.material].quantidade += 1;
      resumoPorMaterial[item.material].pesoTotal += item.pesoKg;
      resumoPorMaterial[item.material].valorTotal += item.total;
    });
    
    Object.entries(resumoPorMaterial).forEach(([material, dados]) => {
      msg += `  - ${material}:\n`;
      msg += `    Quantidade: ${dados.quantidade} item${dados.quantidade !== 1 ? 's' : ''}\n`;
      msg += `    Peso total: ${formatKg(dados.pesoTotal)}\n`;
      msg += `    Valor total: ${formatBRL(dados.valorTotal)}\n`;
    });
    
    msg += `\n`;
    msg += `• *Total da compra:* ${formatBRL(c.totalCompra)}\n\n`;
    
    if (index < comprasDia.length - 1) {
      msg += `────────────────\n\n`;
    }
  });

  const totalDia = comprasDia.reduce((s, c) => s + c.totalCompra, 0);
  const totalItensDia = comprasDia.reduce((s, c) => s + c.itens.length, 0);
  
  const resumoGeralDia = {};
  comprasDia.forEach(compra => {
    compra.itens.forEach(item => {
      if (!resumoGeralDia[item.material]) {
        resumoGeralDia[item.material] = {
          quantidade: 0,
          pesoTotal: 0,
          valorTotal: 0
        };
      }
      
      resumoGeralDia[item.material].quantidade += 1;
      resumoGeralDia[item.material].pesoTotal += item.pesoKg;
      resumoGeralDia[item.material].valorTotal += item.total;
    });
  });
  
  msg += `────────────────\n📊 *RESUMO GERAL DO DIA*\n\n`;
  
  Object.entries(resumoGeralDia).forEach(([material, dados]) => {
    msg += `*${material}:*\n`;
    msg += `  Itens: ${dados.quantidade}\n`;
    msg += `  Peso total: ${formatKg(dados.pesoTotal)}\n`;
    msg += `  Valor total: ${formatBRL(dados.valorTotal)}\n\n`;
  });
  
  msg += `────────────────\n`;
  msg += `💰 *TOTAL DO DIA:* ${formatBRL(totalDia)}\n`;
  msg += `📦 *Total de itens:* ${totalItensDia}\n`;
  msg += `🧾 *Total de compras:* ${comprasDia.length}\n`;
  msg += `⏰ *Horário:* ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
    "_blank"
  );

  comprasDia = [];
  localStorage.removeItem(STORAGE_KEY_COMPRAS_DIA);
  localStorage.removeItem(STORAGE_KEY_SEQ_DIA);
  
  renderComprasDia();
  updateTotais();
  atualizarEstadoUI();
  
  showToast("📤 Relatório detalhado enviado para WhatsApp!", "sucesso");
}

function saveCompraAtiva() {
  localStorage.setItem(STORAGE_KEY_COMPRA_ATIVA, JSON.stringify(compraAtiva));
}

function saveComprasDia() {
  localStorage.setItem(STORAGE_KEY_COMPRAS_DIA, JSON.stringify(comprasDia));
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
  if (!v && v !== 0) return 0;
  
  let str = String(v).trim();
  
  // Remove qualquer letra (como o "l" em "1.0l")
  str = str.replace(/[^\d,.-]/g, '');
  
  // Se tem vírgula E ponto, assume que ponto é separador de milhar
  if (str.includes(',') && str.includes('.')) {
    // Remove pontos (separadores de milhar)
    str = str.replace(/\./g, '');
    // Substitui vírgula por ponto (decimal)
    str = str.replace(',', '.');
  }
  // Se só tem vírgula, assume que é decimal
  else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  // Se só tem ponto, verifica se é decimal ou milhar
  else if (str.includes('.')) {
    // Conta quantos dígitos após o ponto
    const parts = str.split('.');
    if (parts[1].length <= 3) {
      // Até 3 dígitos após o ponto, assume decimal (ex: 1.500)
      // Mantém como está
    } else {
      // Mais de 3 dígitos, assume que ponto é separador de milhar
      str = str.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(str);
  
  // NÃO converter automaticamente gramas para kg
  // O usuário deve digitar corretamente: 0,250 para 250g
  
  return isNaN(num) ? 0 : num;
}

function showToast(mensagem, tipo = "sucesso", duracao = 3000) {
  let toastAntigo = document.getElementById("toast");
  if (toastAntigo) {
    toastAntigo.parentNode.removeChild(toastAntigo);
  }
  
  let bgColor, textColor;
  switch(tipo) {
    case "sucesso":
      bgColor = "var(--primary)";
      textColor = "white";
      break;
    case "erro":
      bgColor = "var(--danger)";
      textColor = "white";
      break;
    case "info":
      bgColor = "rgba(59, 130, 246, 0.9)";
      textColor = "white";
      break;
    default:
      bgColor = "var(--primary)";
      textColor = "white";
  }
  
  let toast = document.createElement("div");
  toast.id = "toast";
  
  if (mensagem.includes('\n')) {
    toast.innerHTML = mensagem.replace(/\n/g, '<br>');
  } else {
    toast.textContent = mensagem;
  }
  
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
    max-width: 350px;
    word-break: break-word;
    line-height: 1.4;
    border-left: 4px solid rgba(255,255,255,0.3);
  `;
  
  if (window.innerWidth <= 768) {
    toast.style.top = "10px";
    toast.style.right = "10px";
    toast.style.left = "10px";
    toast.style.maxWidth = "calc(100% - 20px)";
    toast.style.transform = "translateY(-100px)";
  }
  
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = window.innerWidth <= 768 ? "translateY(0)" : "translateX(0)";
  }, 10);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = window.innerWidth <= 768 ? "translateY(-100px)" : "translateX(100px)";
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duracao);
  
  document.body.appendChild(toast);
}

// ---------- Sequência diária ----------
function getNextSeqDia() {
  const hoje = new Date().toISOString().slice(0, 10);
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SEQ_DIA)) || {};

  if (saved.date !== hoje) {
    saved.date = hoje;
    saved.seq = 1;
  } else {
    saved.seq = (saved.seq || 0) + 1;
  }

  localStorage.setItem(STORAGE_KEY_SEQ_DIA, JSON.stringify(saved));
  return String(saved.seq).padStart(3, "0");
}