// scripts/config.js

// Configurações globais para o app de Delivery

// Número de WhatsApp (apenas dígitos, incluindo código do país e DDD)
const WHATSAPP_NUMBER = "5551993470686"; // Seu número de WhatsApp

// URL da planilha pública no formato CSV (Comma Separated Values)
// Usaremos fetch para obter o conteúdo deste link e analisar o CSV
const CATALOGO_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStR9VM8h2X4j87lsHmBzH-NjrS-k6LMKhEuxfmcLVWt_D-A9Yplbc_309TB_WkWa-oRbpvXYob-Avj/pub?output=csv";

// scripts/logic.js

// Lógica de interação para o Delivery do Daniel

// Variáveis globais para armazenar dados do cliente e itens do carrinho
let dadosCliente = {};
let itensCarrinho = []; // Carrinho iniciado vazio

// Seleção de elementos no DOM para interagir com a interface
const startOrderBtn = document.getElementById("startOrderBtn");
const catalogoContainer = document.getElementById("catalogo");
const formContainer = document.getElementById("formContainer");
const cartContainer = document.getElementById("cartContainer");

// Adiciona um listener para carregar o catálogo assim que o conteúdo do DOM estiver completamente carregado
window.addEventListener('DOMContentLoaded', carregarCatalogo);

/**
 * Carrega produtos do catálogo buscando o arquivo CSV da URL configurada,
 * analisa o CSV e renderiza os produtos na tela.
 */
async function carregarCatalogo() {
  // Verifica se o container do catálogo existe antes de continuar
  if (!catalogoContainer) {
    console.error("Elemento #catalogo não encontrado.");
    return;
  }

  // Exibe uma mensagem de carregamento enquanto os dados são buscados
  catalogoContainer.innerHTML = '<p>Carregando produtos...</p>';

  try {
    // Realiza a requisição para obter o conteúdo do arquivo CSV
    const res = await fetch(CATALOGO_URL);

    // Verifica se a resposta da requisição foi bem-sucedida (status 2xx)
    if (!res.ok) {
      throw new Error(`Erro ao buscar catálogo CSV: Status ${res.status}`);
    }

    // Obtém o texto da resposta (o conteúdo CSV)
    const csvText = await res.text();

    // Analisa o texto CSV em um array de objetos
    const produtos = parseCSV(csvText);

    // Chama a função para exibir os produtos carregados
    showInfo(produtos);

  } catch (error) {
    // Em caso de erro na requisição ou análise do CSV, exibe uma mensagem de erro
    catalogoContainer.innerHTML = `<p>Erro ao carregar catálogo: ${error.message}</p>`;
    console.error("Detalhes do erro ao carregar catálogo:", error);
  }
}

/**
 * Analisa o texto CSV em um array de objetos JavaScript.
 * Assume que a primeira linha do CSV são os cabeçalhos.
 * @param {string} csvText - O conteúdo do arquivo CSV como texto.
 * @returns {Array<Object>} - Um array de objetos representando as linhas do CSV.
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(','); // Assume vírgula como delimitador
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(','); // Assume vírgula como delimitador
    if (values.length === headers.length) { // Garante que a linha tem o número correto de colunas
      const item = {};
      for (let j = 0; j < headers.length; j++) {
        // Remove espaços em branco extras dos cabeçalhos e valores
        const header = headers[j].trim();
        const value = values[j].trim();
        item[header] = value;
      }
      data.push(item);
    }
  }
  return data;
}


/**
 * Processa os dados carregados (agora de um CSV analisado) e renderiza o catálogo.
 * @param {Array<Object>} data - Os dados carregados da planilha (array de objetos).
 */
function showInfo(data) {
  // Verifica se os dados foram carregados corretamente e se é um array
  if (!data || !Array.isArray(data) || data.length === 0) {
    catalogoContainer.innerHTML = '<p>Nenhum produto encontrado no catálogo ou formato de dados inesperado.</p>';
    console.error("Dados recebidos não são um array, estão vazios ou formato inesperado:", data);
    return;
  }

  // Limpa o container e adiciona um título
  catalogoContainer.innerHTML = '<h2>Catálogo de Produtos</h2>';

  // Itera sobre os produtos recebidos, filtra pelos ativos e cria um card para cada um
  // Certifique-se de que os nomes das colunas na planilha (nome, preco, imagem_url, ativo)
  // correspondem às chaves nos objetos 'p'. A função parseCSV usa os cabeçalhos da primeira linha como chaves.
  const produtosAtivos = data.filter(p => p.ativo && p.ativo.toLowerCase() === 'true');

  if (produtosAtivos.length === 0) {
       catalogoContainer.innerHTML += '<p>Nenhum produto ativo encontrado no catálogo.</p>';
       return; // Sai da função se não houver produtos ativos
  }


  produtosAtivos.forEach(p => {
    const card = document.createElement('div');
    card.className = 'produto-item'; // Classe para estilização
    // Adicionado um fallback para a imagem caso a URL esteja vazia ou inválida
    const imageUrl = p.imagem_url && p.imagem_url.trim() !== '' ? p.imagem_url : 'https://placehold.co/150x100/EFEFEF/AAAAAA?text=Sem+Imagem';

    card.innerHTML = `
      <img src="${imageUrl}" alt="${p.nome || 'Produto sem nome'}" class="produto-imagem" onerror="this.onerror=null; this.src='https://placehold.co/150x100/EFEFEF/AAAAAA?text=Erro+Imagem';" />
      <h3>${p.nome || 'Produto sem nome'}</h3>
      <p>R$ ${parseFloat(p.preco || 0).toFixed(2)}</p> <button class="add-to-cart-btn" data-product-id="${p.id || p.nome}">Adicionar ao carrinho</button> `;
    // Adiciona um listener ao botão "Adicionar ao carrinho" para chamar a função adicionarAoCarrinho
    // Passa o objeto produto com preco convertido para número
    card.querySelector('.add-to-cart-btn').addEventListener('click', () => adicionarAoCarrinho({
        id: p.id || p.nome, // Usando nome como fallback para ID
        nome: p.nome || 'Produto sem nome',
        preco: parseFloat(p.preco || 0), // Converte preço para número, com fallback para 0
        imagem_url: imageUrl,
        ativo: p.ativo || 'false' // Fallback para ativo
    }));
    // Adiciona o card do produto ao container do catálogo
    catalogoContainer.appendChild(card);
  });

}


/**
 * Adiciona um produto ao carrinho ou incrementa a quantidade se já existir.
 * Após adicionar, ativa/atualiza a exibição do carrinho.
 * @param {object} produto - O objeto produto a ser adicionado.
 */
function adicionarAoCarrinho(produto) {
  // Procura se o produto já existe no carrinho pelo ID ou nome (se ID não existir)
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

// Adiciona um listener ao botão "Começar Pedido" para exibir o formulário do cliente
if (startOrderBtn) {
  startOrderBtn.addEventListener('click', exibirFormulario);
} else {
  console.error("Elemento #startOrderBtn não encontrado.");
}


/**
 * Exibe o formulário para coletar os dados do cliente (Nome, WhatsApp, Tipo de Entrega, Endereço).
 */
function exibirFormulario() {
  // Verifica se o container do formulário existe
  if (!formContainer) {
    console.error("Elemento #formContainer não encontrado.");
    return;
  }

  // Preenche o container do formulário com o HTML do formulário
  formContainer.innerHTML = `
    <h2>Dados do Cliente</h2>
    <form id="orderForm">
      <label for="nameInput">Nome completo:</label>
      <input type="text" id="nameInput" required><br><br>

      <label for="whatsappInput">WhatsApp:</label>
      <input type="text" id="whatsappInput" required><br><br>

      <label for="deliveryTypeSelect">Tipo de entrega:</label>
      <select id="deliveryTypeSelect" required>
        <option value="">Selecione...</option>
        <option value="Retirada">Retirada</option>
        <option value="Tele-entrega">Tele-entrega</option>
      </select><br><br>

      <div id="addressField" style="display:none;">
        <label for="addressInput">Endereço:</label>
        <input type="text" id="addressInput"><br><br>
      </div>

      <button type="button" id="continueBtn">Continuar</button>
    </form>
  `;

  // Adiciona um listener para mostrar/esconder o campo de endereço baseado no tipo de entrega
  const select = document.getElementById('deliveryTypeSelect');
  const addressField = document.getElementById('addressField');
  if (select && addressField) {
    select.addEventListener('change', () => {
      addressField.style.display = select.value === 'Tele-entrega' ? 'block' : 'none';
    });
  } else {
     console.error("Elementos #deliveryTypeSelect ou #addressField não encontrados.");
  }


  // Adiciona um listener ao botão "Continuar" do formulário
  const continueBtn = document.getElementById('continueBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      // Obtém os valores dos campos do formulário
      const nameInput = document.getElementById('nameInput');
      const whatsappInput = document.getElementById('whatsappInput');
      const addressInput = document.getElementById('addressInput');

      if (!nameInput || !whatsappInput || !select) {
         console.error("Um ou mais elementos do formulário não foram encontrados.");
         return;
      }

      const nome = nameInput.value.trim();
      const whatsapp = whatsappInput.value.trim();
      const tipo = select.value;
      const endereco = addressInput ? addressInput.value.trim() : ''; // Endereço pode não existir se não for tele-entrega

      // Validação básica dos campos obrigatórios
      if (!nome || !whatsapp || !tipo) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
      if (tipo === 'Tele-entrega' && !endereco) {
        alert('Para Tele-entrega, por favor informe o endereço.');
        return;
      }

      // Armazena os dados do cliente na variável global
      dadosCliente = { nome, whatsapp, tipoEntrega: tipo };
      if (tipo === 'Tele-entrega') {
        dadosCliente.endereco = endereco;
      }

      // Ativa a exibição do carrinho após coletar os dados do cliente
      ativarCarrinho();
    });
  } else {
     console.error("Elemento #continueBtn não encontrado.");
  }
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

  // Adiciona um listener ao botão "Finalizar Pedido" se ele existir
  const finalizarBtn = document.getElementById('btnFinalizarPedido');
  if (finalizarBtn) {
    finalizarBtn.addEventListener('click', () => {
      // Gera a mensagem formatada para o WhatsApp
      const msg = gerarMensagemWhatsApp();
      // Abre uma nova janela ou aba com o link do WhatsApp
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }
}

/**
 * Gera a mensagem de texto formatada para ser enviada via WhatsApp,
 * contendo os dados do cliente, itens do carrinho e total.
 * @returns {string} - A mensagem formatada para o WhatsApp.
 */
function gerarMensagemWhatsApp() {
  let msg = `Olá, meu nome é ${dadosCliente.nome}.
Entrega: ${dadosCliente.tipoEntrega}.
`;

  // Adiciona o endereço se o tipo de entrega for Tele-entrega
  if (dadosCliente.tipoEntrega === 'Tele-entrega' && dadosCliente.endereco) {
    msg += `Endereço: ${dadosCliente.endereco}.
`;
  }

  msg += `
*Itens:*
`;

  let total = 0;
  // Adiciona cada item do carrinho à mensagem
  itensCarrinho.forEach(item => {
    const sub = item.preco * item.quantidade;
    total += sub;
    msg += `- ${item.nome} x${item.quantidade}: R$ ${sub.toFixed(2)}
`;
  });

  // Adiciona o total e o aviso final à mensagem
  msg += `
*Total:* R$ ${total.toFixed(2)}

⚠️ O valor da entrega será informado no WhatsApp.`;

  return msg;
}

// Chamada inicial para carregar o catálogo quando a página é carregada (já feito pelo DOMContentLoaded listener)
// carregarCatalogo();
