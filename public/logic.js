// scripts/logic.js

// Lógica de interação para o Delivery do Daniel (v2)

// Variáveis globais para armazenar dados do cliente e itens do carrinho
let dadosCliente = {};
let itensCarrinho = []; // Carrinho iniciado vazio
let configLoja = {}; // Para armazenar as configurações da loja
let produtosCatalogo = []; // Para armazenar os produtos carregados

// Seleção de elementos do DOM para interagir com a interface
const catalogoContainer = document.getElementById("catalogo");
const formContainer = document.getElementById("formContainer");
const cartContainer = document.getElementById("cartContainer");

// --- Funções de Validação (Colocadas no topo para garantir acesso global) ---

function validateField(inputElement, errorElement, isValid, errorMessage) {
    if (isValid) {
        inputElement.classList.remove('input-error');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
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
    const errorMessage = 'Por favor, digite seu nome completo (nome e sobrenome).';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}

function validateWhatsapp(inputElement, errorElement) {
    const whatsapp = inputElement.value.trim();
    const numericWhatsapp = whatsapp.replace(/\D/g, '');
    inputElement.value = numericWhatsapp;
    const isValid = numericWhatsapp.length >= 11 && numericWhatsapp.length <= 13;
    const errorMessage = 'Deve conter entre 11 e 13 dígitos (somente números).';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}

function validateEmail(inputElement, errorElement) {
    const email = inputElement.value.trim();
    if (email === '') {
        return validateField(inputElement, errorElement, false, 'E-mail é obrigatório.');
    }
    const emailRegex = /^[\S@]+@[\S@]+\.[\S@]+$/;
    const isValid = emailRegex.test(email);
    const errorMessage = 'Digite um endereço de E-mail válido.';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}

function validateChange(inputElement, errorElement) {
    const change = inputElement.value.trim();
    if (change === '') {
        return validateField(inputElement, errorElement, true, '');
    }
    const numericChange = parseFloat(change);
    const isValid = !isNaN(numericChange) && numericChange >= 0;
    const errorMessage = 'Informe um valor numérico positivo para o troco.';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}

// --- Funções Principais da Aplicação ---

window.addEventListener('DOMContentLoaded', async () => {
    await carregarConfiguracoes();
    await carregarCatalogo();
    criarFormulario();
});

function animateIn(element) {
    if (element) {
        element.offsetHeight; 
        element.classList.add('fade-in');
    }
}

function animateOut(element) {
    if (element) {
        element.classList.remove('fade-in');
    }
}

async function carregarConfiguracoes() {
    try {
        const res = await fetch('/config');
        if (!res.ok) {
            throw new Error(`Erro ao buscar configurações: Status ${res.status}`);
        }
        configLoja = await res.json();
        
        document.getElementById('nome-loja').textContent = configLoja.nomeloja;
        document.getElementById('endereco-loja').textContent = configLoja.enderecoloja;
        document.getElementById('horario-funcionamento').textContent = configLoja.horariofuncionamento;
        document.getElementById('logo-img').src = configLoja.logourl;
        document.getElementById('capa-img').src = configLoja.capaurl;

    } catch (error) {
        console.error('Erro ao carregar configurações da loja:', error);
    }
}

async function carregarCatalogo() {
    if (!catalogoContainer) {
        console.error("Elemento #catalogo não encontrado.");
        return;
    }
    catalogoContainer.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`/produtos?_=${Date.now()}`);
        if (!res.ok) {
            throw new Error(`Erro ao buscar catálogo: Status ${res.status}`);
        }
        produtosCatalogo = await res.json();
        console.log('Produtos recebidos do servidor:', produtosCatalogo); // Log de diagnóstico
        showInfo(produtosCatalogo);
    } catch (error) {
        catalogoContainer.innerHTML = `<p>Erro ao carregar catálogo: ${error.message}</p>`;
        console.error("Detalhes do erro:", error);
    }
}

function showInfo(produtos) {
  const produtosAtivos = produtos ? produtos.filter(p => p.ativo === true) : [];

  if (produtosAtivos.length === 0) {
    catalogoContainer.innerHTML = '<h2>Catálogo</h2><p class="empty-catalog-message">Nenhum produto encontrado no momento. Volte em breve!</p>';
    return;
  }

  const produtosAgrupados = produtosAtivos.reduce((acc, produto) => {
    const categoria = produto.categoria || 'Outros';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(produto);
    return acc;
  }, {});

  catalogoContainer.innerHTML = '';

  for (const categoria in produtosAgrupados) {
    const secao = document.createElement('div');
    secao.className = 'category-section';
    
    // Cria um ID único para cada container de swiper para poder inicializá-lo individualmente
    const swiperContainerId = `swiper-container-${categoria.replace(/\s+/g, '-')}`;

    secao.innerHTML = `
      <h2 class="category-title">${categoria}</h2>
      <div id="${swiperContainerId}" class="swiper-container">
        <div class="swiper-wrapper"></div>
        <div class="swiper-button-next"></div>
        <div class="swiper-button-prev"></div>
      </div>
    `;
    catalogoContainer.appendChild(secao);

    const swiperWrapper = secao.querySelector('.swiper-wrapper');
    produtosAgrupados[categoria].forEach(p => {
      const card = document.createElement('div');
      card.className = 'swiper-slide produto-item';
      const imageUrl = p.imagem_url || 'https://placehold.co/150x100/EFEFEF/AAAAAA?text=Sem+Imagem';
      card.innerHTML = `
        <img src="${imageUrl}" alt="${p.nome}" class="produto-imagem">
        <h3>${p.nome}</h3>
        <p>R$ ${parseFloat(p.preco).toFixed(2)}</p>
        <button class="add-to-cart-btn" data-product-id="${p.id}">Adicionar</button>
      `;
      swiperWrapper.appendChild(card);

      card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
        const produtoParaAdicionar = produtosCatalogo.find(prod => prod.id === p.id);
        if (produtoParaAdicionar) {
          adicionarAoCarrinho(produtoParaAdicionar, e.target);
        }
      });
    });

    // Inicializa o Swiper para ESTE container específico
    new Swiper(`#${swiperContainerId}`, {
      effect: 'coverflow',
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 'auto',
      coverflowEffect: {
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
      },
      navigation: {
        nextEl: `#${swiperContainerId} .swiper-button-next`,
        prevEl: `#${swiperContainerId} .swiper-button-prev`,
      },
    });
  }
}

function adicionarAoCarrinho(produto, botao) {
  const existente = itensCarrinho.find(item => item.id === produto.id);

  if (existente) {
    existente.quantidade++;
  } else {
    itensCarrinho.push({ ...produto, quantidade: 1 });
  }

  botao.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
  botao.classList.add('added');
  setTimeout(() => {
      botao.innerHTML = 'Adicionar';
      botao.classList.remove('added');
  }, 1500);

  const cartIcon = document.getElementById('cartIcon');
  if(cartIcon) {
      cartIcon.classList.add('shake');
      setTimeout(() => cartIcon.classList.remove('shake'), 500);
  }

  ativarCarrinho();
}

function criarFormulario() {
    if (!formContainer) return;
    formContainer.innerHTML = `
      <h2><i class="fas fa-user-shield"></i> Seus Dados</h2>
      <form id="orderForm">
        <div id="formErrorFeedback" class="form-error-feedback"></div>
        <div class="form-group">
            <label for="nameInput"><i class="fas fa-user"></i> Nome completo:</label>
            <input type="text" id="nameInput" required maxlength="40">
            <p class="error-message-field" id="nameError"></p>
        </div>
        <div class="form-group">
            <label for="whatsappInput"><i class="fab fa-whatsapp"></i> WhatsApp:</label>
            <input type="text" id="whatsappInput" required inputmode="numeric" pattern="[0-9]*" minlength="11" maxlength="13">
             <p class="error-message-field" id="whatsappError"></p>
        </div>
        <div class="form-group">
             <label for="emailInput"><i class="fas fa-at"></i> E-mail:</label>
             <input type="email" id="emailInput" required>
             <p class="error-message-field" id="emailError"></p>
        </div>
        <div class="form-group">
            <label for="deliveryTypeSelect"><i class="fas fa-truck"></i> Tipo de entrega:</label>
            <select id="deliveryTypeSelect" required>
              <option value="">Selecione...</option>
              <option value="Retirada">Retirada</option>
              <option value="Tele-entrega">Tele-entrega</option>
            </select>
            <p class="error-message-field" id="deliveryTypeError"></p>
        </div>
        <div id="addressField" class="form-group" style="display:none;">
          <label for="addressInput"><i class="fas fa-map-marker-alt"></i> Endereço:</label>
          <input type="text" id="addressInput">
          <p class="error-message-field" id="addressError"></p>
        </div>
        <div class="form-group">
            <label for="paymentMethodSelect"><i class="fas fa-credit-card"></i> Forma de Pagamento:</label>
            <select id="paymentMethodSelect" required>
              <option value="">Selecione...</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
            <p class="error-message-field" id="paymentMethodError"></p>
        </div>
        <div id="changeField" class="form-group" style="display:none;">
            <label for="changeInput"><i class="fas fa-money-bill-wave"></i> Troco para quanto? (Opcional):</label>
            <input type="number" id="changeInput" step="0.01" min="0">
            <p class="error-message-field" id="changeError"></p>
        </div>
        <button type="button" id="continueBtn">Enviar Pedido <i class="fas fa-paper-plane"></i></button>
      </form>
    `;
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
    const continueBtn = document.getElementById('continueBtn');
    const formErrorFeedback = document.getElementById('formErrorFeedback');

    deliveryTypeSelect.onchange = () => {
        addressField.style.display = deliveryTypeSelect.value === 'Tele-entrega' ? 'block' : 'none';
    };

    paymentMethodSelect.onchange = () => {
        changeField.style.display = paymentMethodSelect.value === 'Dinheiro' ? 'block' : 'none';
    };

    continueBtn.onclick = () => {
        const nameInput = document.getElementById('nameInput');
        const whatsappInput = document.getElementById('whatsappInput');
        const emailInput = document.getElementById('emailInput');
        const addressInput = document.getElementById('addressInput');
        const changeInput = document.getElementById('changeInput');

        const isNameValid = validateFullName(nameInput, document.getElementById('nameError'));
        const isWhatsappValid = validateWhatsapp(whatsappInput, document.getElementById('whatsappError'));
        const isEmailValid = validateEmail(emailInput, document.getElementById('emailError'));
        const isDeliveryTypeValid = validateField(deliveryTypeSelect, document.getElementById('deliveryTypeError'), deliveryTypeSelect.value !== '', 'Selecione o tipo de entrega.');
        let isAddressValid = true;
        if (deliveryTypeSelect.value === 'Tele-entrega') {
            isAddressValid = validateField(addressInput, document.getElementById('addressError'), addressInput.value.trim() !== '', 'Endereço é obrigatório para Tele-entrega.');
        }
        const isPaymentMethodValid = validateField(paymentMethodSelect, document.getElementById('paymentMethodError'), paymentMethodSelect.value !== '', 'Selecione a forma de pagamento.');
        let isChangeValid = true;
        if (paymentMethodSelect.value === 'Dinheiro') {
            isChangeValid = validateChange(changeInput, document.getElementById('changeError'));
        }

        if (isNameValid && isWhatsappValid && isEmailValid && isDeliveryTypeValid && isAddressValid && isPaymentMethodValid && isChangeValid) {
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
            
            const msg = gerarMensagemWhatsApp();
            window.open(`https://wa.me/${configLoja.whatsappnumber}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            formErrorFeedback.textContent = 'Por favor, corrija os campos destacados em vermelho.';
            formErrorFeedback.style.display = 'block';
            const orderForm = document.getElementById('orderForm');
            orderForm.classList.remove('form-shake');
            void orderForm.offsetWidth;
            orderForm.classList.add('form-shake');
        }
    };
}

function ativarCarrinho() {
  if (!cartContainer) return;

  const total = itensCarrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const itensHtml = itensCarrinho.map(item => `<li>${item.nome} x${item.quantidade} - R$ ${(item.preco * item.quantidade).toFixed(2)}</li>`).join('');
  
  const itemCount = itensCarrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const cartItemCountEl = document.getElementById('cartItemCount');
  if (cartItemCountEl) {
    cartItemCountEl.textContent = itemCount;
    cartItemCountEl.style.display = itemCount > 0 ? 'block' : 'none';
  }

  cartContainer.innerHTML = `
    <h2><i class="fas fa-shopping-cart"></i> Meu Carrinho</h2>
    ${itensCarrinho.length > 0 ? `<ul>${itensHtml}</ul>` : '<p>Seu carrinho está vazio.</p>'}
    <p>Total: R$ ${total.toFixed(2)}</p>
    ${itensCarrinho.length > 0 ? '<button id="btnFinalizarPedido"><i class="fas fa-money-check-alt"></i> Finalizar Pedido</button>' : ''}
  `;

  cartContainer.style.display = 'block';
  animateIn(cartContainer);

  const finalizarBtn = document.getElementById('btnFinalizarPedido');
  if (finalizarBtn) {
    finalizarBtn.addEventListener('click', exibirFormulario);
  }
}

function gerarMensagemWhatsApp() {
  let msg = `Olá, meu nome é ${dadosCliente.nomeCompleto}.\r\n`;

  msg += `Quero: ${dadosCliente.tipoEntrega}.\r\n`;
  if (dadosCliente.tipoEntrega === 'Tele-entrega' && dadosCliente.endereco) {
    msg += `Endereço: ${dadosCliente.endereco}.\r\n`;
  }

  msg += `Forma de pagamento: ${dadosCliente.formaPagamento}.\r\n`;
  if (dadosCliente.formaPagamento === 'Dinheiro' && dadosCliente.trocoPara !== null) {
      msg += `Troco para: R$ ${dadosCliente.trocoPara.toFixed(2)}.\r\n`;
  }

  msg += `\r\n*Itens:*\r\n`;

  let total = 0;
  itensCarrinho.forEach(item => {
    const sub = item.preco * item.quantidade;
    total += sub;
    msg += `- ${item.nome} x${item.quantidade}: R$ ${sub.toFixed(2)}\r\n`;
  });

  msg += `\r\n*Total:* R$ ${total.toFixed(2)}\r\n`;

  if (dadosCliente.tipoEntrega === 'Tele-entrega') {
      msg += `\r\nQuanto que vai custar a minha entrega?`;
  }

  return msg;
}