// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises; // Usar a versão com Promises para async/await
const path = require('path');
const multer = require('multer'); // Para lidar com upload de arquivos
const axios = require('axios'); // Para fazer requisições HTTP (Imgur)
const { v4: uuidv4 } = require('uuid'); // Para gerar IDs únicos (opcional, mas útil)

const app = express();
const port = process.env.PORT || 3000; // Use a porta do Render ou 3000 localmente

const PRODUCTS_FILE = path.join(__dirname, 'produtos.json');
const CONFIG_FILE = path.join(__dirname, 'config.json'); // Arquivo para configurações da loja
// ** Substitua pelo seu Client ID do Imgur ou use variável de ambiente **
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID || 'f4c5ad6ad3841b1';


// Configuração do Multer para upload de arquivos na memória
const upload = multer({ storage: multer.memoryStorage() }); // Armazena o arquivo na memória

// Middleware para servir arquivos estáticos (seu HTML, CSS, JS do frontend)
app.use(express.static('public'));

// Middleware para analisar corpo de requisições JSON e URL-encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para garantir que o arquivo produtos.json exista
async function ensureProductsFileExists(req, res, next) {
    try {
        const fileExists = await fs.access(PRODUCTS_FILE).then(() => true).catch(() => false);
        if (!fileExists) {
            await fs.writeFile(PRODUCTS_FILE, '[]', 'utf8'); // Cria um array JSON vazio
            console.log('Arquivo produtos.json criado.');
        }
        next(); // Continua para a próxima rota
    } catch (error) {
        console.error('Erro ao verificar/criar produtos.json:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

// Middleware para garantir que o arquivo config.json exista
async function ensureConfigFileExists(req, res, next) {
    try {
        const fileExists = await fs.access(CONFIG_FILE).then(() => true).catch(() => false);
        if (!fileExists) {
            // Cria um arquivo de configuração inicial com valores padrão
            const defaultConfig = {
                nomeLoja: "Delivery do Daniel",
                enderecoLoja: "Endereço da Loja",
                horarioFuncionamento: "Horário de Funcionamento",
                logoUrl: "", // URL da logo
                capaUrl: "", // URL da imagem de capa
                capaFormatoPermitido: "Formatos permitidos: JPG, PNG, WebP", // Info para o admin
                whatsappNumber: "5551991778945" // Número de WhatsApp (mantido aqui para centralizar config)
            };
            await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
            console.log('Arquivo config.json criado com configurações padrão.');
        }
        next(); // Continua para a próxima rota
    } catch (error) {
        console.error('Erro ao verificar/criar config.json:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}


// Aplica o middleware para rotas que interagem com produtos e configurações
app.use(['/produtos', '/produtos/:id'], ensureProductsFileExists);
app.use('/config', ensureConfigFileExists);


// Rota GET para obter todos os produtos
app.get('/produtos', async (req, res) => {
    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
        const produtos = JSON.parse(data);
        res.json(produtos);
    } catch (error) {
        console.error('Erro ao ler produtos.json:', error);
        res.status(500).json({ error: 'Erro ao carregar produtos.' });
    }
});

// Rota POST para adicionar um NOVO produto
app.post('/produtos', async (req, res) => {
    const novoProduto = req.body; // O novo produto vem no corpo da requisição

    // Validação básica do novo produto
    if (!novoProduto || !novoProduto.nome || typeof novoProduto.preco !== 'number' || typeof novoProduto.ativo !== 'boolean') {
        return res.status(400).json({ error: 'Dados do novo produto inválidos.' });
    }

    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
        const produtos = JSON.parse(data);

        // Verifica se já existe um produto com o mesmo ID (embora o frontend gere IDs únicos)
        if (produtos.some(p => p.id === novoProduto.id)) {
             // Se o frontend gerar IDs baseados em timestamp, isso é menos provável,
             // mas é bom ter uma verificação. Pode gerar um novo ID aqui se necessário.
             console.warn(`Tentativa de adicionar produto com ID duplicado: ${novoProduto.id}`);
             novoProduto.id = 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5); // Gera um novo ID
        }

        produtos.push(novoProduto); // Adiciona o novo produto à lista

        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(produtos, null, 2), 'utf8');
        res.status(201).json({ message: 'Produto adicionado com sucesso!', product: novoProduto }); // Retorna 201 Created
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        res.status(500).json({ error: 'Erro ao adicionar produto.' });
    }
});

// Rota PUT para atualizar um produto existente pelo ID
app.put('/produtos/:id', async (req, res) => {
    const productId = req.params.id; // Obtém o ID da URL
    const updatedProductData = req.body; // Os dados atualizados vêm no corpo da requisição

     // Validação básica dos dados atualizados
    if (!updatedProductData || !updatedProductData.nome || typeof updatedProductData.preco !== 'number' || typeof updatedProductData.ativo !== 'boolean') {
        return res.status(400).json({ error: 'Dados do produto atualizado inválidos.' });
    }


    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
        let produtos = JSON.parse(data);

        const index = produtos.findIndex(p => p.id === productId);

        if (index === -1) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        // Atualiza o produto na lista
        // Garante que o ID original não seja alterado
        produtos[index] = { ...produtos[index], ...updatedProductData, id: productId };


        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(produtos, null, 2), 'utf8');
        res.status(200).json({ message: 'Produto atualizado com sucesso!', product: produtos[index] });
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
});

// Rota DELETE para excluir um produto pelo ID
app.delete('/produtos/:id', async (req, res) => {
    const productId = req.params.id; // Obtém o ID da URL

    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
        let produtos = JSON.parse(data);

        const initialLength = produtos.length;
        // Filtra a lista, removendo o produto com o ID correspondente
        produtos = produtos.filter(p => p.id !== productId);

        if (produtos.length === initialLength) {
            return res.status(404).json({ error: 'Produto não encontrado para exclusão.' });
        }

        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(produtos, null, 2), 'utf8');
        res.status(200).json({ message: 'Produto excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro ao excluir produto.' });
    }
});


// Rota GET para obter as configurações da loja
app.get('/config', async (req, res) => {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        res.json(config);
    } catch (error) {
        console.error('Erro ao ler config.json:', error);
        res.status(500).json({ error: 'Erro ao carregar configurações.' });
    }
});

// Rota POST para salvar as configurações da loja
app.post('/config', async (req, res) => {
    const newConfig = req.body; // As novas configurações vêm no corpo da requisição

    // Validação básica das configurações (pode ser expandida)
     if (!newConfig || !newConfig.nomeLoja || !newConfig.enderecoLoja || !newConfig.horarioFuncionamento || !newConfig.whatsappNumber) {
         return res.status(400).json({ error: 'Dados de configuração inválidos.' });
     }


    try {
        await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
        res.status(200).json({ message: 'Configurações salvas com sucesso!' });
    } catch (error) {
        console.error('Erro ao escrever config.json:', error);
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
});


// Rota POST para upload de imagem para o Imgur
app.post('/upload-imagem', upload.single('image'), async (req, res) => {
    // 'image' é o nome do campo 'name' no input type="file" do frontend
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo de imagem enviado.' });
    }

    // Validação do tipo de arquivo (apenas imagens permitidas)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Formato de arquivo não permitido. Use JPG, PNG ou WebP.' });
    }

    // Verifica se o Client ID do Imgur foi configurado
    if (IMGUR_CLIENT_ID === 'SEU_CLIENT_ID_DO_IMGUR' || !IMGUR_CLIENT_ID) {
         console.error("Client ID do Imgur não configurado!");
         return res.status(500).json({ error: 'Client ID do Imgur não configurado no backend.' });
    }


    try {
        // Envia a imagem para a API do Imgur
        const imgurResponse = await axios.post('https://api.imgur.com/3/image', req.file.buffer, { // Usa req.file.buffer com memoryStorage
            headers: {
                'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`,
                'Content-Type': req.file.mimetype // Usa o tipo MIME do arquivo
            }
        });

        // Verifica se o upload para o Imgur foi bem-sucedido
        if (imgurResponse.data && imgurResponse.data.success) {
            // Retorna o link da imagem hospedada no Imgur
            res.status(200).json({ link: imgurResponse.data.data.link });
        } else {
            console.error('Erro na resposta do Imgur:', imgurResponse.data);
            res.status(imgurResponse.status || 500).json({ error: 'Erro ao fazer upload para o Imgur.', details: imgurResponse.data });
        }

    } catch (error) {
        console.error('Erro ao enviar imagem para o Imgur:', error.message);
        // Tenta extrair mais detalhes se for um erro de resposta do Imgur
        if (error.response && error.response.data) {
             console.error('Resposta de erro do Imgur:', error.response.data);
             res.status(error.response.status || 500).json({ error: 'Erro ao fazer upload para o Imgur.', details: error.response.data });
        } else {
             res.status(500).json({ error: 'Erro interno ao fazer upload da imagem.' });
        }
    }
});


// Rota raiz redireciona para a página principal do delivery
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Site de Delivery em http://localhost:${port}`);
    console.log(`Painel administrativo em http://localhost:${port}/login.html`);
});
