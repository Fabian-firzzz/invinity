(function() {
  const ADMIN_SECRET = "12345";
  const CLICK_COUNT = 5;
  const CLICK_TIMEOUT = 3000;
  let count = 0, timer = null;

  function showToast(msg) {
    let toast = document.getElementById('easter-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'easter-toast';
      toast.style.cssText = 'position:fixed;bottom:80px;right:20px;background:rgba(231,76,60,0.9);color:#fff;padding:10px 16px;border-radius:8px;font-size:14px;z-index:9999;animation:slideIn .3s ease';
      if (!document.getElementById('easter-keyframes')) {
        const s = document.createElement('style');
        s.id = 'easter-keyframes';
        s.textContent = '@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}';
        document.head.appendChild(s);
      }
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
  }

  function promptAdmin() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:999998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3)';
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:24px;border-radius:10px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);min-width:260px';
    box.innerHTML = `
      <div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#333">Masukkan kode akses admin</div>
      <input type="password" placeholder="•••••" style="width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:6px;font-size:16px;box-sizing:border-box" autofocus>
      <div style="font-size:11px;color:#888;margin-top:6px">Kode tidak akan ditampilkan</div>
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:center">
        <button style="padding:8px 20px;border:none;border-radius:6px;background:#eee;color:#333;font-size:14px;cursor:pointer">Batal</button>
        <button style="padding:8px 20px;border:none;border-radius:6px;background:#6f00ff;color:#fff;font-size:14px;cursor:pointer">OK</button>
      </div>
    `;
    wrapper.appendChild(box);
    document.body.appendChild(wrapper);
    const inp = box.querySelector('input');
    const okBtn = box.querySelector('button:last-child');
    const cancelBtn = box.querySelector('button:first-child');

    function closeModal() { wrapper.remove(); }
    function submitCode() {
      const code = inp.value;
      closeModal();
      if (code === ADMIN_SECRET) {
        try { localStorage.setItem('easterAdminAccess', 'true'); } catch(e){}
        window.location.href = '/admin/dashboard.html';
      } else if (code) showToast('Kode salah');
    }

    okBtn.onclick = submitCode;
    cancelBtn.onclick = closeModal;
    inp.onkeydown = (e) => { if (e.key === 'Enter') submitCode(); if (e.key === 'Escape') closeModal(); };
    setTimeout(() => inp.focus(), 50);
  }

  function createFooterButton() {
    const btn = document.createElement('button');
    btn.id = 'easter-footer-btn';
    btn.style.cssText = 'position:fixed;bottom:10px;right:12px;border:none;background:transparent;color:rgba(0,0,0,0.2);font-size:32px;line-height:1;cursor:pointer;z-index:9997;padding:0 4px;margin:0;border-radius:4px;font-family:serif;transition:color .2s,transform .2s;opacity:.4';
    btn.innerHTML = '.';
    btn.onclick = () => {
      count++;
      if (count === 1) timer = setTimeout(() => count = 0, CLICK_TIMEOUT);
      btn.style.color = 'rgba(111,0,255,0.6)';
      btn.style.transform = 'scale(1.3)';
      setTimeout(() => { btn.style.color = 'rgba(0,0,0,0.2)'; btn.style.transform = 'scale(1)'; }, 180);
      if (count >= CLICK_COUNT) {
        clearTimeout(timer); count = 0; promptAdmin();
      }
    };
    document.body.appendChild(btn);
  }

  try { createFooterButton(); } catch(e) { console.warn('Easter egg init failed:', e); }
  const old = document.getElementById('easter-admin-btn'); if (old) old.remove();
})();