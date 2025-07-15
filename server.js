// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer'); // Para lidar com upload de arquivos
const axios = require('axios'); // Para fazer requisições HTTP (Imgur)
const { v4: uuidv4 } = require('uuid'); // Para gerar IDs únicos
const { Pool } = require('pg'); // Importar a biblioteca pg

const app = express();
const port = process.env.PORT || 3000; // Use a porta do Render ou 3000 localmente

// ** Substitua pelo seu Client ID do Imgur ou use variável de ambiente **
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID || 'f4c5ad6ad3841b1';

// Configuração do Pool de Conexões com PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Render configura esta variável
    ssl: {
        rejectUnauthorized: false // Necessário para Render com SSL
    }
});

// Testar a conexão com o banco de dados ao iniciar
pool.connect()
    .then(async client => {
        console.log('Conectado ao PostgreSQL!');
        client.release(); // Libera o cliente
        // Criar tabelas se não existirem
        await createTables();
        // Roda a migração para garantir que colunas novas existam
        await migrateDatabase();
    })
    .catch(err => console.error('Erro ao conectar ao PostgreSQL:', err.stack));

// Função para criar tabelas
async function createTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                preco NUMERIC(10, 2) NOT NULL,
                imagem_url TEXT,
                ativo BOOLEAN NOT NULL DEFAULT TRUE,
                categoria TEXT
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configurations (
                id INTEGER PRIMARY KEY DEFAULT 1,
                nomeloja TEXT NOT NULL,
                enderecoloja TEXT NOT NULL,
                horariofuncionamento TEXT NOT NULL,
                whatsappnumber TEXT NOT NULL,
                logourl TEXT,
                capaurl TEXT
            );
        `);
        console.log('Tabelas "products" e "configurations" verificadas/criadas.');

        // Insert default config if none exists
        const result = await pool.query('SELECT COUNT(*) FROM configurations');
        if (parseInt(result.rows[0].count) === 0) {
            const defaultConfig = {
                nomeloja: "Delivery do Daniel",
                enderecoloja: "Endereço da Loja",
                horariofuncionamento: "Horário de Funcionamento",
                whatsappnumber: "5551991778945",
                logourl: "",
                capaurl: ""
            };
            await pool.query(`
                INSERT INTO configurations (nomeloja, enderecoloja, horariofuncionamento, whatsappnumber, logourl, capaurl)
                VALUES ($1, $2, $3, $4, $5, $6);
            `, [defaultConfig.nomeloja, defaultConfig.enderecoloja, defaultConfig.horariofuncionamento, defaultConfig.whatsappnumber, defaultConfig.logourl, defaultConfig.capaurl]);
            console.log('Configurações padrão inseridas.');
        }

    } catch (err) {
        console.error('Erro ao criar tabelas ou inserir config inicial:', err.stack);
    }
}

// Função para migrar o banco de dados (adicionar colunas, etc.)
async function migrateDatabase() {
    try {
        // Verifica se a coluna 'categoria' existe na tabela 'products'
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='products' AND column_name='categoria'
        `);
        
        // Se a coluna não existir, adiciona-a
        if (res.rows.length === 0) {
            console.log('Migrando banco de dados: Adicionando coluna "categoria" na tabela "products".');
            await pool.query('ALTER TABLE products ADD COLUMN categoria TEXT');
            console.log('Migração concluída com sucesso.');
        }
    } catch (err) {
        console.error('Erro durante a migração do banco de dados:', err.stack);
    }
}

// Configuração do Multer para upload de arquivos na memória
const upload = multer({ storage: multer.memoryStorage() }); // Armazena o arquivo na memória

// Middleware para servir arquivos estáticos (seu HTML, CSS, JS do frontend)
app.use(express.static('public'));

// Middleware para analisar corpo de requisições JSON e URL-encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Rota GET para obter todos os produtos
app.get('/produtos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY nome ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar produtos do banco de dados:', error);
        res.status(500).json({ error: 'Erro ao carregar produtos.' });
    }
});

// Rota POST para adicionar um NOVO produto
app.post('/produtos', async (req, res) => {
    const { nome, preco, imagem_url, ativo, categoria } = req.body;
    const id = uuidv4(); // Gerar um ID único usando uuid

    // Validação básica
    if (!nome || typeof preco !== 'number' || typeof ativo !== 'boolean') {
        return res.status(400).json({ error: 'Dados do novo produto inválidos. Nome, preço e ativo são obrigatórios.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO products (id, nome, preco, imagem_url, ativo, categoria) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [id, nome, preco, imagem_url, ativo, categoria]
        );
        res.status(201).json({ message: 'Produto adicionado com sucesso!', product: result.rows[0] });
    } catch (error) {
        console.error('Erro ao adicionar produto no banco de dados:', error);
        res.status(500).json({ error: 'Erro ao adicionar produto.' });
    }
});

// Rota PUT para atualizar um produto existente pelo ID
app.put('/produtos/:id', async (req, res) => {
    const productId = req.params.id;
    const { nome, preco, imagem_url, ativo, categoria } = req.body;

    // Validação básica
    if (!nome || typeof preco !== 'number' || typeof ativo !== 'boolean') {
        return res.status(400).json({ error: 'Dados do produto atualizado inválidos. Nome, preço e ativo são obrigatórios.' });
    }

    try {
        const result = await pool.query(
            'UPDATE products SET nome = $1, preco = $2, imagem_url = $3, ativo = $4, categoria = $5 WHERE id = $6 RETURNING *',
            [nome, preco, imagem_url, ativo, categoria, productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }
        res.status(200).json({ message: 'Produto atualizado com sucesso!', product: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar produto no banco de dados:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
});

// Rota DELETE para excluir um produto pelo ID
app.delete('/produtos/:id', async (req, res) => {
    const productId = req.params.id;

    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado para exclusão.' });
        }
        res.status(200).json({ message: 'Produto excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir produto do banco de dados:', error);
        res.status(500).json({ error: 'Erro ao excluir produto.' });
    }
});


// Rota GET para obter as configurações da loja
app.get('/config', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configurations WHERE id = 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            // Return a default config if nothing is in the database
            const defaultConfig = {
                nomeloja: "Delivery do Daniel",
                enderecoloja: "Endereço da Loja",
                horariofuncionamento: "Horário de Funcionamento",
                whatsappnumber: "5551991778945",
                logourl: "",
                capaurl: ""
            };
            res.json(defaultConfig);
        }
    } catch (error) {
        console.error('Erro ao buscar configurações do banco de dados:', error);
        res.status(500).json({ error: 'Erro ao carregar configurações.' });
    }
});

// Rota POST para salvar as configurações da loja
app.post('/config', async (req, res) => {
    const newConfigData = req.body;

    try {
        // 1. Buscar a configuração atual do banco de dados
        const currentConfigResult = await pool.query('SELECT * FROM configurations WHERE id = 1');
        if (currentConfigResult.rows.length === 0) {
            return res.status(404).json({ error: 'Configuração não encontrada para atualizar.' });
        }
        const currentConfig = currentConfigResult.rows[0];

        // 2. Processar e formatar os dados recebidos
        let whatsappNumberToSave = newConfigData.whatsappnumber || currentConfig.whatsappnumber;
        // Limpa o número para garantir que tenha apenas dígitos
        whatsappNumberToSave = whatsappNumberToSave.replace(/\D/g, '');
        // Adiciona o código do país (55) se não estiver presente
        if (whatsappNumberToSave && !whatsappNumberToSave.startsWith('55')) {
            whatsappNumberToSave = '55' + whatsappNumberToSave;
        }

        const finalConfig = {
            nomeloja: newConfigData.nomeloja || currentConfig.nomeloja,
            enderecoloja: newConfigData.enderecoloja || currentConfig.enderecoloja,
            horariofuncionamento: newConfigData.horariofuncionamento || currentConfig.horariofuncionamento,
            whatsappnumber: whatsappNumberToSave,
            logourl: newConfigData.logourl !== undefined ? newConfigData.logourl : currentConfig.logourl,
            capaurl: newConfigData.capaurl !== undefined ? newConfigData.capaurl : currentConfig.capaurl
        };

        // 3. Atualizar o banco de dados com a configuração final
        await pool.query(`
            UPDATE configurations
            SET nomeloja = $1, enderecoloja = $2, horariofuncionamento = $3, whatsappnumber = $4, logourl = $5, capaurl = $6
            WHERE id = 1;
        `, [finalConfig.nomeloja, finalConfig.enderecoloja, finalConfig.horariofuncionamento, finalConfig.whatsappnumber, finalConfig.logourl, finalConfig.capaurl]);

        res.status(200).json({ message: 'Configurações salvas com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar configurações no banco de dados:', error);
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
