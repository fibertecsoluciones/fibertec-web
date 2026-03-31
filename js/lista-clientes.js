// ========================================
// LISTA DE CLIENTES - VERSIÓN TABLA
// ========================================

let clientesGlobal = [];

async function cargarClientes() {
    try {
        const response = await fetch(`${API_URL}/clientes`);
        if (!response.ok) throw new Error('Error al cargar clientes');
        clientesGlobal = await response.json();
        actualizarTabla();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('tablaClientesBody').innerHTML = `
            <tr class="sin-registros"><td colspan="9">
                <div class="sin-clientes"><i class="fas fa-database"></i><p>Error al cargar clientes</p></div>
            </tr>
        `;
    }
}

function actualizarTabla() {
    const tbody = document.getElementById('tablaClientesBody');
    const totalSpan = document.getElementById('totalClientes');
    const busqueda = document.getElementById('buscadorTabla')?.value.toLowerCase() || '';
    
    let filtrados = clientesGlobal;
    if (busqueda) {
        filtrados = clientesGlobal.filter(c => 
            (c.nombre || '').toLowerCase().includes(busqueda) ||
            (c.telefono1 || '').includes(busqueda) ||
            (c.colonia || '').toLowerCase().includes(busqueda)
        );
    }
    
    totalSpan.textContent = filtrados.length;
    
    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr class="sin-registros"><td colspan="9"><div class="sin-clientes"><i class="fas fa-database"></i><p>No hay clientes registrados</p></div></tr>`;
        return;
    }
    
    tbody.innerHTML = filtrados.map(c => `
        <tr>
            <td>${c.id || ''}</td>
            <td class="cliente-nombre">${escapeHtml(c.nombre)}</td>
            <td>${c.telefono1 || ''} ${c.telefono2 ? '/' + c.telefono2 : ''}</td>
            <td>${escapeHtml(c.colonia)}</td>
            <td>${getPlanBadge(c.plan)}</td>
            <td><span class="cliente-ip">${c.ip || 'N/A'}</span></td>
            <td>${c.marca_modem || ''} ${c.modelo_modem || ''}</td>
            <td>${c.dia_pago || 15}</td>
            <td class="acciones">
                <button class="btn-accion btn-editar" onclick="editarCliente(${c.id})" title="Editar cliente">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getPlanBadge(plan) {
    const planes = {
        navega: { clase: 'plan-navega', texto: 'NAVEGA 20MBPS' },
        vuelo: { clase: 'plan-vuelo', texto: 'VUELO 30MBPS' },
        elite: { clase: 'plan-elite', texto: 'ELITE 40MBPS' }
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

window.verFoto = (id) => {
    const cliente = clientesGlobal.find(c => c.id == id);
    if (cliente && cliente.foto) {
        const ventana = window.open();
        ventana.document.write(`
            <html><head><title>Foto - ${cliente.nombre}</title></head>
            <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a2a4f;">
                <img src="${cliente.foto}" style="max-width:90vw;max-height:90vh;border-radius:10px;">
            </body></html>
        `);
    }
};

// Exportar datos
document.getElementById('btnExportar')?.addEventListener('click', () => {
    const dataStr = JSON.stringify(clientesGlobal, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_fibertec_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// Buscador en tiempo real
document.getElementById('buscadorTabla')?.addEventListener('input', actualizarTabla);

// ========================================
// IMPORTAR CLIENTES DESDE EXCEL
// ========================================

const modal = document.getElementById('modalImportar');
const closeModal = document.getElementById('closeModal');
const areaImportar = document.getElementById('areaImportar');
const archivoInput = document.getElementById('archivoExcel');
const previewContainer = document.getElementById('previewContainer');
const previewBody = document.getElementById('previewBody');
const btnCancelarImportar = document.getElementById('btnCancelarImportar');
const btnConfirmarImportar = document.getElementById('btnConfirmarImportar');
const resultadoDiv = document.getElementById('resultadoImportacion');

let datosClientes = [];

document.getElementById('btnImportarClientes')?.addEventListener('click', () => modal?.classList.add('active'));
closeModal?.addEventListener('click', () => { modal?.classList.remove('active'); resetModal(); });
modal?.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.remove('active'); resetModal(); } });

areaImportar?.addEventListener('click', () => archivoInput.click());
areaImportar?.addEventListener('dragover', (e) => { e.preventDefault(); areaImportar.style.borderColor = '#3ea682'; });
areaImportar?.addEventListener('dragleave', () => areaImportar.style.borderColor = '#e2e8f0');
areaImportar?.addEventListener('drop', (e) => {
    e.preventDefault();
    areaImportar.style.borderColor = '#e2e8f0';
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivo(file);
});

archivoInput?.addEventListener('change', (e) => { if (e.target.files[0]) procesarArchivo(e.target.files[0]); });

function procesarArchivo(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
        const reader = new FileReader();
        reader.onload = (e) => procesarCSV(e.target.result);
        reader.readAsText(file, 'UTF-8');
    } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            procesarJSON(json);
        };
        reader.readAsArrayBuffer(file);
    } else {
        mostrarResultado('error', 'Formato no soportado. Usa CSV o Excel.');
    }
}

function procesarCSV(text) {
    const lineas = text.split('\n');
    const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());
    const clientes = [];
    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        const valores = lineas[i].split(',');
        const cliente = {};
        encabezados.forEach((h, idx) => cliente[h] = valores[idx]?.trim() || '');
        clientes.push(cliente);
    }
    validarClientes(clientes);
}

function procesarJSON(json) {
    const clientes = json.map(row => ({
        nombre: row.nombre || row.Nombre || '',
        telefono1: row.telefono1 || row.Telefono1 || '',
        colonia: row.colonia || row.Colonia || '',
        direccion: row.direccion || row.Direccion || '',
        plan: (row.plan || row.Plan || '').toLowerCase(),
        ip: row.ip || row.IP || '',
        mac: row.mac || row.MAC || '',
        marca_modem: row.marca_modem || row.Marca || '',
        modelo_modem: row.modelo_modem || row.Modelo || '',
        serial_modem: row.serial_modem || row.Serial || '',
        tecnico_nombre: row.tecnico_nombre || row.Tecnico || '',
        dia_pago: row.dia_pago || 15
    }));
    validarClientes(clientes);
}

function validarClientes(clientes) {
    datosClientes = [];
    previewBody.innerHTML = '';
    for (const c of clientes) {
        let estado = { tipo: 'nuevo', mensaje: '✅ Válido' };
        if (!c.nombre) estado = { tipo: 'error', mensaje: '❌ Falta nombre' };
        else if (!c.telefono1) estado = { tipo: 'error', mensaje: '❌ Falta teléfono' };
        else if (!c.colonia) estado = { tipo: 'error', mensaje: '❌ Falta colonia' };
        else if (!c.direccion) estado = { tipo: 'error', mensaje: '❌ Falta dirección' };
        else if (!c.plan || !['navega', 'vuelo', 'elite'].includes(c.plan)) estado = { tipo: 'error', mensaje: '❌ Plan inválido' };
        
        datosClientes.push({ ...c, estado });
        const row = previewBody.insertRow();
        row.insertCell(0).textContent = c.nombre;
        row.insertCell(1).textContent = c.telefono1;
        row.insertCell(2).textContent = c.colonia;
        row.insertCell(3).textContent = c.plan;
        const estadoCell = row.insertCell(4);
        estadoCell.textContent = estado.mensaje;
        estadoCell.className = `estado-${estado.tipo}`;
    }
    if (previewContainer) previewContainer.style.display = 'block';
}

btnConfirmarImportar?.addEventListener('click', async () => {
    const nuevos = datosClientes.filter(c => c.estado.tipo === 'nuevo');
    if (nuevos.length === 0) {
        mostrarResultado('error', 'No hay clientes válidos para importar');
        return;
    }
    mostrarResultado('exito', `Importando ${nuevos.length} clientes...`);
    let importados = 0, errores = 0;
    for (const c of nuevos) {
        try {
            const res = await fetch(`${API_URL}/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: c.nombre,
                    telefono1: c.telefono1,
                    telefono2: c.telefono2 || '',
                    colonia: c.colonia,
                    direccion: c.direccion,
                    plan: c.plan,
                    ip: c.ip || '',
                    mac: c.mac || '',
                    marca_modem: c.marca_modem || '',
                    modelo_modem: c.modelo_modem || '',
                    serial_modem: c.serial_modem || '',
                    tecnico_nombre: c.tecnico_nombre || '',
                    dia_pago: c.dia_pago || 15
                })
            });
            if (res.ok) importados++; else errores++;
        } catch (e) { errores++; }
    }
    mostrarResultado('exito', `✅ Importación completada\n📊 Importados: ${importados}\n❌ Errores: ${errores}\n🔄 Recargando página...`);
    setTimeout(() => location.reload(), 3000);
});

btnCancelarImportar?.addEventListener('click', resetModal);

function resetModal() {
    if (previewContainer) previewContainer.style.display = 'none';
    if (resultadoDiv) resultadoDiv.style.display = 'none';
    if (archivoInput) archivoInput.value = '';
    datosClientes = [];
}

function mostrarResultado(tipo, mensaje) {
    if (!resultadoDiv) return;
    resultadoDiv.className = `resultado-importacion ${tipo}`;
    resultadoDiv.innerHTML = mensaje.replace(/\n/g, '<br>');
    resultadoDiv.style.display = 'block';
}

// Descargar plantilla
document.getElementById('descargarPlantilla')?.addEventListener('click', (e) => {
    e.preventDefault();
    const plantilla = [
        ['nombre', 'telefono1', 'telefono2', 'colonia', 'direccion', 'plan', 'ip', 'mac', 'marca_modem', 'modelo_modem', 'serial_modem', 'tecnico_nombre'],
        ['Juan Pérez', '9211509583', '', 'Popotla', 'Calle Principal #123', 'navega', '192.168.1.100', 'AA:BB:CC:DD:EE:FF', 'Huawei', 'HG8145V5', 'ABC123', 'Carlos López']
    ];
    const ws = XLSX.utils.aoa_to_sheet(plantilla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'plantilla_clientes_fibertec.xlsx');
});

// ========================================
// EDITAR CLIENTE
// ========================================

const modalEditar = document.getElementById('modalEditarCliente');
const closeModalEditar = document.getElementById('closeModalEditar');
const btnCancelarEditar = document.getElementById('btnCancelarEditar');
const formEditar = document.getElementById('formEditarCliente');
const editFotoInput = document.getElementById('editFoto');
const previewFotoEditar = document.getElementById('previewFotoEditar');

// Abrir modal con datos del cliente
window.editarCliente = async function(clienteId) {
    const cliente = clientesGlobal.find(c => c.id === clienteId);
    if (!cliente) return;
    
    // Llenar formulario con datos actuales
    document.getElementById('editClienteId').value = cliente.id;
    document.getElementById('editNombre').value = cliente.nombre || '';
    document.getElementById('editTelefono1').value = cliente.telefono1 || '';
    document.getElementById('editTelefono2').value = cliente.telefono2 || '';
    document.getElementById('editColonia').value = cliente.colonia || '';
    document.getElementById('editDireccion').value = cliente.direccion || '';
    document.getElementById('editPlan').value = cliente.plan || 'navega';
    document.getElementById('editIp').value = cliente.ip || '';
    document.getElementById('editMac').value = cliente.mac || '';
    document.getElementById('editMarcaModem').value = cliente.marca_modem || '';
    document.getElementById('editModeloModem').value = cliente.modelo_modem || '';
    document.getElementById('editSerialModem').value = cliente.serial_modem || '';
    
    console.log('Fecha:', cliente.fecha_instalacion);
    document.getElementById('editFechaInstalacion').value = cliente.fecha_instalacion || '';
    document.getElementById('editDiaPago').value = cliente.dia_pago || 15;
    
    // Técnico
    document.getElementById('editTecnico').value = cliente.tecnico || cliente.tecnico_nombre || '';
    console.log('Técnico:', cliente.tecnico || cliente.tecnico_nombre || 'No tiene');
    
    // Observaciones
    document.getElementById('editObservaciones').value = cliente.observaciones || '';
    console.log('Observaciones:', cliente.observaciones || 'No tiene');
    
    // Cargar foto existente
    if (cliente.foto) {
        previewFotoEditar.innerHTML = `<img src="${cliente.foto}" style="max-width: 100%; max-height: 150px; border-radius: 8px;">`;
        console.log('✅ Foto cargada (longitud:', cliente.foto.length, 'caracteres)');
    } else {
        previewFotoEditar.innerHTML = '<span>Sin foto</span>';
        console.log('❌ Foto no disponible');
    }
    editFotoInput.value = ''; // Limpiar input file
    
    modalEditar.classList.add('active');
};

// Cerrar modal
closeModalEditar.addEventListener('click', () => {
    modalEditar.classList.remove('active');
});
btnCancelarEditar.addEventListener('click', () => {
    modalEditar.classList.remove('active');
});
modalEditar.addEventListener('click', (e) => {
    if (e.target === modalEditar) modalEditar.classList.remove('active');
});

// Previsualizar nueva foto
editFotoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            previewFotoEditar.innerHTML = `<img src="${event.target.result}" style="max-width: 100%; max-height: 150px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(file);
    }
});

// Guardar cambios
formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const clienteId = document.getElementById('editClienteId').value;
    
    const datosActualizados = {
        nombre: document.getElementById('editNombre').value,
        telefono1: document.getElementById('editTelefono1').value,
        telefono2: document.getElementById('editTelefono2').value,
        colonia: document.getElementById('editColonia').value,
        direccion: document.getElementById('editDireccion').value,
        plan: document.getElementById('editPlan').value,
        ip: document.getElementById('editIp').value,
        mac: document.getElementById('editMac').value,
        marca_modem: document.getElementById('editMarcaModem').value,
        modelo_modem: document.getElementById('editModeloModem').value,
        serial_modem: document.getElementById('editSerialModem').value,
        fecha_instalacion: document.getElementById('editFechaInstalacion').value,
        observaciones: document.getElementById('editObservaciones').value,
        tecnico: document.getElementById('editTecnico').value,
        dia_pago: parseInt(document.getElementById('editDiaPago').value) || 15
    };
    
    // Si hay nueva foto, agregarla
    if (editFotoInput.files && editFotoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            datosActualizados.foto = event.target.result;
            await enviarActualizacion(datosActualizados, clienteId);
        };
        reader.readAsDataURL(editFotoInput.files[0]);
    } else {
        await enviarActualizacion(datosActualizados, clienteId);
    }
});

async function enviarActualizacion(datos, clienteId) {
    const btn = formEditar.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const response = await fetch(`${API_URL}/clientes/${clienteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        
        if (!response.ok) throw new Error('Error al actualizar');
        
        const clienteActualizado = await response.json();
        
        // Actualizar el cliente en clientesGlobal
        const index = clientesGlobal.findIndex(c => c.id == clienteId);
        if (index !== -1) {
            clientesGlobal[index] = clienteActualizado;
        }
        
        modalEditar.classList.remove('active');
        actualizarTabla();  // Recargar la tabla
        alert('✅ Cliente actualizado correctamente');
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al actualizar el cliente');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Inicializar
cargarClientes();