// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuração do Pool de Conexões com PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Testar a conexão com o banco de dados ao iniciar
pool.connect()
    .then(async client => {
        console.log('Conectado ao PostgreSQL!');
        client.release();
        await createTables();
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

// Função para migrar o banco de dados
async function migrateDatabase() {
    try {
        // Adiciona a coluna 'categoria' em 'products' se não existir
        let res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='categoria'");
        if (res.rows.length === 0) {
            console.log('Migrando Tabela Products: Adicionando coluna "categoria".');
            await pool.query('ALTER TABLE products ADD COLUMN categoria TEXT');
        }

        // Adiciona a coluna 'ordem_categorias' em 'configurations' se não existir
        res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='configurations' AND column_name='ordem_categorias'");
        if (res.rows.length === 0) {
            console.log('Migrando Tabela Configurations: Adicionando coluna "ordem_categorias".');
            await pool.query('ALTER TABLE configurations ADD COLUMN ordem_categorias TEXT');
        }
        console.log('Migração do banco de dados concluída.');

    } catch (err) {
        console.error('Erro durante a migração do banco de dados:', err.stack);
    }
}

// Configuração do Multer para upload de arquivos na memória
const upload = multer({ storage: multer.memoryStorage() });

// Middlewares
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota POST para login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Validação de login no servidor usando variáveis de ambiente
    const adminUser = process.env.ADMIN_USERNAME || 'daniel';
    const adminPass = process.env.ADMIN_PASSWORD || 'lobo123';

    if (username === adminUser && password === adminPass) {
        res.status(200).json({ message: 'Login bem-sucedido' });
    } else {
        res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }
});

// Rota GET para obter todos os produtos
app.get('/produtos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY nome ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao carregar produtos.' });
    }
});

// Função para padronizar nomes de categoria
function standardizeCategory(name) {
    if (!name || typeof name !== 'string') return 'Sem Categoria';
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Sem Categoria';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// Rota POST para adicionar um NOVO produto
app.post('/produtos', async (req, res) => {
    // O ID é gerado pelo servidor (uuidv4), não pego do cliente.
    const { nome, preco, imagem_url, ativo } = req.body;
    const categoria = standardizeCategory(req.body.categoria); // Padroniza a categoria

    if (!nome || typeof preco !== 'number' || typeof ativo !== 'boolean') {
        return res.status(400).json({ error: 'Dados do novo produto inválidos.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO products (id, nome, preco, imagem_url, ativo, categoria) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [uuidv4(), nome, preco, imagem_url, ativo, categoria]
        );
        res.status(201).json({ message: 'Produto adicionado com sucesso!', product: result.rows[0] });
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        res.status(500).json({ error: 'Erro ao adicionar produto.' });
    }
});

// Rota PUT para atualizar um produto existente (CORRIGIDA E ROBUSTA)
app.put('/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, preco, imagem_url, ativo, categoria } = req.body;

    try {
        // Primeiro, busca o produto atual para garantir que ele existe
        const existingProductResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (existingProductResult.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }
        const existingProduct = existingProductResult.rows[0];

        // Constrói o objeto de atualização apenas com os campos fornecidos na requisição
        const updateData = {
            nome: nome !== undefined ? nome : existingProduct.nome,
            preco: preco !== undefined ? parseFloat(preco) : existingProduct.preco,
            imagem_url: imagem_url !== undefined ? imagem_url : existingProduct.imagem_url,
            ativo: ativo !== undefined ? Boolean(ativo) : existingProduct.ativo,
            categoria: categoria !== undefined ? standardizeCategory(categoria) : existingProduct.categoria,
        };

        // Validação para garantir que o preço é um número válido
        if (isNaN(updateData.preco)) {
            return res.status(400).json({ error: 'O preço fornecido é inválido.' });
        }

        const query = `
            UPDATE products 
            SET nome = $1, preco = $2, imagem_url = $3, ativo = $4, categoria = $5 
            WHERE id = $6 
            RETURNING *`;
        
        const values = [
            updateData.nome,
            updateData.preco,
            updateData.imagem_url,
            updateData.ativo,
            updateData.categoria,
            id
        ];

        const result = await pool.query(query, values);
        res.status(200).json({ message: 'Produto atualizado com sucesso!', product: result.rows[0] });

    } catch (error) {
        // Log detalhado do erro no servidor para facilitar a depuração
        console.error(`Erro detalhado ao atualizar produto ID ${id}:`, error);
        res.status(500).json({ error: 'Erro interno ao atualizar o produto.' });
    }
});

// Rota DELETE para excluir um produto
app.delete('/produtos/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado para exclusão.' });
        }
        res.status(200).json({ message: 'Produto excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro ao excluir produto.' });
    }
});

// Rota GET para obter as configurações da loja
app.get('/config', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configurations WHERE id = 1');
        res.json(result.rows[0] || {});
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro ao carregar configurações.' });
    }
});

// Rota POST para salvar as configurações da loja
app.post('/config', async (req, res) => {
    const newConfigData = req.body;
    try {
        const currentConfigResult = await pool.query('SELECT * FROM configurations WHERE id = 1');
        if (currentConfigResult.rows.length === 0) {
            return res.status(404).json({ error: 'Configuração não encontrada.' });
        }
        const currentConfig = currentConfigResult.rows[0];

        let whatsappNumberToSave = (newConfigData.whatsappnumber || currentConfig.whatsappnumber).replace(/\D/g, '');
        if (whatsappNumberToSave && !whatsappNumberToSave.startsWith('55')) {
            whatsappNumberToSave = '55' + whatsappNumberToSave;
        }

        // Prepara a ordem das categorias para ser salva como string JSON
        const ordemCategoriasToSave = newConfigData.ordem_categorias 
            ? JSON.stringify(newConfigData.ordem_categorias) 
            : currentConfig.ordem_categorias;

        const finalConfig = {
            nomeloja: newConfigData.nomeloja || currentConfig.nomeloja,
            enderecoloja: newConfigData.enderecoloja || currentConfig.enderecoloja,
            horariofuncionamento: newConfigData.horariofuncionamento || currentConfig.horariofuncionamento,
            whatsappnumber: whatsappNumberToSave,
            logourl: newConfigData.logourl !== undefined ? newConfigData.logourl : currentConfig.logourl,
            capaurl: newConfigData.capaurl !== undefined ? newConfigData.capaurl : currentConfig.capaurl,
            ordem_categorias: ordemCategoriasToSave
        };

        await pool.query(`
            UPDATE configurations
            SET nomeloja = $1, enderecoloja = $2, horariofuncionamento = $3, whatsappnumber = $4, logourl = $5, capaurl = $6, ordem_categorias = $7
            WHERE id = 1;
        `, [finalConfig.nomeloja, finalConfig.enderecoloja, finalConfig.horariofuncionamento, finalConfig.whatsappnumber, finalConfig.logourl, finalConfig.capaurl, finalConfig.ordem_categorias]);

        res.status(200).json({ message: 'Configurações salvas com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
});

// Rota POST para upload de imagem para o Cloudinary
app.post('/upload-imagem', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo de imagem enviado.' });
    }

    const upload_stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
            if (error) {
                console.error('Erro no upload para o Cloudinary:', error);
                return res.status(500).json({ error: 'Erro ao fazer upload da imagem.' });
            }
            // Retorna o link seguro da imagem para o front-end
            res.status(200).json({ link: result.secure_url });
        }
    );

    // Converte o buffer do arquivo em um stream e o envia para o Cloudinary
    streamifier.createReadStream(req.file.buffer).pipe(upload_stream);
});

// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Fechando pool de conexões...');
    await pool.end();
    console.log('Pool de conexões fechado.');
    process.exit(0);
});

// Rota para servir o admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
