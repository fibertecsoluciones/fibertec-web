/* ========================================
   FIBERTEC - SISTEMA DE INVENTARIO ÚNICO
   ======================================== */

// 1. DECLARACIÓN DE VARIABLES GLOBALES (Solo una vez)
const modalInventario = document.getElementById('modalInventario');
const formInventario = document.getElementById('formInventario');

// 2. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();
    
    // Listeners para la lógica de Fibra/Carretes
    const inputNombre = document.getElementById('nombre_articulo');
    const selectCat = document.getElementById('categoria');

    if (inputNombre) inputNombre.addEventListener('input', verificarTipoProducto);
    if (selectCat) selectCat.addEventListener('change', verificarTipoProducto);
});

// 3. OBTENER DATOS
async function cargarInventario() {
    try {
        const resp = await fetch('/api/inventario');
        if (!resp.ok) throw new Error("Error en API");
        const materiales = await resp.json();
        renderizarTabla(materiales);
    } catch (err) {
        console.error("Error cargando inventario:", err);
    }
}

// 4. DIBUJAR TABLA
function renderizarTabla(lista) {
    const tbody = document.getElementById('tablaInventarioBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    lista.forEach(item => {
        const claseStock = item.cantidad_actual <= item.stock_minimo ? 'stock-bajo' : 'stock-ok';
        
        // Mostrar Nomenclatura FiberTec solo si existe (Carretes)
        const nombreDisplay = item.codigo_fibertec 
            ? `<span style="background:#e2e8f0; padding:2px 5px; border-radius:4px; font-size:0.8em; font-family:monospace;">${item.codigo_fibertec}</span><br><strong>${item.nombre_articulo}</strong>`
            : `<strong>${item.nombre_articulo}</strong>`;

        tbody.innerHTML += `
            <tr>
                <td>${nombreDisplay}</td>
                <td>${item.categoria}</td>
                <td><span class="badge-stock ${claseStock}">${item.cantidad_actual}</span></td>
                <td>${item.unidad_medida}</td>
                <td>${item.cantidad_actual > 0 ? '✅ Disponible' : '❌ Agotado'}</td>
                <td>
                    <button class="btn-edit" onclick="editarProducto(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-edit" style="color:#ff6b6b;" onclick="eliminarProducto(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// 5. LÓGICA DINÁMICA (Solo carretes llevan nomenclatura)
function verificarTipoProducto() {
    const nombre = document.getElementById('nombre_articulo').value.toLowerCase();
    const categoria = document.getElementById('categoria').value;
    const seccionFibra = document.getElementById('seccion-fibra');
    const seccionNormal = document.getElementById('seccion-cantidad-normal');
    const unidadMedida = document.getElementById('unidad_medida');

    if (categoria === 'Planta Externa' && (nombre.includes('fibra') || nombre.includes('carrete'))) {
        if(seccionFibra) seccionFibra.style.display = 'block';
        if(seccionNormal) seccionNormal.style.display = 'none';
        unidadMedida.value = 'Metros';
        unidadMedida.disabled = true;
    } else {
        if(seccionFibra) seccionFibra.style.display = 'none';
        if(seccionNormal) seccionNormal.style.display = 'block';
        unidadMedida.disabled = false;
        if (unidadMedida.value === 'Metros') unidadMedida.value = 'Piezas';
    }
}

// 6. CONTROL DEL MODAL
function abrirModalInventario(id = null) {
    if (!formInventario) return;
    formInventario.reset();
    document.getElementById('productoId').value = '';
    document.getElementById('modalInventarioTitulo').innerHTML = id ? '<i class="fas fa-edit"></i> Editar Material' : '<i class="fas fa-plus"></i> Nuevo Material';
    
    verificarTipoProducto();

    if (id) {
        cargarDatosProducto(id);
    }
    modalInventario.style.display = 'flex';
}

function cerrarModalInventario() {
    modalInventario.style.display = 'none';
}

// 7. EDITAR
async function cargarDatosProducto(id) {
    try {
        const resp = await fetch(`/api/inventario/${id}`);
        const item = await resp.json();

        document.getElementById('productoId').value = item.id;
        document.getElementById('nombre_articulo').value = item.nombre_articulo;
        document.getElementById('categoria').value = item.categoria;
        document.getElementById('stock_minimo').value = item.stock_minimo;
        document.getElementById('unidad_medida').value = item.unidad_medida;

        if (item.codigo_fibertec) {
            document.getElementById('codigo_fibertec').value = item.codigo_fibertec;
            document.getElementById('metros_actuales').value = item.cantidad_actual;
            document.getElementById('metros_iniciales').value = item.metros_iniciales || item.cantidad_actual;
        } else {
            document.getElementById('cantidad_actual').value = item.cantidad_actual;
        }
        verificarTipoProducto();
    } catch (err) { console.error(err); }
}

// 8. GUARDAR (POST/PUT)
formInventario.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('productoId').value;
    const nombre = document.getElementById('nombre_articulo').value.toLowerCase();
    const categoria = document.getElementById('categoria').value;
    const esCarrete = (categoria === 'Planta Externa' && (nombre.includes('fibra') || nombre.includes('carrete')));

    const datos = {
        nombre_articulo: document.getElementById('nombre_articulo').value,
        categoria: categoria,
        stock_minimo: parseInt(document.getElementById('stock_minimo').value),
        unidad_medida: document.getElementById('unidad_medida').value,
        cantidad_actual: esCarrete ? parseInt(document.getElementById('metros_actuales').value) : parseInt(document.getElementById('cantidad_actual').value),
        codigo_fibertec: esCarrete ? document.getElementById('codigo_fibertec').value.toUpperCase() : null,
        metros_iniciales: esCarrete ? parseInt(document.getElementById('metros_iniciales').value) : null
    };

    try {
        const res = await fetch(id ? `/api/inventario/${id}` : '/api/inventario', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        if (res.ok) {
            cerrarModalInventario();
            cargarInventario();
        }
    } catch (err) { alert("Error al guardar"); }
};

// 9. ELIMINAR
async function eliminarProducto(id) {
    if (confirm("¿Eliminar este artículo de FiberTec?")) {
        await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
        cargarInventario();
    }
}

// Global para botones de tabla
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;