// ========================================
// ALTA DE CLIENTE - CON API (PostgreSQL)
// ========================================

const API_URL = '/api'; // Railway lo resuelve solo

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formAltaCliente');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnObtenerCoords = document.getElementById('btnObtenerCoords');
    const inputFoto = document.getElementById('fotoModem');
    const previewFoto = document.getElementById('previewFoto');
    const mensajeDiv = document.getElementById('mensajeConfirmacion');

    // Fecha por defecto
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInstalacion').value = hoy;

    // Previsualizar foto
    if (inputFoto) {
        inputFoto.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    previewFoto.innerHTML = `<img src="${event.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 12px;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Obtener coordenadas
    if (btnObtenerCoords) {
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
                    function() {
                        btnObtenerCoords.innerHTML = '<i class="fas fa-map-marker-alt"></i> Obtener';
                        mostrarMensaje('error', 'No se pudo obtener tu ubicación');
                    }
                );
            } else {
                mostrarMensaje('error', 'Tu navegador no soporta geolocalización');
            }
        });
    }

    // Guardar cliente vía API
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validar campos requeridos
            const campos = ['nombre', 'telefono1', 'colonia', 'direccion', 'plan', 'ip', 'mac', 'marcaModem', 'modeloModem', 'serialModem', 'tecnico'];
            let faltan = false;

            campos.forEach(campo => {
                const input = document.getElementById(campo);
                if (!input.value.trim()) {
                    input.style.borderColor = '#ff6b6b';
                    faltan = true;
                } else {
                    input.style.borderColor = '#e2e8f0';
                }
            });

            if (!inputFoto.files[0]) {
                mostrarMensaje('error', '❌ Debes tomar una foto del módem instalado');
                return;
            }

            if (faltan) {
                mostrarMensaje('error', '❌ Completa todos los campos obligatorios');
                return;
            }

            // Preparar datos
            const formData = new FormData();
            formData.append('nombre', document.getElementById('nombre').value);
            formData.append('telefono1', document.getElementById('telefono1').value);
            formData.append('telefono2', document.getElementById('telefono2').value);
            formData.append('colonia', document.getElementById('colonia').value);
            formData.append('direccion', document.getElementById('direccion').value);
            formData.append('lat', document.getElementById('lat').value);
            formData.append('lng', document.getElementById('lng').value);
            formData.append('plan', document.getElementById('plan').value);
            formData.append('ip', document.getElementById('ip').value);
            formData.append('mac', document.getElementById('mac').value);
            formData.append('marcaModem', document.getElementById('marcaModem').value);
            formData.append('modeloModem', document.getElementById('modeloModem').value);
            formData.append('serialModem', document.getElementById('serialModem').value);
            formData.append('fechaInstalacion', document.getElementById('fechaInstalacion').value);
            formData.append('observaciones', document.getElementById('observaciones').value);
            formData.append('tecnico', document.getElementById('tecnico').value);
            
            // Leer la foto como base64
            const file = inputFoto.files[0];
            const reader = new FileReader();
            
            reader.onload = async function(event) {
                formData.append('foto', event.target.result);
                
                // Convertir FormData a objeto JSON
                const jsonData = {};
                for (let [key, value] of formData.entries()) {
                    jsonData[key] = value;
                }
                
                try {
                    const response = await fetch(`${API_URL}/clientes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(jsonData)
                    });
                    
                    if (!response.ok) throw new Error('Error al guardar');
                    
                    const resultado = await response.json();
                    mostrarMensaje('exito', `✅ Cliente registrado con ID: ${resultado.id}`);
                    form.reset();
                    document.getElementById('fechaInstalacion').value = hoy;
                    previewFoto.innerHTML = '';
                    
                } catch (error) {
                    mostrarMensaje('error', '❌ Error al guardar en servidor');
                    console.error(error);
                }
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Limpiar formulario
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            form.reset();
            document.getElementById('fechaInstalacion').value = hoy;
            previewFoto.innerHTML = '';
            mostrarMensaje('', '');
            
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.style.borderColor = '#e2e8f0';
            });
        });
    }

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