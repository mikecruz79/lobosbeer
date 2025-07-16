// scripts/login.js

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    errorMessage.style.display = 'none'; // Esconde mensagens de erro antigas

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            // Login bem-sucedido - armazena sessão via localStorage e redireciona
            localStorage.setItem('adminLoggedIn', 'true'); // Marca como logado
            window.location.href = 'admin.html'; // Redireciona para o painel
        } else {
            // Login falhou - exibe mensagem de erro vinda do servidor
            const data = await response.json();
            errorMessage.textContent = data.error || 'Erro desconhecido.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        // Erro de rede ou outro problema
        console.error('Erro ao tentar fazer login:', error);
        errorMessage.textContent = 'Não foi possível conectar ao servidor. Tente novamente.';
        errorMessage.style.display = 'block';
    }
});

// Verifica se já está logado ao carregar a página
// Se a página atual for login.html e o usuário já estiver logado, redireciona
if (window.location.pathname.endsWith('login.html') && localStorage.getItem('adminLoggedIn') === 'true') {
    window.location.href = 'admin.html';
}