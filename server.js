const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const midtransClient = require('midtrans-client');
const { v4: uuidv4 } = require('uuid');
const app = express();

app.use(express.json());

// Initialize Midtrans Snap client
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || 'YOUR_SERVER_KEY', 
  clientKey: process.env.MIDTRANS_CLIENT_KEY || 'YOUR_CLIENT_KEY'  
});

// === Setup koneksi MySQL (promise-based) ===
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'earpods_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test koneksi saat startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Terhubung ke database MySQL!');
    conn.release();
  } catch (err) {
    console.error('❌ Gagal konek ke database:', err.message);
  }
})();

// Serve frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// === Helper: normalisasi path gambar ===
function normalizeImagePath(filename) {
  if (!filename) return null;
  if (filename.startsWith('http') || filename.startsWith('/')) return filename;
  return `/image/${filename}`;
}

// === Helper: format harga Rupiah ===
function formatRupiah(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}

// ============================================================
// API ROUTES
// ============================================================

// --- GET /api/products ---
// Ambil semua produk aktif + kategori + images + options
app.get('/api/products', async (req, res) => {
  try {
    // Query produk + kategori
    const [products] = await pool.query(`
      SELECT 
        p.id, p.name, p.slug, p.description,
        p.price, p.original_price, p.stock,
        p.image, p.thumbnail, p.is_active,
        c.slug AS category, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.created_at DESC
    `);

    // Query semua gambar
    const [allImages] = await pool.query(`
      SELECT product_id, image_path, sort_order 
      FROM product_images 
      ORDER BY sort_order ASC
    `);

    // Query semua opsi
    const [allOptions] = await pool.query(`
      SELECT product_id, option_name 
      FROM product_options
    `);

    // Gabungkan data
    const result = products.map(p => {
      const images = allImages
        .filter(img => img.product_id === p.id)
        .map(img => normalizeImagePath(img.image_path));

      const options = allOptions
        .filter(opt => opt.product_id === p.id)
        .map(opt => opt.option_name);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : null,
        formattedPrice: formatRupiah(p.price),
        formattedOriginalPrice: p.original_price ? formatRupiah(p.original_price) : null,
        category: p.category || '',
        categoryName: p.category_name || '',
        stock: p.stock,
        image: normalizeImagePath(p.image),
        thumbnail: normalizeImagePath(p.thumbnail || p.image),
        images: images.length > 0 ? images : [normalizeImagePath(p.image)],
        options: options
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Gagal memuat produk' });
  }
});

// --- GET /api/products/:id ---
// Detail satu produk
app.get('/api/products/:id', async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT 
        p.id, p.name, p.slug, p.description,
        p.price, p.original_price, p.stock,
        p.image, p.thumbnail, p.is_active,
        c.slug AS category, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    const p = products[0];

    const [images] = await pool.query(
      'SELECT image_path, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
      [p.id]
    );

    const [options] = await pool.query(
      'SELECT option_name FROM product_options WHERE product_id = ?',
      [p.id]
    );

    res.json({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      originalPrice: p.original_price ? Number(p.original_price) : null,
      formattedPrice: formatRupiah(p.price),
      formattedOriginalPrice: p.original_price ? formatRupiah(p.original_price) : null,
      category: p.category || '',
      categoryName: p.category_name || '',
      stock: p.stock,
      image: normalizeImagePath(p.image),
      thumbnail: normalizeImagePath(p.thumbnail || p.image),
      images: images.length > 0
        ? images.map(img => normalizeImagePath(img.image_path))
        : [normalizeImagePath(p.image)],
      options: options.map(opt => opt.option_name)
    });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Gagal memuat detail produk' });
  }
});

// --- GET /api/categories ---
// Semua kategori
app.get('/api/categories', async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT id, slug, name, description 
      FROM categories 
      ORDER BY id ASC
    `);
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Gagal memuat kategori' });
  }
});

// --- POST /api/checkout ---
// Buat order dan generate Midtrans URL
app.post('/api/checkout', async (req, res) => {
  try {
    const { 
      fullName, phone, province, city, district, postalCode, addressDetail, notes,
      paymentMethod, cart 
    } = req.body;

    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: 'Keranjang kosong' });
    }

    // Hitung total dari database atau langsung (di sini kita pakai dari input untuk kesederhanaan, di production HARUS dari DB)
    let subtotal = 0;
    const orderItems = [];
    
    // Ambil harga dari DB
    for (const item of cart) {
      const [products] = await pool.query('SELECT name, price FROM products WHERE id = ?', [item.productId]);
      if (products.length > 0) {
        const p = products[0];
        const price = Number(p.price);
        const qty = item.quantity || 1;
        subtotal += price * qty;
        orderItems.push({
          productId: item.productId,
          name: p.name,
          price: price,
          quantity: qty
        });
      }
    }

    const adminFee = Math.round(subtotal * 0.02);
    const grandTotal = subtotal + adminFee;
    const orderId = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    // 1. Simpan ke tabel orders (status pending)
    const [orderResult] = await pool.query(`
      INSERT INTO orders (
        order_id, customer_name, customer_phone, province, city, district, 
        postal_code, address_detail, notes, payment_method, subtotal, admin_fee, grand_total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      orderId, fullName, phone, province, city, district, 
      postalCode, addressDetail, notes, paymentMethod, subtotal, adminFee, grandTotal
    ]);

    // 2. Simpan order items
    for (const item of orderItems) {
      await pool.query(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, item.productId, item.name, item.price, item.quantity]);
    }

    // 3. Buat transaksi ke Midtrans
    const itemDetails = orderItems.map(item => ({
      id: item.productId,
      price: item.price,
      quantity: item.quantity,
      name: item.name.substring(0, 50)
    }));

    // Tambahkan admin fee sebagai item
    if (adminFee > 0) {
      itemDetails.push({
        id: 'ADMIN-FEE',
        price: adminFee,
        quantity: 1,
        name: 'Biaya Admin (2%)'
      });
    }

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grandTotal
      },
      customer_details: {
        first_name: fullName,
        phone: phone,
        billing_address: {
          first_name: fullName,
          phone: phone,
          address: addressDetail || '-',
          city: city,
          postal_code: postalCode,
          country_code: 'IDN'
        }
      },
      item_details: itemDetails
    };

    const transaction = await snap.createTransaction(parameter);
    
    // Update token & redirect url ke database
    await pool.query('UPDATE orders SET snap_token = ? WHERE order_id = ?', [transaction.token, orderId]);

    // Kirim response
    res.json({
      success: true,
      order_id: orderId,
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Gagal membuat transaksi' });
  }
});

// --- POST /api/midtrans/webhook ---
// Handle callback dari Midtrans
app.post('/api/midtrans/webhook', async (req, res) => {
  try {
    const notificationJson = req.body;
    const notification = await snap.transaction.notification(notificationJson);
    
    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;
    
    let orderStatus = 'pending';

    if (transactionStatus == 'capture') {
        if (fraudStatus == 'challenge'){
            orderStatus = 'pending';
        } else if (fraudStatus == 'accept'){
            orderStatus = 'settlement';
        }
    } else if (transactionStatus == 'settlement'){
        orderStatus = 'settlement';
    } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire'){
        orderStatus = transactionStatus;
    } else if (transactionStatus == 'pending'){
        orderStatus = 'pending';
    }
    
    // Update database
    let updateQuery = 'UPDATE orders SET status = ?, midtrans_transaction_id = ?';
    const queryParams = [orderStatus, notification.transaction_id];
    
    if (orderStatus === 'settlement') {
        updateQuery += ', paid_at = NOW()';
    }
    updateQuery += ' WHERE order_id = ?';
    queryParams.push(orderId);
    
    await pool.query(updateQuery, queryParams);
    
    console.log(`Order ${orderId} status updated to ${orderStatus}`);
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// --- GET /api/orders/:orderId ---
// Cek status pesanan
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [req.params.orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }
    
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.orderId]);
    
    res.json({
      order: orders[0],
      items: items
    });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Gagal mengambil data pesanan' });
  }
});

// === Fallback untuk route non-API dan non-file ===
const fallbackRoute = (req, res) => {
  if (req.path.includes('.') || req.path.startsWith('/api')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
};

app.get(/^\/(?!api)(?!\.\.).*$/, fallbackRoute);

// === Jalankan server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));
