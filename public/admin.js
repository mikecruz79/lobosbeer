// scripts/admin.js

// Verifica se o usuário está logado ao carregar a página
if (localStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

// Adiciona listener para o botão de logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'login.html';
});

// --- Seleção de Elementos do DOM ---
const productListContainer = document.getElementById('productList');
const addProductForm = document.getElementById('addProductForm');
const configForm = document.getElementById('configForm');
const configSection = document.querySelector('.config-section');
const productsSection = document.querySelector('.products-section');

// Modal de Ordenação
const orderModal = document.getElementById('orderModal');
const openOrderModalBtn = document.getElementById('openOrderModalBtn');
const saveOrderBtn = document.getElementById('saveOrderBtn');
const cancelOrderBtn = document.getElementById('cancelOrderBtn');
const sortableCategoryList = document.getElementById('sortableCategoryList');

// --- Variáveis Globais ---
let originalWhatsappValue = '';
let productsByCategory = {};
let categoryOrder = [];

// --- Funções de Animação ---
function showElementWithAnimation(element, displayType = 'block') {
    if (element) {
        element.style.display = displayType;
        element.offsetHeight;
        element.classList.add('fade-in');
    }
}

// --- Funções de Validação ---
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

function validateWhatsapp(inputElement, errorElement) {
    const whatsapp = inputElement.value.trim().replace(/\D/g, '');
    inputElement.value = whatsapp;
    return validateField(inputElement, errorElement, whatsapp.length === 11, 'Deve conter 11 dígitos (DDD + Número).');
}

function validatePrice(inputElement, errorElement) {
    const price = parseFloat(inputElement.value);
    return validateField(inputElement, errorElement, !isNaN(price) && price >= 0, 'Preço deve ser um número positivo.');
}

// --- Funções de Produtos e Categorias ---

async function loadProductsAndConfig() {
    try {
        const [productsRes, configRes] = await Promise.all([
            fetch('/produtos?_=' + Date.now()),
            fetch('/config?_=' + Date.now())
        ]);

        if (!productsRes.ok || !configRes.ok) {
            throw new Error('Erro ao carregar dados do servidor.');
        }

        const products = await productsRes.json();
        const config = await configRes.json();

        // Processa e renderiza as configurações primeiro
        renderConfig(config);

        // Continua com o processamento dos produtos
        categoryOrder = config.ordem_categorias ? JSON.parse(config.ordem_categorias) : [];

        productsByCategory = products.reduce((acc, product) => {
            const category = product.categoria || 'Sem Categoria';
            if (!acc[category]) acc[category] = [];
            acc[category].push(product);
            return acc;
        }, {});

        renderProductList();
        showElementWithAnimation(productsSection, 'block');

    } catch (error) {
        console.error('Erro ao carregar produtos e configurações:', error);
        alert('Erro ao carregar dados.');
    }
}

function renderProductList() {
    productListContainer.innerHTML = '';

    const allCategories = Object.keys(productsByCategory);
    allCategories.forEach(cat => {
        if (!categoryOrder.includes(cat)) {
            categoryOrder.push(cat);
        }
    });
    categoryOrder = categoryOrder.filter(cat => allCategories.includes(cat));

    categoryOrder.forEach(category => {
        const categoryProducts = productsByCategory[category];
        if (!categoryProducts) return;

        const categoryId = `category-carousel-${category.replace(/\s+/g, '-')}`;
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-carousel-container';
        
        const title = document.createElement('h4');
        title.className = 'category-carousel-title';
        title.textContent = `${category} (${categoryProducts.length} produtos)`;
        categoryElement.appendChild(title);

        const swiperContainer = document.createElement('div');
        swiperContainer.id = categoryId;
        swiperContainer.className = 'swiper-container admin-swiper';
        swiperContainer.innerHTML = `
            <div class="swiper-wrapper"></div>
            <div class="swiper-pagination"></div>
        `;
        categoryElement.appendChild(swiperContainer);
        
        const swiperWrapper = swiperContainer.querySelector('.swiper-wrapper');

        categoryProducts.forEach(product => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.innerHTML = `
                <div class="admin-product-card" data-id="${product.id}">
                    <div class="admin-product-image-container">
                        <img src="${product.imagem_url || 'https://placehold.co/150x140'}" alt="${product.nome || ''}">
                        <input type="file" accept="image/*" class="upload-single-image-file" style="display:none;">
                        <button type="button" class="upload-single-image-btn">Trocar Imagem</button>
                    </div>
                    <div class="admin-product-details">
                        <div class="form-group">
                            <label>Nome:</label>
                            <input type="text" value="${product.nome || ''}" data-field="nome">
                        </div>
                        <div class="form-group">
                            <label>Preço (R$):</label>
                            <input type="number" step="0.01" value="${product.preco || 0}" data-field="preco">
                        </div>
                        <div class="form-group-inline">
                            <label>Ativo:</label>
                            <input type="checkbox" ${product.ativo ? 'checked' : ''} data-field="ativo">
                        </div>
                        <div class="admin-product-actions">
                            <button class="save-btn">Salvar</button>
                            <button class="delete-btn">Excluir</button>
                        </div>
                    </div>
                </div>
            `;
            swiperWrapper.appendChild(slide);
        });

        productListContainer.appendChild(categoryElement);

        new Swiper(`#${categoryId}`, {
            slidesPerView: 'auto',
            spaceBetween: 16,
            grabCursor: true,
            pagination: {
                el: `#${categoryId} .swiper-pagination`,
                clickable: true,
            },
        });
    });

    const categorySuggestions = document.getElementById('category-suggestions');
    categorySuggestions.innerHTML = '';
    allCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        categorySuggestions.appendChild(option);
    });

    addDynamicButtonListeners();
}

function addAccordionListeners() {
    // Removido
}

function addDynamicButtonListeners() {
    document.querySelectorAll('.save-btn').forEach(btn => btn.addEventListener('click', saveProduct));
    document.querySelectorAll('.upload-single-image-btn').forEach(btn => btn.addEventListener('click', handleSingleImageUpload));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteProduct));
}

// --- Funções do Modal de Ordenação ---

function openOrderModal() {
    sortableCategoryList.innerHTML = '';
    categoryOrder.forEach(catName => {
        const li = document.createElement('li');
        li.textContent = catName;
        li.dataset.id = catName;
        sortableCategoryList.appendChild(li);
    });
    orderModal.style.display = 'flex';
    new Sortable(sortableCategoryList, { animation: 150, ghostClass: 'sortable-ghost' });
}

async function saveCategoryOrder() {
    const newOrder = [...sortableCategoryList.querySelectorAll('li')].map(li => li.dataset.id);
    
    try {
        const response = await fetch('/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ordem_categorias: newOrder })
        });

        if (!response.ok) throw new Error('Falha ao salvar a ordem.');

        alert('Ordem das categorias salva com sucesso!');
        orderModal.style.display = 'none';
        categoryOrder = newOrder;
        renderProductList();
    } catch (error) {
        console.error('Erro ao salvar ordem:', error);
        alert('Erro ao salvar a ordem das categorias.');
    }
}

// --- Listeners do Modal ---
openOrderModalBtn.addEventListener('click', openOrderModal);
cancelOrderBtn.addEventListener('click', () => orderModal.style.display = 'none');
saveOrderBtn.addEventListener('click', saveCategoryOrder);


// --- Funções de Ações de Produto ---

async function saveProduct(event) {
    const card = event.target.closest('.admin-product-card');
    if (!card) return;

    const productId = card.dataset.id;
    const nameInput = card.querySelector('input[data-field="nome"]');
    const priceInput = card.querySelector('input[data-field="preco"]');
    const imageUrl = card.querySelector('img').src;
    const activeInput = card.querySelector('input[data-field="ativo"]');

    const isNameValid = validateField(nameInput, null, nameInput.value.trim() !== '', 'Nome é obrigatório.');
    const isPriceValid = validatePrice(priceInput, null);

    if (!isNameValid || !isPriceValid) {
        alert('Por favor, corrija os campos destacados antes de salvar.');
        return;
    }

    const updatedProductData = {
        nome: nameInput.value.trim(),
        preco: parseFloat(priceInput.value),
        imagem_url: imageUrl,
        ativo: activeInput.checked
    };

    try {
        const saveResponse = await fetch(`/produtos/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProductData)
        });
        if (saveResponse.ok) {
            alert('Produto salvo com sucesso!');
        } else {
             throw new Error(await saveResponse.text());
        }
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto.');
    }
}

async function deleteProduct(event) {
    const card = event.target.closest('.admin-product-card');
    const productId = card.dataset.id;
    const productName = card.querySelector('input[data-field="nome"]').value;

    if (!confirm(`Tem certeza que deseja excluir o produto "${productName}"?`)) return;

    try {
        const deleteResponse = await fetch(`/produtos/${productId}`, { method: 'DELETE' });
        if (deleteResponse.ok) {
            alert('Produto excluído com sucesso!');
            loadProductsAndConfig();
        } else {
             throw new Error(await deleteResponse.text());
        }
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto.');
    }
}

async function handleSingleImageUpload(event) {
    const card = event.target.closest('.admin-product-card');
    const fileInput = card.querySelector('input[type="file"].upload-single-image-file');
    const imgElement = card.querySelector('img');

    fileInput.click();

    fileInput.onchange = async () => {
        if (fileInput.files.length === 0) return;

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);

        const originalButtonText = event.target.textContent;
        event.target.textContent = 'Enviando...';
        event.target.disabled = true;

        try {
            const response = await fetch('/upload-imagem', { method: 'POST', body: formData });
            if (response.ok) {
                const result = await response.json();
                imgElement.src = result.link;
                
                const saveButton = card.querySelector('.save-btn');
                if (saveButton) {
                    saveButton.click();
                }
            } else {
                 throw new Error(await response.text());
            }
        } catch (error) {
            console.error('Erro no upload da imagem:', error);
            alert('Erro no upload da imagem.');
        } finally {
            event.target.textContent = originalButtonText;
            event.target.disabled = false;
            fileInput.value = '';
        }
    };
}

// --- Adicionar Novo Produto ---
addProductForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const newProductNameInput = document.getElementById('newProductName');
    const newProductPriceInput = document.getElementById('newProductPrice');
    const newProductCategoryInput = document.getElementById('newProductCategory');
    const newProductActiveInput = document.getElementById('newProductActive');
    const newProductImageUrlValue = document.getElementById('newProductImageUrl').value.trim();
    const newProductImageFileValue = document.getElementById('newProductImageFile').files[0];

    const isNameValid = validateField(newProductNameInput, null, newProductNameInput.value.trim() !== '', 'Nome é obrigatório.');
    const isPriceValid = validatePrice(newProductPriceInput, null);
    const isImageValid = validateField(document.getElementById('newProductImageUrl'), null, newProductImageUrlValue || newProductImageFileValue, 'Forneça uma imagem (upload ou URL).');

    if (!isNameValid || !isPriceValid || !isImageValid) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    let imageUrl = newProductImageUrlValue;
    if (newProductImageFileValue) {
        const formData = new FormData();
        formData.append('image', newProductImageFileValue);
        try {
            const uploadResponse = await fetch('/upload-imagem', { method: 'POST', body: formData });
            if (!uploadResponse.ok) throw new Error('Falha no upload da imagem.');
            imageUrl = (await uploadResponse.json()).link;
        } catch (error) {
            console.error('Erro no upload:', error);
            alert('Erro ao adicionar produto: Falha no upload da imagem.');
            return;
        }
    }

    // O ID não é mais gerado no cliente. O servidor cuidará disso.
    const newProduct = {
        nome: newProductNameInput.value.trim(),
        preco: parseFloat(newProductPriceInput.value),
        categoria: newProductCategoryInput.value.trim(),
        imagem_url: imageUrl,
        ativo: newProductActiveInput.checked
    };

    try {
        const addResponse = await fetch('/produtos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct)
        });
        if (addResponse.ok) {
            alert('Novo produto adicionado com sucesso!');
            addProductForm.reset();
            loadProductsAndConfig(); // Recarrega tudo
        } else {
            throw new Error(await addResponse.text());
        }
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        alert('Erro ao adicionar produto.');
    }
});


// --- Funções de Configurações ---
function renderConfig(config) {
    if (config) {
        document.getElementById('nomeLoja').value = config.nomeloja || '';
        document.getElementById('enderecoLoja').value = config.enderecoloja || '';
        document.getElementById('horarioFuncionamento').value = config.horariofuncionamento || '';
        
        let localWhatsapp = (config.whatsappnumber || '').replace(/\D/g, '');
        if (localWhatsapp.startsWith('55')) {
            localWhatsapp = localWhatsapp.substring(2);
        }
        document.getElementById('whatsappNumberConfig').value = localWhatsapp;
        originalWhatsappValue = localWhatsapp;

        document.getElementById('logoUrl').value = config.logourl || '';
        document.getElementById('capaUrl').value = config.capaurl || '';
    }
    showElementWithAnimation(configSection, 'block');
}

configForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const whatsappInput = document.getElementById('whatsappNumberConfig');
    let isWhatsappValid = true;
    if (!whatsappInput.disabled) {
        isWhatsappValid = validateWhatsapp(whatsappInput, document.getElementById('whatsappConfigError'));
    }

    if (!isWhatsappValid) {
        alert('Por favor, corrija o formato do número de WhatsApp.');
        return;
    }

    const updatedConfig = {
        nomeloja: document.getElementById('nomeLoja').value.trim(),
        enderecoloja: document.getElementById('enderecoLoja').value.trim(),
        horariofuncionamento: document.getElementById('horarioFuncionamento').value.trim(),
        whatsappnumber: whatsappInput.value.trim(),
        logourl: document.getElementById('logoUrl').value.trim(),
        capaurl: document.getElementById('capaUrl').value.trim()
    };

    try {
        const saveResponse = await fetch('/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig)
        });

        if (saveResponse.ok) {
            alert('Configurações salvas com sucesso!');
            whatsappInput.disabled = true;
            document.getElementById('editWhatsappBtn').style.display = 'inline-block';
            document.getElementById('cancelEditWhatsappBtn').style.display = 'none';
            // Não precisa recarregar, os dados já estão na tela
        } else {
             throw new Error(await saveResponse.text());
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        alert('Erro ao salvar configurações da loja.');
    }
});

// --- Inicialização ---
window.addEventListener('DOMContentLoaded', () => {
    loadProductsAndConfig();
});

// --- Listeners de UI ---
document.getElementById('editWhatsappBtn').addEventListener('click', () => {
    const whatsappInput = document.getElementById('whatsappNumberConfig');
    whatsappInput.disabled = false;
    whatsappInput.focus();
    document.getElementById('editWhatsappBtn').style.display = 'none';
    document.getElementById('cancelEditWhatsappBtn').style.display = 'inline-block';
});

document.getElementById('cancelEditWhatsappBtn').addEventListener('click', () => {
    const whatsappInput = document.getElementById('whatsappNumberConfig');
    whatsappInput.value = originalWhatsappValue;
    whatsappInput.disabled = true;
    document.getElementById('editWhatsappBtn').style.display = 'inline-block';
    document.getElementById('cancelEditWhatsappBtn').style.display = 'none';
    validateWhatsapp(whatsappInput, document.getElementById('whatsappConfigError'));
});

document.getElementById('whatsappNumberConfig').addEventListener('input', () => {
    const whatsappInput = document.getElementById('whatsappNumberConfig');
    validateWhatsapp(whatsappInput, document.getElementById('whatsappConfigError'));
});

document.getElementById('uploadNewImageBtn').addEventListener('click', () => {
    document.getElementById('newProductImageFile').click();
});

document.getElementById('uploadLogoBtn').addEventListener('click', () => {
    document.getElementById('logoUpload').click();
});

document.getElementById('uploadCapaBtn').addEventListener('click', () => {
    document.getElementById('capaUpload').click();
});

document.getElementById('logoUpload').addEventListener('change', () => {
    handleConfigImageUpload(document.getElementById('logoUpload'), document.getElementById('logoUrl'));
});

document.getElementById('capaUpload').addEventListener('change', () => {
    handleConfigImageUpload(document.getElementById('capaUpload'), document.getElementById('capaUrl'));
});


async function handleConfigImageUpload(fileInput, urlInput) {
    if (fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo de imagem.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);

    // Adiciona um feedback visual de "carregando"
    const originalButtonText = fileInput.previousElementSibling.textContent;
    fileInput.previousElementSibling.textContent = 'Enviando...';
    fileInput.previousElementSibling.disabled = true;

    try {
        const response = await fetch('/upload-imagem', { method: 'POST', body: formData });
        if (response.ok) {
            const result = await response.json();
            urlInput.value = result.link;
            alert('Upload de imagem bem-sucedido!');
        } else {
             throw new Error(await response.text());
        }
    } catch (error) {
        console.error('Erro no upload da imagem:', error);
        alert('Erro no upload da imagem.');
    } finally {
        // Restaura o botão
        fileInput.previousElementSibling.textContent = originalButtonText;
        fileInput.previousElementSibling.disabled = false;
        fileInput.value = ''; // Limpa o input de arquivo
    }
}
