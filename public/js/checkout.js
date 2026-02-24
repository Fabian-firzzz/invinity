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
        const payment = document.querySelector('input[name="payment"]:checked');

        // Required checks: fullName, phone, province, city, district, postalCode
        if (!fullName || !phone || !province || !city || !district || !postalCode) {
            alert('Lengkapi semua field wajib. Detail alamat dan catatan bersifat opsional.');
            return;
        }
        if (!onlyDigits(phone)) { alert('Nomor HP harus angka saja.'); return; }
        if (!onlyDigits(postalCode)) { alert('Kode pos harus angka saja.'); return; }
        if (!payment) { alert('Pilih metode pembayaran.'); return; }

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

        // If payment method is QR based, show QR modal simulation
        if (['DANA','GoPay','QRIS'].includes(payment.value)) {
            const paymentId = 'SIMUL-'+Math.random().toString(36).slice(2,10).toUpperCase();
            const qrData = `${payment.value}|${paymentId}|${grand}`;
            // Use external QR generator for preview (dummy)
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData)}`;
            qrAmount.textContent = `Silakan lakukan pembayaran sesuai nominal: ${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(grand)}`;
            showQrCountdown(300); // 5 minutes
            qrModal.style.display = 'flex';

            // populate order summary and buyer info into modal (create if not present)
            let summaryEl = document.getElementById('qrOrderSummary');
            if (!summaryEl) {
                summaryEl = document.createElement('div');
                summaryEl.id = 'qrOrderSummary';
                qrImage.parentNode.insertBefore(summaryEl, qrImage.nextSibling);
            }
            summaryEl.innerHTML = '<strong>Ringkasan Pesanan:</strong>';
            const ul = document.createElement('ul');
            const cartForModal = JSON.parse(localStorage.getItem('airpodsCart')) || [];
            cartForModal.forEach(it => {
                const name = it.name || (productsMap[it.productId] && productsMap[it.productId].name) || it.productId;
                const price = (typeof it.price === 'number') ? it.price : ((productsMap[it.productId] && productsMap[it.productId].price) || 0);
                const qty = it.quantity || 1;
                const li = document.createElement('li');
                li.textContent = `${name} x ${qty} — ${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(price*qty)}`;
                ul.appendChild(li);
            });
            const totLi = document.createElement('li');
            totLi.style.listStyle = 'none';
            totLi.style.fontWeight = '700'; 
            totLi.style.marginTop = '8px';
            totLi.style.paddingTop = '8px';
            totLi.style.borderTop = '1px solid rgba(255,255,255,0.15)';
            totLi.style.color = 'var(--accent-color)';
            totLi.textContent = `Grand Total: ${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(grand)}`;
            ul.appendChild(totLi);
            summaryEl.appendChild(ul);

            // buyer info
            let buyerEl = document.getElementById('qrBuyerInfo');
            if (!buyerEl) {
                buyerEl = document.createElement('div');
                buyerEl.id = 'qrBuyerInfo';
                qrImage.parentNode.insertBefore(buyerEl, summaryEl.nextSibling);
            }
            buyerEl.innerHTML = `<strong>Data Pemesan:</strong><div><strong>Nama:</strong> ${fullName}</div><div><strong>HP:</strong> ${phone}</div><div><strong>Lokasi:</strong> ${province}, ${city}, ${district}</div><div><strong>Kode Pos:</strong> ${postalCode}</div>${addressDetail ? `<div><strong>Detail:</strong> ${addressDetail}</div>` : ''}<div><strong>Catatan:</strong> ${notes || '-'}</div>`;

            // paid button handler
            paidButton.onclick = () => {
                paidButton.disabled = true; paidButton.textContent = 'Memverifikasi...';
                setTimeout(() => {
                    // mark transaction as PAID
                    const transaction = {
                        id: paymentId,
                        status: 'PAID',
                        method: payment.value,
                        amount: grand,
                        items: cart,
                        address: { fullName, phone, province, city, district, postalCode, addressDetail, notes },
                        createdAt: new Date().toISOString()
                    };
                    localStorage.setItem('lastTransaction', JSON.stringify(transaction));
                    // clear cart
                    localStorage.removeItem('airpodsCart');
                    // close modal and redirect to success
                    qrModal.style.display = 'none';
                    window.location.href = 'checkout-success.html';
                }, 2200);
            };
        } else {
            alert('Metode pembayaran tidak dikenali.');
        }
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
