const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const midtransClient = require('midtrans-client');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const app = express();

app.use(express.json());

// === Setup Multer untuk upload file ===
const uploadDir = path.join(__dirname, 'public', 'uploads', 'payments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${req.body.order_id}-${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung'));
    }
  }
});

// Initialize Midtrans Snap client
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-nLEY047RxYhsrxGj'
});

// === Setup koneksi MySQL (promise-based) ===
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'earpods_db',
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

    // 3. Siapkan item details untuk gateway atau manual payment
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

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    // Jika pelanggan memilih Pembayaran Manual, arahkan ke halaman upload bukti
    if (paymentMethod === 'Manual Payment') {
      const manualUrl = `${baseUrl}/payment-proof.html?id=${orderId}`;
      await pool.query('UPDATE orders SET redirect_url = ? WHERE order_id = ?', [manualUrl, orderId]);
      return res.json({
        success: true,
        order_id: orderId,
        manual: true,
        payment_proof_url: manualUrl,
        instructions: {
          message: 'Silakan transfer ke rekening kami dan unggah bukti pembayaran di halaman yang disediakan.',
          bank: 'BCA',
          account_number: '1234567890',
          account_name: 'INFINITY STORE'
        }
      });
    }

    // Default: buat transaksi ke Midtrans (Snap)
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
      item_details: itemDetails,
      // Callbacks untuk berbagai metode pembayaran
      callbacks: {
        finish: `${baseUrl}/order-status.html?id=${orderId}`,
        unfinish: `${baseUrl}/order-status.html?id=${orderId}`,
        error: `${baseUrl}/order-status.html?id=${orderId}`
      },
      // Enable semua payment methods
      payment_type: 'all'
    };

    const transaction = await snap.createTransaction(parameter);

    // Update token & redirect url ke database
    await pool.query('UPDATE orders SET snap_token = ?, redirect_url = ? WHERE order_id = ?', [transaction.token, transaction.redirect_url, orderId]);

    // Kirim response
    res.json({
      success: true,
      order_id: orderId,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      client_key: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-nLEY047RxYhsrxGj'
    });

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Gagal membuat transaksi' });
  }
});

// --- POST /api/midtrans/webhook ---
// Handle callback dari Midtrans untuk semua metode pembayaran
app.post('/api/midtrans/webhook', async (req, res) => {
  try {
    const notificationJson = req.body;
    console.log('Webhook received:', notificationJson);
    
    const notification = await snap.transaction.notification(notificationJson);
    
    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;
    const paymentType = notification.payment_type;
    
    console.log(`[WEBHOOK] Order: ${orderId}, Status: ${transactionStatus}, Payment Type: ${paymentType}, Fraud: ${fraudStatus}`);
    
    let orderStatus = 'pending';

    // Mapping status dari Midtrans ke status order
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
    
    // Update database dengan status pembayaran terbaru
    let updateQuery = 'UPDATE orders SET status = ?, midtrans_transaction_id = ?, payment_type = ?';
    const queryParams = [orderStatus, notification.transaction_id, paymentType];
    
    if (orderStatus === 'settlement') {
        updateQuery += ', paid_at = NOW()';
    }
    updateQuery += ' WHERE order_id = ?';
    queryParams.push(orderId);
    
    await pool.query(updateQuery, queryParams);
    
    console.log(`✅ Order ${orderId} status updated to ${orderStatus}`);
    res.status(200).json({ status: 'OK', message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed', message: error.message });
  }
});

// --- GET /api/midtrans/status/:orderId ---
// Check payment status real-time dari Midtrans
app.get('/api/midtrans/status/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    
    // Get status dari database terlebih dahulu
    const [orders] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order tidak ditemukan' });
    }

    const order = orders[0];
    
    // Jika sudah settlement, return langsung
    if (order.status === 'settlement') {
      return res.json({
        status: 'settlement',
        order_id: orderId,
        message: 'Pembayaran sudah berhasil'
      });
    }

    // Jika masih pending, cek ke Midtrans
    if (order.snap_token) {
      try {
        const statusRes = await snap.transaction.status(orderId);
        console.log(`Status check for ${orderId}:`, statusRes.transaction_status);
        
        return res.json({
          status: statusRes.transaction_status,
          order_id: orderId,
          payment_type: statusRes.payment_type,
          gross_amount: statusRes.gross_amount
        });
      } catch (err) {
        console.error(`Failed to check status from Midtrans for ${orderId}:`, err);
        // Return local status jika gagal check ke Midtrans
        return res.json({
          status: order.status,
          order_id: orderId,
          message: 'Status dari database lokal'
        });
      }
    }

    res.json({
      status: order.status,
      order_id: orderId,
      message: 'Status dari database lokal'
    });
  } catch (err) {
    console.error('Error checking status:', err);
    res.status(500).json({ error: 'Gagal mengecek status pembayaran' });
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

// ============================================================
// ADMIN ENDPOINTS - Payment Management
// ============================================================

// --- GET /api/admin/orders ---
// List semua order untuk admin dashboard
app.get('/api/admin/orders', async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT id, order_id, customer_name, customer_phone, province, city, district, 
             postal_code, address_detail, payment_method, subtotal, admin_fee, grand_total, 
             status, payment_proof_path, confirmed_at, confirmed_by, rejection_reason, 
             created_at, updated_at
      FROM orders 
      ORDER BY created_at DESC
    `);
    
    res.json(orders);
  } catch (err) {
    console.error('Error fetching admin orders:', err);
    res.status(500).json({ error: 'Gagal memuat daftar pesanan' });
  }
});

// --- POST /api/admin/approve-payment ---
// Setujui pembayaran manual
app.post('/api/admin/approve-payment', async (req, res) => {
  try {
    const { order_id, admin_name } = req.body;
    
    if (!order_id || !admin_name) {
      return res.status(400).json({ error: 'order_id dan admin_name diperlukan' });
    }

    // Update order status ke settlement
    await pool.query(`
      UPDATE orders 
      SET status = 'settlement', confirmed_at = NOW(), confirmed_by = ?
      WHERE order_id = ?
    `, [admin_name, order_id]);

    console.log(`✅ Payment approved for order ${order_id} by ${admin_name}`);
    res.json({ 
      success: true, 
      message: 'Pembayaran telah disetujui',
      order_id: order_id
    });
  } catch (err) {
    console.error('Error approving payment:', err);
    res.status(500).json({ error: 'Gagal menyetujui pembayaran' });
  }
});

// --- POST /api/admin/reject-payment ---
// Tolak pembayaran manual
app.post('/api/admin/reject-payment', async (req, res) => {
  try {
    const { order_id, reason } = req.body;
    
    if (!order_id || !reason) {
      return res.status(400).json({ error: 'order_id dan reason diperlukan' });
    }

    // Update order status ke rejected
    await pool.query(`
      UPDATE orders 
      SET status = 'rejected', rejection_reason = ?
      WHERE order_id = ?
    `, [reason, order_id]);

    console.log(`❌ Payment rejected for order ${order_id}: ${reason}`);
    res.json({ 
      success: true, 
      message: 'Pembayaran telah ditolak',
      order_id: order_id
    });
  } catch (err) {
    console.error('Error rejecting payment:', err);
    res.status(500).json({ error: 'Gagal menolak pembayaran' });
  }
});

// --- POST /api/upload-payment-proof ---
// Upload bukti pembayaran (manual) dan simpan path ke order
app.post('/api/upload-payment-proof', upload.single('proof_file'), async (req, res) => {
  try {
    const order_id = req.body.order_id;
    const notes = req.body.notes || null;
    const file = req.file;

    if (!order_id || !file) {
      return res.status(400).json({ error: 'order_id dan file bukti diperlukan' });
    }

    // Pastikan order ada
    const [orders] = await pool.query('SELECT order_id FROM orders WHERE order_id = ?', [order_id]);
    if (orders.length === 0) {
      // Hapus file jika order tidak ditemukan
      try { fs.unlinkSync(file.path); } catch (e) {}
      return res.status(404).json({ error: 'Order tidak ditemukan' });
    }

    const publicPath = `/uploads/payments/${file.filename}`;

    // Simpan path file dan catatan (notes) ke tabel orders
    await pool.query('UPDATE orders SET payment_proof_path = ?, notes = ? WHERE order_id = ?', [publicPath, notes, order_id]);

    res.json({ success: true, order_id: order_id, file: publicPath });
  } catch (err) {
    console.error('Error uploading payment proof:', err);
    res.status(500).json({ error: 'Gagal mengunggah bukti pembayaran' });
  }
});

// === Route khusus untuk callback Midtrans ===
app.get('/callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'callback.html'));
});

// === Fallback untuk route non-API dan non-file ===
const fallbackRoute = (req, res) => {
  if (req.path.includes('.') || req.path.startsWith('/api')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
};

app.get(/^\/(?!api)(?!\.\.).*$/, fallbackRoute);

// === Jalankan server (Hanya jika tidak di Vercel) ===
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));
}

module.exports = app;
