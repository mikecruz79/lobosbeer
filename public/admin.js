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
const uploadNewImageBtn = document.getElementById('uploadNewImageBtn'); // Botão de upload para novo produto

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

// Elementos de erro para o formulário de configurações
const whatsappConfigError = document.getElementById('whatsappConfigError');

// --- Funções de Animação (replicadas de logic.js para consistência) ---
/**
 * Mostra um elemento com animação de fade-in.
 * @param {HTMLElement} element - O elemento DOM a ser mostrado.
 * @param {string} displayType - O tipo de display CSS (ex: 'block', 'grid', 'flex').
 */
function showElementWithAnimation(element, displayType = 'block') {
    if (element) {
        element.style.display = displayType;
        // Força o reflow para garantir que a transição ocorra
        element.offsetHeight; 
        element.classList.add('fade-in');
    }
}

/**
 * Esconde um elemento com animação de fade-out, removendo-o do fluxo após a transição.
 * @param {HTMLElement} element - O elemento DOM a ser escondido.
 */
function hideElementWithAnimation(element) {
    if (element) {
        element.classList.remove('fade-in');
        setTimeout(() => {
            element.style.display = 'none';
        }, 600); // Deve corresponder à duração da transição CSS
    }
}


// --- Funções de Validação ---

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
 * Valida o campo de preço (número positivo).
 * @param {HTMLElement} inputElement - O elemento input do preço.
 * @param {HTMLElement} errorElement - O elemento onde a mensagem de erro será exibida.
 * @returns {boolean} - O resultado da validação.
 */
function validatePrice(inputElement, errorElement) {
    const price = parseFloat(inputElement.value);
    const isValid = !isNaN(price) && price >= 0;
    const errorMessage = 'Preço deve ser um número positivo.';
    return validateField(inputElement, errorElement, isValid, errorMessage);
}


// --- Funções de Produtos ---

/**
 * Carrega e exibe os produtos na tabela do painel.
 */
async function loadProducts() {
    try {
        // Adicionado timestamp para evitar cache
        const response = await fetch('/produtos?_=' + Date.now());
        if (!response.ok) {
             throw new Error(`Erro HTTP: ${response.status}`);
        }
        const products = await response.json();

        productListBody.innerHTML = ''; // Limpa a lista atual

        products.forEach(product => {
            const row = productListBody.insertRow();
            row.dataset.id = product.id; // Armazena o ID na linha

            row.innerHTML = `
                <td data-label="ID">${product.id}</td>
                <td data-label="Nome"><input type="text" value="${product.nome || ''}" data-field="nome"></td>
                <td data-label="Preço"><input type="number" step="0.01" value="${product.preco || 0}" data-field="preco"></td>
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

            // Adiciona listeners para os botões de salvar, upload e excluir individuais
            row.querySelector('.save-btn').addEventListener('click', saveProduct);
            row.querySelector('.upload-single-image-btn').addEventListener('click', handleSingleImageUpload);
            row.querySelector('.delete-btn').addEventListener('click', deleteProduct);
        });

        // Anima a seção de produtos para aparecer
        showElementWithAnimation(productsSection, 'block');

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        alert('Erro ao carregar produtos.');
    }
}

/**
 * Salva um produto individualmente.
 * @param {Event} event - O evento de clique.
 */
async function saveProduct(event) {
    const row = event.target.closest('tr'); // Encontra a linha do produto
    const productId = row.dataset.id; // Obtém o ID da linha

    const nameInput = row.querySelector(`input[data-field="nome"]`);
    const priceInput = row.querySelector(`input[data-field="preco"]`);
    const imageUrlInput = row.querySelector(`input[data-field="imagem_url"]`);
    const activeInput = row.querySelector(`input[data-field="ativo"]`);

    // Validação dos campos antes de salvar
    const isNameValid = validateField(nameInput, null, nameInput.value.trim() !== '', 'Nome é obrigatório.');
    const isPriceValid = validatePrice(priceInput, null); // Validação de preço

    if (!isNameValid || !isPriceValid) {
        alert('Por favor, corrija os campos destacados antes de salvar.');
        return;
    }


    const updatedProduct = {
        id: productId,
        nome: nameInput.value.trim(),
        preco: parseFloat(priceInput.value),
        imagem_url: imageUrlInput.value.trim(),
        ativo: activeInput.checked
    };


    try {
        // Envie o produto atualizado para o backend
        const saveResponse = await fetch(`/produtos/${productId}`, { // Rota PUT com ID
            method: 'PUT', // Usar PUT para atualizar um recurso existente
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProduct)
        });

        if (saveResponse.ok) {
            alert('Produto salvo com sucesso!');
            // Atualiza a imagem exibida caso o URL tenha mudado
            const imgElement = row.querySelector('.image-cell img');
            if (imgElement) {
                 imgElement.src = updatedProduct.imagem_url || 'https://placehold.co/50x50/EFEFEF/AAAAAA?text=Sem+Img';
            }
            // Não recarrega a lista inteira
        } else {
             const errorText = await saveResponse.text();
             throw new Error(`Erro ao salvar produto: Status ${saveResponse.status}, Resposta: ${errorText}`);
        }

    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto.');
    }
}

/**
 * Exclui um produto individualmente.
 * @param {Event} event - O evento de clique.
 */
async function deleteProduct(event) {
    const row = event.target.closest('tr'); // Encontra a linha do produto
    const productId = row.dataset.id; // Obtém o ID da linha
    const productName = row.querySelector(`input[data-field="nome"]`).value; // Obtém o nome para a confirmação


    // Confirmação antes de excluir
    if (!confirm(`Tem certeza que deseja excluir o produto "${productName}"?`)) {
        return; // Cancela a exclusão se o usuário não confirmar
    }

    try {
        // Envia a requisição DELETE para o backend
        const deleteResponse = await fetch(`/produtos/${productId}`, {
            method: 'DELETE'
        });

        if (deleteResponse.ok) {
            alert('Produto excluído com sucesso!');
            row.remove(); // Remove a linha da tabela no frontend
            // Não precisa recarregar a lista inteira
        } else {
             const errorText = await deleteResponse.text();
             throw new Error(`Erro ao excluir produto: Status ${deleteResponse.status}, Resposta: ${errorText}`);
        }

    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto.');
    }
}


// Função para lidar com o upload de imagem individual dentro da tabela
async function handleSingleImageUpload(event) {
    const row = event.target.closest('tr');
    const productId = row.dataset.id;
    const fileInput = row.querySelector(`input[type="file"].upload-single-image-file`);
    const imageUrlInput = row.querySelector(`input[data-field="imagem_url"]`);
    const imgElement = row.querySelector('.image-cell img');


    if (fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo de imagem para upload.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file); // 'image' deve corresponder ao nome do campo no backend

    try {
        const response = await fetch('/upload-imagem', {
            method: 'POST',
            body: formData // FormData não precisa de Content-Type header
        });

        if (response.ok) {
            const result = await response.json();
            const imageUrl = result.link; // Assumindo que o backend retorna { link: 'url_da_imagem' }
            imageUrlInput.value = imageUrl; // Preenche o campo de URL com o link do Imgur
             if (imgElement) {
                imgElement.src = imageUrl; // Atualiza a imagem exibida
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


// Função para lidar com o formulário de adicionar novo produto
addProductForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    const newProductNameInput = document.getElementById('newProductName');
    const newProductPriceInput = document.getElementById('newProductPrice');
    const newProductActiveInput = document.getElementById('newProductActive');
    const newProductImageUrlValue = newProductImageUrl.value.trim(); // Valor do campo de texto URL
    const newProductImageFileValue = newProductImageFile.files[0]; // Arquivo selecionado


    // Validação do formulário de adicionar novo produto
     const isNameValid = validateField(newProductNameInput, newProductNameError, newProductNameInput.value.trim() !== '', 'Nome é obrigatório.');
     const isPriceValid = validatePrice(newProductPriceInput, newProductPriceError);
     let isImageValid = true;
     if (!newProductImageUrlValue && !newProductImageFileValue) {
         isImageValid = validateField(newProductImageUrl, newProductImageError, false, 'Forneça uma imagem (upload ou URL).');
     } else {
          validateField(newProductImageUrl, newProductImageError, true, ''); // Limpa erro se imagem presente
     }


    if (!isNameValid || !isPriceValid || !isImageValid) {
        alert('Por favor, preencha todos os campos obrigatórios e corrija os erros.');
        return;
    }


    let imageUrl = newProductImageUrlValue; // Começa com o valor do campo de texto

    // Se um arquivo foi selecionado, faça o upload primeiro
    if (newProductImageFileValue) {
         const formData = new FormData();
         formData.append('image', newProductImageFileValue);

         try {
             const uploadResponse = await fetch('/upload-imagem', {
                 method: 'POST',
                 body: formData
             });

             if (uploadResponse.ok) {
                 const result = await uploadResponse.json();
                 imageUrl = result.link; // Usa o link retornado pelo Imgur
             } else {
                  const errorText = await uploadResponse.text();
                  throw new Error(`Erro no upload da imagem para novo produto: Status ${uploadResponse.status}, Resposta: ${errorText}`);
             }
         } catch (error) {
             console.error('Erro ao fazer upload da imagem para novo produto:', error);
             alert('Erro ao adicionar produto: Falha no upload da imagem.');
             return; // Interrompe se o upload falhar
         }
    }


    // Gerar um ID único simples
    const newProductId = 'prod_' + Date.now(); // Usando timestamp como base para ID único


    const newProduct = {
        id: newProductId,
        nome: newProductNameInput.value.trim(),
        preco: parseFloat(newProductPriceInput.value),
        imagem_url: imageUrl, // Usa o URL final (texto ou do Imgur)
        ativo: newProductActiveInput.checked
    };

     try {
         // Envie o novo produto para o backend
         const addResponse = await fetch('/produtos', {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json'
             },
             body: JSON.stringify(newProduct) // Envia apenas o novo produto
         });

         if (addResponse.ok) {
             alert('Novo produto adicionado com sucesso!');
             addProductForm.reset(); // Limpa o formulário
             // Limpa as classes de erro e mensagens após reset
             newProductNameInput.classList.remove('input-error');
             newProductPriceInput.classList.remove('input-error');
             newProductImageUrl.classList.remove('input-error');
             newProductNameError.style.display = 'none';
             newProductPriceError.style.display = 'none';
             newProductImageError.style.display = 'none';

             loadProducts(); // Recarrega a lista para incluir o novo produto
         } else {
              const errorText = await addResponse.text();
              throw new Error(`Erro ao adicionar produto: Status ${addResponse.status}, Resposta: ${errorText}`);
         }

     } catch (error) {
         console.error('Erro ao adicionar produto:', error);
         alert('Erro ao adicionar produto.');
     }
});

// Listener para o botão de upload no formulário de adicionar novo produto
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
         const response = await fetch('/upload-imagem', {
             method: 'POST',
             body: formData
         });

         if (response.ok) {
             const result = await response.json();
             const imageUrl = result.link;
             imageUrlInput.value = imageUrl; // Preenche o campo de URL
             alert('Upload de imagem bem-sucedido!');
              validateField(imageUrlInput, newProductImageError, true, ''); // Limpa erro de imagem após upload
         } else {
             const errorText = await response.text();
             throw new Error(`Erro no upload da imagem: Status ${response.status}, Resposta: ${errorText}`);
         }
     } catch (error) {
         console.error('Erro no upload da imagem:', error);
         alert('Erro no upload da imagem.');
          validateField(imageUrlInput, newProductImageError, false, 'Falha no upload da imagem.'); // Mostra erro de upload
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

        // Preenche o formulário com as configurações carregadas
        if (config) {
            nomeLojaInput.value = config.nomeloja || '';
            enderecoLojaInput.value = config.enderecoloja || '';
            horarioFuncionamentoInput.value = config.horariofuncionamento || '';
            whatsappNumberConfigInput.value = config.whatsappnumber || '';
            logoUrlInput.value = config.logourl || '';
            capaUrlInput.value = config.capaurl || '';
        }
        // Anima a seção de configurações para aparecer
        showElementWithAnimation(configSection, 'block');

    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        alert('Erro ao carregar configurações da loja.');
    }
}

/**
 * Salva as configurações da loja.
 * @param {Event} event - O evento de submit.
 */
configForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    // Validação dos campos de configuração
    const isWhatsappValid = whatsappNumberConfigInput.value.trim() === '' || validateWhatsapp(whatsappNumberConfigInput, whatsappConfigError);

    if (!isWhatsappValid) {
        alert('Por favor, corrija o formato do número de WhatsApp.');
        return;
    }

    const updatedConfig = {
        nomeloja: nomeLojaInput.value.trim(),
        enderecoloja: enderecoLojaInput.value.trim(),
        horariofuncionamento: horarioFuncionamentoInput.value.trim(),
        whatsappnumber: whatsappNumberConfigInput.value.trim(),
        logourl: logoUrlInput.value.trim(),
        capaurl: capaUrlInput.value.trim()
    };

    try {
        const saveResponse = await fetch('/config', {
            method: 'POST', // Usar POST para salvar as configurações
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedConfig)
        });

        if (saveResponse.ok) {
            alert('Configurações salvas com sucesso!');
            // Opcional: recarregar configurações para garantir a UI consistente
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

// Listener para o botão de upload de logo
uploadLogoBtn.addEventListener('click', async () => {
     const fileInput = document.getElementById('logoUpload');
     const imageUrlInput = document.getElementById('logoUrl');

     if (fileInput.files.length === 0) {
         alert('Por favor, selecione um arquivo de imagem para upload.');
         return;
     }

     const file = fileInput.files[0];
     const formData = new FormData();
     formData.append('image', file);

     try {
         const response = await fetch('/upload-imagem', {
             method: 'POST',
             body: formData
         });

         if (response.ok) {
             const result = await response.json();
             const imageUrl = result.link;
             imageUrlInput.value = imageUrl; // Preenche o campo de URL
             alert('Upload da Logo bem-sucedido!');
         } else {
             const errorText = await response.text();
             throw new Error(`Erro no upload da Logo: Status ${response.status}, Resposta: ${errorText}`);
         }
     } catch (error) {
         console.error('Erro no upload da Logo:', error);
         alert('Erro no upload da Logo.');
     }
});

// Listener para o botão de upload de capa
uploadCapaBtn.addEventListener('click', async () => {
     const fileInput = document.getElementById('capaUpload');
     const imageUrlInput = document.getElementById('capaUrl');

     if (fileInput.files.length === 0) {
         alert('Por favor, selecione um arquivo de imagem para upload.');
         return;
     }

     const file = fileInput.files[0];
     const formData = new FormData();
     formData.append('image', file);

     try {
         const response = await fetch('/upload-imagem', {
             method: 'POST',
             body: formData
         });

         if (response.ok) {
             const result = await response.json();
             const imageUrl = result.link;
             imageUrlInput.value = imageUrl; // Preenche o campo de URL
             alert('Upload da Imagem de Capa bem-sucedido!');
         } else {
             const errorText = await response.text();
             throw new Error(`Erro no upload da Imagem de Capa: Status ${response.status}, Resposta: ${errorText}`);
         }
     } catch (error) {
         console.error('Erro no upload da Imagem de Capa:', error);
         alert('Erro no upload da Imagem de Capa.');
     }
});


// --- Inicialização ---

// Carrega produtos e configurações ao carregar a página
// As seções começarão ocultas e serão animadas quando seus dados forem carregados.

// Adiciona um listener para carregar as seções quando o DOM estiver completamente carregado
window.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadConfig();
});

// Listener para validação do campo de WhatsApp nas configurações
whatsappNumberConfigInput.addEventListener('input', () => validateWhatsapp(whatsappNumberConfigInput, whatsappConfigError));
