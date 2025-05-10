// scripts/config.js

// Configurações globais para o app de Delivery

// Número de WhatsApp (apenas dígitos, incluindo código do país e DDD)
const WHATSAPP_NUMBER = "5551999999999"; // Exemplo: 55 (Brasil) 51 (DDD RS) 999999999 (Número)

// URL da sua planilha pública (JSON) ou endpoint da API que retorna o catálogo
// Certifique-se de que este URL retorne um array de objetos com as propriedades esperadas (id, nome, preco, imagem_url, ativo)
const CATALOGO_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStR9VM8h2X4j87lsHmBzH-NjrS-k6LMKhEuxfmcLVWt_D-A9Yplbc_309TB_WkWa-oRbpvXYob-Avj/pub?output=json";
