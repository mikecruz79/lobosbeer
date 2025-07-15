// scripts/admin.js

// Verifica se o usuário está logado ao carregar a página
// Redireciona para o login se não estiver logado
if (localStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

// Adiciona listener para o botão de logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('adminLoggedIn'); // Remove a marcação de logado
    window.location.href = 'login.html'; // Redireciona para a página de login
});

// Seleção de elementos do DOM para produtos e seções do admin
const productListBody = document.querySelector('#productList tbody');
const addProductForm = document.getElementById('addProductForm');
const newProductImageFile = document.getElementById('newProductImageFile');
const newProductImageUrl = document.getElementById('newProductImageUrl');
const uploadNewImageBtn = document.getElementById('uploadNewImageBtn');

const configSection = document.querySelector('.config-section');
const productsSection = document.querySelector('.products-section');

// Elementos de erro para o formulário de adicionar novo produto
const newProductNameError = document.getElementById('newProductNameError');
const newProductPriceError = document.getElementById('newProductPriceError');
const newProductImageError = document.getElementById('newProductImageError');

// Seleção de elementos do DOM para configurações
const configForm = document.getElementById('configForm');
const nomeLojaInput = document.getElementById('nomeLoja');
const enderecoLojaInput = document.getElementById('enderecoLoja');
const horarioFuncionamentoInput = document.getElementById('horarioFuncionamento');
const whatsappNumberConfigInput = document.getElementById('whatsappNumberConfig');
const logoUrlInput = document.getElementById('logoUrl');
const logoUploadInput = document.getElementById('logoUpload');
const capaUrlInput = document.getElementById('capaUrl');
const capaUploadInput = document.getElementById('capaUpload');
const uploadLogoBtn = document.getElementById('uploadLogoBtn');
const uploadCapaBtn = document.getElementById('uploadCapaBtn');
const editWhatsappBtn = document.getElementById('editWhatsappBtn');
const cancelEditWhatsappBtn = document.getElementById('cancelEditWhatsappBtn');

// Elementos de erro para o formulário de configurações
const whatsappConfigError = document.getElementById('whatsappConfigError');

// Variável para guardar o valor original do WhatsApp ao editar
let originalWhatsappValue = '';

// --- Funções de Animação ---
function showElementWithAnimation(element, displayType = 'block') {
    if (element) {
        element.style.display = displayType;
        element.offsetHeight;
        element.classList.add('fade-in');
    }
}

function hideElementWithAnimation(element) {
    if (element) {
        element.classList.remove('fade-in');
        setTimeout(() => {
            element.style.display = 'none';
        }, 600);
    }
}

// --- Funções de Validação ---
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

/**
 * Valida o campo de WhatsApp (apenas números, exatamente 11 dígitos).
 * @param {HTMLElement} inputElement - O elemento input do WhatsApp.
 * @param {HTMLElement} errorElement - O elemento onde a mensagem de erro será exibida.
 * @returns {boolean} - O resultado da validação.
 */
function validateWhatsapp(inputElement, errorElement) {
    const whatsapp = inputElement.value.trim();
    const numericWhatsapp = whatsapp.replace(/\D/g, '');
    inputElement.value = numericWhatsapp;
    const isValid = numericWhatsapp.length === 11;
    const errorMessage = 'Deve conter exatamente 11 dígitos (DDD + Número).';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}

function validatePrice(inputElement, errorElement) {
    const price = parseFloat(inputElement.value);
    const isValid = !isNaN(price) && price >= 0;
    const errorMessage = 'Preço deve ser um número positivo.';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}

// --- Funções de Produtos (sem alterações) ---
async function loadProducts() {
    try {
        const response = await fetch('/produtos?_=' + Date.now());
        if (!response.ok) {
             throw new Error(`Erro HTTP: ${response.status}`);
        }
        const products = await response.json();
        productListBody.innerHTML = '';
        products.forEach(product => {
            const row = productListBody.insertRow();
            row.dataset.id = product.id;
            row.innerHTML = `
                <td data-label="ID">${product.id}</td>
                <td data-label="Nome"><input type="text" value="${product.nome || ''}" data-field="nome"></td>
                <td data-label="Preço"><input type="number" step="0.01" value="${product.preco || 0}" data-field="preco"></td>
                <td data-label="Categoria"><input type="text" value="${product.categoria || ''}" data-field="categoria"></td>
                <td data-label="Imagem" class="image-cell">
                    <input type="text" value="${product.imagem_url || ''}" data-field="imagem_url">
                    <input type="file" accept="image/*" class="upload-single-image-file">
                    <button type="button" class="upload-single-image-btn">Upload</button>
                    <img src="${product.imagem_url || 'https://placehold.co/50x50/EFEFEF/AAAAAA?text=Sem+Img'}" alt="${product.nome || 'Sem Img'}" width="50" onerror="this.onerror=null; this.src='https://placehold.co/50x50/EFEFEF/AAAAAA?text=Erro+Img';">
                </td>
                <td data-label="Ativo"><input type="checkbox" ${product.ativo ? 'checked' : ''} data-field="ativo"></td>
                <td data-label="Ações">
                    <button class="save-btn">Salvar</button>
                    <button class="delete-btn">Excluir</button>
                </td>
            `;
            row.querySelector('.save-btn').addEventListener('click', saveProduct);
            row.querySelector('.upload-single-image-btn').addEventListener('click', handleSingleImageUpload);
            row.querySelector('.delete-btn').addEventListener('click', deleteProduct);
        });
        showElementWithAnimation(productsSection, 'block');
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        alert('Erro ao carregar produtos.');
    }
}

async function saveProduct(event) {
    const row = event.target.closest('tr');
    const productId = row.dataset.id;
    const nameInput = row.querySelector(`input[data-field="nome"]`);
    const priceInput = row.querySelector(`input[data-field="preco"]`);
    const categoryInput = row.querySelector(`input[data-field="categoria"]`);
    const imageUrlInput = row.querySelector(`input[data-field="imagem_url"]`);
    const activeInput = row.querySelector(`input[data-field="ativo"]`);

    const isNameValid = validateField(nameInput, null, nameInput.value.trim() !== '', 'Nome é obrigatório.');
    const isPriceValid = validatePrice(priceInput, null);

    if (!isNameValid || !isPriceValid) {
        alert('Por favor, corrija os campos destacados antes de salvar.');
        return;
    }

    const updatedProduct = {
        id: productId,
        nome: nameInput.value.trim(),
        preco: parseFloat(priceInput.value),
        categoria: categoryInput.value.trim(),
        imagem_url: imageUrlInput.value.trim(),
        ativo: activeInput.checked
    };

    try {
        const saveResponse = await fetch(`/produtos/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProduct)
        });
        if (saveResponse.ok) {
            alert('Produto salvo com sucesso!');
            const imgElement = row.querySelector('.image-cell img');
            if (imgElement) {
                 imgElement.src = updatedProduct.imagem_url || 'https://placehold.co/50x50/EFEFEF/AAAAAA?text=Sem+Img';
            }
        } else {
             const errorText = await saveResponse.text();
             throw new Error(`Erro ao salvar produto: Status ${saveResponse.status}, Resposta: ${errorText}`);
        }
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto.');
    }
}

async function deleteProduct(event) {
    const row = event.target.closest('tr');
    const productId = row.dataset.id;
    const productName = row.querySelector(`input[data-field="nome"]`).value;

    if (!confirm(`Tem certeza que deseja excluir o produto "${productName}"?`)) {
        return;
    }

    try {
        const deleteResponse = await fetch(`/produtos/${productId}`, { method: 'DELETE' });
        if (deleteResponse.ok) {
            alert('Produto excluído com sucesso!');
            row.remove();
        } else {
             const errorText = await deleteResponse.text();
             throw new Error(`Erro ao excluir produto: Status ${deleteResponse.status}, Resposta: ${errorText}`);
        }
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto.');
    }
}

async function handleSingleImageUpload(event) {
    const row = event.target.closest('tr');
    const fileInput = row.querySelector(`input[type="file"].upload-single-image-file`);
    const imageUrlInput = row.querySelector(`input[data-field="imagem_url"]`);
    const imgElement = row.querySelector('.image-cell img');

    if (fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo de imagem para upload.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/upload-imagem', { method: 'POST', body: formData });
        if (response.ok) {
            const result = await response.json();
            imageUrlInput.value = result.link;
             if (imgElement) {
                imgElement.src = result.link;
             }
            alert('Upload de imagem bem-sucedido!');
        } else {
             const errorText = await response.text();
             throw new Error(`Erro no upload da imagem: Status ${response.status}, Resposta: ${errorText}`);
        }
    } catch (error) {
        console.error('Erro no upload da imagem:', error);
        alert('Erro no upload da imagem.');
    }
}

addProductForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const newProductNameInput = document.getElementById('newProductName');
    const newProductPriceInput = document.getElementById('newProductPrice');
    const newProductCategoryInput = document.getElementById('newProductCategory');
    const newProductActiveInput = document.getElementById('newProductActive');
    const newProductImageUrlValue = newProductImageUrl.value.trim();
    const newProductImageFileValue = newProductImageFile.files[0];

     const isNameValid = validateField(newProductNameInput, newProductNameError, newProductNameInput.value.trim() !== '', 'Nome é obrigatório.');
     const isPriceValid = validatePrice(newProductPriceInput, newProductPriceError);
     let isImageValid = true;
     if (!newProductImageUrlValue && !newProductImageFileValue) {
         isImageValid = validateField(newProductImageUrl, newProductImageError, false, 'Forneça uma imagem (upload ou URL).');
     } else {
          validateField(newProductImageUrl, newProductImageError, true, '');
     }

    if (!isNameValid || !isPriceValid || !isImageValid) {
        alert('Por favor, preencha todos os campos obrigatórios e corrija os erros.');
        return;
    }

    let imageUrl = newProductImageUrlValue;
    if (newProductImageFileValue) {
         const formData = new FormData();
         formData.append('image', newProductImageFileValue);
         try {
             const uploadResponse = await fetch('/upload-imagem', { method: 'POST', body: formData });
             if (uploadResponse.ok) {
                 imageUrl = (await uploadResponse.json()).link;
             } else {
                  throw new Error(`Erro no upload: ${uploadResponse.statusText}`);
             }
         } catch (error) {
             console.error('Erro ao fazer upload da imagem para novo produto:', error);
             alert('Erro ao adicionar produto: Falha no upload da imagem.');
             return;
         }
    }

    const newProduct = {
        id: 'prod_' + Date.now(),
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
             [newProductNameInput, newProductPriceInput, newProductImageUrl].forEach(el => el.classList.remove('input-error'));
             [newProductNameError, newProductPriceError, newProductImageError].forEach(el => el.style.display = 'none');
             loadProducts();
         } else {
              const errorText = await addResponse.text();
              throw new Error(`Erro ao adicionar produto: Status ${addResponse.status}, Resposta: ${errorText}`);
         }
     } catch (error) {
         console.error('Erro ao adicionar produto:', error);
         alert('Erro ao adicionar produto.');
     }
});

uploadNewImageBtn.addEventListener('click', async () => {
     const fileInput = document.getElementById('newProductImageFile');
     const imageUrlInput = document.getElementById('newProductImageUrl');
     if (fileInput.files.length === 0) {
         alert('Por favor, selecione um arquivo de imagem para upload.');
         return;
     }
     const file = fileInput.files[0];
     const formData = new FormData();
     formData.append('image', file);
     try {
         const response = await fetch('/upload-imagem', { method: 'POST', body: formData });
         if (response.ok) {
             imageUrlInput.value = (await response.json()).link;
             alert('Upload de imagem bem-sucedido!');
             validateField(imageUrlInput, newProductImageError, true, '');
         } else {
             throw new Error(`Erro no upload: ${response.statusText}`);
         }
     } catch (error) {
         console.error('Erro no upload da imagem:', error);
         alert('Erro no upload da imagem.');
         validateField(imageUrlInput, newProductImageError, false, 'Falha no upload da imagem.');
     }
});

// --- Funções de Configurações ---

/**
 * Carrega as configurações da loja para o formulário no painel.
 */
async function loadConfig() {
    try {
        const response = await fetch('/config');
        if (!response.ok) {
             throw new Error(`Erro HTTP: ${response.status}`);
        }
        const config = await response.json();

        if (config) {
            nomeLojaInput.value = config.nomeloja || '';
            enderecoLojaInput.value = config.enderecoloja || '';
            horarioFuncionamentoInput.value = config.horariofuncionamento || '';
            
            // Exibe o número de WhatsApp local (remove o prefixo 55)
            let localWhatsapp = config.whatsappnumber || '';
            if (localWhatsapp.startsWith('55')) {
                localWhatsapp = localWhatsapp.substring(2);
            }
            whatsappNumberConfigInput.value = localWhatsapp;
            originalWhatsappValue = localWhatsapp; // Guarda o valor original

            logoUrlInput.value = config.logourl || '';
            capaUrlInput.value = config.capaurl || '';
        }
        showElementWithAnimation(configSection, 'block');
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        alert('Erro ao carregar configurações da loja.');
    }
}

/**
 * Salva as configurações da loja.
 */
configForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    // Valida o WhatsApp apenas se o campo estiver habilitado
    let isWhatsappValid = true;
    if (!whatsappNumberConfigInput.disabled) {
        isWhatsappValid = validateWhatsapp(whatsappNumberConfigInput, whatsappConfigError);
    }

    if (!isWhatsappValid) {
        alert('Por favor, corrija o formato do número de WhatsApp.');
        return;
    }

    const updatedConfig = {
        nomeloja: nomeLojaInput.value.trim(),
        enderecoloja: enderecoLojaInput.value.trim(),
        horariofuncionamento: horarioFuncionamentoInput.value.trim(),
        whatsappnumber: whatsappNumberConfigInput.value.trim(), // Envia o número local
        logourl: logoUrlInput.value.trim(),
        capaurl: capaUrlInput.value.trim()
    };

    try {
        const saveResponse = await fetch('/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig)
        });

        if (saveResponse.ok) {
            alert('Configurações salvas com sucesso!');
            // Trava o campo de WhatsApp novamente e recarrega as configs
            whatsappNumberConfigInput.disabled = true;
            editWhatsappBtn.style.display = 'inline-block';
            cancelEditWhatsappBtn.style.display = 'none';
            loadConfig();
        } else {
             const errorText = await saveResponse.text();
             throw new Error(`Erro ao salvar configurações: Status ${saveResponse.status}, Resposta: ${errorText}`);
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        alert('Erro ao salvar configurações da loja.');
    }
});

// Listeners para os botões de upload de imagem
uploadLogoBtn.addEventListener('click', () => handleImageUpload(logoUpload, logoUrlInput, 'Logo'));
uploadCapaBtn.addEventListener('click', () => handleImageUpload(capaUpload, capaUrlInput, 'Capa'));

async function handleImageUpload(fileInput, urlInput, type) {
    if (fileInput.files.length === 0) {
        alert(`Por favor, selecione um arquivo de imagem para a ${type}.`);
        return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);
    try {
        const response = await fetch('/upload-imagem', { method: 'POST', body: formData });
        if (response.ok) {
            urlInput.value = (await response.json()).link;
            alert(`Upload da ${type} bem-sucedido!`);
        } else {
            throw new Error(`Erro no upload da ${type}: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Erro no upload da ${type}:`, error);
        alert(`Erro no upload da ${type}.`);
    }
}

// --- Inicialização e Listeners de UI ---

// Botões para editar/cancelar edição do WhatsApp
editWhatsappBtn.addEventListener('click', () => {
    whatsappNumberConfigInput.disabled = false;
    whatsappNumberConfigInput.focus();
    editWhatsappBtn.style.display = 'none';
    cancelEditWhatsappBtn.style.display = 'inline-block';
});

cancelEditWhatsappBtn.addEventListener('click', () => {
    whatsappNumberConfigInput.value = originalWhatsappValue; // Restaura o valor original
    whatsappNumberConfigInput.disabled = true;
    editWhatsappBtn.style.display = 'inline-block';
    cancelEditWhatsappBtn.style.display = 'none';
    validateWhatsapp(whatsappNumberConfigInput, whatsappConfigError); // Limpa qualquer erro
});

// Carrega dados ao iniciar
window.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadConfig();
});

// Validação em tempo real
whatsappNumberConfigInput.addEventListener('input', () => validateWhatsapp(whatsappNumberConfigInput, whatsappConfigError));