const API_URL = '/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMensaje');
    const btn = document.querySelector('.btn-login');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
    errorDiv.classList.remove('show');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            sessionStorage.setItem('user', JSON.stringify(data.user));
            
            if (data.user.rol === 'admin') {
                window.location.href = '/admin/control-pagos.html';
            } else {
                window.location.href = '/tecnico/alta-cliente.html';
            }
        } else {
            errorDiv.textContent = data.message || 'Credenciales incorrectas';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Error al conectar con el servidor';
        errorDiv.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// Cerrar sesión
function cerrarSesion() {
    sessionStorage.removeItem('user');
    window.location.href = '/login.html';
}