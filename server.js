const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to SQLite database
const dbPath = path.join(__dirname, 'brain.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database:', err);
  } else {
    console.log('Connected to SQLite database: brain.db');
  }
});

// Serve Admin Panel static page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ================= API PRODUCTS =================
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { name, type, price, description, quantity } = req.body;
  const sql = 'INSERT INTO products (name, type, price, description, quantity) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [name, type, price, description, quantity], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, type, price, description, quantity });
  });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, price, description, quantity } = req.body;
  const sql = 'UPDATE products SET name = ?, type = ?, price = ?, description = ?, quantity = ? WHERE id = ?';
  db.run(sql, [name, type, price, description, quantity, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM products WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ================= API CUSTOMERS =================
app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/customers', (req, res) => {
  const { name, phone, zalo, email } = req.body;
  const created_at = new Date().toISOString();
  const sql = 'INSERT INTO customers (name, phone, zalo, email, created_at) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [name, phone, zalo, email, created_at], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, phone, zalo, email, created_at });
  });
});

app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, zalo, email } = req.body;
  const sql = 'UPDATE customers SET name = ?, phone = ?, zalo = ?, email = ? WHERE id = ?';
  db.run(sql, [name, phone, zalo, email, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM customers WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ================= API ORDERS =================
app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Check order payment status
app.get('/api/orders/status', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing order id' });
  db.get('SELECT status FROM orders WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Order not found' });
    res.json({ status: row.status });
  });
});

// Helper function to handle product inventory subtraction
function subtractInventory(productName, quantityToSubtract) {
  db.get('SELECT id, type, quantity FROM products WHERE name = ?', [productName], (err, product) => {
    if (!err && product && product.type === 'physical') {
      const newQty = Math.max(0, (product.quantity || 0) - quantityToSubtract);
      db.run('UPDATE products SET quantity = ? WHERE id = ?', [newQty, product.id]);
    }
  });
}

// Create new order (Frontend checkout or Admin manual)
app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, customer_email, product_name, amount, status = 'pending' } = req.body;
  const created_at = new Date().toISOString();
  
  // 1. Insert order first to get ID
  const sqlOrder = 'INSERT INTO orders (customer_name, customer_phone, customer_email, product_name, amount, status, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.run(sqlOrder, [customer_name, customer_phone, customer_email, product_name, amount, status, '', created_at], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const orderId = this.lastID;
    
    // 2. Generate unique memo: e.g., "AIMAR123" (order ID)
    const memo = `AIMAR${orderId}`;
    
    db.run('UPDATE orders SET memo = ? WHERE id = ?', [memo, orderId], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      
      // 3. Subtract inventory if adding directly as a successful physical order
      if (status === 'success') {
        subtractInventory(product_name, 1);
      }
      
      // 4. Save/update customer info in parallel if phone is provided
      if (customer_phone) {
        db.get('SELECT id FROM customers WHERE phone = ?', [customer_phone], (custErr, row) => {
          if (!custErr && !row) {
            db.run('INSERT INTO customers (name, phone, email, created_at) VALUES (?, ?, ?, ?)', 
              [customer_name, customer_phone, customer_email, created_at]);
          }
        });
      }

      res.json({ id: orderId, customer_name, customer_phone, customer_email, product_name, amount, status, memo, created_at });
    });
  });
});

// Update order (Admin manual triggers / status changes)
app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, customer_email, product_name, amount, status, memo } = req.body;
  
  // Get current status of order to check if we transition to success
  db.get('SELECT status, product_name FROM orders WHERE id = ?', [id], (getErr, oldOrder) => {
    if (getErr || !oldOrder) return res.status(500).json({ error: getErr ? getErr.message : 'Order not found' });
    
    const sql = 'UPDATE orders SET customer_name = ?, customer_phone = ?, customer_email = ?, product_name = ?, amount = ?, status = ?, memo = ? WHERE id = ?';
    db.run(sql, [customer_name, customer_phone, customer_email, product_name, amount, status, memo, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // If order transitions to success from non-success, subtract inventory
      if (status === 'success' && oldOrder.status !== 'success') {
        subtractInventory(product_name, 1);
      }
      
      res.json({ success: true });
    });
  });
});

app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM orders WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ================= API SEPAY WEBHOOK =================
app.post('/api/sepay-webhook', (req, res) => {
  const { content, transferAmount, transferType } = req.body;
  
  console.log('Received Sepay Webhook:', { content, transferAmount, transferType });
  
  if (transferType !== 'in') {
    return res.json({ success: true, message: 'Not an incoming payment' });
  }

  if (!content) {
    return res.status(400).json({ success: false, message: 'Missing transaction content' });
  }

  // Normalize transaction content to find matching memo (e.g., content contains AIMAR12)
  const normalizedContent = content.toUpperCase().replace(/\s+/g, '');
  
  // Query all pending orders
  db.all("SELECT id, memo, product_name, status FROM orders WHERE status = 'pending'", [], (err, rows) => {
    if (err) {
      console.error('Error fetching pending orders:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    let matchedOrder = null;
    for (const row of rows) {
      if (row.memo) {
        const normalizedMemo = row.memo.toUpperCase().replace(/\s+/g, '');
        if (normalizedContent.includes(normalizedMemo)) {
          matchedOrder = row;
          break;
        }
      }
    }

    if (matchedOrder) {
      console.log(`Matched order ID ${matchedOrder.id} for memo: ${matchedOrder.memo}`);
      
      // Update order status to success
      db.run("UPDATE orders SET status = 'success' WHERE id = ?", [matchedOrder.id], (updateErr) => {
        if (updateErr) {
          console.error('Error updating order:', updateErr);
          return res.status(500).json({ success: false, error: updateErr.message });
        }
        
        // Subtract inventory if physical product
        subtractInventory(matchedOrder.product_name, 1);
        
        return res.json({ success: true, message: `Order ${matchedOrder.id} marked as success` });
      });
    } else {
      console.log('No matching pending order found for content:', content);
      return res.json({ success: false, message: 'No matching pending order' });
    }
  });
});

// Trả về trang chủ cho bất kỳ URL nào không khớp (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Node.js đang chạy tại cổng ${PORT}`);
});
