// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();
});

// Función para obtener datos de la API
async function cargarInventario() {
    try {
        const resp = await fetch('/api/inventario');
        const materiales = await resp.json();
        renderizarTabla(materiales);
    } catch (err) {
        console.error("Error cargando inventario:", err);
    }
}

function renderizarTabla(lista) {
    const tbody = document.getElementById('tablaInventarioBody');
    tbody.innerHTML = '';

    lista.forEach(item => {
        const claseStock = item.cantidad_actual <= item.stock_minimo ? 'stock-bajo' : 'stock-ok';
        
        tbody.innerHTML += `
            <tr>
                <td>${item.nombre_articulo}</td>
                <td>${item.categoria}</td>
                <td><span class="badge-stock ${claseStock}">${item.cantidad_actual}</span></td>
                <td>${item.unidad_medida}</td>
                <td>${item.cantidad_actual > 0 ? 'Disponible' : 'Agotado'}</td>
                <td>
                    <button class="btn-edit" onclick="editarProducto(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-edit" style="color: #ff6b6b;" onclick="eliminarProducto(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// Función que se activa al dar clic en Editar
function editarProducto(id) {
    console.log("Editando producto ID:", id);
    // Aquí abriríamos un modal similar al de usuarios
    // Pero con los campos de nombre_articulo, cantidad, etc.
    abrirModalInventario(id); 
}

function abrirModalInventario(id = null) {
    // Lógica para mostrar el modal (puedes reutilizar la estructura del modal de usuarios)
    alert(id ? "Editando material " + id : "Agregando nuevo material");
}