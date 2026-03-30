// ========================================
// AUTENTICACIÓN - FIBERTEC
// ========================================

const API_URL = '/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMensaje');
    const btnSubmit = document.querySelector('.btn-login');
    const textoOriginal = btnSubmit.innerHTML;
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
    errorDiv.classList.remove('show');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            sessionStorage.setItem('user', JSON.stringify(data.user));
            
            if (data.user.rol === 'admin') {
                window.location.href = '/admin/control-pagos.html';
            } else {
                window.location.href = '/tecnico/lista-clientes.html';
            }
        } else {
            errorDiv.textContent = data.message || 'Credenciales incorrectas';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Error al conectar con el servidor';
        errorDiv.classList.add('show');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textoOriginal;
    }
});