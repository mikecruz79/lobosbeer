// scripts/logic.js

// Lógica de interação para o Delivery do Daniel

// Variáveis globais para armazenar dados do cliente e itens do carrinho
let dadosCliente = {};
let itensCarrinho = []; // Carrinho iniciado vazio
let configLoja = {}; // Para armazenar as configurações da loja
let produtosCatalogo = []; // Para armazenar os produtos carregados

// Seleção de elementos do DOM para interagir com a interface
const startOrderBtn = document.getElementById("startOrderBtn");
const catalogoContainer = document.getElementById("catalogo");
const formContainer = document.getElementById("formContainer");
const cartContainer = document.getElementById("cartContainer");

// Elementos do cabeçalho
const capaImg = document.getElementById('capa-img');
const logoImg = document.getElementById('logo-img');
const nomeLojaElem = document.getElementById('nome-loja');
const enderecoLojaElem = document.getElementById('endereco-loja');
const horarioFuncionamentoElem = document.getElementById('horario-funcionamento');


// Adiciona um listener para carregar configurações e catálogo assim que o conteúdo do DOM estiver completamente carregado
window.addEventListener('DOMContentLoaded', async () => {
    await carregarConfiguracoes();
    await carregarCatalogo();
    criarFormulario(); // Pré-cria o formulário, mas o mantém escondido
});

function criarFormulario() {
    if (!formContainer) return;
    formContainer.innerHTML = `
      <h2><i class="fas fa-user-shield"></i> Seus Dados</h2>
      <form id="orderForm">
        <!-- ... (conteúdo do formulário como antes) ... -->
        <button type="button" id="continueBtn">Enviar Pedido <i class="fas fa-paper-plane"></i></button>
      </form>
    `;
    formContainer.style.display = 'none'; // Garante que comece escondido
}



/**
 * Adiciona a classe 'fade-in' para elementos que devem aparecer com animação.
 * @param {HTMLElement} element - O elemento DOM a ser animado.
 */
function animateIn(element) {
    if (element) {
        // Força o reflow para garantir que a transição ocorra
        element.offsetHeight; 
        element.classList.add('fade-in');
    }
}

/**
 * Remove a classe 'fade-in' (e esconde) um elemento, com animação.
 * @param {HTMLElement} element - O elemento DOM a ser escondido.
 */
function animateOut(element) {
    if (element) {
        element.classList.remove('fade-in');
        // Pode-se adicionar um timeout aqui se precisar esconder *depois* da animação
        // Por enquanto, o display: none será instantâneo após a remoção da classe
    }
}

/**
 * Carrega as configurações da loja do backend e atualiza a interface.
 */
async function carregarConfiguracoes() {
    try {
        const res = await fetch('/config');
        if (!res.ok) {
            throw new Error(`Erro ao buscar configurações: Status ${res.status}`);
        }
        configLoja = await res.json(); // Armazena as configurações globalmente
        console.log('Dados de configuração recebidos:', configLoja); // Adicionado para depuração

        // Atualiza os elementos da interface com as configurações
        const nomeLojaElement = document.getElementById('nome-loja');
        console.log('Elemento #nome-loja encontrado?', nomeLojaElement);
        if (nomeLojaElement) {
            nomeLojaElement.textContent = configLoja.nomeloja; // Alterado para usar diretamente a propriedade
            console.log('#nome-loja atualizado para:', nomeLojaElement.textContent);
        }

        const enderecoLojaElement = document.getElementById('endereco-loja');
        console.log('Elemento #endereco-loja encontrado?', enderecoLojaElement);
        if (enderecoLojaElement) {
            enderecoLojaElement.textContent = configLoja.enderecoloja; // Alterado para usar diretamente a propriedade
            console.log('#endereco-loja atualizado para:', enderecoLojaElement.textContent);
        }

        const horarioFuncionamentoElement = document.getElementById('horario-funcionamento');
        console.log('Elemento #horario-funcionamento encontrado?', horarioFuncionamentoElement);
        if (horarioFuncionamentoElement) {
            horarioFuncionamentoElement.textContent = configLoja.horariofuncionamento; // Alterado para usar diretamente a propriedade
            console.log('#horario-funcionamento atualizado para:', horarioFuncionamentoElement.textContent);
        }

        const logoImgElement = document.getElementById('logo-img');
        console.log('Elemento #logo-img encontrado?', logoImgElement);
        if (logoImgElement) {
            logoImgElement.src = configLoja.logourl; // Alterado para usar diretamente a propriedade
            console.log('#logo-img src atualizado para:', logoImgElement.src);
        }

        const capaImgElement = document.getElementById('capa-img');
        console.log('Elemento #capa-img encontrado?', capaImgElement);
        if (capaImgElement) {
            capaImgElement.src = configLoja.capaurl; // Alterado para usar diretamente a propriedade
            console.log('#capa-img src atualizado para:', capaImgElement.src);
        }

    } catch (error) {
        console.error('Erro ao carregar configurações da loja:', error);
        // Pode exibir uma mensagem de erro na interface se necessário
    }
}


/**
 * Carrega produtos do catálogo buscando o JSON do backend,
 * e renderiza os produtos ativos na tela.
 */
async function carregarCatalogo() {
  if (!catalogoContainer) {
    console.error("Elemento #catalogo não encontrado.");
    return;
  }
  catalogoContainer.innerHTML = '<div class="loader"></div>'; // Mostra o spinner
  try {
    const res = await fetch(`/produtos?_=${Date.now()}`);
    if (!res.ok) {
      throw new Error(`Erro ao buscar catálogo: Status ${res.status}`);
    }
    produtosCatalogo = await res.json();
    showInfo(produtosCatalogo);
    catalogoContainer.style.display = 'block';
    animateIn(catalogoContainer);
  } catch (error) {
    catalogoContainer.innerHTML = `<p>Erro ao carregar catálogo: ${error.message}</p>`;
    console.error("Detalhes do erro:", error);
  }
}

function showInfo(produtos) {
  if (!produtos || produtos.length === 0) {
    catalogoContainer.innerHTML = '<h2>Catálogo</h2><p>Nenhum produto encontrado.</p>';
    return;
  }

  const produtosAtivos = produtos.filter(p => p.ativo === true);
  const produtosAgrupados = produtosAtivos.reduce((acc, produto) => {
    const categoria = produto.categoria || 'Outros';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(produto);
    return acc;
  }, {});

  catalogoContainer.innerHTML = ''; // Limpa o container

  for (const categoria in produtosAgrupados) {
    const secao = document.createElement('div');
    secao.className = 'category-section';
    secao.innerHTML = `
      <h2 class="category-title">${categoria}</h2>
      <div class="swiper-container">
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

      // Adiciona o listener de clique diretamente aqui
      card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
        const produtoParaAdicionar = produtosCatalogo.find(prod => prod.id === p.id);
        if (produtoParaAdicionar) {
          adicionarAoCarrinho(produtoParaAdicionar, e.target);
        }
      });
    });
  }

  // Inicializa todos os carrosséis Swiper com efeitos
  new Swiper('.swiper-container', {
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
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  });
}

function adicionarAoCarrinho(produto, botao) {
  const existente = itensCarrinho.find(item => item.id === produto.id);

  if (existente) {
    existente.quantidade++;
  } else {
    itensCarrinho.push({ ...produto, quantidade: 1 });
  }

  // Animação do botão
  botao.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
  botao.classList.add('added');
  setTimeout(() => {
      botao.innerHTML = 'Adicionar';
      botao.classList.remove('added');
  }, 1500);

  // Animação do carrinho
  const cartIcon = document.getElementById('cartIcon'); // Precisamos adicionar este ícone
  if(cartIcon) {
      cartIcon.classList.add('shake');
      setTimeout(() => cartIcon.classList.remove('shake'), 500);
  }

  ativarCarrinho();
}

/**
 * Exibe o formulário para coletar os dados do cliente (Nome, WhatsApp, Tipo de Entrega, Endereço, Pagamento).
 * Inclui validação visual.
 */
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
  // Esconde os outros containers
  catalogoContainer.style.display = 'none';
  cartContainer.style.display = 'none';

  // Mostra o formulário
  formContainer.style.display = 'block';
  animateIn(formContainer);

  // Adiciona os listeners do formulário AQUI para garantir que sempre funcionem
  const deliveryTypeSelect = document.getElementById('deliveryTypeSelect');
  const addressField = document.getElementById('addressField');
  const paymentMethodSelect = document.getElementById('paymentMethodSelect');
  const changeField = document.getElementById('changeField');
  const continueBtn = document.getElementById('continueBtn');
  const nameInput = document.getElementById('nameInput');
  const whatsappInput = document.getElementById('whatsappInput');
  const emailInput = document.getElementById('emailInput');
  const addressInput = document.getElementById('addressInput');
  const changeInput = document.getElementById('changeInput');

  // Listener para mostrar/esconder campo de endereço
  deliveryTypeSelect.onchange = () => {
    addressField.style.display = deliveryTypeSelect.value === 'Tele-entrega' ? 'block' : 'none';
  };

  // Listener para mostrar/esconder campo de troco
  paymentMethodSelect.onchange = () => {
    changeField.style.display = paymentMethodSelect.value === 'Dinheiro' ? 'block' : 'none';
  };

  // Listener para o botão final de enviar
  continueBtn.onclick = () => {
    const formErrorFeedback = document.getElementById('formErrorFeedback');

    // Validação completa
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

    // Logs de depuração
    console.log('--- Verificação de Validação ---');
    console.log('Nome Válido:', isNameValid);
    console.log('WhatsApp Válido:', isWhatsappValid);
    console.log('Email Válido:', isEmailValid);
    console.log('Tipo de Entrega Válido:', isDeliveryTypeValid);
    console.log('Endereço Válido:', isAddressValid);
    console.log('Método de Pagamento Válido:', isPaymentMethodValid);
    console.log('Troco Válido:', isChangeValid);
    console.log('-----------------------------');

    if (isNameValid && isWhatsappValid && isEmailValid && isDeliveryTypeValid && isAddressValid && isPaymentMethodValid && isChangeValid) {
      formErrorFeedback.style.display = 'none'; // Esconde o erro se tudo estiver ok
      // Coleta os dados do cliente
      dadosCliente = {
        nomeCompleto: nameInput.value.trim(),
        whatsapp: whatsappInput.value.trim(),
        email: emailInput.value.trim(),
        tipoEntrega: deliveryTypeSelect.value,
        endereco: addressInput.value.trim(),
        formaPagamento: paymentMethodSelect.value,
        trocoPara: changeInput.value.trim() ? parseFloat(changeInput.value) : null
      };
      
      // Gera a mensagem e abre o WhatsApp
      const msg = gerarMensagemWhatsApp();
      window.open(`https://wa.me/${configLoja.whatsappnumber}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      // Mostra feedback de erro aprimorado
      formErrorFeedback.textContent = 'Por favor, corrija os campos destacados em vermelho.';
      formErrorFeedback.style.display = 'block';
      const orderForm = document.getElementById('orderForm');
      orderForm.classList.remove('form-shake'); // Remove para reiniciar a animação
      void orderForm.offsetWidth; // Força o reflow
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

/**
 * Gera a mensagem de texto formatada para ser enviada via WhatsApp,
 * contendo os dados do cliente, itens do carrinho e total.
 * @returns {string} - A mensagem formatada para o WhatsApp.
 */
function gerarMensagemWhatsApp() {
  let msg = `Olá, meu nome é ${dadosCliente.nomeCompleto}.\r\n`;

  // Adiciona tipo de entrega e endereço (se for tele-entrega)
  msg += `Quero: ${dadosCliente.tipoEntrega}.\r\n`;
  if (dadosCliente.tipoEntrega === 'Tele-entrega' && dadosCliente.endereco) {
    msg += `Endereço: ${dadosCliente.endereco}.\r\n`;
  }

  // Adiciona forma de pagamento e troco (se for dinheiro)
  msg += `Forma de pagamento: ${dadosCliente.formaPagamento}.\r\n`;
  if (dadosCliente.formaPagamento === 'Dinheiro' && dadosCliente.trocoPara !== null) {
      msg += `Troco para: R$ ${dadosCliente.trocoPara.toFixed(2)}.\r\n`;
  }


  msg += `\r\n*Itens:*\r\n`;

  let total = 0;
  // Adiciona cada item do carrinho à mensagem
  itensCarrinho.forEach(item => {
    const sub = item.preco * item.quantidade;
    total += sub;
    msg += `- ${item.nome} x${item.quantidade}: R$ ${sub.toFixed(2)}\r\n`;
  });

  // Adiciona o total
  msg += `\r\n*Total:* R$ ${total.toFixed(2)}\r\n`;

  // Adiciona a pergunta sobre o custo da entrega condicionalmente
  if (dadosCliente.tipoEntrega === 'Tele-entrega') {
      msg += `\r\nQuanto que vai custar a minha entrega?`;
  }


  return msg;
}

// Chamada inicial para carregar o catálogo quando a página é carregada (já feito pelo DOMContentLoaded listener)
// carregarCatalogo();
