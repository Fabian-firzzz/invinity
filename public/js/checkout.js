document.addEventListener('DOMContentLoaded', () => {
    // We will use product snapshot data stored inside cart (no DB dependency)
    let productsMap = {};
    // attempt to load API only as fallback (not required)
    fetch('/api/products')
        .then(r => r.json())
        .then(products => { products.forEach(p => productsMap[p.id] = p); })
        .catch(() => {} )
        .finally(() => renderOrder());

    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }

    function renderOrder() {
        const cart = JSON.parse(localStorage.getItem('airpodsCart')) || [];
        const orderItems = document.getElementById('orderItems');
        const subtotalEl = document.getElementById('subtotal');
        const adminEl = document.getElementById('adminFee');
        const grandEl = document.getElementById('grandTotal');

        if (!orderItems) return;
        if (cart.length === 0) {
            orderItems.innerHTML = '<p>Keranjang kosong. Tambahkan produk sebelum checkout.</p>';
            subtotalEl.textContent = formatRupiah(0);
            adminEl.textContent = formatRupiah(0);
            grandEl.textContent = formatRupiah(0);
            return;
        }

        let subtotal = 0;
        orderItems.innerHTML = '';
        cart.forEach(item => {
            // prefer snapshot stored in cart
            const name = item.name || (productsMap[item.productId] && productsMap[item.productId].name) || item.productId;
            const price = (typeof item.price === 'number') ? item.price : ((productsMap[item.productId] && productsMap[item.productId].price) || 0);
            const qty = item.quantity || 1;
            const line = price * qty;
            subtotal += line;
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.marginBottom = '8px';
            div.innerHTML = `<div>${name} x ${qty}</div><div>${formatRupiah(line)}</div>`;
            orderItems.appendChild(div);
        });
        const admin = Math.round(subtotal * 0.02);
        const grand = subtotal + admin;
        subtotalEl.textContent = formatRupiah(subtotal);
        adminEl.textContent = formatRupiah(admin);
        grandEl.textContent = formatRupiah(grand);
    }

    const form = document.getElementById('checkoutForm');
    const qrModal = document.getElementById('qrModal');
    const qrImage = document.getElementById('qrImage');
    const qrAmount = document.getElementById('qrAmount');
    const qrTimer = document.getElementById('qrTimer');
    const paidButton = document.getElementById('paidButton');
    const closeQr = document.getElementById('closeQr');

    function onlyDigits(val) { return /^\d+$/.test(val); }

    // show/hide custom fields for selects
    function wireCustomSelects() {
        const province = document.getElementById('province');
        const provinceCustom = document.getElementById('provinceCustom');
        province.addEventListener('change', () => { provinceCustom.style.display = (province.value === 'Lainnya') ? 'block' : 'none'; });
        const city = document.getElementById('city');
        const cityCustom = document.getElementById('cityCustom');
        city.addEventListener('change', () => { cityCustom.style.display = (city.value === 'Lainnya') ? 'block' : 'none'; });
        const district = document.getElementById('district');
        const districtCustom = document.getElementById('districtCustom');
        district.addEventListener('change', () => { districtCustom.style.display = (district.value === 'Lainnya') ? 'block' : 'none'; });
    }
    wireCustomSelects();

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Validate fields
        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const provinceEl = document.getElementById('province');
        const province = (provinceEl.value === 'Lainnya') ? document.getElementById('provinceCustom').value.trim() : provinceEl.value.trim();
        const cityEl = document.getElementById('city');
        const city = (cityEl.value === 'Lainnya') ? document.getElementById('cityCustom').value.trim() : cityEl.value.trim();
        const districtEl = document.getElementById('district');
        const district = (districtEl.value === 'Lainnya') ? document.getElementById('districtCustom').value.trim() : districtEl.value.trim();
        const postalCode = document.getElementById('postalCode').value.trim();
        const addressDetail = document.getElementById('addressDetail').value.trim(); // now optional
        const notes = document.getElementById('notes').value.trim();

        // Required checks: fullName, phone, province, city, district, postalCode
        if (!fullName || !phone || !province || !city || !district || !postalCode) {
            alert('Lengkapi semua field wajib. Detail alamat dan catatan bersifat opsional.');
            return;
        }
        if (!onlyDigits(phone)) { alert('Nomor HP harus angka saja.'); return; }
        if (!onlyDigits(postalCode)) { alert('Kode pos harus angka saja.'); return; }

        // prepare order details
        const cart = JSON.parse(localStorage.getItem('airpodsCart')) || [];
        if (cart.length === 0) { alert('Keranjang kosong.'); return; }

        // compute total using cart snapshot prices (not API fallback)
        let subtotal = 0;
        cart.forEach(item => {
            // use snapshot price stored in cart
            const price = (typeof item.price === 'number') ? item.price : 0;
            const qty = item.quantity || 1;
            subtotal += price * qty;
        });
        const admin = Math.round(subtotal * 0.02);
        const grand = subtotal + admin;

        // Buat payload untuk dikirim ke backend
        const requestData = {
            fullName, phone, province, city, district, postalCode, addressDetail, notes,
            paymentMethod: 'Midtrans Snap',
            cart: cart
        };

        // Ganti tombol submit dengan loading state
        const submitBtn = document.querySelector('#checkoutForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Memproses...';

        // Panggil API checkout
        fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.token) {
                // Kosongkan keranjang
                localStorage.removeItem('airpodsCart');

                // Tampilkan Midtrans Snap Popup
                window.snap.pay(data.token, {
                    onSuccess: function(result){
                        window.location.href = `order-status.html?id=${data.order_id}`;
                    },
                    onPending: function(result){
                        window.location.href = `order-status.html?id=${data.order_id}`;
                    },
                    onError: function(result){
                        alert('Pembayaran gagal!');
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    },
                    onClose: function(){
                        alert('Anda menutup popup sebelum menyelesaikan pembayaran.');
                        window.location.href = `order-status.html?id=${data.order_id}`;
                    }
                });
            } else {
                alert('Gagal membuat transaksi: ' + (data.error || 'Unknown error'));
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        })
        .catch(err => {
            console.error('Checkout error:', err);
            alert('Terjadi kesalahan saat memproses checkout.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    });

    closeQr.addEventListener('click', () => {
        qrModal.style.display = 'none';
    });

    let countdownInterval = null;
    function showQrCountdown(seconds) {
        clearInterval(countdownInterval);
        let t = seconds;
        const btn = paidButton;
        btn.disabled = false; btn.textContent = 'Saya Sudah Bayar';
        function update() {
            const m = Math.floor(t/60).toString().padStart(2,'0');
            const s = (t%60).toString().padStart(2,'0');
            qrTimer.textContent = `${m}:${s}`;
            if (t <= 0) {
                clearInterval(countdownInterval);
                qrTimer.textContent = 'Waktu Habis';
                btn.disabled = true; btn.textContent = 'QR Kadaluarsa';
                // save failed transaction state (simulation)
                const failed = { status: 'FAILED', createdAt: new Date().toISOString() };
                localStorage.setItem('lastTransaction', JSON.stringify(failed));
            }
            t--;
        }
        update();
        countdownInterval = setInterval(update, 1000);
    }

});
