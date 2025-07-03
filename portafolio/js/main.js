// Verificar autenticación en cada página
function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isLoginPage = window.location.pathname.includes('login.html');
    
    if (!currentUser && !isLoginPage) {
        window.location.href = 'login.html';
    } else if (currentUser && isLoginPage) {
        window.location.href = 'dashboard.html';
    }
    
    return currentUser;
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar la base de datos
    init();
    
    // Verificar autenticación
    const currentUser = checkAuth();
    
    if (currentUser) {
        // Actualizar navegación e información de usuario
        updateNavMenu(currentUser);
        updateUserInfo(currentUser);
    }
});