/* ================================================================
 *  ZAN RENTAL — core.js
 *  Util, format, penyimpanan lokal, lapisan API (fetch ke GAS),
 *  pengukur performa, toast, bottom-sheet, dan set ikon SVG.
 * ================================================================ */
(function (global) {
  'use strict';

  /* ---------------- DOM helper ---------------- */
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------- Format ---------------- */
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const BULAN_P = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const HARI_P = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(String(v).replace(/[^\d.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function ribuan(n) { return String(Math.round(num(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rp(n) { return 'Rp ' + ribuan(n); }
  function rpSingkat(n) {
    const v = Math.abs(num(n));
    if (v >= 1e9) return 'Rp ' + (num(n) / 1e9).toFixed(v >= 1e10 ? 0 : 1).replace('.', ',') + 'M';
    if (v >= 1e6) return 'Rp ' + (num(n) / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace('.', ',') + 'jt';
    if (v >= 1e3) return 'Rp ' + Math.round(num(n) / 1e3) + 'rb';
    return rp(n);
  }
  function hariIni() {
    const d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function jamIni() {
    const d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function parseTgl(t) {
    if (!t) return null;
    const d = new Date(String(t).slice(0, 10) + 'T00:00:00');
    return isNaN(d) ? null : d;
  }
  function tglId(t) {
    const d = parseTgl(t);
    return d ? d.getDate() + ' ' + BULAN_P[d.getMonth()] + ' ' + d.getFullYear() : '-';
  }
  function tglPendek(t) {
    const d = parseTgl(t);
    return d ? d.getDate() + ' ' + BULAN_P[d.getMonth()] : '-';
  }
  function tglPanjang(t) {
    const d = parseTgl(t);
    return d ? HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : '-';
  }
  function bulanId(ym) {
    if (!ym) return '-';
    const p = String(ym).split('-');
    return BULAN[Number(p[1]) - 1] + ' ' + p[0];
  }
  function selisihHari(a, b) {
    const d1 = parseTgl(a), d2 = parseTgl(b);
    if (!d1 || !d2) return 0;
    return Math.round((d2 - d1) / 86400000);
  }
  function tambahHari(t, n) {
    const d = parseTgl(t) || new Date();
    d.setDate(d.getDate() + Number(n || 0));
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  /** "Hari ini, 14:20" / "Kemarin" / "08 Nov" */
  function relatif(t) {
    const s = String(t || '').slice(0, 10);
    if (!s) return '';
    const d = selisihHari(s, hariIni());
    if (d === 0) return 'Hari ini';
    if (d === 1) return 'Kemarin';
    if (d === -1) return 'Besok';
    if (d > 1 && d < 7) return d + ' hari lalu';
    if (d < -1 && d > -7) return Math.abs(d) + ' hari lagi';
    return tglId(s);
  }
  function jamDari(iso) { return String(iso || '').slice(11, 16); }
  function hp08(v) {
    let s = String(v || '').trim().replace(/[^0-9+]/g, '').replace(/^\+/, '');
    if (!s) return '';
    if (s.indexOf('62') === 0) s = '0' + s.substring(2);
    else if (s.indexOf('8') === 0) s = '0' + s;
    return s;
  }
  function hp62(v) { const s = hp08(v); return s ? (s[0] === '0' ? '62' + s.slice(1) : s) : ''; }
  function hpCantik(v) {
    const s = hp08(v);
    return s ? s.replace(/^(\d{4})(\d{3,4})(\d{3,5})$/, '$1-$2-$3') : '';
  }
  function inisial(nama) {
    return String(nama || '?').trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }
  function terbilang(n) {
    n = Math.floor(Math.abs(num(n)));
    const s = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
    function t(x) {
      if (x < 12) return s[x];
      if (x < 20) return t(x - 10) + ' belas';
      if (x < 100) return t(Math.floor(x / 10)) + ' puluh ' + t(x % 10);
      if (x < 200) return 'seratus ' + t(x - 100);
      if (x < 1000) return t(Math.floor(x / 100)) + ' ratus ' + t(x % 100);
      if (x < 2000) return 'seribu ' + t(x - 1000);
      if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu ' + t(x % 1000);
      if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta ' + t(x % 1e6);
      return t(Math.floor(x / 1e9)) + ' miliar ' + t(x % 1e9);
    }
    return n === 0 ? 'nol' : t(n).replace(/\s+/g, ' ').trim();
  }

  /* ---------------- Penyimpanan lokal (aman) ---------------- */
  const Simpan = {
    ambil: function (k, def) {
      try {
        const v = localStorage.getItem('zan.' + k);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    taruh: function (k, v) {
      try { localStorage.setItem('zan.' + k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    },
    hapus: function (k) { try { localStorage.removeItem('zan.' + k); } catch (e) {} }
  };

  /* ---------------- Pengukur performa ---------------- */
  const Perf = {
    rows: [],
    catat: function (aksi, total, server, cached) {
      this.rows.push({ aksi: aksi, total: total, server: server || 0, net: total - (server || 0), cache: !!cached });
      if (this.rows.length > 120) this.rows.shift();
    },
    table: function () { if (console.table) console.table(this.rows); else console.log(this.rows); },
    summary: function () {
      const m = {};
      this.rows.forEach(function (r) {
        m[r.aksi] = m[r.aksi] || { n: 0, total: 0, server: 0 };
        m[r.aksi].n++; m[r.aksi].total += r.total; m[r.aksi].server += r.server;
      });
      const out = Object.keys(m).map(function (k) {
        return { aksi: k, panggilan: m[k].n, rataTotal: Math.round(m[k].total / m[k].n),
                 rataServer: Math.round(m[k].server / m[k].n) };
      });
      if (console.table) console.table(out); else console.log(out);
      return out;
    }
  };

  /* ---------------- Lapisan API ---------------- */
  const BACA = /^(boot|ping|notif\.config|notif\.antrean|sistem\.status|wa\.device|import\.pindai|verifikasi)$/;
  const _inflight = {};
  let _epoch = 0;

  function url() { return (global.ZAN_CONFIG && global.ZAN_CONFIG.GAS_URL) || ''; }
  function siapDeploy() { return url() && !/GANTI|XXXX/.test(url()); }

  async function jalankan(action, data, opsi) {
    opsi = opsi || {};
    const t0 = performance.now();
    if (!siapDeploy()) {
      return { success: false, message: 'Alamat server belum diisi. Buka js/config.js lalu isi GAS_URL dengan URL /exec Apps Script Anda.' };
    }
    const badan = { action: action, token: Api.token || '', data: data || {} };
    try {
      const res = await fetch(url(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },  // WAJIB: hindari preflight CORS
        body: JSON.stringify(badan),
        redirect: 'follow'
      });
      const j = await res.json();
      Perf.catat(action, Math.round(performance.now() - t0), j.ms || 0, j.cached);
      if (j && j.code === 'AUTH' && Api.onAuthGagal) Api.onAuthGagal();
      if (j && j.nq > 0) jadwalkanDrain();
      return j;
    } catch (e) {
      Perf.catat(action, Math.round(performance.now() - t0), 0, false);
      return { success: false, message: 'Tidak bisa menghubungi server. Periksa koneksi internet Anda.', offline: true };
    }
  }

  const Api = {
    token: Simpan.ambil('token', ''),
    onAuthGagal: null,
    setToken: function (t) { this.token = t || ''; Simpan.taruh('token', this.token); },
    /** Panggilan dengan dedupe untuk aksi BACA + epoch untuk aksi TULIS. */
    kirim: function (action, data, opsi) {
      if (!BACA.test(action)) { _epoch++; return jalankan(action, data, opsi); }
      const k = _epoch + '|' + action + '|' + JSON.stringify(data || {});
      if (_inflight[k]) return _inflight[k];
      const p = jalankan(action, data, opsi);
      _inflight[k] = p;
      p.then(function () { delete _inflight[k]; }, function () { delete _inflight[k]; });
      return p;
    },
    /** Panaskan mesin server (GET ringan, maksimal 1× / 4 menit). */
    hangatkan: function (scope) {
      if (!siapDeploy()) return;
      try {
        const k = 'warm.' + (scope || 'pub');
        const last = Number(sessionStorage.getItem(k) || 0);
        if (Date.now() - last < 240000) return;
        sessionStorage.setItem(k, String(Date.now()));
        fetch(url() + '?w=' + encodeURIComponent(scope || 'pub'), { mode: 'no-cors' }).catch(function () {});
      } catch (e) {}
    }
  };

  let _drainTimer = null, _drainSisa = 3;
  function jadwalkanDrain() {
    if (_drainTimer) return;
    _drainTimer = setTimeout(async function () {
      _drainTimer = null;
      const r = await jalankan('drain', {});
      if (r && r.success && r.data && r.data.sisa > 0 && _drainSisa-- > 0) jadwalkanDrain();
      else _drainSisa = 3;
    }, 1200);
  }

  /* ---------------- Toast ---------------- */
  function toast(pesan, tipe, detik) {
    let wrap = $('#toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastWrap';
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast toast-' + (tipe || 'ok');
    t.innerHTML = '<span class="toast-ikon">' + Ikon(tipe === 'err' ? 'alert' : (tipe === 'info' ? 'info' : 'check'), 18) +
      '</span><span class="toast-teks">' + esc(pesan) + '</span>';
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('tampil'); });
    setTimeout(function () {
      t.classList.remove('tampil');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, (detik || 3) * 1000);
  }

  /* ---------------- Bottom sheet / modal ---------------- */
  const Sheet = {
    el: null,
    buka: function (opsi) {
      this.tutup(true);
      const wrap = document.createElement('div');
      wrap.className = 'sheet-wrap';
      wrap.innerHTML =
        '<div class="sheet-scrim"></div>' +
        '<div class="sheet' + (opsi.lebar ? ' sheet-lebar' : '') + '" role="dialog" aria-modal="true">' +
          '<div class="sheet-grip"></div>' +
          '<div class="sheet-head">' +
            '<div class="sheet-judul">' +
              (opsi.ikon ? '<span class="sheet-ikon">' + Ikon(opsi.ikon, 20) + '</span>' : '') +
              '<div><div class="t">' + esc(opsi.judul || '') + '</div>' +
              (opsi.sub ? '<div class="s">' + esc(opsi.sub) + '</div>' : '') + '</div>' +
            '</div>' +
            '<button class="ikon-btn sheet-tutup" aria-label="Tutup">' + Ikon('x', 20) + '</button>' +
          '</div>' +
          '<div class="sheet-isi">' + (opsi.isi || '') + '</div>' +
          (opsi.aksi ? '<div class="sheet-aksi">' + opsi.aksi + '</div>' : '') +
        '</div>';
      document.body.appendChild(wrap);
      document.body.classList.add('kunci-scroll');
      this.el = wrap;
      const tutup = this.tutup.bind(this);
      $('.sheet-scrim', wrap).addEventListener('click', function () { tutup(); });
      $('.sheet-tutup', wrap).addEventListener('click', function () { tutup(); });
      const diri = this;
      requestAnimationFrame(function () {
        wrap.classList.add('tampil');
        // Pindah halaman saat sheet terbuka (tap menu bawah, tombol Back Android,
        // atau tautan dalam sheet) harus ikut menutup sheet — kalau tidak, scrim
        // tertinggal dan memblokir seluruh layar. Dipasang di frame berikutnya agar
        // hashchange yang MEMBUKA sheet ini tidak langsung menutupnya kembali.
        window.addEventListener('hashchange', diri._nav = function () { tutup(true); });
        window.addEventListener('popstate', diri._nav);
      });
      document.addEventListener('keydown', this._esc = function (e) { if (e.key === 'Escape') tutup(); });
      if (opsi.setelah) setTimeout(function () { opsi.setelah(wrap); }, 30);
      return wrap;
    },
    tutup: function (langsung) {
      const wrap = this.el;
      if (!wrap) return;
      this.el = null;
      document.removeEventListener('keydown', this._esc);
      if (this._nav) {
        window.removeEventListener('hashchange', this._nav);
        window.removeEventListener('popstate', this._nav);
        this._nav = null;
      }
      document.body.classList.remove('kunci-scroll');
      if (langsung) { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); return; }
      wrap.classList.remove('tampil');
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 240);
    }
  };

  function konfirmasi(opsi) {
    return new Promise(function (selesai) {
      const wrap = Sheet.buka({
        judul: opsi.judul || 'Konfirmasi',
        ikon: opsi.bahaya ? 'alert' : 'info',
        isi: '<p class="konf-teks">' + esc(opsi.pesan || '') + '</p>',
        aksi: '<button class="btn btn-netral" data-k="batal">' + esc(opsi.batal || 'Batal') + '</button>' +
              '<button class="btn ' + (opsi.bahaya ? 'btn-bahaya' : 'btn-utama') + '" data-k="ya">' +
              esc(opsi.ya || 'Ya, lanjutkan') + '</button>'
      });
      $$('[data-k]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          const ya = b.getAttribute('data-k') === 'ya';
          Sheet.tutup();
          selesai(ya);
        });
      });
    });
  }

  /* ---------------- Ikon SVG ---------------- */
  const PATH = {
    beranda: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    order: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    motor: '<circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M8.5 17h7l-2-6h3l-1.5-3H12"/><path d="M13.5 11 9 11l-3 6"/>',
    orang: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
    dompet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    cari: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    lonceng: '<path d="M18 16V11a6 6 0 1 0-12 0v5l-1.5 2.5h15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    check: '<path d="m4.5 12.5 5 5L20 7"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.2v.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8.2v.1"/>',
    jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
    kalender: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    wa: '<path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.6-3.9A8 8 0 1 1 20 11.5z"/><path d="M8.8 9.2c0 3 2.2 5.2 5.2 5.2l1-1.2-1.6-1-.9.8c-1-.4-1.8-1.2-2.2-2.2l.8-.9-1-1.6z" fill="currentColor" stroke="none"/>',
    telp: '<path d="M6 3h3l2 5-2.2 1.3a12 12 0 0 0 5.9 5.9L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z"/>',
    unduh: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 20h16"/>',
    cetak: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>',
    pensil: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/>',
    sampah: '<path d="M4 7h16M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    tutup2: '<path d="M18 6 6 18M6 6l12 12"/>',
    naik: '<path d="M4 17 10 11l4 4 6-7"/><path d="M15 8h5v5"/>',
    turun: '<path d="M4 7 10 13l4-4 6 7"/><path d="M15 16h5v-5"/>',
    masuk: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
    keluar: '<path d="M12 20V8"/><path d="m7 13 5-5 5 5"/><path d="M4 4h16"/>',
    kunci: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    perkakas: '<path d="M14.5 5.5a4 4 0 0 1 5 5l-9 9-5 1 1-5z"/>',
    bensin: '<rect x="4" y="3" width="10" height="18" rx="2"/><path d="M14 9h2.5a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-2.5-2.5"/><path d="M6.5 7h5"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 7.2l1.9 1.1M17.9 15.7l1.9 1.1M4.2 16.8l1.9-1.1M17.9 8.3l1.9-1.1"/>',
    grafik: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    dokumen: '<path d="M6 3h7l5 5v13H6z"/><path d="M13 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    bintang: '<path d="m12 3.5 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z"/>',
    tag: '<path d="M11 3H3v8l10 10 8-8z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
    lokasi: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    sinkron: '<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 16"/><path d="M4 20v-4h4"/>',
    bulan: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    matahari: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
    keluarApp: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 8 6 12l4 4"/><path d="M6 12h9"/>',
    panah: '<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>',
    panahKiri: '<path d="M19 12H6"/><path d="m11 6-6 6 6 6"/>',
    bawah: '<path d="m6 9 6 6 6-6"/>',
    atas: '<path d="m6 15 6-6 6 6"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    daftar: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.8" cy="6" r="1.2"/><circle cx="3.8" cy="12" r="1.2"/><circle cx="3.8" cy="18" r="1.2"/>',
    kamera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    perisai: '<path d="M12 3 5 6v6c0 4.2 3 7.8 7 9 4-1.2 7-4.8 7-9V6z"/><path d="m9.2 12 2 2 3.6-3.8"/>',
    kirim: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m10 13 11-10"/>',
    salin: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM18 18h3v3h-3z" fill="currentColor" stroke="none"/>',
    import: '<path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><rect x="3" y="16" width="18" height="5" rx="2"/>',
    hotel: '<path d="M3 20V8l9-5 9 5v12"/><path d="M9 20v-6h6v6"/>',
    kampus: '<path d="m12 4 9 4-9 4-9-4z"/><path d="M7 11v5c0 1.7 2.2 3 5 3s5-1.3 5-3v-5"/>'
  };
  function Ikon(nama, ukuran, kelas) {
    const p = PATH[nama] || PATH.info;
    const s = ukuran || 20;
    return '<svg class="ikon ' + (kelas || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + p + '</svg>';
  }

  /* ---------------- Ilustrasi motor (karya asli, tanpa foto/CDN eksternal) ----------------
     Empat siluet dasar: skuter matic, maxi scooter, bebek, dan sport.
     Dipakai sebagai gambar unit saat pemilik belum mengunggah foto asli. */
  function roda_(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#15171c"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 6) + '" fill="#cfd2d8"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 10) + '" fill="#8e939c"/>';
  }
  const BENTUK = {
    matic: function (b, g, t) {
      return '<ellipse cx="80" cy="90" rx="56" ry="5" fill="#000" opacity=".16"/>' +
        '<path d="M104 62 A20 20 0 0 1 139 71" fill="none" stroke="' + g + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M24 62 A18 18 0 0 1 54 54" fill="none" stroke="' + g + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M50 40 L41 66" stroke="' + t + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M57 64 H96 V73 H57 Z" fill="' + b + '"/>' +
        '<path d="M86 73 q-6-18 8-22 h24 q15 0 19 14 l2 7 q2 9-8 9 h-37 q-8 0-8-8 z" fill="' + b + '"/>' +
        '<path d="M80 44 h36 q10 0 10 7 t-10 7 H80 q-9 0-9-7 T80 44 z" fill="' + t + '"/>' +
        '<path d="M63 73 q-13-28 -9-41 q3-8 12-8 q9 0 10 9 l7 40 z" fill="' + b + '"/>' +
        '<path d="M50 23 H72" stroke="' + t + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M63 25 V33" stroke="' + t + '" stroke-width="4"/>' +
        '<ellipse cx="60" cy="40" rx="7" ry="5" fill="#FFE600" opacity=".92"/>' +
        '<path d="M118 79 h16 q5 0 5-3.5 t-5-3.5" fill="none" stroke="' + g + '" stroke-width="5" stroke-linecap="round"/>' +
        roda_(40, 74, 14) + roda_(120, 74, 14);
    },
    maxi: function (b, g, t) {
      return '<ellipse cx="80" cy="90" rx="58" ry="5" fill="#000" opacity=".16"/>' +
        '<path d="M104 60 A21 21 0 0 1 141 70" fill="none" stroke="' + g + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M22 60 A19 19 0 0 1 54 52" fill="none" stroke="' + g + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M50 36 L39 66" stroke="' + t + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M55 62 H98 V73 H55 Z" fill="' + b + '"/>' +
        '<path d="M84 73 q-7-21 10-25 h26 q16 0 20 15 l3 9 q2 10-9 10 h-41 q-9 0-9-9 z" fill="' + b + '"/>' +
        '<path d="M78 40 h40 q11 0 11 7.5 T118 55 H78 q-10 0-10-7.5 T78 40 z" fill="' + t + '"/>' +
        '<path d="M82 41 q16-4 32 0" fill="none" stroke="' + g + '" stroke-width="2" opacity=".45"/>' +
        '<path d="M62 73 q-15-30 -10-44 q4-9 14-9 q10 0 11 10 l8 43 z" fill="' + b + '"/>' +
        '<path d="M57 21 q11-10 19-2 l-5 9 q-7-5-14 1 z" fill="' + g + '" opacity=".6"/>' +
        '<path d="M48 25 H74" stroke="' + t + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M56 36 q8-4 15 0 l-2 7 q-6-3-12 0 z" fill="#FFE600" opacity=".92"/>' +
        '<path d="M120 80 h17 q6 0 6-4 t-6-4" fill="none" stroke="' + g + '" stroke-width="6" stroke-linecap="round"/>' +
        roda_(40, 73, 15) + roda_(121, 73, 15);
    },
    bebek: function (b, g, t) {
      return '<ellipse cx="80" cy="90" rx="54" ry="5" fill="#000" opacity=".16"/>' +
        '<path d="M102 64 A19 19 0 0 1 135 72" fill="none" stroke="' + g + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M26 62 A17 17 0 0 1 54 55" fill="none" stroke="' + g + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M52 40 L42 66" stroke="' + t + '" stroke-width="4.5" stroke-linecap="round"/>' +
        '<path d="M60 66 H94 V73 H60 Z" fill="' + b + '"/>' +
        '<path d="M64 66 q3-19 13-21 h8 l3 21 z" fill="' + b + '"/>' +
        '<path d="M86 73 q-4-14 9-16 h22 q13 0 16 12 l2 7 q1 7-7 7 h-34 q-8 0-8-10 z" fill="' + b + '"/>' +
        '<path d="M82 49 h34 q9 0 9 6 t-9 6 H82 q-8 0-8-6 T82 49 z" fill="' + t + '"/>' +
        '<path d="M62 73 q-10-24 -7-36 q3-7 10-7 q8 0 9 8 l6 35 z" fill="' + b + '"/>' +
        '<path d="M52 26 H74" stroke="' + t + '" stroke-width="4.5" stroke-linecap="round"/>' +
        '<ellipse cx="62" cy="41" rx="6.5" ry="5" fill="#FFE600" opacity=".92"/>' +
        '<path d="M116 79 h16 q5 0 5-3.5 t-5-3.5" fill="none" stroke="' + g + '" stroke-width="5" stroke-linecap="round"/>' +
        roda_(42, 74, 14) + roda_(118, 74, 14);
    },
    sport: function (b, g, t) {
      return '<ellipse cx="80" cy="90" rx="54" ry="5" fill="#000" opacity=".16"/>' +
        '<path d="M104 60 A20 20 0 0 1 139 70" fill="none" stroke="' + g + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M24 60 A18 18 0 0 1 54 53" fill="none" stroke="' + g + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M52 32 L40 66" stroke="' + t + '" stroke-width="5.5" stroke-linecap="round"/>' +
        '<path d="M66 56 h26 q7 0 7 8 v7 q0 5-7 5 H70 q-7 0-7-7 v-6 q0-7 3-7 z" fill="' + t + '"/>' +
        '<path d="M62 52 q7-16 21-16 h16 q8 0 8 8 l-2 10 q-1 5-9 5 H68 q-8 0-6-7 z" fill="' + b + '"/>' +
        '<path d="M96 56 h20 q14 0 18 11 l2 6 q1 7-8 7 h-20 q-8 0-10-8 z" fill="' + b + '"/>' +
        '<path d="M88 51 h30 q8 0 8 6 t-8 6 H90 q-8 0-8-6 T88 51 z" fill="' + t + '"/>' +
        '<path d="M54 30 H76" stroke="' + t + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M56 38 q8-5 15 0 l-3 9 q-5-4-10 0 z" fill="#FFE600" opacity=".92"/>' +
        '<path d="M100 78 h26 q5 0 5-4 t-5-4" fill="none" stroke="' + g + '" stroke-width="6" stroke-linecap="round"/>' +
        roda_(40, 73, 15) + roda_(120, 73, 15);
    }
  };
  const JENIS_MOTOR = {
    scoopy: 'matic', beat: 'matic', vario: 'matic', mio: 'matic', genio: 'matic', fazzio: 'matic',
    nmax: 'maxi', pcx: 'maxi', aerox: 'maxi', lexi: 'maxi', adv: 'maxi',
    supra: 'bebek', verza: 'sport'
  };

  /** 'art:scoopy:#F2EDE3' → ilustrasi SVG; nilai lain dianggap URL foto asli. */
  function fotoUnit(kode, opsi) {
    opsi = opsi || {};
    const tinggi = opsi.tinggi || 176;
    if (!kode) kode = 'art:beat:#9aa0a6';
    if (String(kode).indexOf('art:') !== 0) {
      return '<img class="unit-foto" src="' + esc(kode) + '" alt="' + esc(opsi.alt || 'Foto unit') +
        '" loading="lazy" style="height:' + tinggi + 'px" onerror="this.replaceWith(ZAN.elDari(ZAN.fotoUnit(\'art:beat:#9aa0a6\',{tinggi:' + tinggi + '})))">';
    }
    const p = String(kode).split(':');
    const gambar = BENTUK[JENIS_MOTOR[p[1]] || 'matic'];
    const warna = p[2] || '#8a8f98';
    const bg1 = campur(warna, '#ffffff', 0.5);
    const bg2 = campur(warna, '#000000', 0.3);
    const badan = campur(warna, '#ffffff', 0.12);
    const gelap = campur(warna, '#000000', 0.35);
    const tua = campur(warna, '#000000', 0.6);
    // Latar digambar dengan CSS agar ilustrasi tetap utuh pada kotak dengan rasio apa pun
    return '<div class="unit-art" style="height:' + tinggi + 'px;background:linear-gradient(135deg,' +
        bg1 + ',' + bg2 + ')">' +
      '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
        esc(opsi.alt || 'Ilustrasi motor') + '">' +
      '<circle cx="132" cy="20" r="26" fill="#ffffff" opacity=".13"/>' +
      gambar(badan, gelap, tua) + '</svg></div>';
  }
  function campur(a, b, t) {
    function h2r(h) {
      h = String(h).replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const x = h2r(a), y = h2r(b);
    return '#' + [0, 1, 2].map(function (i) {
      return ('0' + Math.round(x[i] + (y[i] - x[i]) * t).toString(16)).slice(-2);
    }).join('');
  }
  function elDari(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  /* ---------------- QR (pustaka opsional dari CDN) ---------------- */
  function qrDataUrl(teksIsi, modul) {
    try {
      if (typeof qrcode !== 'function') return '';
      const q = qrcode(0, 'M');
      q.addData(String(teksIsi));
      q.make();
      return q.createDataURL(modul || 5, 8);
    } catch (e) { return ''; }
  }
  function qrPngDataUrl(teksIsi, ukuran) {
    return new Promise(function (selesai) {
      const gif = qrDataUrl(teksIsi, 6);
      if (!gif) return selesai('');
      const img = new Image();
      img.onload = function () {
        try {
          const c = document.createElement('canvas');
          const s = ukuran || 256;
          c.width = s; c.height = s;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, s, s);
          ctx.drawImage(img, 0, 0, s, s);
          selesai(c.toDataURL('image/png'));
        } catch (e) { selesai(''); }
      };
      img.onerror = function () { selesai(''); };
      img.src = gif;
    });
  }

  /* ---------------- Aktivitas pengguna (polling adaptif) ---------------- */
  const Aktivitas = {
    at: Date.now(), last: {},
    init: function () {
      const self = this;
      ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(function (ev) {
        window.addEventListener(ev, function () { self.at = Date.now(); }, { passive: true });
      });
    },
    diam: function () { return Date.now() - this.at > 120000; },
    saatnya: function (kunci, aktifMs, diamMs) {
      if (document.visibilityState !== 'visible') return false;
      const batas = (this.diam() ? diamMs : aktifMs) - 500;
      if (Date.now() - (this.last[kunci] || 0) < batas) return false;
      this.last[kunci] = Date.now();
      return true;
    }
  };

  /* ---------------- Ekspor ---------------- */
  global.ZAN = {
    $: $, $$: $$, esc: esc, num: num, rp: rp, rpSingkat: rpSingkat, ribuan: ribuan,
    hariIni: hariIni, jamIni: jamIni, tglId: tglId, tglPendek: tglPendek, tglPanjang: tglPanjang,
    bulanId: bulanId, selisihHari: selisihHari, tambahHari: tambahHari, relatif: relatif, jamDari: jamDari,
    hp08: hp08, hp62: hp62, hpCantik: hpCantik, inisial: inisial, terbilang: terbilang, parseTgl: parseTgl,
    BULAN: BULAN, BULAN_P: BULAN_P, HARI: HARI, HARI_P: HARI_P,
    Simpan: Simpan, Api: Api, Perf: Perf, toast: toast, Sheet: Sheet, konfirmasi: konfirmasi,
    Ikon: Ikon, fotoUnit: fotoUnit, elDari: elDari, campur: campur,
    qrDataUrl: qrDataUrl, qrPngDataUrl: qrPngDataUrl, Aktivitas: Aktivitas, siapDeploy: siapDeploy
  };
  global.Perf = Perf;   // mudah dipanggil dari console: Perf.table()
})(window);
