const API_URL = '/api';  // ← Global, disponible para todos los scripts

// LÓGICA DE LOGIN
if (document.getElementById('loginForm')) {
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
                // Guardamos la info en el navegador para uso visual
                sessionStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirección por Rol
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
}

// LÓGICA DE CIERRE DE SESIÓN (CORREGIDA PARA RAILWAY)
async function cerrarSesion() {
    try {
        // 1. Avisamos al servidor para que destruya la sesión de Express
        await fetch(`${API_URL}/logout`);
    } catch (error) {
        console.error('Error al cerrar sesión en servidor');
    }
    // 2. Limpiamos el navegador y redirigimos
    sessionStorage.clear();
    window.location.href = '/login.html';
}

// CARGA DE SESIÓN Y PROTECCIÓN DE RUTAS
document.addEventListener('DOMContentLoaded', () => {
    const userData = sessionStorage.getItem('user');
    const nameDisplay = document.getElementById('userNameDisplay');
    const rolBadge = document.getElementById('rolBadge');

    // Si hay datos, mostramos la info en el header
    if (userData) {
        const user = JSON.parse(userData);
        
        if (nameDisplay) {
            nameDisplay.textContent = user.nombre;
        }

        if (rolBadge) {
            rolBadge.textContent = user.rol.toUpperCase();
            // Diferenciamos visualmente el técnico del admin en el badge
            if (user.rol === 'tecnico') {
                rolBadge.style.background = 'rgba(0,0,0,0.3)';
            }
        }
    } 
    // Si NO hay sesión y no estamos en el login, rebotamos al usuario
    else if (!window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
    }
});