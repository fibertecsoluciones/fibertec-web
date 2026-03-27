// ========================================
// LISTA DE CLIENTES - CON API (PostgreSQL)
// ========================================

const API_URL = '/api';

let clientesGlobal = [];

async function cargarClientes() {
    try {
        const response = await fetch(`${API_URL}/clientes`);
        const clientes = await response.json();
        clientesGlobal = clientes;
        actualizarTabla();
        actualizarContador();
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        mostrarError();
    }
}

function actualizarTabla() {
    const tbody = document.getElementById('tablaClientesBody');
    const buscador = document.getElementById('buscadorTabla').value.toLowerCase();
    
    let clientesFiltrados = clientesGlobal;
    
    if (buscador) {
        clientesFiltrados = clientesGlobal.filter(c => 
            c.nombre?.toLowerCase().includes(buscador) ||
            c.telefono1?.includes(buscador) ||
            c.colonia?.toLowerCase().includes(buscador) ||
            c.ip?.includes(buscador) ||
            c.mac?.toLowerCase().includes(buscador)
        );
    }
    
    if (clientesFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr class="sin-registros">
                <td colspan="11">
                    <div class="sin-clientes">
                        <i class="fas fa-database"></i>
                        <p>No hay clientes registrados aún</p>
                    </div>
                 </td>
             </tr>
        `;
        return;
    }
    
    tbody.innerHTML = clientesFiltrados.map(cliente => `
        <tr>
            <td><span class="cliente-id">#${cliente.id}</span></td>
            <td><span class="cliente-nombre">${escapeHtml(cliente.nombre)}</span></td>
            <td>${cliente.telefono1} ${cliente.telefono2 ? ' / ' + cliente.telefono2 : ''}</td>
            <td>${escapeHtml(cliente.colonia)}</td>
            <td>${getPlanBadge(cliente.plan)}</td>
            <td><span class="cliente-ip">${cliente.ip || 'N/A'}</span></td>
            <td><span class="cliente-mac">${cliente.mac || 'N/A'}</span></td>
            <td>${cliente.marca_modem || ''} ${cliente.modelo_modem || ''}</td>
            <td>${escapeHtml(cliente.tecnico || 'N/A')}</td>
            <td>${cliente.fecha_instalacion || cliente.fecha_registro?.split('T')[0] || 'N/A'}</td>
            <td>${cliente.foto ? `<img src="${cliente.foto}" class="foto-miniatura" alt="Módem" onclick="verFoto('${cliente.id}')">` : 'Sin foto'}</td>
        </tr>
    `).join('');
}

function actualizarContador() {
    const total = clientesGlobal.length;
    document.getElementById('totalClientes').textContent = total;
}

function getPlanBadge(plan) {
    // Normalizar el plan (minúsculas y sin espacios)
    const planNormalizado = String(plan || '').toLowerCase().trim();
    
    const planes = {
        'navega': { clase: 'plan-navega', texto: 'NAVEGA 20MBPS' },
        'vuelo': { clase: 'plan-vuelo', texto: 'VUELO 30MBPS' },
        'elite': { clase: 'plan-elite', texto: 'ELITE 40MBPS' }
    };
    
    const p = planes[planNormalizado];
    
    if (!p) {
        console.warn('Plan no reconocido:', plan, 'Normalizado:', planNormalizado);
        return `<span class="plan-badge" style="background:#f1f5f9; color:#5f6b7a;">${plan || 'SIN PLAN'}</span>`;
    }
    
    return `<span class="plan-badge ${p.clase}">${p.texto}</span>`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function verFoto(id) {
    const cliente = clientesGlobal.find(c => c.id == id);
    if (cliente && cliente.foto) {
        const ventana = window.open();
        ventana.document.write(`
            <html>
            <head><title>Foto del módem - ${cliente.nombre}</title></head>
            <body style="display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #1a2a4f;">
                <img src="${cliente.foto}" style="max-width: 90vw; max-height: 90vh; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            </body>
            </html>
        `);
    }
}

function mostrarError() {
    const tbody = document.getElementById('tablaClientesBody');
    tbody.innerHTML = `
        <tr class="sin-registros">
            <td colspan="11">
                <div class="sin-clientes">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar clientes. Verifica la conexión con el servidor.</p>
                </div>
            </td>
        </tr>
    `;
}

// Eventos
document.addEventListener('DOMContentLoaded', function() {
    cargarClientes();
    
    document.getElementById('buscadorTabla').addEventListener('input', () => {
        actualizarTabla();
    });
    
    document.getElementById('btnExportar').addEventListener('click', () => {
        const dataStr = JSON.stringify(clientesGlobal, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fibertec_clientes_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
});