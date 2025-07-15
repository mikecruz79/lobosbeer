// scripts/logic.js

// --- Variáveis Globais ---
let dadosCliente = {};
let itensCarrinho = [];
let configLoja = {};
let produtosCatalogo = [];

// --- Seleção de Elementos do DOM ---
const catalogoContainer = document.getElementById("catalogo");
const formContainer = document.getElementById("formContainer");
const cartContainer = document.getElementById("cartContainer");

// --- Funções de Validação (Definidas no topo para garantir acesso global) ---

function validateField(inputElement, errorElement, isValid, errorMessage) {
    if (isValid) {
        inputElement.classList.remove('input-error');
        if (errorElement) errorElement.style.display = 'none';
        return true;
    } else {
        inputElement.classList.add('input-error');
        if (errorElement) {
            errorElement.style.display = 'block';
            errorElement.textContent = errorMessage;
        }
        return false;
    }
}

function validateFullName(inputElement, errorElement) {
    const fullName = inputElement.value.trim();
    const parts = fullName.split(' ');
    const isValid = parts.length >= 2 && parts.every(part => part.length > 0);
    return validateField(inputElement, errorElement, isValid, 'Por favor, digite seu nome completo.');
}

function validateWhatsapp(inputElement, errorElement) {
    const whatsapp = inputElement.value.trim().replace(/\D/g, '');
    inputElement.value = whatsapp;
    return validateField(inputElement, errorElement, whatsapp.length >= 11, 'Deve conter 11 dígitos (DDD + Número).');
}

function validateEmail(inputElement, errorElement) {
    const email = inputElement.value.trim();
    if (email === '') return validateField(inputElement, errorElement, false, 'E-mail é obrigatório.');
    const emailRegex = /^[\S@]+@[\S@]+\.[\S@]+$/;
    return validateField(inputElement, errorElement, emailRegex.test(email), 'Digite um e-mail válido.');
}

function validateChange(inputElement, errorElement) {
    const change = inputElement.value.trim();
    if (change === '') return validateField(inputElement, errorElement, true, '');
    const numericChange = parseFloat(change);
    return validateField(inputElement, errorElement, !isNaN(numericChange) && numericChange >= 0, 'Informe um valor numérico.');
}

// --- Funções de Inicialização e Renderização ---

window.addEventListener('DOMContentLoaded', async () => {
    await loadPageData();
    criarFormulario();
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
        showInfo(produtosCatalogo);
        animateIn(catalogoContainer);
    } catch (error) {
        catalogoContainer.innerHTML = `<p>Erro ao carregar o site: ${error.message}</p>`;
    }
}

function updateStoreInfo() {
    document.getElementById('nome-loja').textContent = configLoja.nomeloja;
    document.getElementById('endereco-loja').textContent = configLoja.enderecoloja;
    document.getElementById('horario-funcionamento').textContent = configLoja.horariofuncionamento;
    document.getElementById('logo-img').src = configLoja.logourl || 'https://placehold.co/90x90';
    document.getElementById('capa-img').src = configLoja.capaurl || 'https://placehold.co/800x280';
}

function showInfo(produtos) {
    const produtosAtivos = produtos ? produtos.filter(p => p.ativo === true) : [];
    if (produtosAtivos.length === 0) {
        catalogoContainer.innerHTML = '<h2>Catálogo</h2><p class="empty-catalog-message">Nenhum produto encontrado.</p>';
        return;
    }

    const produtosAgrupados = produtosAtivos.reduce((acc, produto) => {
        const categoria = produto.categoria || 'Outros';
        if (!acc[categoria]) acc[categoria] = [];
        acc[categoria].push(produto);
        return acc;
    }, {});

    let orderedCategories = configLoja.ordem_categorias ? JSON.parse(configLoja.ordem_categorias) : [];
    const allCategories = Object.keys(produtosAgrupados);
    allCategories.forEach(cat => { if (!orderedCategories.includes(cat)) orderedCategories.push(cat); });
    orderedCategories = orderedCategories.filter(cat => allCategories.includes(cat));

    catalogoContainer.innerHTML = '';
    orderedCategories.forEach(categoria => {
        const secao = document.createElement('div');
        secao.className = 'category-section';
        const swiperContainerId = `swiper-container-${categoria.replace(/\s+/g, '-')}`;
        secao.innerHTML = `
          <h2 class="category-title">${categoria}</h2>
          <div id="${swiperContainerId}" class="swiper-container"><div class="swiper-wrapper"></div><div class="swiper-button-next"></div><div class="swiper-button-prev"></div></div>`;
        catalogoContainer.appendChild(secao);

        const swiperWrapper = secao.querySelector('.swiper-wrapper');
        produtosAgrupados[categoria].forEach(p => {
            const card = document.createElement('div');
            card.className = 'swiper-slide produto-item';
            card.innerHTML = `
                <img src="${p.imagem_url || 'https://placehold.co/150x100'}" alt="${p.nome}" class="produto-imagem">
                <h3>${p.nome}</h3><p>R$ ${parseFloat(p.preco).toFixed(2)}</p>
                <button class="add-to-cart-btn" data-product-id="${p.id}">Adicionar</button>`;
            swiperWrapper.appendChild(card);
            card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => adicionarAoCarrinho(p, e.target));
        });

        new Swiper(`#${swiperContainerId}`, {
            effect: 'coverflow', grabCursor: true, centeredSlides: true, slidesPerView: 'auto',
            coverflowEffect: { rotate: 50, stretch: 0, depth: 100, modifier: 1, slideShadows: true },
            navigation: { nextEl: `#${swiperContainerId} .swiper-button-next`, prevEl: `#${swiperContainerId} .swiper-button-prev` },
        });
    });
}

// --- Funções de Interação com o Usuário (Carrinho, Formulário, Toast) ---

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animação de entrada
    setTimeout(() => toast.classList.add('show'), 100);

    // Animação de saída
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000); // O toast some após 3 segundos
}

function adicionarAoCarrinho(produto, botao) {
    const existente = itensCarrinho.find(item => item.id === produto.id);
    if (existente) {
        existente.quantidade++;
    } else {
        itensCarrinho.push({ ...produto, quantidade: 1 });
    }

    if (botao) {
        botao.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
        botao.classList.add('added');
        setTimeout(() => {
            botao.innerHTML = 'Adicionar';
            botao.classList.remove('added');
        }, 1500);
    }
    
    showToast(`✅ "${produto.nome}" foi adicionado ao carrinho!`);
    
    const cartIcon = document.getElementById('cartIcon');
    if(cartIcon) {
        cartIcon.classList.add('shake');
        setTimeout(() => cartIcon.classList.remove('shake'), 500);
    }
    ativarCarrinho();
}

function removerDoCarrinho(productId) {
    const itemIndex = itensCarrinho.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        const item = itensCarrinho[itemIndex];
        item.quantidade--;
        if (item.quantidade === 0) {
            itensCarrinho.splice(itemIndex, 1);
        }
        showToast(`"${item.nome}" foi removido do carrinho.`);
        ativarCarrinho();
    }
}

function ativarCarrinho() {
    if (!cartContainer) return;
    const total = itensCarrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
    const itemCount = itensCarrinho.reduce((acc, item) => acc + item.quantidade, 0);
    
    const cartItemCountEl = document.getElementById('cartItemCount');
    if (cartItemCountEl) {
        cartItemCountEl.textContent = itemCount;
        cartItemCountEl.style.display = itemCount > 0 ? 'block' : 'none';
    }

    const itensHtml = itensCarrinho.map(item => `
        <li>
            <span class="item-info">${item.nome} x${item.quantidade} - R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
            <button class="remove-item-btn" data-product-id="${item.id}" title="Remover item">❌</button>
        </li>`).join('');

    cartContainer.innerHTML = `
        <h2><i class="fas fa-shopping-cart"></i> Meu Carrinho</h2>
        ${itensCarrinho.length > 0 ? `<ul>${itensHtml}</ul>` : '<p>Seu carrinho está vazio.</p>'}
        <p>Total: R$ ${total.toFixed(2)}</p>
        ${itensCarrinho.length > 0 ? '<button id="btnFinalizarPedido"><i class="fas fa-money-check-alt"></i> Finalizar Pedido</button>' : ''}`;

    cartContainer.style.display = 'block';
    animateIn(cartContainer);

    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => removerDoCarrinho(e.target.dataset.productId));
    });

    const finalizarBtn = document.getElementById('btnFinalizarPedido');
    if (finalizarBtn) finalizarBtn.addEventListener('click', exibirFormulario);
}

function criarFormulario() {
    if (!formContainer) return;
    formContainer.innerHTML = `
      <h2><i class="fas fa-user-shield"></i> Seus Dados</h2>
      <form id="orderForm">
        <div id="formErrorFeedback" class="form-error-feedback"></div>
        <div class="form-group"><label for="nameInput"><i class="fas fa-user"></i> Nome completo:</label><input type="text" id="nameInput" required maxlength="40"><p class="error-message-field" id="nameError"></p></div>
        <div class="form-group"><label for="whatsappInput"><i class="fab fa-whatsapp"></i> WhatsApp:</label><input type="text" id="whatsappInput" required inputmode="numeric" pattern="[0-9]*" minlength="11" maxlength="13"><p class="error-message-field" id="whatsappError"></p></div>
        <div class="form-group"><label for="emailInput"><i class="fas fa-at"></i> E-mail:</label><input type="email" id="emailInput" required><p class="error-message-field" id="emailError"></p></div>
        <div class="form-group"><label for="deliveryTypeSelect"><i class="fas fa-truck"></i> Tipo de entrega:</label><select id="deliveryTypeSelect" required><option value="">Selecione...</option><option value="Retirada">Retirada</option><option value="Tele-entrega">Tele-entrega</option></select><p class="error-message-field" id="deliveryTypeError"></p></div>
        <div id="addressField" class="form-group" style="display:none;"><label for="addressInput"><i class="fas fa-map-marker-alt"></i> Endereço:</label><input type="text" id="addressInput"><p class="error-message-field" id="addressError"></p></div>
        <div class="form-group"><label for="paymentMethodSelect"><i class="fas fa-credit-card"></i> Forma de Pagamento:</label><select id="paymentMethodSelect" required><option value="">Selecione...</option><option value="Cartão de Crédito">Cartão de Crédito</option><option value="Cartão de Débito">Cartão de Débito</option><option value="Pix">Pix</option><option value="Dinheiro">Dinheiro</option></select><p class="error-message-field" id="paymentMethodError"></p></div>
        <div id="changeField" class="form-group" style="display:none;"><label for="changeInput"><i class="fas fa-money-bill-wave"></i> Troco para quanto? (Opcional):</label><input type="number" id="changeInput" step="0.01" min="0"><p class="error-message-field" id="changeError"></p></div>
        <button type="button" id="continueBtn">Enviar Pedido <i class="fas fa-paper-plane"></i></button>
      </form>`;
    formContainer.style.display = 'none';
}

function exibirFormulario() {
    catalogoContainer.style.display = 'none';
    cartContainer.style.display = 'none';
    formContainer.style.display = 'block';
    animateIn(formContainer);

    const deliveryTypeSelect = document.getElementById('deliveryTypeSelect');
    const addressField = document.getElementById('addressField');
    const paymentMethodSelect = document.getElementById('paymentMethodSelect');
    const changeField = document.getElementById('changeField');
    
    deliveryTypeSelect.onchange = () => { addressField.style.display = deliveryTypeSelect.value === 'Tele-entrega' ? 'block' : 'none'; };
    paymentMethodSelect.onchange = () => { changeField.style.display = paymentMethodSelect.value === 'Dinheiro' ? 'block' : 'none'; };
    document.getElementById('continueBtn').onclick = () => { if (validateForm()) window.open(`https://wa.me/${configLoja.whatsappnumber}?text=${encodeURIComponent(gerarMensagemWhatsApp())}`, '_blank'); };
}

function validateForm() {
    const nameInput = document.getElementById('nameInput');
    const whatsappInput = document.getElementById('whatsappInput');
    const emailInput = document.getElementById('emailInput');
    const deliveryTypeSelect = document.getElementById('deliveryTypeSelect');
    const addressInput = document.getElementById('addressInput');
    const paymentMethodSelect = document.getElementById('paymentMethodSelect');
    const changeInput = document.getElementById('changeInput');
    const formErrorFeedback = document.getElementById('formErrorFeedback');

    const allValid = 
        validateFullName(nameInput, document.getElementById('nameError')) &&
        validateWhatsapp(whatsappInput, document.getElementById('whatsappError')) &&
        validateEmail(emailInput, document.getElementById('emailError')) &&
        validateField(deliveryTypeSelect, document.getElementById('deliveryTypeError'), deliveryTypeSelect.value !== '', 'Selecione o tipo de entrega.') &&
        (deliveryTypeSelect.value !== 'Tele-entrega' || validateField(addressInput, document.getElementById('addressError'), addressInput.value.trim() !== '', 'Endereço é obrigatório.')) &&
        validateField(paymentMethodSelect, document.getElementById('paymentMethodError'), paymentMethodSelect.value !== '', 'Selecione a forma de pagamento.') &&
        (paymentMethodSelect.value !== 'Dinheiro' || validateChange(changeInput, document.getElementById('changeError')));

    if (allValid) {
        formErrorFeedback.style.display = 'none';
        dadosCliente = {
            nomeCompleto: nameInput.value.trim(),
            whatsapp: whatsappInput.value.trim(),
            email: emailInput.value.trim(),
            tipoEntrega: deliveryTypeSelect.value,
            endereco: addressInput.value.trim(),
            formaPagamento: paymentMethodSelect.value,
            trocoPara: changeInput.value.trim() ? parseFloat(changeInput.value) : null
        };
    } else {
        formErrorFeedback.textContent = 'Por favor, corrija os campos destacados.';
        formErrorFeedback.style.display = 'block';
    }
    return allValid;
}

function gerarMensagemWhatsApp() {
    let msg = `Olá, meu nome é ${dadosCliente.nomeCompleto}.\r\n`;
    msg += `Quero: ${dadosCliente.tipoEntrega}.\r\n`;
    if (dadosCliente.tipoEntrega === 'Tele-entrega' && dadosCliente.endereco) msg += `Endereço: ${dadosCliente.endereco}.\r\n`;
    msg += `Forma de pagamento: ${dadosCliente.formaPagamento}.\r\n`;
    if (dadosCliente.formaPagamento === 'Dinheiro' && dadosCliente.trocoPara !== null) msg += `Troco para: R$ ${dadosCliente.trocoPara.toFixed(2)}.\r\n`;
    msg += `\r\n*Itens:*\r\n`;
    let total = 0;
    itensCarrinho.forEach(item => {
        const sub = item.preco * item.quantidade;
        total += sub;
        msg += `- ${item.nome} x${item.quantidade}: R$ ${sub.toFixed(2)}\r\n`;
    });
    msg += `\r\n*Total:* R$ ${total.toFixed(2)}\r\n`;
    if (dadosCliente.tipoEntrega === 'Tele-entrega') msg += `\r\nQuanto que vai custar a minha entrega?`;
    return msg;
}

function animateIn(element) {
    if (element) {
        element.offsetHeight; 
        element.classList.add('fade-in');
    }
}