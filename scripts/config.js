// Configurações globais para o app de Delivery


// Número de WhatsApp (apenas dígitos)
const WHATSAPP_NUMBER = "5551999999999";


// URL da sua planilha pública (JSON)
const CATALOGO_URL = "https://seusite.com/caminho/para/catalogo.json";

// Lógica de interação para o Delivery do Daniel


// Variáveis globais
let dadosCliente = {};
let itensCarrinho = []; // Carrinho iniciado vazio


// Seleção de elementos no DOM
const startOrderBtn = document.getElementById("startOrderBtn");
const catalogoContainer = document.getElementById("catalogo");
const formContainer = document.getElementById("formContainer");
const cartContainer = document.getElementById("cartContainer");


// Inicializa o catálogo quando o DOM for carregado
window.addEventListener('DOMContentLoaded', carregarCatalogo);


/**
 * Carrega produtos do catálogo via fetch e renderiza na tela
 */
async function carregarCatalogo() {
  if (!catalogoContainer) return;
  catalogoContainer.innerHTML = '<p>Carregando produtos...</p>';
  try {
    const res = await fetch(CATALOGO_URL);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const produtos = await res.json();
    catalogoContainer.innerHTML = '<h2>Catálogo de Produtos</h2>';
    produtos.filter(p => p.ativo).forEach(p => {
      const card = document.createElement('div');
      card.className = 'produto-item';
      card.innerHTML = `
        <img src="${p.imagem_url}" alt="${p.nome}" class="produto-imagem" />
        <h3>${p.nome}</h3>
        <p>R$ ${p.preco.toFixed(2)}</p>
        <button class="add-to-cart-btn">Adicionar ao carrinho</button>
      `;
      card.querySelector('button').addEventListener('click', () => adicionarAoCarrinho(p));
      catalogoContainer.appendChild(card);
    });
  } catch (error) {
    catalogoContainer.innerHTML = `<p>Erro ao carregar catálogo: ${error.message}</p>`;
  }
}


/**
 * Adiciona produto ao carrinho ou incrementa quantidade
 */
function adicionarAoCarrinho(produto) {
  const existente = itensCarrinho.find(i => i.id === produto.id);
  if (existente) existente.quantidade++;
  else itensCarrinho.push({ ...produto, quantidade: 1 });
  ativarCarrinho();
}


// Evento para exibir formulário ao clicar
startOrderBtn.addEventListener('click', exibirFormulario);


/**
 * Exibe formulário de dados do cliente
 */
function exibirFormulario() {
  formContainer.innerHTML = `
    <form id="orderForm">
      <label>Nome completo:<input type="text" id="nameInput" required></label>
      <label>WhatsApp:<input type="text" id="whatsappInput" required></label>
      <label>Tipo de entrega:
        <select id="deliveryTypeSelect" required>
          <option value="">Selecione...</option>
          <option value="Retirada">Retirada</option>
          <option value="Tele-entrega">Tele-entrega</option>
        </select>
      </label>
      <div id="addressField" style="display:none;">
        <label>Endereço:<input type="text" id="addressInput"></label>
      </div>
      <button type="button" id="continueBtn">Continuar</button>
    </form>
  `;
  const select = document.getElementById('deliveryTypeSelect');
  select.addEventListener('change', () => {
    document.getElementById('addressField').style.display = select.value === 'Tele-entrega' ? 'block' : 'none';
  });
  document.getElementById('continueBtn').addEventListener('click', () => {
    const nome = document.getElementById('nameInput').value.trim();
    const whatsapp = document.getElementById('whatsappInput').value.trim();
    const tipo = select.value;
    const endereco = document.getElementById('addressInput').value.trim();
    if (!nome || !whatsapp || !tipo) return alert('Preencha todos os campos obrigatórios.');
    if (tipo === 'Tele-entrega' && !endereco) return alert('Informe o endereço.');
    dadosCliente = { nome, whatsapp, tipoEntrega: tipo };
    if (tipo === 'Tele-entrega') dadosCliente.endereco = endereco;
    ativarCarrinho();
  });
}


/**
 * Renderiza o carrinho, aviso e botão de finalizar
 */
function ativarCarrinho() {
  const total = itensCarrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
  cartContainer.innerHTML = `
    <h2>Carrinho</h2>
    <ul>${itensCarrinho.map(i => `<li>${i.nome} x${i.quantidade} - R$ ${(i.preco * i.quantidade).toFixed(2)}</li>`).join('')}</ul>
    <p>Total: R$ ${total.toFixed(2)}</p>
    <div id="avisoFinal">⚠️ Atenção: seu pedido ainda não foi pago. O valor da entrega será informado diretamente pelo Daniel no WhatsApp. Este é apenas o resumo do seu pedido. O pagamento e entrega serão organizados por lá.</div>
    <button id="btnFinalizarPedido">Finalizar Pedido</button>
  `;
  document.getElementById('btnFinalizarPedido').addEventListener('click', () => {
    const msg = gerarMensagemWhatsApp();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  });
}


/**
 * Gera mensagem para WhatsApp com itens e total
 */
function gerarMensagemWhatsApp() {
  let msg = `Olá, meu nome é ${dadosCliente.nome}.
Entrega: ${dadosCliente.tipoEntrega}.
`;
  if (dadosCliente.tipoEntrega === 'Tele-entrega') msg += `Endereço: ${dadosCliente.endereco}.
`;
  msg += '*Itens:*
';
  let total = 0;
  itensCarrinho.forEach(i => {
    const sub = i.preco * i.quantidade;
    total += sub;
    msg += `- ${i.nome} x${i.quantidade}: R$ ${sub.toFixed(2)}
`;
  });
  msg += `*Total:* R$ ${total.toFixed(2)}


O valor da entrega será informado no WhatsApp.`;
  return msg;
}
