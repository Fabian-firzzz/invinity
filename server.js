const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();

app.use(express.json());

// === Setup koneksi MySQL ===
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'earpods_db'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Gagal konek ke database:', err);
  } else {
    console.log('✅ Terhubung ke database MySQL!');
  }
});

// Serve frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// === API Routes ===
// Get products from database or return sample data
app.get('/api/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) {
      console.error(err);
      // Return sample data if database fails
      const sampleProducts = [
        {
          id: 'pro2',
          name: 'Invinity Pro',
          price: 150000,
          formattedPrice: 'Rp 150.000',
          description: 'Invinity Pro dengan Audio Adaptif, Pembatalan Bising Aktif 2x lebih baik, dan Mode Transparansi yang ditingkatkan.',
          image: 'hexa ijo.png',
          thumbnail: 'hexa item.png',
          category: 'airpods_pro'
        },
        {
          id: 'max',
          name: 'Invinity Max',
          price: 110000,
          formattedPrice: 'Rp 110.000',
          description: 'Invinity Max menghadirkan pengalaman mendengarkan personal secara menyeluruh.',
          image: '11.png',
          thumbnail: '11.png',
          category: 'airpods_max'
        },
        {
          id: '2rd',
          name: 'Invinity Strongest',
          price: 175000,
          formattedPrice: 'Rp 175.000',
          description: 'Invinity Strongest memiliki Audio Spasial Personalisasi dengan pelacakan kepala dinamis.',
          image: '12.png',
          thumbnail: '12.png',
          category: 'airpods_3'
        }
      ];
      // Normalisasi path gambar
      const mapped = sampleProducts.map(r => {
        const out = { ...r };
        if (out.image) {
          if (!out.image.startsWith('http') && !out.image.includes('/')) out.image = `/image/${out.image}`;
        }
        if (out.thumbnail) {
          if (!out.thumbnail.startsWith('http') && !out.thumbnail.includes('/')) out.thumbnail = `/image/${out.thumbnail}`;
        }
        return out;
      });
      return res.json(mapped);
    }
    // Normalisasi path gambar sebelum dikirim ke client
    const mapped = results.map(r => {
      const out = { ...r };
      if (out.image) {
        if (!out.image.startsWith('http') && !out.image.includes('/')) out.image = `/image/${out.image}`;
      }
      if (out.thumbnail) {
        if (!out.thumbnail.startsWith('http') && !out.thumbnail.includes('/')) out.thumbnail = `/image/${out.thumbnail}`;
      }
      return out;
    });
    res.json(mapped);
  });
});

const fallbackRoute = (req, res) => {
  if (req.path.includes('.') || req.path.startsWith('/api')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
};

// === Fallback untuk route non-API dan non-file ===
// Use a regex pattern to match all routes except those containing a dot or starting with /api
app.get(/^\/(?!api)(?!.*\.).*$/, fallbackRoute);

// === Jalankan server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));
