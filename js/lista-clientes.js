// ========================================
// LISTA DE CLIENTES - VERSIÓN TABLA
// ========================================

let clientesGlobal = [];

function cargarClientes() {
    const clientes = JSON.parse(localStorage.getItem('fibertec_clientes') || '[]');
    clientesGlobal = clientes.reverse();
    actualizarTabla();
}

function actualizarTabla() {
    const tbody = document.getElementById('tablaClientesBody');
    const totalClientesSpan = document.getElementById('totalClientes');
    
    totalClientesSpan.textContent = clientesGlobal.length;
    
    if (clientesGlobal.length === 0) {
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
    
    tbody.innerHTML = clientesGlobal.map(cliente => `
        <tr>
            <td><span class="cliente-id">#${cliente.id}</span></td>
            <td><span class="cliente-nombre">${escapeHtml(cliente.nombre)}</span></td>
            <td><span class="cliente-telefono">${cliente.telefono1} ${cliente.telefono2 ? ' / ' + cliente.telefono2 : ''}</span></td>
            <td>${escapeHtml(cliente.colonia)}</td>
            <td>${getPlanBadge(cliente.plan)}</td>
            <td><span class="cliente-ip">${cliente.ip || 'N/A'}</span></td>
            <td><span class="cliente-mac">${cliente.mac || 'N/A'}</span></td>
            <td>${cliente.marcaModem || ''} ${cliente.modeloModem || ''}</td>
            <td>${escapeHtml(cliente.tecnico || 'N/A')}</td>
            <td>${cliente.fechaInstalacion || cliente.fechaRegistro?.split(',')[0] || 'N/A'}</td>
            <td>${cliente.foto ? `<img src="${cliente.foto}" class="foto-miniatura" alt="Módem" onclick="verFoto('${cliente.id}')">` : 'Sin foto'}</td>
        </tr>
    `).join('');
}

function getPlanBadge(plan) {
    const planes = {
        'navega': { clase: 'plan-navega', texto: 'NAVEGA 20MBPS' },
        'vuelo': { clase: 'plan-vuelo', texto: 'VUELO 30MBPS' },
        'elite': { clase: 'plan-elite', texto: 'ELITE 40MBPS' }
    };
    const p = planes[plan] || planes.navega;
    return `<span class="plan-badge ${p.clase}">${p.texto}</span>`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function verFoto(id) {
    const clientes = JSON.parse(localStorage.getItem('fibertec_clientes') || '[]');
    const cliente = clientes.find(c => c.id == id);
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

// Buscar clientes
function buscarClientes() {
    const busqueda = document.getElementById('buscadorTabla').value.toLowerCase().trim();
    if (!busqueda) {
        clientesGlobal = JSON.parse(localStorage.getItem('fibertec_clientes') || '[]').reverse();
        actualizarTabla();
        return;
    }
    
    const todosClientes = JSON.parse(localStorage.getItem('fibertec_clientes') || '[]');
    clientesGlobal = todosClientes.reverse().filter(cliente => 
        cliente.nombre?.toLowerCase().includes(busqueda) ||
        cliente.telefono1?.includes(busqueda) ||
        cliente.telefono2?.includes(busqueda) ||
        cliente.colonia?.toLowerCase().includes(busqueda) ||
        cliente.ip?.includes(busqueda) ||
        cliente.mac?.toLowerCase().includes(busqueda) ||
        cliente.tecnico?.toLowerCase().includes(busqueda)
    );
    actualizarTabla();
}

document.addEventListener('DOMContentLoaded', function() {
    cargarClientes();
    
    const btnExportar = document.getElementById('btnExportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            const clientes = localStorage.getItem('fibertec_clientes');
            const blob = new Blob([clientes], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fibertec_clientes_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    
    const buscador = document.getElementById('buscadorTabla');
    if (buscador) {
        buscador.addEventListener('input', buscarClientes);
    }
});