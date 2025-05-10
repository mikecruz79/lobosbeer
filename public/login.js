// scripts/login.js

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Validação básica no front-end (usuário/senha fixos)
    if (username === 'daniel' && password === 'lobo123') {
        // Login bem-sucedido - armazena sessão via localStorage e redireciona
        localStorage.setItem('adminLoggedIn', 'true'); // Marca como logado
        window.location.href = 'admin.html'; // Redireciona para o painel
    } else {
        // Login falhou - exibe mensagem de erro
        errorMessage.textContent = 'Usuário ou senha incorretos.';
        errorMessage.style.display = 'block';
    }
});

// Verifica se já está logado ao carregar a página
// Se a página atual for login.html e o usuário já estiver logado, redireciona
if (window.location.pathname.endsWith('login.html') && localStorage.getItem('adminLoggedIn') === 'true') {
    window.location.href = 'admin.html';
}
