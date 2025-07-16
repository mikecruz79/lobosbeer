// scripts/logic.js - Modern "Clean & Focused" Redesign

// --- Variáveis Globais ---
let dadosCliente = {};
let itensCarrinho = [];
let configLoja = {};
let produtosCatalogo = [];

// --- Seleção de Elementos do DOM ---
const catalogoContainer = document.getElementById("catalogo");
const formContainer = document.getElementById("formContainer");
const cartContainer = document.getElementById("cartContainer");
const stickyNav = document.getElementById("sticky-nav");
const storeInfoContainer = document.querySelector(".store-info-container");
const startOrderBtn = document.getElementById("startOrderBtn");
const backToTopBtn = document.getElementById("backToTopBtn");

// --- Funções de Validação (Definidas no topo) ---
function validateField(el, errEl, valid, msg) { if (valid) { el.classList.remove('input-error'); if (errEl) errEl.style.display = 'none'; return true; } else { el.classList.add('input-error'); if (errEl) { errEl.style.display = 'block'; errEl.textContent = msg; } return false; } }
function validateFullName(el, errEl) { const parts = el.value.trim().split(' '); return validateField(el, errEl, parts.length >= 2 && parts.every(p => p.length > 0), 'Digite nome e sobrenome.'); }
function validateWhatsapp(el, errEl) { const num = el.value.trim().replace(/\D/g, ''); el.value = num; return validateField(el, errEl, num.length >= 11, 'Deve conter 11 dígitos (DDD + Número).'); }
function validateEmail(el, errEl) { if (el.value.trim() === '') return validateField(el, errEl, false, 'E-mail é obrigatório.'); return validateField(el, errEl, /^[\S@]+@[\S@]+\.[\S@]+$/.test(el.value.trim()), 'Digite um e-mail válido.'); }
function validateChange(el, errEl) { const num = parseFloat(el.value.trim()); return validateField(el, errEl, el.value.trim() === '' || (!isNaN(num) && num >= 0), 'Informe um valor numérico.'); }

// --- Funções de Inicialização e Renderização ---

window.addEventListener('DOMContentLoaded', async () => {
    await loadPageData();
    criarFormulario();
    setupImageModal();
    setupScrollListeners();
    setupButtonListeners();
});

async function loadPageData() {
    if (!catalogoContainer) return;
    catalogoContainer.innerHTML = '<div class="loader"></div>';
    try {
        const [productsRes, configRes] = await Promise.all([fetch(`/produtos?_=${Date.now()}`), fetch('/config')]);
        if (!productsRes.ok || !configRes.ok) throw new Error('Erro ao buscar dados do servidor.');
        
        produtosCatalogo = await productsRes.json();
        configLoja = await configRes.json();

        updateStoreInfo();
        showInfo();
        setupStickyNav();
        
        // Adiciona a classe 'visible' para iniciar a animação de fade-in do CSS
        document.querySelectorAll('.fade-in').forEach(el => {
            // Força um reflow para garantir que a transição aconteça
            el.offsetHeight; 
            el.classList.add('visible');
        });

        document.getElementById('searchInput').addEventListener('input', (e) => showInfo(e.target.value));

    } catch (error) {
        catalogoContainer.innerHTML = `<p>Erro ao carregar o site: ${error.message}</p>`;
    }
}

function updateStoreInfo() {
    document.title = configLoja.nomeloja || 'Cardápio Digital';
    document.getElementById('nome-loja').textContent = configLoja.nomeloja;
    document.querySelector('#endereco-loja span').textContent = configLoja.enderecoloja;
    document.querySelector('#horario-funcionamento span').textContent = configLoja.horariofuncionamento;
    document.getElementById('logo-img').src = configLoja.logourl || 'https://placehold.co/100x100';
    document.getElementById('capa-img').src = configLoja.capaurl || 'https://placehold.co/800x250';
}

function showInfo(searchTerm = '') {
    const term = searchTerm.toLowerCase();
    const produtosFiltrados = produtosCatalogo.filter(p => p.ativo === true && p.nome.toLowerCase().includes(term));

    if (produtosFiltrados.length === 0) {
        catalogoContainer.innerHTML = `<p class="empty-catalog-message">Nenhum produto encontrado para "${searchTerm}".</p>`;
        return;
    }

    const produtosAgrupados = produtosFiltrados.reduce((acc, produto) => {
        const categoria = produto.categoria || 'Outros';
        if (!acc[categoria]) acc[categoria] = [];
        acc[categoria].push(produto);
        return acc;
    }, {});

    let orderedCategories = configLoja.ordem_categorias ? JSON.parse(configLoja.ordem_categorias) : [];
    const allCategories = Object.keys(produtosAgrupados);
    orderedCategories = orderedCategories.filter(cat => allCategories.includes(cat));
    allCategories.forEach(cat => { if (!orderedCategories.includes(cat)) orderedCategories.push(cat); });

    catalogoContainer.innerHTML = '';
    orderedCategories.forEach(categoria => {
        const categoryId = `category-title-${categoria.replace(/\s+/g, '-')}`;
        const secao = document.createElement('div');
        secao.className = 'category-section';
        const swiperContainerId = `swiper-container-${categoria.replace(/\s+/g, '-')}`;
        secao.innerHTML = `<h2 class="category-title" id="${categoryId}">${categoria}</h2><div id="${swiperContainerId}" class="swiper-container"><div class="swiper-wrapper"></div><div class="swiper-button-next"></div><div class="swiper-button-prev"></div></div>`;
        catalogoContainer.appendChild(secao);

        const swiperWrapper = secao.querySelector('.swiper-wrapper');
        produtosAgrupados[categoria].forEach(p => {
            const card = document.createElement('div');
            card.className = 'swiper-slide'; // A classe produto-item é adicionada no wrapper interno
            card.innerHTML = `<div class="produto-item"><img src="${p.imagem_url || 'https://placehold.co/150x140'}" alt="${p.nome}" class="produto-imagem"><h3>${p.nome}</h3><p>R$ ${parseFloat(p.preco).toFixed(2)}</p><button class="add-to-cart-btn" data-product-id="${p.id}">Adicionar</button></div>`;
            swiperWrapper.appendChild(card);
            card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => adicionarAoCarrinho(p, e.target));
            card.querySelector('.produto-imagem').addEventListener('click', (e) => openImageModal(e.target.src));
        });

        new Swiper(`#${swiperContainerId}`, {
            effect: 'slide', slidesPerView: 'auto', spaceBetween: 16, grabCursor: true,
            navigation: { nextEl: `#${swiperContainerId} .swiper-button-next`, prevEl: `#${swiperContainerId} .swiper-button-prev` },
            breakpoints: { 600: { slidesPerView: 3, spaceBetween: 20 }, 768: { slidesPerView: 4, spaceBetween: 24 } }
        });
    });
}

// --- Funções de Interação com o Usuário ---

function setupButtonListeners() {
    if (startOrderBtn) {
        startOrderBtn.addEventListener('click', () => {
            catalogoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

function setupScrollListeners() {
    window.addEventListener('scroll', () => {
        // Lógica para a barra de navegação fixa
        if (storeInfoContainer && window.scrollY > storeInfoContainer.offsetTop) {
            stickyNav.classList.add('visible');
        } else {
            stickyNav.classList.remove('visible');
        }

        // Lógica para o botão de voltar ao topo
        if (backToTopBtn) {
            if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
                backToTopBtn.style.display = "flex";
            } else {
                backToTopBtn.style.display = "none";
            }
        }
    });
}

function setupStickyNav() {
    const categories = Array.from(document.querySelectorAll('.category-title'));
    if (categories.length === 0) return;

    const linksContainer = stickyNav.querySelector('.nav-links-container');
    linksContainer.innerHTML = categories.map(cat => `<a href="#${cat.id}">${cat.textContent}</a>`).join('');

    linksContainer.querySelectorAll('a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetElement = document.querySelector(this.getAttribute('href'));
            if(targetElement) {
                const offsetTop = targetElement.offsetTop - stickyNav.offsetHeight;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function setupImageModal() {
    const modal = document.getElementById("imageModal");
    if (!modal) return;
    const modalImg = document.getElementById("modalImage");
    const span = document.getElementsByClassName("close-image-modal")[0];

    window.openImageModal = (src) => {
        modal.style.display = "block";
        modalImg.src = src;
    }
    span.onclick = () => modal.style.display = "none";
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, 3000);
}

function adicionarAoCarrinho(produto, botao) {
    const existente = itensCarrinho.find(item => item.id === produto.id);
    if (existente) existente.quantidade++; else itensCarrinho.push({ ...produto, quantidade: 1 });
    if (botao) {
        botao.innerHTML = '<i class="fas fa-check"></i>';
        botao.classList.add('added');
        setTimeout(() => { botao.innerHTML = 'Adicionar'; botao.classList.remove('added'); }, 1500);
    }
    showToast(`✅ "${produto.nome}" foi adicionado!`);
    const cartIcon = document.getElementById('cartIcon');
    if(cartIcon) { cartIcon.classList.add('shake'); setTimeout(() => cartIcon.classList.remove('shake'), 500); }
    ativarCarrinho();
}

function removerDoCarrinho(productId) {
    const itemIndex = itensCarrinho.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        const item = itensCarrinho[itemIndex];
        item.quantidade--;
        if (item.quantidade === 0) itensCarrinho.splice(itemIndex, 1);
        showToast(`"${item.nome}" foi removido.`);
        ativarCarrinho();
    }
}

function ativarCarrinho() {
    if (!cartContainer) return;
    const total = itensCarrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
    const itemCount = itensCarrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const cartItemCountEl = document.getElementById('cartItemCount');
    if (cartItemCountEl) { cartItemCountEl.textContent = itemCount; cartItemCountEl.style.display = itemCount > 0 ? 'flex' : 'none'; }
    const itensHtml = itensCarrinho.map(item => `<li><span class="item-info">${item.nome} x${item.quantidade} - R$ ${(item.preco * item.quantidade).toFixed(2)}</span><button class="remove-item-btn" data-product-id="${item.id}" title="Remover item">❌</button></li>`).join('');
    cartContainer.innerHTML = `<h2><i class="fas fa-shopping-cart"></i> Meu Carrinho</h2>${itensCarrinho.length > 0 ? `<ul>${itensHtml}</ul>` : '<p>Seu carrinho está vazio.</p>'}<p class="total-price">Total: R$ ${total.toFixed(2)}</p>${itensCarrinho.length > 0 ? '<button id="btnFinalizarPedido"><i class="fas fa-money-check-alt"></i> Finalizar Pedido</button>' : ''}`;
    
    if (itensCarrinho.length > 0) {
        cartContainer.style.display = 'block';
    } else {
        cartContainer.style.display = 'none';
    }

    document.querySelectorAll('.remove-item-btn').forEach(btn => btn.addEventListener('click', (e) => removerDoCarrinho(e.currentTarget.dataset.productId)));
    const finalizarBtn = document.getElementById('btnFinalizarPedido');
    if (finalizarBtn) finalizarBtn.addEventListener('click', exibirFormulario);
}

function criarFormulario() {
    if (!formContainer) return;
    formContainer.innerHTML = `<h2><i class="fas fa-user-shield"></i> Seus Dados</h2><form id="orderForm"><div id="formErrorFeedback" class="form-error-feedback"></div><div class="form-group"><label for="nameInput"><i class="fas fa-user"></i> Nome completo:</label><input type="text" id="nameInput" required maxlength="40"><p class="error-message-field" id="nameError"></p></div><div class="form-group"><label for="whatsappInput"><i class="fab fa-whatsapp"></i> WhatsApp:</label><input type="text" id="whatsappInput" required inputmode="numeric" pattern="[0-9]*" minlength="11" maxlength="13"><p class="error-message-field" id="whatsappError"></p></div><div class="form-group"><label for="emailInput"><i class="fas fa-at"></i> E-mail:</label><input type="email" id="emailInput" required><p class="error-message-field" id="emailError"></p></div><div class="form-group"><label for="deliveryTypeSelect"><i class="fas fa-truck"></i> Tipo de entrega:</label><select id="deliveryTypeSelect" required><option value="">Selecione...</option><option value="Retirada">Retirada</option><option value="Tele-entrega">Tele-entrega</option></select><p class="error-message-field" id="deliveryTypeError"></p></div><div id="addressField" class="form-group" style="display:none;"><label for="addressInput"><i class="fas fa-map-marker-alt"></i> Endereço:</label><input type="text" id="addressInput"><p class="error-message-field" id="addressError"></p></div><div class="form-group"><label for="paymentMethodSelect"><i class="fas fa-credit-card"></i> Forma de Pagamento:</label><select id="paymentMethodSelect" required><option value="">Selecione...</option><option value="Cartão de Crédito">Cartão de Crédito</option><option value="Cartão de Débito">Cartão de Débito</option><option value="Pix">Pix</option><option value="Dinheiro">Dinheiro</option></select><p class="error-message-field" id="paymentMethodError"></p></div><div id="changeField" class="form-group" style="display:none;"><label for="changeInput"><i class="fas fa-money-bill-wave"></i> Troco para:</label><input type="number" id="changeInput" step="0.01" placeholder="Ex: 50.00"><p class="error-message-field" id="changeError"></p></div><button type="button" id="continueBtn"><i class="fas fa-paper-plane"></i> Enviar Pedido</button></form><div id="avisoFinal" style="display:none;">Seu pedido será enviado para o WhatsApp.</div>`;
    formContainer.style.display = 'none';
}

function exibirFormulario() {
    if (itensCarrinho.length === 0) {
        showToast("Seu carrinho está vazio!");
        return;
    }
    catalogoContainer.style.display = 'none';
    startOrderBtn.style.display = 'none';
    cartContainer.style.display = 'none';
    formContainer.style.display = 'block';
    
    const deliveryTypeSelect = document.getElementById('deliveryTypeSelect');
    const addressField = document.getElementById('addressField');
    const paymentMethodSelect = document.getElementById('paymentMethodSelect');
    deliveryTypeSelect.onchange = () => { addressField.style.display = deliveryTypeSelect.value === 'Tele-entrega' ? 'block' : 'none'; };
    paymentMethodSelect.onchange = () => { document.getElementById('changeField').style.display = paymentMethodSelect.value === 'Dinheiro' ? 'block' : 'none'; };
    document.getElementById('continueBtn').onclick = () => { if (validateForm()) window.open(`https://wa.me/${configLoja.whatsappnumber}?text=${encodeURIComponent(gerarMensagemWhatsApp())}`, '_blank'); };
}

function validateForm() {
    const formErrorFeedback = document.getElementById('formErrorFeedback');
    const allValid = validateFullName(document.getElementById('nameInput'), document.getElementById('nameError')) &&
        validateWhatsapp(document.getElementById('whatsappInput'), document.getElementById('whatsappError')) &&
        validateEmail(document.getElementById('emailInput'), document.getElementById('emailError')) &&
        validateField(document.getElementById('deliveryTypeSelect'), document.getElementById('deliveryTypeError'), document.getElementById('deliveryTypeSelect').value !== '', 'Selecione o tipo de entrega.') &&
        (document.getElementById('deliveryTypeSelect').value !== 'Tele-entrega' || validateField(document.getElementById('addressInput'), document.getElementById('addressError'), document.getElementById('addressInput').value.trim() !== '', 'Endereço é obrigatório.')) &&
        validateField(document.getElementById('paymentMethodSelect'), document.getElementById('paymentMethodError'), document.getElementById('paymentMethodSelect').value !== '', 'Selecione a forma de pagamento.') &&
        (document.getElementById('paymentMethodSelect').value !== 'Dinheiro' || validateChange(document.getElementById('changeInput'), document.getElementById('changeError')));
    if (allValid) {
        formErrorFeedback.style.display = 'none';
        dadosCliente = { nomeCompleto: document.getElementById('nameInput').value.trim(), whatsapp: document.getElementById('whatsappInput').value.trim(), email: document.getElementById('emailInput').value.trim(), tipoEntrega: document.getElementById('deliveryTypeSelect').value, endereco: document.getElementById('addressInput').value.trim(), formaPagamento: document.getElementById('paymentMethodSelect').value, trocoPara: document.getElementById('changeInput').value.trim() ? parseFloat(document.getElementById('changeInput').value) : null };
    } else {
        formErrorFeedback.textContent = 'Por favor, corrija os campos destacados.';
        formErrorFeedback.style.display = 'block';
    }
    return allValid;
}

function gerarMensagemWhatsApp() {
    let msg = `Olá, meu nome é ${dadosCliente.nomeCompleto}.\r\nQuero: ${dadosCliente.tipoEntrega}.\r\n`;
    if (dadosCliente.tipoEntrega === 'Tele-entrega' && dadosCliente.endereco) msg += `Endereço: ${dadosCliente.endereco}.\r\n`;
    msg += `Forma de pagamento: ${dadosCliente.formaPagamento}.\r\n`;
    if (dadosCliente.formaPagamento === 'Dinheiro' && dadosCliente.trocoPara !== null) msg += `Troco para: R$ ${dadosCliente.trocoPara.toFixed(2)}.\r\n`;
    msg += `\r\n*Itens:*\r\n`;
    let total = 0;
    itensCarrinho.forEach(item => { const sub = item.preco * item.quantidade; total += sub; msg += `- ${item.nome} x${item.quantidade}: R$ ${sub.toFixed(2)}\r\n`; });
    msg += `\r\n*Total:* R$ ${total.toFixed(2)}\r\n`;
    if (dadosCliente.tipoEntrega === 'Tele-entrega') msg += `\r\nQuanto que vai custar a minha entrega?`;
    return msg;
}
