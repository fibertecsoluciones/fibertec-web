// ========================================
// ADMINISTRAR USUARIOS - FIBERTEC
// ========================================

const API_URL = '/api';

let usuariosGlobal = [];

function verificarAutenticacion() {
    const user = sessionStorage.getItem('user');
    if (!user) {
        window.location.href = '/login.html';
        return null;
    }
    const userData = JSON.parse(user);
    if (userData.rol !== 'admin') {
        window.location.href = '/tecnico/lista-clientes.html';
        return null;
    }
    return userData;
}

async function cargarUsuarios() {
    try {
        const response = await fetch(`${API_URL}/usuarios`);
        if (!response.ok) throw new Error('Error al cargar usuarios');
        usuariosGlobal = await response.json();
        actualizarTabla();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('tablaUsuariosBody').innerHTML = `
            <tr class="sin-registros"><td colspan="7"><div class="sin-usuarios"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar usuarios</p></div></td></tr>
        `;
    }
}

function actualizarTabla() {
    const tbody = document.getElementById('tablaUsuariosBody');
    
    if (usuariosGlobal.length === 0) {
        tbody.innerHTML = `<tr class="sin-registros"><td colspan="7"><div class="sin-usuarios"><i class="fas fa-database"></i><p>No hay usuarios registrados</p></div></td></tr>`;
        return;
    }
    
    tbody.innerHTML = usuariosGlobal.map(u => `
        <tr>
            <td>${u.id}</td>
            <td><strong>${escapeHtml(u.nombre)}</strong></td>
            <td>${u.email}</td>
            <td><span class="${u.rol === 'admin' ? 'badge-admin' : 'badge-tecnico'}">${u.rol === 'admin' ? '👑 Administrador' : '👨‍🔧 Técnico'}</span></td>
            <td><span class="${u.activo ? 'estado-activo' : 'estado-inactivo'}">${u.activo ? '✅ Activo' : '❌ Inactivo'}</span></td>
            <td>${u.fecha_registro?.split('T')[0] || '-'}</td>
            <td>
                <button class="btn-accion btn-editar" onclick="editarUsuario(${u.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-accion btn-eliminar" onclick="eliminarUsuario(${u.id})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
             </td>
        </tr>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const modal = document.getElementById('modalUsuario');
const closeModal = document.getElementById('closeModal');
const btnCancelar = document.getElementById('btnCancelarModal');
const btnNuevo = document.getElementById('btnNuevoUsuario');
const form = document.getElementById('formUsuario');

let usuarioEditando = null;

btnNuevo.addEventListener('click', () => {
    usuarioEditando = null;
    document.getElementById('modalTitulo').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Usuario';
    document.getElementById('passwordRequerido').innerHTML = '*';
    document.getElementById('password').required = true;
    form.reset();
    document.getElementById('usuarioId').value = '';
    document.getElementById('activo').value = 'true';
    modal.classList.add('active');
});

closeModal.addEventListener('click', () => modal.classList.remove('active'));
btnCancelar.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

window.editarUsuario = async (id) => {
    const usuario = usuariosGlobal.find(u => u.id === id);
    if (!usuario) return;
    
    usuarioEditando = usuario;
    document.getElementById('modalTitulo').innerHTML = '<i class="fas fa-user-edit"></i> Editar Usuario';
    document.getElementById('passwordRequerido').innerHTML = ' (opcional)';
    document.getElementById('password').required = false;
    document.getElementById('usuarioId').value = usuario.id;
    document.getElementById('nombre').value = usuario.nombre;
    document.getElementById('email').value = usuario.email;
    document.getElementById('rol').value = usuario.rol;
    document.getElementById('activo').value = usuario.activo ? 'true' : 'false';
    document.getElementById('password').value = '';
    modal.classList.add('active');
};

window.eliminarUsuario = async (id) => {
    if (!confirm('¿Eliminar este usuario permanentemente?')) return;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar');
        await cargarUsuarios();
        alert('✅ Usuario eliminado');
    } catch (error) {
        alert('❌ Error al eliminar');
    }
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const usuario = {
        nombre: document.getElementById('nombre').value,
        email: document.getElementById('email').value,
        rol: document.getElementById('rol').value,
        activo: document.getElementById('activo').value === 'true'
    };
    
    const password = document.getElementById('password').value;
    if (password) usuario.password = password;
    
    const id = document.getElementById('usuarioId').value;
    const url = id ? `${API_URL}/usuarios/${id}` : `${API_URL}/usuarios`;
    const method = id ? 'PUT' : 'POST';
    
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(usuario)
        });
        
        if (!response.ok) throw new Error('Error al guardar');
        
        modal.classList.remove('active');
        await cargarUsuarios();
        alert(id ? '✅ Usuario actualizado' : '✅ Usuario creado');
    } catch (error) {
        alert('❌ Error al guardar');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

const usuarioActual = verificarAutenticacion();
cargarUsuarios();