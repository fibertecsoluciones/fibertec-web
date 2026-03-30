const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========================================
// ENDPOINTS API
// ========================================

// Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener un cliente por ID
app.get('/api/clientes/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear nuevo cliente
app.post('/api/clientes', async (req, res) => {
  const { nombre, telefono1, telefono2, colonia, direccion, lat, lng, 
          plan, ip, mac, marcaModem, modeloModem, serialModem, 
          fechaInstalacion, observaciones, tecnico, foto, dia_pago } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO clientes 
       (nombre, telefono1, telefono2, colonia, direccion, lat, lng, 
        plan, ip, mac, marca_modem, modelo_modem, serial_modem, 
        fecha_instalacion, observaciones, tecnico, foto, dia_pago) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
       RETURNING *`,
      [nombre, telefono1, telefono2, colonia, direccion, lat, lng, 
       plan, ip, mac, marcaModem, modeloModem, serialModem, 
       fechaInstalacion, observaciones, tecnico, foto, dia_pago || 15]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
  const { nombre, telefono1, telefono2, colonia, direccion, plan, ip, mac } = req.body;
  try {
    const result = await pool.query(
      `UPDATE clientes 
       SET nombre = $1, telefono1 = $2, telefono2 = $3, colonia = $4, 
           direccion = $5, plan = $6, ip = $7, mac = $8
       WHERE id = $9 RETURNING *`,
      [nombre, telefono1, telefono2, colonia, direccion, plan, ip, mac, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar cliente
app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// ENDPOINTS PAGOS
// ========================================

// Obtener pagos de un cliente
app.get('/api/clientes/:id/pagos', async (req, res) => {
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

// Registrar pago
app.post('/api/pagos', async (req, res) => {
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


// Obtener TODOS los pagos (para el dashboard)
app.get('/api/pagos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pagos ORDER BY fecha DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reporte de pagos por mes
app.get('/api/reportes/pagos/:mes', async (req, res) => {
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
// ENDPOINTS DE AUTENTICACIÓN (para admin/técnicos)
// ========================================

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, nombre, rol FROM usuarios WHERE email = $1 AND password_hash = crypt($2, password_hash)',
      [email, password]
    );
    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email, rol, activo, fecha_registro FROM usuarios ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear usuario
app.post('/api/usuarios', async (req, res) => {
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

// Actualizar usuario
app.put('/api/usuarios/:id', async (req, res) => {
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

// Eliminar usuario
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ========================================
// RUTAS ESTÁTICAS (HTML)
// ========================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cobertura', (req, res) => res.sendFile(path.join(__dirname, 'cobertura.html')));
app.get('/contacto', (req, res) => res.sendFile(path.join(__dirname, 'contacto.html')));
app.get('/nosotros', (req, res) => res.sendFile(path.join(__dirname, 'nosotros.html')));
app.get('/planes', (req, res) => res.sendFile(path.join(__dirname, 'planes.html')));
app.get('/seguridad', (req, res) => res.sendFile(path.join(__dirname, 'seguridad.html')));
app.get('/soluciones', (req, res) => res.sendFile(path.join(__dirname, 'soluciones.html')));

// Rutas para admin y técnico
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', req.params[0] || 'control-pagos.html'));
});
app.get('/tecnico/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'tecnico', req.params[0] || 'alta-cliente.html'));
});

app.listen(PORT, () => {
  console.log(`✅ FiberTec corriendo en http://localhost:${PORT}`);
});