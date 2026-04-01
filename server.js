const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const session = require('express-session'); // ← Agregado para seguridad
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// BLOQUE DE SEGURIDAD (NUEVO)
// ========================================
app.use(session({
    secret: 'FiberTec-2026-Secret-Key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 10 * 60 * 60 * 1000 // 10 horas
    }
}));

// Función Portero
function asegurarSesion(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login.html');
}

// Middleware
app.use(express.json({ limit: '10mb' }));
// Nota: Quitamos el static global de aquí para que no se salte el portero
// Lo pondremos al final del archivo.

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========================================
// ENDPOINTS API (TODA TU LÓGICA ORIGINAL)
// ========================================

// Obtener todos los clientes
app.get('/api/clientes', asegurarSesion, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener un cliente por ID
app.get('/api/clientes/:id', asegurarSesion, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clientes/:id', asegurarSesion, async (req, res) => {
  const { nombre, telefono1, telefono2, colonia, direccion, plan, ip, mac,
          marca_modem, modelo_modem, serial_modem, fecha_instalacion, 
          observaciones, tecnico, foto, dia_pago } = req.body;
  try {
    const result = await pool.query(
      `UPDATE clientes 
       SET nombre = $1, telefono1 = $2, telefono2 = $3, colonia = $4, 
           direccion = $5, plan = $6, ip = $7, mac = $8,
           marca_modem = $9, modelo_modem = $10, serial_modem = $11,
           fecha_instalacion = $12, observaciones = $13, tecnico = $14, 
           foto = $15, dia_pago = $16
       WHERE id = $17 RETURNING *`,
      [nombre, telefono1, telefono2, colonia, direccion, plan, ip, mac,
       marca_modem, modelo_modem, serial_modem, fecha_instalacion, 
       observaciones, tecnico, foto, dia_pago, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar cliente
app.delete('/api/clientes/:id', asegurarSesion, async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// ENDPOINTS PAGOS (TU LÓGICA ORIGINAL)
// ========================================

app.get('/api/clientes/:id/pagos', asegurarSesion, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pagos WHERE cliente_id = $1 ORDER BY fecha DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pagos', asegurarSesion, async (req, res) => {
  const { clienteId, fecha, monto, metodo, referencia, notas, registradoPor } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO pagos 
       (cliente_id, fecha, monto, metodo, referencia, notas, registrado_por) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [clienteId, fecha, monto, metodo, referencia, notas, registradoPor]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pagos', asegurarSesion, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pagos ORDER BY fecha DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reportes/pagos/:mes', asegurarSesion, async (req, res) => {
  const mes = req.params.mes;
  try {
    const result = await pool.query(
      `SELECT 
          c.id, c.nombre, c.telefono1,
          p.fecha, p.monto, p.metodo,
          CASE 
            WHEN p.fecha IS NULL THEN 'PENDIENTE'
            ELSE 'PAGADO'
          END as estado
       FROM clientes c
       LEFT JOIN pagos p ON c.id = p.cliente_id 
          AND TO_CHAR(p.fecha, 'YYYY-MM') = $1
       ORDER BY c.nombre`,
      [mes]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// ENDPOINTS DE AUTENTICACIÓN (ACTUALIZADO)
// ========================================

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, nombre, email, username, rol FROM usuarios WHERE username = $1 AND password_hash = crypt($2, password_hash) AND activo = true',
            [username, password]
        );
        
        if (result.rows.length > 0) {
            req.session.user = result.rows[0]; // Creamos la sesión
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// ========================================
// GESTIÓN DE USUARIOS (TU LÓGICA ORIGINAL)
// ========================================

app.get('/api/usuarios', asegurarSesion, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email, rol, activo, fecha_registro FROM usuarios ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/usuarios', asegurarSesion, async (req, res) => {
    const { nombre, email, password, rol, activo } = req.body;
    try {
        let query, params;
        if (password) {
            query = `INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5) RETURNING id`;
            params = [nombre, email, password, rol, activo];
        } else {
            query = `INSERT INTO usuarios (nombre, email, rol, activo) VALUES ($1, $2, $3, $4) RETURNING id`;
            params = [nombre, email, rol, activo];
        }
        const result = await pool.query(query, params);
        res.json({ id: result.rows[0].id, message: 'Usuario creado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/usuarios/:id', asegurarSesion, async (req, res) => {
    const { nombre, email, password, rol, activo } = req.body;
    const id = req.params.id;
    try {
        let query, params;
        if (password) {
            query = `UPDATE usuarios SET nombre = $1, email = $2, password_hash = crypt($3, gen_salt('bf')), rol = $4, activo = $5 WHERE id = $6`;
            params = [nombre, email, password, rol, activo, id];
        } else {
            query = `UPDATE usuarios SET nombre = $1, email = $2, rol = $3, activo = $4 WHERE id = $5`;
            params = [nombre, email, rol, activo, id];
        }
        await pool.query(query, params);
        res.json({ message: 'Usuario actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/usuarios/:id', asegurarSesion, async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// RUTAS ESTÁTICAS (HTML PROTEGIDOS)
// ========================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/cobertura', (req, res) => res.sendFile(path.join(__dirname, 'cobertura.html')));
app.get('/contacto', (req, res) => res.sendFile(path.join(__dirname, 'contacto.html')));
app.get('/nosotros', (req, res) => res.sendFile(path.join(__dirname, 'nosotros.html')));
app.get('/planes', (req, res) => res.sendFile(path.join(__dirname, 'planes.html')));
app.get('/seguridad', (req, res) => res.sendFile(path.join(__dirname, 'seguridad.html')));
app.get('/soluciones', (req, res) => res.sendFile(path.join(__dirname, 'soluciones.html')));

// Rutas para admin y técnico con PORTERO
app.get('/admin/*', asegurarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', req.params[0] || 'control-pagos.html'));
});
app.get('/tecnico/*', asegurarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'tecnico', req.params[0] || 'alta-cliente.html'));
});

// Cargar archivos generales (CSS, JS, Imágenes)
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`✅ FiberTec corriendo en puerto ${PORT}`);
});