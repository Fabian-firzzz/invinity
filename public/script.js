function normalizeImgPath(p) {
  const src = p.image || p.thumbnail || '';
  if (!src) return 'image/placeholder.png';
  if (src.startsWith('http') || src.startsWith('/')) return src;
  return src.includes('/') ? src : `image/${src}`;
}

// Fetch products from server and render into #product-list
fetch('/api/products')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('product-list');
    if (!Array.isArray(data)) data = [];
    container.innerHTML = data.map(p => {
      const imgSrc = normalizeImgPath(p);
      return `
        <div class="product-card">
          <div class="product-image-wrap">
            <img src="${encodeURI(imgSrc)}" alt="${p.name}" width="150">
          </div>
          <div class="product-body">
            <h3 class="product-title">${p.name}</h3>
            <p class="price">${p.price ? new Intl.NumberFormat('id-ID').format(p.price) : '-'}</p>
          </div>
        </div>
      `;
    }).join('');
  })
  .catch(err => console.error('Gagal mengambil data produk:', err));