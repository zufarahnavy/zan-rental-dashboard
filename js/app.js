/* ================================================================
 *  ZAN RENTAL — app.js
 *  Kerangka aplikasi: login PIN, router SPA, navigasi, sinkronisasi
 *  data (stale-while-revalidate), tema, dan aksi global.
 * ================================================================ */
(function (global) {
  'use strict';
  const Z = global.ZAN, U = global.UI, esc = Z.esc, Hal = global.Hal;

  /* ================================================================
   * MEREK — logo, warna, dan font yang bisa diatur pemilik.
   *
   * Nilainya datang dari sheet Pengaturan lewat payload boot, lalu
   * diterapkan sebagai custom property CSS. Karena seluruh stylesheet
   * memakai var(--kuning), var(--ink), dan var(--ungu), mengganti tiga
   * nilai di sini langsung mengubah warna seluruh aplikasi.
   * ================================================================ */
  /* Hanya font yang tersedia TANPA mengunduh apa pun dari luar: Poppins ikut
     dipaketkan di folder fonts/, sisanya memakai font bawaan perangkat. */
  const FONT_TERSEDIA = {
    Poppins:  'Poppins, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    Sistem:   'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    Bulat:    'ui-rounded, "SF Pro Rounded", "Segoe UI Variable Display", Nunito, system-ui, sans-serif',
    Serif:    'Georgia, "Times New Roman", "Noto Serif", serif'
  };

  const Merek = global.Merek = {
    set: function (k, d) { return (App.set ? App.set(k, d) : d) || d; },
    judul:    function () { return Merek.set('MEREK_JUDUL', 'ZAN Dashboard'); },
    subjudul: function () { return Merek.set('MEREK_SUBJUDUL', 'Operasional'); },
    logoUrl:  function () { return String(Merek.set('MEREK_LOGO', '') || '').trim(); },

    /** Logo: gambar bila pemilik mengunggahnya, kalau tidak huruf awal nama. */
    htmlLogo: function (kelas) {
      const url = Merek.logoUrl();
      const k = kelas || 'merek-logo';
      if (url) return '<div class="' + k + ' ada-gambar"><img src="' + Z.esc(url) + '" alt="Logo" ' +
        'onerror="this.parentNode.classList.remove(\'ada-gambar\');this.parentNode.textContent=\'' +
        Z.esc((Merek.judul() || 'Z').charAt(0).toUpperCase()) + '\'"></div>';
      return '<div class="' + k + '">' + Z.esc((Merek.judul() || 'Z').charAt(0).toUpperCase()) + '</div>';
    },

    /**
     * Naikkan kecerahan sebuah warna ke tingkat tertentu sambil menjaga rona,
     * supaya warna merek pemilik tetap terbaca di atas kanvas gelap.
     * @param hex    warna sumber "#rrggbb"
     * @param target kecerahan sasaran 0–1 (0,74 ≈ cukup kontras di kanvas gelap)
     */
    terangkan: function (hex, target) {
      const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex).trim());
      if (!m) return '#b79ad4';
      let r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
      const maks = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (maks + min) / 2, d = maks - min;
      let h = 0, s = 0;
      if (d) {
        s = l > 0.5 ? d / (2 - maks - min) : d / (maks + min);
        if (maks === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (maks === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
      }
      const L = Math.max(target, l);                 // jangan pernah membuat lebih gelap
      const S = Math.min(s, 0.55);                   // turunkan saturasi agar tidak menyilaukan
      const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs(((h * 6) % 2) - 1)), o = L - c / 2;
      const t = h * 6;
      const rgb = t < 1 ? [c, x, 0] : t < 2 ? [x, c, 0] : t < 3 ? [0, c, x]
              : t < 4 ? [0, x, c] : t < 5 ? [x, 0, c] : [c, 0, x];
      return '#' + rgb.map(function (v) {
        return Math.round((v + o) * 255).toString(16).padStart(2, '0');
      }).join('');
    },

    /** Luminансi relatif WCAG dari "#rrggbb". */
    luminansi: function (hex) {
      const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex).trim());
      if (!m) return 1;
      const k = [1, 2, 3].map(function (i) {
        const v = parseInt(m[i], 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
    },

    rasio: function (a, b) {
      const x = Merek.luminansi(a), y = Merek.luminansi(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    },

    /** Hitam atau putih — mana pun yang lebih terbaca DI ATAS warna ini. */
    kontrasAtas: function (hex) {
      return Merek.rasio(hex, '#0B0B0F') >= Merek.rasio(hex, '#FFFFFF') ? '#0B0B0F' : '#FFFFFF';
    },

    /**
     * Versi aksen yang terbaca sebagai TEKS di atas permukaan gelap.
     * Acuannya #3F4247 — permukaan gelap paling TERANG yang bisa muncul setelah
     * lapisan tembus pandang ditumpuk (mis. badge hitung di dalam chip aktif).
     * Lolos di sana berarti lolos di semua permukaan gelap yang lebih pekat.
     */
    terbacaDiGelap: function (hex) {
      let warna = hex;
      for (let t = 0.5; t <= 0.95; t += 0.05) {
        if (Merek.rasio(warna, '#3F4247') >= 4.5) return warna;
        warna = Merek.terangkan(hex, t);
      }
      return warna;
    },

    /** Terapkan warna + font ke dokumen. Dipanggil setiap data boot berubah. */
    terapkan: function () {
      const r = document.documentElement;
      const aksen = Merek.set('WARNA_AKSEN', '#FFE600');
      const tinta = Merek.set('WARNA_TINTA', '#0B0B0F');
      const kedua = Merek.set('WARNA_SEKUNDER', '#69567E');
      // Ditulis ke --merek-*, BUKAN langsung ke --ink/--ungu. Inline style pada
      // :root mengalahkan aturan html[data-tema="gelap"], jadi menulis --ink di
      // sini dulu membuat seluruh teks mode gelap memakai tinta hitam pemilik
      // di atas kanvas hitam (terukur 1,05:1 — praktis tak terlihat).
      if (/^#[0-9a-f]{6}$/i.test(aksen)) {
        r.style.setProperty('--kuning', aksen);
        // Aksen dipakai di dua peran yang berlawanan: sebagai TEKS di atas
        // permukaan gelap, dan sebagai LATAR yang ditimpa teks. Kuning bawaan
        // aman di keduanya, tetapi aksen gelap pilihan pemilik (mis. biru tua)
        // tidak — plat nomor, chip, dan tombol jadi tidak terbaca.
        r.style.setProperty('--aksen-teks', Merek.terbacaDiGelap(aksen));
        r.style.setProperty('--aksen-kontras', Merek.kontrasAtas(aksen));
      }
      if (/^#[0-9a-f]{6}$/i.test(tinta)) r.style.setProperty('--merek-tinta', tinta);
      if (/^#[0-9a-f]{6}$/i.test(kedua)) {
        r.style.setProperty('--merek-ungu', kedua);
        // Versi terang dari warna sekunder pemilik, dipakai tema gelap supaya
        // panel & grafik tetap berwarna merek tanpa kehilangan keterbacaan.
        r.style.setProperty('--merek-ungu-terang', Merek.terangkan(kedua, 0.74));
      }

      const font = Merek.set('FONT_APP', 'Poppins');
      r.style.setProperty('--font-app', FONT_TERSEDIA[font] || FONT_TERSEDIA.Poppins);

      // Favicon: pakai unggahan pemilik, kalau tidak gambarkan ulang dari warna aksen
      const fav = String(Merek.set('MEREK_FAVICON', '') || '').trim();
      let el = document.querySelector('link[rel="icon"]');
      if (!el) { el = document.createElement('link'); el.rel = 'icon'; document.head.appendChild(el); }
      if (fav) el.href = fav;
      else {
        const huruf = (Merek.judul() || 'Z').charAt(0).toUpperCase();
        el.href = 'data:image/svg+xml,' + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
          '<rect width="32" height="32" rx="8" fill="' + aksen + '"/>' +
          '<text x="16" y="23" font-family="Poppins,Arial" font-size="20" font-weight="800" ' +
          'text-anchor="middle" fill="' + tinta + '">' + huruf + '</text></svg>');
      }

      const nama = Z.$('#merekNama');
      if (nama) nama.textContent = Merek.judul();
      const sub = Z.$('#subJudul');
      if (sub && !sub.dataset.dipakaiHalaman) sub.textContent = Merek.subjudul();
    },

    FONT: FONT_TERSEDIA
  };

  const NAV = [
    { kunci: 'beranda',   ikon: 'beranda', teks: 'Beranda' },
    { kunci: 'order',     ikon: 'order',   teks: 'Order' },
    { kunci: 'armada',    ikon: 'motor',   teks: 'Armada' },
    { kunci: 'pelanggan', ikon: 'orang',   teks: 'Pelanggan' },
    { kunci: 'lainnya',   ikon: 'grid',    teks: 'Lainnya' }
  ];

  const App = global.App = {
    data: null,
    rute: 'beranda',
    param: {},
    cari: '',
    siap: false,

    /* ---------------- Pengaturan ---------------- */
    set: function (kunci, bawaan) {
      const s = (App.data && App.data.pengaturan) || {};
      const v = s[kunci];
      return (v === undefined || v === '') ? bawaan : v;
    },

    /* ---------------- Panggilan API dengan umpan balik ---------------- */
    kirim: async function (action, data, opsi) {
      opsi = opsi || {};
      const r = await Z.Api.kirim(action, data, opsi);
      if (!r.success) {
        if (r.code === 'AUTH') { App.keluar(true); return r; }
        if (!opsi.diam) Z.toast(r.message || 'Gagal memproses permintaan.', 'err', 4);
      } else if (r.message && !opsi.diam) {
        Z.toast(r.message);
      }
      return r;
    },

    /* ---------------- Muat / segarkan data ---------------- */
    muatUlang: async function (segar) {
      const r = await Z.Api.kirim('boot', segar ? { _fresh: true } : {});
      if (r.success) {
        App.data = r.data;
        Z.Simpan.taruh('boot', { at: Date.now(), data: r.data });
        Merek.terapkan();          // pengaturan merek mungkin baru saja diubah
        App.render();
        return true;
      }
      if (r.code === 'AUTH') App.keluar(true);
      else if (!App.data) App.tampilGagal(r.message);
      return false;
    },

    /** Stale-while-revalidate: pakai cache lokal dulu, baru cek server. */
    muatSWR: async function () {
      const simpan = Z.Simpan.ambil('boot', null);
      const umur = simpan ? (Date.now() - simpan.at) / 1000 : 1e9;
      if (simpan && simpan.data) {
        App.data = simpan.data;
        App.siap = true;
        App.render();
      }
      if (umur > (global.ZAN_CONFIG.SEGAR_DETIK || 45) || !simpan) {
        const ok = await App.muatUlang(false);
        App.siap = App.siap || ok;
      }
    },

    /* ---------------- Navigasi ---------------- */
    ke: function (rute, param) {
      App.rute = rute;
      App.param = param || {};
      App.cari = '';
      const hash = '#/' + rute + (param && param.id ? '/' + param.id : '');
      if (location.hash !== hash) history.pushState(null, '', hash);
      window.scrollTo({ top: 0, behavior: 'auto' });
      App.render();
    },

    dariHash: function () {
      const h = (location.hash || '').replace(/^#\/?/, '');
      const bagian = h.split('/').filter(Boolean);
      if (!bagian.length) return { rute: 'beranda', param: {} };
      if (bagian[0] === 'v') return { rute: 'verifikasi', param: { kode: bagian[1] || '' } };
      const rute = Hal[bagian[0]] ? bagian[0] : 'beranda';
      return { rute: rute, param: bagian[1] ? { id: bagian[1] } : {} };
    },

    /* ---------------- Render ---------------- */
    render: function () {
      const hal = Hal[App.rute] || Hal.beranda;
      const main = Z.$('#utama');
      if (!main) return;
      let html;
      try { html = hal.render(App.param); }
      catch (e) {
        console.error(e);
        html = U.kosong('alert', 'Terjadi kesalahan tampilan', e.message);
      }
      // Animasi masuk bertahap hanya diputar saat benar-benar BERPINDAH halaman.
      // Kalau diputar pada setiap render ulang (mis. form order yang menghitung
      // ulang total), seluruh isi layar berkedip tiap kali pengguna menyentuh isian.
      const kunciHal = App.rute + '|' + ((App.param && App.param.id) || '');
      const pindahHalaman = App._kunciHal !== kunciHal;
      App._kunciHal = kunciHal;
      // Bar "mode pilih" hidup di <body>, jadi harus dibersihkan sendiri setiap
      // render; kalau tidak, ia tertinggal melayang saat pengguna pindah menu.
      if (global.Pilih) {
        global.Pilih.bersihkan();
        if (pindahHalaman && global.Pilih.aktif && global.Pilih.hal !== App.rute) {
          global.Pilih.aktif = false; global.Pilih.hal = ''; global.Pilih.set = {};
        }
      }
      main.innerHTML = '<div class="lajur' + (pindahHalaman ? ' lajur-masuk' : '') + '" id="lajur">' + html + '</div>';
      const lajur = Z.$('#lajur', main);
      try { if (hal.setelah) hal.setelah(lajur, App.param); } catch (e) { console.error(e); }
      App.pasangAksiGlobal(lajur);
      App.perbaruiNav();
      document.title = (hal.judul ? hal.judul + ' • ' : '') + (global.ZAN_CONFIG.APP_NAMA || 'ZAN Rental');
    },

    perbaruiNav: function () {
      const hal = Hal[App.rute] || Hal.beranda;
      const aktif = hal.nav || App.rute;
      Z.$$('[data-navitem]').forEach(function (el) {
        el.classList.toggle('on', el.getAttribute('data-navitem') === aktif);
      });
      const lonceng = Z.$('#jumlahAlert');
      if (lonceng && App.data) {
        const n = global.Hitung ? global.Hitung.perhatian().filter(function (p) {
          return p.prioritas <= 2; }).length : 0;
        lonceng.textContent = n;
        lonceng.style.display = n ? 'grid' : 'none';
      }
    },

    /* ---------------- Aksi global (delegasi) ---------------- */
    pasangAksiGlobal: function (root) {
      Z.$$('[data-pilih-mulai]', root).forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          global.Pilih.mulai(el.getAttribute('data-pilih-mulai'));
        });
      });
      Z.$$('[data-nav]', root).forEach(function (el) {
        if (el._nav) return;
        el._nav = true;
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          App.ke(el.getAttribute('data-nav'));
        });
      });
      Z.$$('[data-order]', root).forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.closest('[data-wa],[data-selesai],[data-kwitansi],[data-mulai],a')) return;
          Hal.detailOrder(el.getAttribute('data-order'));
        });
      });
      Z.$$('[data-unit]', root).forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.closest('button,a')) return;
          const id = el.getAttribute('data-unit');
          if (id) Hal.armada.form(id);
        });
      });
      Z.$$('[data-unit-edit]', root).forEach(function (el) {
        el.addEventListener('click', function (e) { e.stopPropagation(); Hal.armada.form(el.getAttribute('data-unit-edit')); });
      });
      Z.$$('[data-pelanggan]', root).forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.closest('button,a')) return;
          Hal.pelanggan.form(el.getAttribute('data-pelanggan'));
        });
      });
      Z.$$('[data-wa]', root).forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          const o = global.Hitung.order(el.getAttribute('data-wa'));
          if (o) global.kirimWa(o, el.getAttribute('data-wa-tipe') || 'ORDER_BARU');
        });
      });
      Z.$$('[data-selesai]', root).forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          Hal.detailOrder(el.getAttribute('data-selesai'));
        });
      });
      Z.$$('[data-kwitansi]', root).forEach(function (el) {
        el.addEventListener('click', function (e) { e.stopPropagation(); Hal.detailOrder(el.getAttribute('data-kwitansi')); });
      });
      Z.$$('[data-mulai]', root).forEach(function (el) {
        el.addEventListener('click', function (e) { e.stopPropagation(); Hal.detailOrder(el.getAttribute('data-mulai')); });
      });
      Z.$$('[data-order-unit]', root).forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          global.PagesUtil.FormOrder.data = null;
          global.PagesUtil.FormOrder.idSumber = null;
          App.ke('order-baru');
          setTimeout(function () {
            global.PagesUtil.FormOrder.data.unit = el.getAttribute('data-order-unit');
            App.render();
          }, 60);
        });
      });
      Z.$$('[data-order-pelanggan]', root).forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          global.PagesUtil.FormOrder.data = null;
          global.PagesUtil.FormOrder.idSumber = null;
          App.ke('order-baru');
          setTimeout(function () {
            global.PagesUtil.FormOrder.data.pelanggan = el.getAttribute('data-order-pelanggan');
            App.render();
          }, 60);
        });
      });
      Z.$$('[data-servis-unit]', root).forEach(function (el) {
        el.addEventListener('click', function (e) { e.stopPropagation(); Hal.servis.form(el.getAttribute('data-servis-unit')); });
      });
      const cari = Z.$('#kotakCari', root);
      if (cari) {
        let t = null;
        cari.addEventListener('input', function () {
          clearTimeout(t);
          t = setTimeout(function () {
            App.cari = cari.value;
            const posisi = cari.selectionStart;
            App.render();
            const baru = Z.$('#kotakCari');
            if (baru) { baru.focus(); try { baru.setSelectionRange(posisi, posisi); } catch (e) {} }
          }, 260);
        });
      }
      const bersih = Z.$('[data-aksi="bersih-cari"]', root);
      if (bersih) bersih.addEventListener('click', function () { App.cari = ''; App.render(); });
    },

    /* ---------------- Tema ---------------- */
    gantiTema: function (tema, ev) {
      function terapkan() {
        document.documentElement.setAttribute('data-tema', tema);
        Z.Simpan.taruh('tema', tema);
        const meta = Z.$('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', tema === 'gelap' ? '#14101C' : '#f5f5f7');
      }
      if (ev && document.startViewTransition) {
        const x = ev.clientX || window.innerWidth / 2;
        const y = ev.clientY || window.innerHeight / 2;
        document.documentElement.style.setProperty('--vt-x', x + 'px');
        document.documentElement.style.setProperty('--vt-y', y + 'px');
        document.startViewTransition(terapkan);
      } else terapkan();
    },

    /* ---------------- Keluar ---------------- */
    keluar: function (paksa) {
      Z.Api.setToken('');
      Z.Simpan.hapus('boot');
      App.data = null;
      App.siap = false;
      layarLogin(paksa ? 'Sesi Anda berakhir. Silakan masuk lagi.' : '');
    },

    tampilGagal: function (pesan) {
      Z.$('#utama').innerHTML = '<div class="lajur"><div class="kartu">' +
        U.kosong('alert', 'Tidak bisa memuat data', pesan || 'Periksa koneksi internet lalu coba lagi.',
          '<button class="btn btn-utama" style="margin-top:14px" onclick="location.reload()">Muat ulang</button>') +
        '</div></div>';
    }
  };

  /* ================================================================
   * KERANGKA HTML
   * ================================================================ */
  function gambarKerangka() {
    const app = Z.$('#app');
    app.className = 'app';
    app.innerHTML =
      /* Rail desktop */
      '<aside class="rail">' +
        Merek.htmlLogo('rail-logo') +
        NAV.map(function (n) {
          return '<button class="rail-item" data-navitem="' + n.kunci + '" data-nav="' + n.kunci + '">' +
            Z.Ikon(n.ikon, 21) + '<span>' + esc(n.teks) + '</span></button>';
        }).join('') +
        '<div class="rail-bawah">' +
          '<button class="rail-item" id="railTema">' + Z.Ikon('bulan', 20) + '<span>Tema</span></button>' +
        '</div>' +
      '</aside>' +

      /* Topbar */
      '<header class="topbar"><div class="topbar-in">' +
        '<div class="merek">' +
          Merek.htmlLogo() +
          '<div class="merek-teks"><div class="merek-nama" id="merekNama">' + Z.esc(Merek.judul()) + '</div>' +
          '<div class="merek-sub" id="subJudul">' + Z.esc(Merek.subjudul()) + '</div></div>' +
        '</div>' +
        '<div class="topbar-aksi">' +
          '<button class="ikon-btn" id="btnSegar" aria-label="Segarkan data">' + Z.Ikon('sinkron', 21) + '</button>' +
          '<button class="ikon-btn" id="btnAlert" aria-label="Perlu perhatian">' + Z.Ikon('lonceng', 21) +
            '<span class="lonceng-n" id="jumlahAlert" style="display:none">0</span></button>' +
          '<button class="ikon-btn" id="btnTema" aria-label="Ganti tema">' + Z.Ikon('bulan', 21) + '</button>' +
        '</div>' +
      '</div></header>' +

      '<main id="utama"></main>' +

      '<button class="fab" id="fab" aria-label="Buat order baru">' + Z.Ikon('plus', 26) + '</button>' +

      '<nav class="navbawah"><div class="navbawah-in">' +
        NAV.map(function (n) {
          return '<button class="nav-item" data-navitem="' + n.kunci + '" data-nav="' + n.kunci + '">' +
            '<span class="nav-pil">' + Z.Ikon(n.ikon, 21) + '</span><span>' + esc(n.teks) + '</span></button>';
        }).join('') +
      '</div></nav>';

    Z.$$('[data-nav]', app).forEach(function (el) {
      el.addEventListener('click', function () { App.ke(el.getAttribute('data-nav')); });
    });
    Z.$('#fab').addEventListener('click', function () {
      if (App.rute === 'keuangan') Hal.keuangan.formTransaksi('Masuk');
      else if (App.rute === 'armada') Hal.armada.form(null);
      else if (App.rute === 'pelanggan') Hal.pelanggan.form(null);
      else App.ke('order-baru');
    });

    // FAB menepi saat menggulir ke bawah (agar tidak menutupi tombol kartu),
    // muncul lagi saat menggulir ke atas atau berhenti menggulir.
    (function () {
      const fab = Z.$('#fab');
      let akhir = window.scrollY, tunggu = 0, diam = null;
      window.addEventListener('scroll', function () {
        if (tunggu) return;
        tunggu = requestAnimationFrame(function () {
          tunggu = 0;
          const y = window.scrollY;
          if (y > akhir + 8 && y > 140) fab.classList.add('sembunyi');
          else if (y < akhir - 8) fab.classList.remove('sembunyi');
          akhir = y;
          clearTimeout(diam);
          diam = setTimeout(function () { fab.classList.remove('sembunyi'); }, 900);
        });
      }, { passive: true });
    })();
    Z.$('#btnSegar').addEventListener('click', async function () {
      const b = Z.$('#btnSegar');
      b.innerHTML = Z.Ikon('sinkron', 21, 'putar');
      await App.muatUlang(true);
      b.innerHTML = Z.Ikon('sinkron', 21);
      Z.toast('Data diperbarui dari server.');
    });
    Z.$('#btnAlert').addEventListener('click', function () { App.ke('beranda'); });
    function toggleTema(e) {
      const kini = document.documentElement.getAttribute('data-tema') === 'gelap';
      App.gantiTema(kini ? 'terang' : 'gelap', e);
    }
    Z.$('#btnTema').addEventListener('click', toggleTema);
    Z.$('#railTema').addEventListener('click', toggleTema);
  }

  /* ================================================================
   * LAYAR LOGIN
   * ================================================================ */
  function layarLogin(pesan) {
    const app = Z.$('#app');
    app.className = 'login-bg';
    app.innerHTML =
      '<div class="kartu login-kartu anim">' +
        Merek.htmlLogo('login-logo') +
        '<h1 class="t-hero" style="font-size:21px">ZAN Rental Operasional</h1>' +
        '<p class="t-sm t-var" style="margin-top:4px">Masukkan PIN 6 angka untuk masuk</p>' +
        (pesan ? '<div class="kotak kotak-warn" style="margin-top:13px;font-size:12px">' + esc(pesan) + '</div>' : '') +
        '<div class="pin-kotak" id="pinKotak">' +
          '<i></i><i></i><i></i><i></i><i></i><i></i>' +
        '</div>' +
        '<div id="pinPesan" class="t-sm" style="min-height:18px;color:var(--danger);font-weight:600"></div>' +
        '<div class="pin-pad">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
            return '<button class="pin-tombol" data-pin="' + n + '">' + n + '</button>'; }).join('') +
          '<button class="pin-tombol" data-pin="hapus" aria-label="Hapus">' + Z.Ikon('panahKiri', 20) + '</button>' +
          '<button class="pin-tombol" data-pin="0">0</button>' +
          '<button class="pin-tombol" data-pin="ok" style="background:var(--kuning);color:var(--aksen-kontras)">' +
            Z.Ikon('panah', 20) + '</button>' +
        '</div>' +
        '<div class="t-sm t-var" style="margin-top:18px;line-height:1.6">' +
          'PIN awal ada di <b>Execution Log</b> Apps Script setelah menjalankan setupAppEnvironment().<br>' +
          'Lupa PIN? Jalankan fungsi <code>resetPin()</code> di editor.</div>' +
      '</div>';

    let pin = '';
    function gambar() {
      Z.$$('#pinKotak i').forEach(function (el, i) { el.classList.toggle('isi', i < pin.length); });
    }
    // Penjaga panggilan ganda: digit ke-6 mengirim otomatis, lalu tombol → atau
    // tombol Enter bisa menyusul. Tanpa penjaga, panggilan kedua berjalan setelah
    // layar login diganti sehingga #pinPesan sudah tidak ada (TypeError).
    let sedangMasuk = false;
    async function coba() {
      if (sedangMasuk || pin.length !== 6) return;
      const pesanEl = Z.$('#pinPesan');
      if (!pesanEl) return;                       // layar login sudah berganti
      sedangMasuk = true;
      pesanEl.textContent = '';
      Z.$$('.pin-tombol').forEach(function (b) { b.disabled = true; });
      let r;
      try {
        r = await Z.Api.kirim('auth.login', { pin: pin });
      } catch (e) {
        r = { success: false, message: 'Tidak dapat menghubungi server. Periksa koneksi Anda.' };
      }
      if (r.success) {
        Z.Api.setToken(r.data.token);
        App.data = r.data.boot;
        Z.Simpan.taruh('boot', { at: Date.now(), data: r.data.boot });
        App.siap = true;
        mulaiAplikasi();                          // layar login dibuang di sini
        Z.toast(r.message || 'Selamat datang!');
        return;                                   // jangan sentuh DOM login lagi
      }
      sedangMasuk = false;
      Z.$$('.pin-tombol').forEach(function (b) { b.disabled = false; });
      pin = ''; gambar();
      const pesanEl2 = Z.$('#pinPesan');
      if (pesanEl2) pesanEl2.textContent = r.message || 'PIN salah.';
      const kartu = Z.$('.login-kartu');
      if (kartu) {
        kartu.classList.add('goyang');
        setTimeout(function () { kartu.classList.remove('goyang'); }, 460);
      }
    }
    Z.$$('[data-pin]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = b.getAttribute('data-pin');
        if (v === 'hapus') pin = pin.slice(0, -1);
        else if (v === 'ok') return coba();
        else if (pin.length < 6) pin += v;
        gambar();
        if (pin.length === 6) setTimeout(coba, 160);
      });
    });
    document.addEventListener('keydown', function tekan(e) {
      if (!Z.$('#pinKotak')) { document.removeEventListener('keydown', tekan); return; }
      if (/^\d$/.test(e.key) && pin.length < 6) { pin += e.key; gambar(); if (pin.length === 6) setTimeout(coba, 160); }
      else if (e.key === 'Backspace') { pin = pin.slice(0, -1); gambar(); }
      else if (e.key === 'Enter') coba();
    });
    Z.Api.hangatkan('pub');
  }

  /* ================================================================
   * MULAI
   * ================================================================ */
  function mulaiAplikasi() {
    Merek.terapkan();          // warna & font dulu, supaya kerangka langsung tergambar benar
    gambarKerangka();
    Merek.terapkan();          // lalu isi logo/judul pada kerangka yang baru ada
    const h = App.dariHash();
    App.rute = h.rute;
    App.param = h.param;
    App.render();
    App.muatSWR();
    Z.Api.hangatkan('admin');

    window.addEventListener('popstate', function () {
      const x = App.dariHash();
      App.rute = x.rute; App.param = x.param; App.cari = '';
      App.render();
    });

    // Penyegaran adaptif: hanya saat tab terlihat & pengguna aktif
    setInterval(function () {
      if (!Z.Api.token) return;
      if (Z.Aktivitas.saatnya('boot', 90000, 300000)) App.muatUlang(false);
    }, 20000);
  }

  function mulai() {
    // Tema tersimpan
    const tema = Z.Simpan.ambil('tema', null);
    if (tema) document.documentElement.setAttribute('data-tema', tema);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-tema', 'gelap');
    }
    Z.Aktivitas.init();
    Z.Api.onAuthGagal = function () { /* ditangani di App.kirim */ };

    // Halaman verifikasi publik: boleh dibuka tanpa login
    const h = App.dariHash();
    if (h.rute === 'verifikasi') {
      gambarKerangka();
      Z.$('.navbawah').style.display = 'none';
      Z.$('.fab').style.display = 'none';
      App.rute = 'verifikasi'; App.param = h.param;
      App.render();
      return;
    }

    if (!Z.siapDeploy()) {
      Z.$('#app').className = 'login-bg';
      Z.$('#app').innerHTML = '<div class="kartu login-kartu">' +
        '<div class="login-logo" style="background:var(--danger-isi);color:#fff">!</div>' +
        '<h1 class="t-judul">Alamat server belum diisi</h1>' +
        '<p class="t-sm t-var" style="margin-top:8px;line-height:1.7">Buka berkas <b>js/config.js</b> lalu ganti ' +
        '<code>GAS_URL</code> dengan URL Web App Apps Script Anda (yang diakhiri <code>/exec</code>).<br><br>' +
        'Langkahnya ada di PANDUAN-INSTALASI.md.</p></div>';
      return;
    }

    if (Z.Api.token) mulaiAplikasi();
    else layarLogin('');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})(window);
