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
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='products' AND column_name='categoria'
        `);
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
const upload = multer({ storage: multer.memoryStorage() });

// Middlewares
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Rota POST para adicionar um NOVO produto
app.post('/produtos', async (req, res) => {
    const { nome, preco, imagem_url, ativo, categoria } = req.body;
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

// Rota PUT para atualizar um produto existente
app.put('/produtos/:id', async (req, res) => {
    const { nome, preco, imagem_url, ativo, categoria } = req.body;
    if (!nome || typeof preco !== 'number' || typeof ativo !== 'boolean') {
        return res.status(400).json({ error: 'Dados do produto atualizado inválidos.' });
    }
    try {
        const result = await pool.query(
            'UPDATE products SET nome = $1, preco = $2, imagem_url = $3, ativo = $4, categoria = $5 WHERE id = $6 RETURNING *',
            [nome, preco, imagem_url, ativo, categoria, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }
        res.status(200).json({ message: 'Produto atualizado com sucesso!', product: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto.' });
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

        const finalConfig = {
            nomeloja: newConfigData.nomeloja || currentConfig.nomeloja,
            enderecoloja: newConfigData.enderecoloja || currentConfig.enderecoloja,
            horariofuncionamento: newConfigData.horariofuncionamento || currentConfig.horariofuncionamento,
            whatsappnumber: whatsappNumberToSave,
            logourl: newConfigData.logourl !== undefined ? newConfigData.logourl : currentConfig.logourl,
            capaurl: newConfigData.capaurl !== undefined ? newConfigData.capaurl : currentConfig.capaurl
        };

        await pool.query(`
            UPDATE configurations
            SET nomeloja = $1, enderecoloja = $2, horariofuncionamento = $3, whatsappnumber = $4, logourl = $5, capaurl = $6
            WHERE id = 1;
        `, [finalConfig.nomeloja, finalConfig.enderecoloja, finalConfig.horariofuncionamento, finalConfig.whatsappnumber, finalConfig.logourl, finalConfig.capaurl]);

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