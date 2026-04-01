/* ========================================
   FIBERTEC - SISTEMA DE INVENTARIO
   ======================================== */

// 1. DECLARACIÓN DE VARIABLES (Una sola vez)
const modalInventario = document.getElementById('modalInventario');
const formInventario = document.getElementById('formInventario');

// 2. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();
    
    const inputNombre = document.getElementById('nombre_articulo');
    if (inputNombre) {
        inputNombre.addEventListener('input', verificarCategoria);
    }
});

// 3. OBTENER DATOS DE LA API
async function cargarInventario() {
    try {
        const resp = await fetch('/api/inventario');
        if (!resp.ok) throw new Error("Error en la red");
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
        // Lógica de FiberTec: Si metros_actuales no es null, usamos ese valor
        const esMaterialPorMetros = item.metros_actuales !== null;
        const stockReal = esMaterialPorMetros ? item.metros_actuales : item.cantidad_actual;
        
        const claseStock = stockReal <= item.stock_minimo ? 'stock-bajo' : 'stock-ok';
        
        const nombreDisplay = item.codigo_fibertec 
            ? `<span class="nomenclatura-ft" style="background:#004a99; color:white; padding:2px 6px; border-radius:4px; font-size:10px;">${item.codigo_fibertec}</span><br><strong>${item.nombre_articulo}</strong>`
            : `<strong>${item.nombre_articulo}</strong>`;

        tbody.innerHTML += `
            <tr>
                <td>${nombreDisplay}</td>
                <td>${item.categoria}</td>
                <td><span class="badge-stock ${claseStock}">${stockReal}</span></td>
                <td>${item.unidad_medida}</td>
                <td>${stockReal > 0 ? '✅ Disponible' : '❌ Agotado'}</td>
                <td>
                    <button class="btn-edit" onclick="editarProducto(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-edit" style="color:#ff6b6b;" onclick="eliminarProducto(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// 5. LÓGICA DE CATEGORÍAS (Esta es la que pedía tu HTML)
function verificarCategoria() {
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

// 6. MODAL (Abrir/Cerrar)
function abrirModalInventario(id = null) {
    if (!formInventario) return;
    formInventario.reset();
    document.getElementById('productoId').value = '';
    document.getElementById('modalInventarioTitulo').innerHTML = id ? '<i class="fas fa-edit"></i> Editar Material' : '<i class="fas fa-plus"></i> Nuevo Material';
    
    verificarCategoria();

    if (id) {
        cargarDatosProducto(id);
    }
    modalInventario.style.display = 'flex';
}

function cerrarModalInventario() {
    modalInventario.style.display = 'none';
}


// 7. EDITAR (Ajustado para FiberTec)
async function cargarDatosProducto(id) {
    try {
        const resp = await fetch(`/api/inventario/${id}`);
        const item = await resp.json();

        document.getElementById('productoId').value = item.id;
        document.getElementById('nombre_articulo').value = item.nombre_articulo;
        document.getElementById('categoria').value = item.categoria;
        document.getElementById('stock_minimo').value = item.stock_minimo;
        document.getElementById('unidad_medida').value = item.unidad_medida;

        // Si el item tiene código de FiberTec, cargamos los metros
        if (item.codigo_fibertec) {
            document.getElementById('codigo_fibertec').value = item.codigo_fibertec;
            document.getElementById('metros_actuales').value = item.metros_actuales;
            document.getElementById('metros_iniciales').value = item.metros_iniciales;
        } else {
            document.getElementById('cantidad_actual').value = item.cantidad_actual;
        }
        verificarCategoria();
    } catch (err) { console.error("Error cargando producto:", err); }
}

// 8. GUARDAR
formInventario.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('productoId').value;
    const nombre = document.getElementById('nombre_articulo').value.toLowerCase();
    const categoria = document.getElementById('categoria').value;
    
    // Detectamos si es carrete para FiberTec
    const esCarrete = (categoria === 'Planta Externa' && (nombre.includes('fibra') || nombre.includes('carrete')));

    const datos = {
        nombre_articulo: document.getElementById('nombre_articulo').value,
        categoria: categoria,
        stock_minimo: parseInt(document.getElementById('stock_minimo').value),
        unidad_medida: document.getElementById('unidad_medida').value,
        
        // Si es carrete, mandamos los datos a las columnas de METROS
        // Si no, mandamos a CANTIDAD NORMAL
        cantidad_actual: esCarrete ? 0 : parseInt(document.getElementById('cantidad_actual').value),
        codigo_fibertec: esCarrete ? document.getElementById('codigo_fibertec').value.toUpperCase() : null,
        metros_iniciales: esCarrete ? parseInt(document.getElementById('metros_iniciales').value) : null,
        metros_actuales: esCarrete ? parseInt(document.getElementById('metros_actuales').value) : null
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
    } catch (err) { 
        alert("Error al conectar con el servidor de FiberTec"); 
    }
};

// 9. ELIMINAR
async function eliminarProducto(id) {
    if (confirm("¿Eliminar este artículo de FiberTec?")) {
        try {
            const resp = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
            if (res.ok) cargarInventario();
        } catch (err) { console.error(err); }
    }
}

// 10. EXPOSICIÓN GLOBAL (Muy importante para que el HTML los vea)
window.abrirModalInventario = abrirModalInventario;
window.cerrarModalInventario = cerrarModalInventario;
window.verificarCategoria = verificarCategoria;
window.editarProducto = (id) => abrirModalInventario(id);
window.eliminarProducto = eliminarProducto;