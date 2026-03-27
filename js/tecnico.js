// ========================================
// APP PARA TÉCNICOS - FIBERTEC
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formAltaCliente');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnObtenerCoords = document.getElementById('btnObtenerCoords');
    const areaFoto = document.getElementById('areaFoto');
    const inputFoto = document.getElementById('fotoModem');
    const previewFoto = document.getElementById('previewFoto');
    const mensajeDiv = document.getElementById('mensajeConfirmacion');

    // Fecha por defecto (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInstalacion').value = hoy;

    // ========================================
    // MANEJAR FOTO
    // ========================================
    
    areaFoto.addEventListener('click', () => {
        inputFoto.click();
    });

    inputFoto.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                previewFoto.innerHTML = `<img src="${event.target.result}" alt="Foto del módem">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // ========================================
    // OBTENER COORDENADAS (geolocalización)
    // ========================================
    
    btnObtenerCoords.addEventListener('click', () => {
        if (navigator.geolocation) {
            btnObtenerCoords.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo...';
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    document.getElementById('lat').value = position.coords.latitude;
                    document.getElementById('lng').value = position.coords.longitude;
                    btnObtenerCoords.innerHTML = '<i class="fas fa-check"></i> Ubicación obtenida';
                    setTimeout(() => {
                        btnObtenerCoords.innerHTML = '<i class="fas fa-map-marker-alt"></i> Obtener';
                    }, 2000);
                },
                function(error) {
                    btnObtenerCoords.innerHTML = '<i class="fas fa-map-marker-alt"></i> Obtener';
                    mostrarMensaje('error', 'No se pudo obtener tu ubicación. Activa el GPS.');
                }
            );
        } else {
            mostrarMensaje('error', 'Tu navegador no soporta geolocalización');
        }
    });

    // ========================================
    // GUARDAR CLIENTE
    // ========================================
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validar campos obligatorios
        const camposRequeridos = ['nombre', 'telefono1', 'colonia', 'direccion', 'plan', 'ip', 'mac', 'marcaModem', 'modeloModem', 'serialModem', 'tecnico'];
        let faltan = false;
        
        camposRequeridos.forEach(campo => {
            const input = document.getElementById(campo);
            if (!input.value.trim()) {
                input.style.borderColor = '#ff6b6b';
                faltan = true;
            } else {
                input.style.borderColor = '#e2e8f0';
            }
        });
        
        // Validar foto
        if (!inputFoto.files[0]) {
            mostrarMensaje('error', '❌ Debes tomar una foto del módem instalado');
            return;
        }
        
        if (faltan) {
            mostrarMensaje('error', '❌ Por favor completa todos los campos obligatorios');
            return;
        }
        
        // Crear objeto con los datos
        const cliente = {
            id: Date.now(),
            nombre: document.getElementById('nombre').value,
            telefono1: document.getElementById('telefono1').value,
            telefono2: document.getElementById('telefono2').value,
            colonia: document.getElementById('colonia').value,
            direccion: document.getElementById('direccion').value,
            lat: document.getElementById('lat').value,
            lng: document.getElementById('lng').value,
            plan: document.getElementById('plan').value,
            ip: document.getElementById('ip').value,
            mac: document.getElementById('mac').value,
            marcaModem: document.getElementById('marcaModem').value,
            modeloModem: document.getElementById('modeloModem').value,
            serialModem: document.getElementById('serialModem').value,
            fechaInstalacion: document.getElementById('fechaInstalacion').value,
            observaciones: document.getElementById('observaciones').value,
            tecnico: document.getElementById('tecnico').value,
            fechaRegistro: new Date().toLocaleString()
        };
        
        // Guardar foto en base64 (para almacenar en localStorage)
        const reader = new FileReader();
        reader.onload = function(event) {
            cliente.foto = event.target.result;
            
            // Obtener clientes existentes
            let clientes = JSON.parse(localStorage.getItem('fibertec_clientes') || '[]');
            clientes.push(cliente);
            localStorage.setItem('fibertec_clientes', JSON.stringify(clientes));
            
            // Mostrar mensaje de éxito
            mostrarMensaje('exito', `✅ Cliente registrado correctamente\nID: ${cliente.id}\nCliente: ${cliente.nombre}`);
            
            // Limpiar formulario
            limpiarFormulario();
            
            // Opcional: abrir en nueva pestaña el resumen
            console.log('Cliente guardado:', cliente);
        };
        reader.readAsDataURL(inputFoto.files[0]);
    });
    
    // ========================================
    // LIMPIAR FORMULARIO
    // ========================================
    
    btnLimpiar.addEventListener('click', limpiarFormulario);
    
    function limpiarFormulario() {
        form.reset();
        previewFoto.innerHTML = '';
        inputFoto.value = '';
        document.getElementById('fechaInstalacion').value = hoy;
        
        // Resetear bordes
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.style.borderColor = '#e2e8f0';
        });
        
        mostrarMensaje('', '');
    }
    
    // ========================================
    // MOSTRAR MENSAJE
    // ========================================
    
    function mostrarMensaje(tipo, texto) {
        mensajeDiv.className = 'mensaje-confirmacion';
        if (tipo === 'exito') {
            mensajeDiv.classList.add('exito');
        } else if (tipo === 'error') {
            mensajeDiv.classList.add('error');
        }
        mensajeDiv.textContent = texto;
        
        if (texto) {
            setTimeout(() => {
                mensajeDiv.className = 'mensaje-confirmacion';
                mensajeDiv.textContent = '';
            }, 5000);
        }
    }
});