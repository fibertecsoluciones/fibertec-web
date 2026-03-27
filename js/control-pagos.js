// ========================================
// CONTROL DE PAGOS - CON API (PostgreSQL)
// ========================================

const API_URL = '/api';

let clientesGlobal = [];
let pagosGlobal = [];

// ========================================
// CARGAR DATOS DESDE LA API
// ========================================

async function cargarDatos() {
    try {
        // Cargar clientes
        const resClientes = await fetch(`${API_URL}/clientes`);
        clientesGlobal = await resClientes.json();
        
        // Cargar todos los pagos (podrías tener un endpoint específico)
        // Por ahora, cargamos pagos de cada cliente (puede optimizarse después)
        pagosGlobal = [];
        for (const cliente of clientesGlobal) {
            const resPagos = await fetch(`${API_URL}/clientes/${cliente.id}/pagos`);
            const pagos = await resPagos.json();
            pagosGlobal.push(...pagos);
        }
        
        actualizarTabla();
        actualizarResumen();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        mostrarError('Error al cargar datos del servidor');
    }
}

// ========================================
// OBTENER ESTADO DE PAGO DE UN CLIENTE
// ========================================

function obtenerEstadoPago(cliente) {
    const pagosCliente = pagosGlobal.filter(p => p.cliente_id === cliente.id);
    const ultimoPago = pagosCliente.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))[0];
    
    if (!ultimoPago) {
        return { estado: 'mora', diasAtraso: 30, ultimoPago: null, proximoPago: null };
    }
    
    const fechaUltimoPago = new Date(ultimoPago.fecha);
    const hoy = new Date();
    const diasDesdeUltimoPago = Math.floor((hoy - fechaUltimoPago) / (1000 * 60 * 60 * 24));
    const fechaProximoPago = new Date(fechaUltimoPago);
    fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);
    
    if (diasDesdeUltimoPago <= 30) {
        return {
            estado: 'aldia',
            diasAtraso: 0,
            ultimoPago: ultimoPago.fecha,
            proximoPago: fechaProximoPago.toISOString().split('T')[0]
        };
    } else {
        return {
            estado: 'mora',
            diasAtraso: diasDesdeUltimoPago - 30,
            ultimoPago: ultimoPago.fecha,
            proximoPago: fechaProximoPago.toISOString().split('T')[0]
        };
    }
}

// ========================================
// UTILIDADES
// ========================================

function obtenerMontoPlan(plan) {
    const montos = { navega: 400, vuelo: 500, elite: 600 };
    return montos[plan] || 400;
}

function getPlanNombre(plan) {
    const nombres = { navega: 'NAVEGA 20MBPS', vuelo: 'VUELO 30MBPS', elite: 'ELITE 40MBPS' };
    return nombres[plan] || 'NAVEGA';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// MODAL Y FORMULARIO
// ========================================

let clienteSeleccionado = null;

function abrirModalPago(clienteId) {
    const cliente = clientesGlobal.find(c => c.id === clienteId);
    if (!cliente) return;
    
    clienteSeleccionado = cliente;
    
    const modal = document.getElementById('modalPago');
    const clienteInfo = document.getElementById('modalClienteInfo');
    const fechaPago = document.getElementById('fechaPago');
    const montoPago = document.getElementById('montoPago');
    
    clienteInfo.innerHTML = `
        <h4>${escapeHtml(cliente.nombre)}</h4>
        <p>📞 ${cliente.telefono1}</p>
        <p>📡 ${getPlanNombre(cliente.plan)}</p>
        <p>💰 Monto mensual: $${obtenerMontoPlan(cliente.plan)}</p>
    `;
    
    fechaPago.value = new Date().toISOString().split('T')[0];
    montoPago.value = obtenerMontoPlan(cliente.plan);
    
    modal.classList.add('active');
}

async function verHistorialPagos(clienteId) {
    try {
        const response = await fetch(`${API_URL}/clientes/${clienteId}/pagos`);
        const pagos = await response.json();
        const cliente = clientesGlobal.find(c => c.id === clienteId);
        
        if (pagos.length === 0) {
            alert(`❌ ${cliente.nombre} no tiene pagos registrados aún`);
            return;
        }
        
        let historial = `📋 HISTORIAL DE PAGOS\nCliente: ${cliente.nombre}\n\n`;
        pagos.forEach(p => {
            historial += `📅 ${p.fecha} | $${p.monto} | ${p.metodo} | Ref: ${p.referencia || 'N/A'}\n`;
        });
        
        alert(historial);
    } catch (error) {
        console.error('Error al cargar historial:', error);
        alert('Error al cargar el historial de pagos');
    }
}

// ========================================
// ACTUALIZAR TABLA
// ========================================

function actualizarTabla() {
    const tbody = document.getElementById('tablaPagosBody');
    const buscador = document.getElementById('buscadorPagos').value.toLowerCase();
    const filtroEstado = document.getElementById('filtroEstado').value;
    const filtroMes = document.getElementById('filtroMes').value;
    
    let clientesFiltrados = [...clientesGlobal];
    
    if (buscador) {
        clientesFiltrados = clientesFiltrados.filter(c => 
            c.nombre?.toLowerCase().includes(buscador) ||
            c.telefono1?.includes(buscador)
        );
    }
    
    const clientesConEstado = clientesFiltrados.map(c => ({
        ...c,
        estadoPago: obtenerEstadoPago(c),
        monto: obtenerMontoPlan(c.plan)
    }));
    
    // Aplicar filtros
    if (filtroEstado !== 'todos') {
        const filtrados = clientesConEstado.filter(c => {
            if (filtroEstado === 'aldia') return c.estadoPago.estado === 'aldia';
            if (filtroEstado === 'mora') return c.estadoPago.estado === 'mora';
            if (filtroEstado === 'pagohoy') {
                const hoy = new Date().toISOString().split('T')[0];
                const pagosHoy = pagosGlobal.filter(p => p.fecha === hoy);
                return pagosHoy.some(p => p.cliente_id === c.id);
            }
            if (filtroEstado === 'esteMes') {
                const mesActual = new Date().toISOString().slice(0,7);
                const pagosEsteMes = pagosGlobal.filter(p => p.fecha.startsWith(mesActual));
                return pagosEsteMes.some(p => p.cliente_id === c.id);
            }
            return true;
        });
        clientesConEstado.length = 0;
        clientesConEstado.push(...filtrados);
    }
    
    if (filtroMes) {
        const filtrados = clientesConEstado.filter(c => {
            const pagosEnMes = pagosGlobal.filter(p => p.fecha.startsWith(filtroMes) && p.cliente_id === c.id);
            return pagosEnMes.length > 0;
        });
        clientesConEstado.length = 0;
        clientesConEstado.push(...filtrados);
    }
    
    if (clientesConEstado.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="sin-pagos"><i class="fas fa-credit-card"></i><p>No hay clientes que coincidan con la búsqueda</p></div></td></tr>`;
        return;
    }
    
    tbody.innerHTML = clientesConEstado.map(cliente => `
        <tr>
            <td><span class="cliente-id">#${cliente.id}</span></td>
            <td><span class="cliente-nombre">${escapeHtml(cliente.nombre)}</span></td>
            <td>${cliente.telefono1}</td>
            <td>${getPlanNombre(cliente.plan)}</td>
            <td><strong>$${cliente.monto}</strong></td>
            <td>${cliente.estadoPago.ultimoPago || 'Sin pagos'}</td>
            <td>${cliente.estadoPago.proximoPago || 'No disponible'}</td>
            <td>${cliente.estadoPago.estado === 'aldia' ? '<span class="estado-aldia">✅ Al día</span>' : '<span class="estado-mora">⚠️ En mora</span>'}</td>
            <td>${cliente.estadoPago.diasAtraso > 0 ? `<span class="dias-atraso">${cliente.estadoPago.diasAtraso} días</span>` : '-'}</td>
            <td>
                <button class="btn-accion btn-pagar" onclick="abrirModalPago(${cliente.id})" title="Registrar pago">
                    <i class="fas fa-money-bill-wave"></i>
                </button>
                <button class="btn-accion btn-ver" onclick="verHistorialPagos(${cliente.id})" title="Ver historial">
                    <i class="fas fa-history"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ========================================
// ACTUALIZAR RESUMEN
// ========================================

function actualizarResumen() {
    const total = clientesGlobal.length;
    let aldia = 0, mora = 0, totalRecaudado = 0;
    
    clientesGlobal.forEach(c => {
        const estado = obtenerEstadoPago(c);
        if (estado.estado === 'aldia') aldia++;
        else mora++;
    });
    
    const mesActual = new Date().toISOString().slice(0,7);
    const pagosEsteMes = pagosGlobal.filter(p => p.fecha.startsWith(mesActual));
    
    // FORZAR A NÚMERO Y ELIMINAR CEROS A LA IZQUIERDA
    totalRecaudado = pagosEsteMes.reduce((sum, p) => {
        let monto = Number(p.monto);
        if (isNaN(monto)) monto = 0;
        return sum + monto;
    }, 0);
    
    document.getElementById('totalClientes').textContent = total;
    document.getElementById('clientesAlDia').textContent = aldia;
    document.getElementById('clientesMora').textContent = mora;
    document.getElementById('pagosEsteMes').textContent = pagosEsteMes.length;
    
    // Formato sin cero a la izquierda
    document.getElementById('totalRecaudado').textContent = `$${totalRecaudado.toFixed(2)}`;
}

// ========================================
// REGISTRAR PAGO VÍA API
// ========================================

// ========================================
// REGISTRAR PAGO VÍA API
// ========================================

async function registrarPago(pago) {
    try {
        const response = await fetch(`${API_URL}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pago)
        });
        
        if (!response.ok) throw new Error('Error al registrar pago');
        
        const nuevoPago = await response.json();
        
        // Actualizar pagosGlobal localmente
        pagosGlobal.push(nuevoPago);
        
        return nuevoPago;
    } catch (error) {
        console.error('Error al registrar pago:', error);
        throw error;
    }
}

// ========================================
// MOSTRAR ERROR
// ========================================

function mostrarError(mensaje) {
    const tbody = document.getElementById('tablaPagosBody');
    tbody.innerHTML = `<tr><td colspan="10"><div class="sin-pagos"><i class="fas fa-exclamation-triangle"></i><p>${mensaje}</p></div></td></tr>`;
}

// ========================================
// EVENTOS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    cargarDatos();
    
    document.getElementById('btnExportarPagos').addEventListener('click', () => {
        const exportData = {
            clientes: clientesGlobal,
            pagos: pagosGlobal,
            fechaExportacion: new Date().toLocaleString()
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fibertec_pagos_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
    
    document.getElementById('buscadorPagos').addEventListener('input', actualizarTabla);
    document.getElementById('filtroEstado').addEventListener('change', actualizarTabla);
    document.getElementById('filtroMes').addEventListener('change', actualizarTabla);
    
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('modalPago').classList.remove('active');
    });
    
    document.getElementById('formRegistroPago').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!clienteSeleccionado) return;
    
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerHTML;
    
    // Deshabilitar botón para evitar múltiples envíos
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    const nuevoPago = {
        clienteId: clienteSeleccionado.id,
        fecha: document.getElementById('fechaPago').value,
        monto: parseFloat(document.getElementById('montoPago').value),
        metodo: document.getElementById('metodoPago').value,
        referencia: document.getElementById('referenciaPago').value,
        notas: document.getElementById('notasPago').value,
        registradoPor: 'admin'
    };
    
    try {
        await registrarPago(nuevoPago);
        
        // Cerrar modal y resetear formulario
        document.getElementById('modalPago').classList.remove('active');
        document.getElementById('formRegistroPago').reset();
        
        // Recargar datos
        await cargarDatos();
        
        alert(`✅ Pago registrado para ${clienteSeleccionado.nombre}\nMonto: $${nuevoPago.monto}\nFecha: ${nuevoPago.fecha}`);
    } catch (error) {
        console.error(error);
        alert('❌ Error al registrar el pago');
    } finally {
        // Reactivar botón
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textoOriginal;
    }
});
});