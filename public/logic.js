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
    await carregarConfiguracoes(); // Carrega configurações primeiro
    carregarCatalogo(); // Depois carrega o catálogo
    animateIn(startOrderBtn); // Garante que o botão inicial apareça com animação

    // Adiciona o listener para o botão "Começar Pedido" AQUI, garantindo que o botão já existe.
    if (startOrderBtn) {
        startOrderBtn.addEventListener('click', () => {
            animateOut(startOrderBtn); // Esconde o botão com animação
            startOrderBtn.style.display = 'none'; // Oculta o botão após a animação
            if (catalogoContainer) catalogoContainer.style.display = 'none'; // Esconde o catálogo
            exibirFormulario();
        });
    } else {
        console.error("Elemento #startOrderBtn não foi encontrado no DOM.");
    }
});


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
  catalogoContainer.innerHTML = '<p>Carregando produtos...</p>';
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
        <button class="add-to-cart-btn" data-product-id="${p.id}" disabled>Adicionar</button>
      `;
      swiperWrapper.appendChild(card);
    });
  }

  // Inicializa todos os carrosséis Swiper
  new Swiper('.swiper-container', {
    slidesPerView: 'auto',
    spaceBetween: 15,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    breakpoints: {
        320: { slidesPerView: 2, spaceBetween: 10 },
        480: { slidesPerView: 3, spaceBetween: 15 },
        640: { slidesPerView: 4, spaceBetween: 20 }
    }
  });
}


/**
 * Adiciona um produto ao carrinho ou incrementa a quantidade se já existir.
 * Após adicionar, ativa/atualiza a exibição do carrinho.
 * @param {object} produto - O objeto produto a ser adicionado.
 */
function adicionarAoCarrinho(produto) {
  // Procura se o produto já existe no carrinho pelo ID
  const existente = itensCarrinho.find(item => item.id === produto.id);

  if (existente) {
    // Se existir, incrementa a quantidade
    existente.quantidade++;
  } else {
    // Se não existir, adiciona o produto com quantidade 1
    itensCarrinho.push({ ...produto, quantidade: 1 });
  }

  // Atualiza a exibição do carrinho
  ativarCarrinho();
}

/**
 * Exibe o formulário para coletar os dados do cliente (Nome, WhatsApp, Tipo de Entrega, Endereço, Pagamento).
 * Inclui validação visual.
 */
function exibirFormulario() {
  // Verifica se o container do formulário existe
  if (!formContainer) {
    console.error("Elemento #formContainer não encontrado.");
    return;
  }

  // Preenche o container do formulário com o HTML do formulário
  formContainer.innerHTML = `
    <h2><i class="fas fa-user-shield"></i> Seus Dados</h2>
    <form id="orderForm">
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


      <button type="button" id="continueBtn">Continuar para os Produtos <i class="fas fa-arrow-right"></i></button>
    </form>
  `;

  // Adiciona listeners para validação visual e mostrar/esconder campos
  const nameInput = document.getElementById('nameInput');
  const whatsappInput = document.getElementById('whatsappInput');
  const emailInput = document.getElementById('emailInput');
  const deliveryTypeSelect = document.getElementById('deliveryTypeSelect');
  const addressField = document.getElementById('addressField');
  const addressInput = document.getElementById('addressInput');
  const paymentMethodSelect = document.getElementById('paymentMethodSelect');
  const changeField = document.getElementById('changeField');
  const changeInput = document.getElementById('changeInput');
  const continueBtn = document.getElementById('continueBtn');

  const nameError = document.getElementById('nameError');
  const whatsappError = document.getElementById('whatsappError');
  const emailError = document.getElementById('emailError');
  const deliveryTypeError = document.getElementById('deliveryTypeError');
  const addressError = document.getElementById('addressError');
  const paymentMethodError = document.getElementById('paymentMethodError');
  const changeError = document.getElementById('changeError');


  // Listener para mostrar/esconder o campo de endereço baseado no tipo de entrega
  if (deliveryTypeSelect && addressField) {
    deliveryTypeSelect.addEventListener('change', () => {
      addressField.style.display = deliveryTypeSelect.value === 'Tele-entrega' ? 'block' : 'none';
      // Limpa erro de endereço se mudar para Retirada
      if (deliveryTypeSelect.value !== 'Tele-entrega') {
          addressInput.classList.remove('input-error');
          addressError.style.display = 'none';
          addressError.textContent = '';
      }
    });
  } else {
     console.error("Elementos #deliveryTypeSelect ou #addressField não encontrados.");
  }

  // Listener para mostrar/esconder o campo de troco baseado na forma de pagamento
    if (paymentMethodSelect && changeField) {
        paymentMethodSelect.addEventListener('change', () => {
            changeField.style.display = paymentMethodSelect.value === 'Dinheiro' ? 'block' : 'none';
             // Limpa erro de troco se mudar para outra forma de pagamento
            if (paymentMethodSelect.value !== 'Dinheiro') {
                changeInput.classList.remove('input-error');
                changeError.style.display = 'none';
                changeError.textContent = '';
            }
        });
    } else {
        console.error("Elementos #paymentMethodSelect ou #changeField não encontrados.");
    }


  // Listeners para validação visual (oninput/onchange)
  nameInput.addEventListener('input', () => validateFullName(nameInput, nameError)); // Usar nova validação para nome completo
  whatsappInput.addEventListener('input', () => validateWhatsapp(whatsappInput, whatsappError));
  emailInput.addEventListener('input', () => validateEmail(emailInput, emailError)); // E-mail agora é obrigatório
  deliveryTypeSelect.addEventListener('change', () => validateField(deliveryTypeSelect, deliveryTypeError, deliveryTypeSelect.value !== '', 'Selecione o tipo de entrega.'));
  addressInput.addEventListener('input', () => {
      if (deliveryTypeSelect.value === 'Tele-entrega') {
          validateField(addressInput, addressError, addressInput.value.trim() !== '', 'Endereço é obrigatório para Tele-entrega.');
      }
  });
  paymentMethodSelect.addEventListener('change', () => validateField(paymentMethodSelect, paymentMethodError, paymentMethodSelect.value !== '', 'Selecione a forma de pagamento.'));
  changeInput.addEventListener('input', () => {
      if (paymentMethodSelect.value === 'Dinheiro') {
           validateChange(changeInput, changeError);
      }
  });


  // Adiciona um listener ao botão "Continuar" do formulário
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      // Executa todas as validações antes de continuar
      const isNameValid = validateFullName(nameInput, nameError); // Usar nova validação
      const isWhatsappValid = validateWhatsapp(whatsappInput, whatsappError);
      const isEmailValid = validateEmail(emailInput, emailError); // E-mail agora é obrigatório
      const isDeliveryTypeValid = validateField(deliveryTypeSelect, deliveryTypeError, deliveryTypeSelect.value !== '', 'Selecione o tipo de entrega.');
      let isAddressValid = true;
      if (deliveryTypeSelect.value === 'Tele-entrega') {
          isAddressValid = validateField(addressInput, addressError, addressInput.value.trim() !== '', 'Endereço é obrigatório para Tele-entrega.');
      }
      const isPaymentMethodValid = validateField(paymentMethodSelect, paymentMethodError, paymentMethodSelect.value !== '', 'Selecione a forma de pagamento.');
      let isChangeValid = true;
       if (paymentMethodSelect.value === 'Dinheiro') {
           isChangeValid = validateChange(changeInput, changeError);
       }


      // Se todas as validações passarem
      if (isNameValid && isWhatsappValid && isEmailValid && isDeliveryTypeValid && isAddressValid && isPaymentMethodValid && isChangeValid) {
          // Obtém os valores dos campos do formulário
          const nomeCompleto = nameInput.value.trim();
          const whatsapp = whatsappInput.value.trim();
          const email = emailInput.value.trim();
          const tipo = deliveryTypeSelect.value;
          const endereco = addressInput ? addressInput.value.trim() : ''; // Endereço pode não existir se não for tele-entrega
          const formaPagamento = paymentMethodSelect.value;
          const trocoPara = paymentMethodSelect.value === 'Dinheiro' && changeInput.value.trim() !== '' ? parseFloat(changeInput.value) : null;


          // Armazena os dados do cliente na variável global
          dadosCliente = {
              nomeCompleto: nomeCompleto,
              nome: nomeCompleto.split(' ')[0] || '', // Primeiro nome para CAPI
              sobrenome: nomeCompleto.split(' ').slice(1).join(' ') || '', // Restante para sobrenome CAPI
              whatsapp: whatsapp,
              email: email, // E-mail agora é obrigatório
              tipoEntrega: tipo,
              formaPagamento: formaPagamento,
              trocoPara: trocoPara
          };
          if (tipo === 'Tele-entrega') {
              dadosCliente.endereco = endereco;
          }

          // **NOVO FLUXO**
          // Esconde o formulário e re-exibe o catálogo com os botões ativados
          formContainer.style.display = 'none';
          catalogoContainer.style.display = 'grid'; // Re-exibe o catálogo
          animateIn(catalogoContainer);

          // Ativa todos os botões "Adicionar ao carrinho"
          const addButtons = document.querySelectorAll('.add-to-cart-btn');
          addButtons.forEach(button => {
              button.disabled = false;
              // Adiciona o listener de clique AGORA, após a identificação
              const productId = button.dataset.productId;
              const produto = produtosCatalogo.find(p => p.id == productId); // Usa a variável global
              if(produto) {
                  button.addEventListener('click', () => adicionarAoCarrinho({
                      id: produto.id,
                      nome: produto.nome || 'Produto sem nome',
                      preco: parseFloat(produto.preco || 0),
                      imagem_url: produto.imagem_url,
                      ativo: produto.ativo === true
                  }));
              }
          });

      } else {
          alert('Por favor, corrija os campos destacados.');
      }
    });
  } else {
     console.error("Elemento #continueBtn não encontrado.");
  }

  // Torna o formulário visível e o anima
  formContainer.style.display = 'block';
  animateIn(formContainer);
}

/**
 * Função genérica para validar campos e mostrar feedback visual.
 * @param {HTMLElement} inputElement - O elemento input/select a ser validado.
 * @param {HTMLElement} errorElement - O elemento onde a mensagem de erro será exibida.
 * @param {boolean} isValid - O resultado da validação (true se válido, false se inválido).
 * @param {string} errorMessage - A mensagem de erro a ser exibida se inválido.
 * @returns {boolean} - O resultado da validação.
 */
function validateField(inputElement, errorElement, isValid, errorMessage) {
    if (isValid) {
        inputElement.classList.remove('input-error');
        if (errorElement) { // Verifica se o elemento de erro existe
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
        return true;
    } else {
        inputElement.classList.add('input-error');
         if (errorElement) { // Verifica se o elemento de erro existe
            errorElement.style.display = 'block';
            errorElement.textContent = errorMessage;
        }
        return false;
    }
}

/**
 * Valida o campo de Nome completo (requer pelo menos nome e sobrenome).
 * @param {HTMLElement} inputElement - O elemento input do Nome completo.
 * @param {HTMLElement} errorElement - O elemento onde a mensagem de erro será exibida.
 * @returns {boolean} - O resultado da validação.
 */
function validateFullName(inputElement, errorElement) {
    const fullName = inputElement.value.trim();
    const parts = fullName.split(' ');
    // Valida se tem pelo menos duas partes (nome e sobrenome) e se nenhuma parte está vazia após split
    const isValid = parts.length >= 2 && parts.every(part => part.length > 0);
    const errorMessage = 'Por favor, digite seu nome completo (nome e sobrenome).';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}


/**
 * Valida o campo de WhatsApp (apenas números, 11-13 dígitos).
 * @param {HTMLElement} inputElement - O elemento input do WhatsApp.
 * @param {HTMLElement} errorElement - O elemento onde a mensagem de erro será exibida.
 * @returns {boolean} - O resultado da validação.
 */
function validateWhatsapp(inputElement, errorElement) {
    const whatsapp = inputElement.value.trim();
    // Permite apenas dígitos
    const numericWhatsapp = whatsapp.replace(/\D/g, '');
    inputElement.value = numericWhatsapp; // Atualiza o campo para mostrar apenas números
    const isValid = numericWhatsapp.length >= 11 && numericWhatsapp.length <= 13;
    const errorMessage = 'Deve conter entre 11 e 13 dígitos (somente números).';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}

/**
 * Valida o campo de E-mail (agora obrigatório).
 * @param {HTMLElement} inputElement - O elemento input do E-mail.
 * @param {HTMLElement} errorElement - O elemento onde a mensagem de erro será exibida.
 * @returns {boolean} - O resultado da validação.
 */
function validateEmail(inputElement, errorElement) {
    const email = inputElement.value.trim();
    // Agora o campo não pode estar vazio
    if (email === '') {
        return validateField(inputElement, errorElement, false, 'E-mail é obrigatório.');
    }
    // Regex básico para validar formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    const errorMessage = 'Digite um endereço de E-mail válido.';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}

/**
 * Valida o campo de Troco (opcional, apenas se pagamento for Dinheiro).
 * Garante que, se preenchido, seja um número positivo.
 * @param {HTMLElement} inputElement - O elemento input do Troco.
 * @param {HTMLElement} errorElement - O elemento onde a mensagem de erro será exibida.
 * @returns {boolean} - O resultado da validação.
 */
function validateChange(inputElement, errorElement) {
    const change = inputElement.value.trim();
    // Se o campo estiver vazio, é válido (é opcional)
    if (change === '') {
        return validateField(inputElement, errorElement, true, '');
    }
    const numericChange = parseFloat(change);
    const isValid = !isNaN(numericChange) && numericChange >= 0;
    const errorMessage = 'Informe um valor numérico positivo para o troco.';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}


/**
 * Renderiza o conteúdo do carrinho, incluindo a lista de itens, total, aviso e botão de finalizar.
 */
function ativarCarrinho() {
  // Verifica se o container do carrinho existe
  if (!cartContainer) {
    console.error("Elemento #cartContainer não encontrado.");
    return;
  }

  animateOut(formContainer); // Esconde o formulário com animação
  formContainer.style.display = 'none'; // Oculta o formulário

  // Calcula o total do carrinho
  const total = itensCarrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  // Gera o HTML da lista de itens do carrinho
  const itensHtml = itensCarrinho.map(item =>
    `<li>${item.nome} x${item.quantidade} - R$ ${(item.preco * item.quantidade).toFixed(2)}</li>`
  ).join('');

  // Preenche o container do carrinho com o HTML gerado
  cartContainer.innerHTML = `
    <h2>Carrinho</h2>
    ${itensCarrinho.length > 0 ? `<ul>${itensHtml}</ul>` : '<p>Seu carrinho está vazio.</p>'}
    <p>Total: R$ ${total.toFixed(2)}</p>
    <div id="avisoFinal">⚠️ Atenção: seu pedido ainda não foi pago. O valor da entrega será informado diretamente pelo Daniel no WhatsApp. Este é apenas o resumo do seu pedido. O pagamento e entrega serão organizados por lá.</div>
    ${itensCarrinho.length > 0 ? '<button id="btnFinalizarPedido">Finalizar Pedido</button>' : ''}
  `;

  // Anima o carrinho para aparecer
  cartContainer.style.display = 'block';
  animateIn(cartContainer);

  // Adiciona um listener ao botão "Finalizar Pedido" se ele existir
  const finalizarBtn = document.getElementById('btnFinalizarPedido');
  if (finalizarBtn) {
    finalizarBtn.addEventListener('click', () => {
      // Gera a mensagem formatada para o WhatsApp
      const msg = gerarMensagemWhatsApp();
      // Abre uma nova janela ou aba com o link do WhatsApp
      // Usa o número de WhatsApp das configurações da loja
      window.open(`https://wa.me/${configLoja.whatsappnumber}?text=${encodeURIComponent(msg)}`, '_blank');
    });
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
