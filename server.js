const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const session = require('express-session'); // ← NUEVO
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// CONFIGURACIÓN DE SESIONES (SEGURIDAD)
// ========================================
app.use(session({
    secret: 'FiberTec-2026-Secret-Key-Southern-Mexico', // Frase secreta para encriptar
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Cambiar a true si en el futuro activas SSL/HTTPS
        maxAge: 10 * 60 * 60 * 1000 // La sesión dura 10 horas
    }
}));

// EL PORTERO: Función para proteger rutas privadas
function asegurarSesion(req, res, next) {
    if (req.session && req.session.user) {
        return next(); // Tiene permiso, puede pasar
    }
    res.redirect('/login.html'); // No tiene sesión, lo mandamos al login
}

// Middleware
app.use(express.json({ limit: '10mb' }));

// IMPORTANTE: Servimos archivos públicos primero (index, planes, etc.)
// Pero NO las carpetas de admin y tecnico aún.
app.use(express.static(path.join(__dirname), {
    index: false,
    ignore: ['admin/**', 'tecnico/**'] 
}));

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========================================
// ENDPOINTS DE AUTENTICACIÓN (CORREGIDO)
// ========================================

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, nombre, email, username, rol FROM usuarios WHERE username = $1 AND password_hash = crypt($2, password_hash) AND activo = true',
            [username, password]
        );
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // 🔥 GUARDAR EN LA SESIÓN DEL SERVIDOR
            req.session.user = user; 
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Endpoint para cerrar sesión
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// ========================================
// RUTAS PROTEGIDAS (ADMIN Y TÉCNICO)
// ========================================

// Ahora estas rutas usan al PORTERO (asegurarSesion)
app.get('/admin/*', asegurarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', req.params[0] || 'control-pagos.html'));
});

app.get('/tecnico/*', asegurarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'tecnico', req.params[0] || 'alta-cliente.html'));
});

// ========================================
// ENDPOINTS API (Mantener igual debajo de aquí...)
// ========================================

// ... Aquí siguen todos tus app.get('/api/clientes'), app.put, app.delete, etc.
// ... Asegúrate de no borrarlos al pegar el código de arriba.

// ========================================
// RUTAS ESTÁTICAS PÚBLICAS
// ========================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/cobertura', (req, res) => res.sendFile(path.join(__dirname, 'cobertura.html')));
app.get('/contacto', (req, res) => res.sendFile(path.join(__dirname, 'contacto.html')));
app.get('/nosotros', (req, res) => res.sendFile(path.join(__dirname, 'nosotros.html')));
app.get('/planes', (req, res) => res.sendFile(path.join(__dirname, 'planes.html')));
app.get('/seguridad', (req, res) => res.sendFile(path.join(__dirname, 'seguridad.html')));
app.get('/soluciones', (req, res) => res.sendFile(path.join(__dirname, 'soluciones.html')));

app.listen(PORT, () => {
  console.log(`✅ FiberTec corriendo en http://localhost:${PORT}`);
});