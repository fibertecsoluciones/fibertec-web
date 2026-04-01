/* ========================================
   FIBERTEC - LÓGICA DE INVENTARIO
   ======================================== */

const modalInventario = document.getElementById('modalInventario');
const formInventario = document.getElementById('formInventario');

// 1. Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();
});

// 2. Función para obtener datos de la API
async function cargarInventario() {
    try {
        const resp = await fetch('/api/inventario');
        if (!resp.ok) throw new Error("No se pudo obtener el inventario");
        const materiales = await resp.json();
        renderizarTabla(materiales);
    } catch (err) {
        console.error("Error cargando inventario:", err);
    }
}

// 3. Dibujar la tabla en el HTML
function renderizarTabla(lista) {
    const tbody = document.getElementById('tablaInventarioBody');
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay materiales registrados</td></tr>';
        return;
    }

    lista.forEach(item => {
        // Lógica de colores según el stock
        const claseStock = item.cantidad_actual <= item.stock_minimo ? 'stock-bajo' : 'stock-ok';
        const estado = item.cantidad_actual > 0 ? '✅ Disponible' : '❌ Agotado';
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${item.nombre_articulo}</strong></td>
                <td>${item.categoria}</td>
                <td><span class="badge-stock ${claseStock}">${item.cantidad_actual}</span></td>
                <td>${item.unidad_medida}</td>
                <td>${estado}</td>
                <td>
                    <button class="btn-edit" onclick="editarProducto(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-edit" style="color: #ff6b6b; background: rgba(255,107,107,0.1);" 
                            onclick="eliminarProducto(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// 4. Funciones del Modal (Abrir/Cerrar)
async function abrirModalInventario(id = null) {
    formInventario.reset();
    document.getElementById('productoId').value = '';
    document.getElementById('modalInventarioTitulo').innerHTML = '<i class="fas fa-plus"></i> Nuevo Material';

    if (id) {
        document.getElementById('modalInventarioTitulo').innerHTML = '<i class="fas fa-edit"></i> Editar Material';
        await cargarDatosProducto(id);
    }

    modalInventario.style.display = 'flex';
}

function cerrarModalInventario() {
    modalInventario.style.display = 'none';
}

// 5. Cargar datos en el formulario para editar
async function cargarDatosProducto(id) {
    try {
        const resp = await fetch(`/api/inventario/${id}`);
        const item = await resp.json();

        document.getElementById('productoId').value = item.id;
        document.getElementById('nombre_articulo').value = item.nombre_articulo;
        document.getElementById('categoria').value = item.categoria;
        document.getElementById('cantidad_actual').value = item.cantidad_actual;
        document.getElementById('stock_minimo').value = item.stock_minimo;
        document.getElementById('unidad_medida').value = item.unidad_medida;
    } catch (err) {
        console.error("Error al obtener detalles del producto:", err);
    }
}

// 6. Guardar o Actualizar (Evento Submit)
formInventario.onsubmit = async (e) => {
    e.preventDefault();

    const id = document.getElementById('productoId').value;
    const datos = {
        nombre_articulo: document.getElementById('nombre_articulo').value,
        categoria: document.getElementById('categoria').value,
        cantidad_actual: parseInt(document.getElementById('cantidad_actual').value),
        stock_minimo: parseInt(document.getElementById('stock_minimo').value),
        unidad_medida: document.getElementById('unidad_medida').value
    };

    const url = id ? `/api/inventario/${id}` : '/api/inventario';
    const metodo = id ? 'PUT' : 'POST';

    try {
        const resp = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (resp.ok) {
            cerrarModalInventario();
            cargarInventario(); // Refrescar la tabla
        } else {
            alert("Hubo un error al guardar los cambios.");
        }
    } catch (err) {
        console.error("Error en la petición:", err);
    }
};

// 7. Eliminar Producto
async function eliminarProducto(id) {
    if (confirm("¿Estás seguro de eliminar este artículo del inventario?")) {
        try {
            const resp = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
            if (resp.ok) cargarInventario();
        } catch (err) {
            console.error("Error al eliminar:", err);
        }
    }
}

// Función auxiliar para el botón de editar en la tabla
function editarProducto(id) {
    abrirModalInventario(id);
}