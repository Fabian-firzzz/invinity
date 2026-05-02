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
        const addressDetail = document.getElementById('addressDetail').value.trim();
        const notes = document.getElementById('notes').value.trim();
        const paymentMethod = document.getElementById('paymentMethod') ? document.getElementById('paymentMethod').value : 'Midtrans Snap';

        // Required checks
        if (!fullName || !phone || !province || !city || !district || !postalCode) {
            alert('Lengkapi semua field wajib. Detail alamat dan catatan bersifat opsional.');
            return;
        }
        if (!onlyDigits(phone)) { alert('Nomor HP harus angka saja.'); return; }
        if (!onlyDigits(postalCode)) { alert('Kode pos harus angka saja.'); return; }

        const cart = JSON.parse(localStorage.getItem('airpodsCart')) || [];
        if (cart.length === 0) { alert('Keranjang kosong.'); return; }

        let subtotal = 0;
        cart.forEach(item => {
            const price = (typeof item.price === 'number') ? item.price : 0;
            const qty = item.quantity || 1;
            subtotal += price * qty;
        });
        const admin = Math.round(subtotal * 0.02);
        const grand = subtotal + admin;

        const requestData = {
            fullName, phone, province, city, district, postalCode, addressDetail, notes,
            paymentMethod: paymentMethod,
            cart: cart
        };

        const submitBtn = document.querySelector('#checkoutForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Memproses...';

        fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.order_id) {
                // Kosongkan keranjang
                localStorage.removeItem('airpodsCart');

                // Check jenis pembayaran
                if (requestData.paymentMethod === 'Manual Payment') {
                    // Redirect ke halaman upload bukti pembayaran
                    window.location.href = `payment-proof.html?id=${data.order_id}`;
                } else if (data.token || data.redirect_url) {
                    // Midtrans payment flow
                    const orderStatusUrl = `order-status.html?id=${data.order_id}`;
                    const redirectToOrderStatus = () => {
                        localStorage.setItem('lastOrderId', data.order_id);
                        localStorage.setItem('paymentTime', new Date().toISOString());
                        window.location.href = orderStatusUrl;
                    };

                    const startSnapPayment = () => {
                        try {
                            window.snap.pay(data.token, {
                                onSuccess: function(result){
                                    console.log('Payment success:', result);
                                    redirectToOrderStatus();
                                },
                                onPending: function(result){
                                    console.log('Payment pending:', result);
                                    redirectToOrderStatus();
                                },
                                onError: function(result){
                                    console.error('Payment error:', result);
                                    alert('Pembayaran gagal! Silakan coba lagi.');
                                    submitBtn.disabled = false;
                                    submitBtn.textContent = originalText;
                                },
                                onClose: function(){
                                    console.log('Payment popup closed');
                                    setTimeout(() => {
                                        redirectToOrderStatus();
                                    }, 2000);
                                }
                            });
                        } catch (e) {
                            console.error('Snap error:', e);
                            if (data.redirect_url) {
                                window.location.href = data.redirect_url;
                            } else {
                                alert('Tidak dapat memulai pembayaran. Silakan refresh halaman dan coba lagi.');
                                submitBtn.disabled = false;
                                submitBtn.textContent = originalText;
                            }
                        }
                    };

                    if (window.snap && typeof window.snap.pay === 'function' && data.token) {
                        startSnapPayment();
                    } else if (data.redirect_url) {
                        console.warn('Snap.js tidak tersedia, menggunakan redirect URL');
                        window.location.href = data.redirect_url;
                    } else {
                        alert('Tidak dapat memulai pembayaran. Silakan gunakan browser lain atau hubungi admin.');
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                } else {
                    alert('Format respons pembayaran tidak valid');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
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

    if (closeQr) closeQr.addEventListener('click', () => {
        if (qrModal) qrModal.style.display = 'none';
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
