/* ================================================================
 *  ZAN RENTAL — pages.js (bagian 1)
 *  Halaman: Beranda, Order, Buat Order, Armada, Pelanggan (CRM).
 *  Semua render dilakukan di peramban dari data boot → pindah menu
 *  tidak memanggil server sama sekali.
 * ================================================================ */
(function (global) {
  'use strict';
  const Z = global.ZAN, U = global.UI, esc = Z.esc;
  const Hal = global.Hal = global.Hal || {};
  const Hitung = global.Hitung = {};

  /* ================================================================
   * MODE PILIH — hapus massal untuk Order, Armada, dan Pelanggan
   *
   * Dibuat satu kali lalu dipakai ketiga halaman. Checkbox tidak ditulis
   * ke dalam markup kartu; ia DISISIPKAN ke kartu yang sudah ada saat mode
   * pilih menyala. Dengan begitu tata letak kartu tidak perlu diubah dan
   * tidak ada risiko merusak tampilan yang sudah benar.
   * ================================================================ */
  const Pilih = global.Pilih = {
    aktif: false,
    hal: '',
    set: {},

    jumlah: function () { return Object.keys(this.set).length; },

    mulai: function (hal) {
      this.aktif = true; this.hal = hal; this.set = {};
      global.App.render();
    },
    selesai: function () {
      this.aktif = false; this.hal = ''; this.set = {};
      global.App.render();
    },

    /** Tombol "Pilih" untuk diselipkan di kepala halaman. */
    tombol: function (hal) {
      return '<button class="btn btn-kecil btn-netral" data-pilih-mulai="' + hal + '">' +
        Z.Ikon('check', 15) + 'Pilih</button>';
    },

    /**
     * Pasang mode pilih pada daftar yang sudah dirender.
     * @param root  elemen halaman
     * @param sel   pemilih kartu, mis. '[data-order]'
     * @param atr   nama atribut pembawa id, mis. 'data-order'
     * @param opsi  { nama, aksi, bolehHapus(id) }
     */
    pasang: function (root, sel, atr, opsi) {
      const diri = this;
      if (!this.aktif || this.hal !== opsi.hal) return;
      root.classList.add('mode-pilih');

      // Atribut yang sama juga dipakai tombol DI DALAM kartu ("Detail order"),
      // jadi ambil hanya elemen terluar — kalau tidak, satu kartu bisa
      // mendapat beberapa checkbox sekaligus.
      const semua = Z.$$(sel, root).filter(function (el) { return el.getAttribute(atr); });
      const kartu = semua.filter(function (el) {
        return !semua.some(function (lain) { return lain !== el && lain.contains(el); });
      });
      kartu.forEach(function (el) {
        const id = el.getAttribute(atr);
        if (el.querySelector(':scope > .pilih-cek')) return;
        el.classList.add('bisa-pilih');
        const cek = document.createElement('label');
        cek.className = 'pilih-cek';
        cek.innerHTML = '<input type="checkbox" aria-label="Pilih ' + esc(id) + '"' +
          (diri.set[id] ? ' checked' : '') + '>';
        el.appendChild(cek);
        if (diri.set[id]) el.classList.add('terpilih');

        // Tangkap klik di fase CAPTURE supaya aksi asli kartu (buka detail)
        // tidak ikut berjalan selama mode pilih menyala.
        el.addEventListener('click', function (e) {
          if (!diri.aktif) return;
          e.preventDefault(); e.stopPropagation();
          diri.toggle(id, el);
        }, true);
      });

      this.gambarBar(root, kartu.length, opsi);
    },

    toggle: function (id, el) {
      if (this.set[id]) delete this.set[id]; else this.set[id] = 1;
      if (el) {
        el.classList.toggle('terpilih', !!this.set[id]);
        const cb = el.querySelector('.pilih-cek input');
        if (cb) cb.checked = !!this.set[id];
      }
      this.perbaruiBar();
    },

    perbaruiBar: function () {
      const n = this.jumlah();
      const el = Z.$('#pilihJml');
      if (el) el.textContent = n ? n + ' dipilih' : 'Belum ada yang dipilih';
      const bh = Z.$('#pilihHapus');
      if (bh) bh.disabled = !n;
      const bs = Z.$('#pilihSemua');
      if (bs) bs.textContent = n && n >= (this._tampil || 0) ? 'Kosongkan' : 'Pilih semua';
    },

    gambarBar: function (root, tampil, opsi) {
      const diri = this;
      this._tampil = tampil;
      const lama = Z.$('#pilihBar');
      if (lama) lama.remove();
      const bar = document.createElement('div');
      bar.id = 'pilihBar';
      bar.className = 'pilih-bar';
      bar.innerHTML =
        '<div class="pilih-bar-kiri">' +
          '<button class="ikon-btn" id="pilihTutup" aria-label="Keluar dari mode pilih">' + Z.Ikon('x', 19) + '</button>' +
          '<div><div class="pilih-bar-n" id="pilihJml">Belum ada yang dipilih</div>' +
          '<div class="t-sm t-var">' + esc(opsi.nama) + '</div></div>' +
        '</div>' +
        '<div class="pilih-bar-kanan">' +
          '<button class="btn btn-kecil btn-netral" id="pilihSemua">Pilih semua</button>' +
          '<button class="btn btn-kecil btn-bahaya" id="pilihHapus" disabled>' +
            Z.Ikon('sampah', 15) + 'Hapus</button>' +
        '</div>';
      document.body.appendChild(bar);
      requestAnimationFrame(function () { bar.classList.add('tampil'); });

      Z.$('#pilihTutup').addEventListener('click', function () { diri.selesai(); });
      Z.$('#pilihSemua').addEventListener('click', function () {
        const semuaKartu = Z.$$('.bisa-pilih', root);
        const penuh = diri.jumlah() >= semuaKartu.length;
        diri.set = {};
        if (!penuh) semuaKartu.forEach(function (el) { diri.set[el.getAttribute(opsi.atr)] = 1; });
        semuaKartu.forEach(function (el) {
          const on = !!diri.set[el.getAttribute(opsi.atr)];
          el.classList.toggle('terpilih', on);
          const cb = el.querySelector('.pilih-cek input');
          if (cb) cb.checked = on;
        });
        diri.perbaruiBar();
      });
      Z.$('#pilihHapus').addEventListener('click', function () { diri.konfirmasiHapus(opsi); });
      this.perbaruiBar();
    },

    konfirmasiHapus: function (opsi) {
      const diri = this;
      const ids = Object.keys(this.set);
      if (!ids.length) return;
      Z.konfirmasi({
        judul: 'Hapus ' + ids.length + ' ' + opsi.nama + '?',
        pesan: opsi.peringatan || ('Tindakan ini tidak bisa dibatalkan.'),
        ya: 'Ya, hapus ' + ids.length, batal: 'Batal', bahaya: true
      }).then(async function (setuju) {
        if (!setuju) return;
        const r = await global.App.kirim(opsi.aksi, { ids: ids });
        if (!r.success) return;
        diri.aktif = false; diri.hal = ''; diri.set = {};
        await global.App.muatUlang(true);
        global.App.render();
      });
    },

    /** Dipanggil saat berpindah halaman agar bar tidak tertinggal. */
    bersihkan: function () {
      const bar = Z.$('#pilihBar');
      if (bar) bar.remove();
    }
  };

  /* ================================================================
   * HITUNGAN TURUNAN
   * ================================================================ */
  function D() { return global.App.data || {}; }
  function unit(id) { return (D().units || []).filter(function (u) { return u.id === id; })[0] || {}; }
  function pel(id) { return (D().pelanggan || []).filter(function (p) { return p.id === id; })[0] || {}; }
  function orderById(id) { return (D().pesanan || []).filter(function (o) { return o.id === id; })[0] || null; }
  Hitung.unit = unit; Hitung.pel = pel; Hitung.order = orderById;

  /** Status efektif: order Berjalan yang lewat tanggal kembali → Terlambat. */
  function statusEfektif(o) {
    if (o.status === 'Berjalan' && o.kembali && o.kembali < Z.hariIni()) return 'Terlambat';
    return o.status;
  }
  function hariTelat(o) {
    return o.status === 'Berjalan' ? Math.max(0, Z.selisihHari(o.kembali, Z.hariIni())) : 0;
  }
  function dendaBerjalan(o) {
    const t = hariTelat(o);
    return t > 0 ? t * Z.num(global.App.set('TARIF_DENDA_HARI', 50000)) : 0;
  }
  Hitung.statusEfektif = statusEfektif;
  Hitung.hariTelat = hariTelat;
  Hitung.dendaBerjalan = dendaBerjalan;

  function keuPeriode(dari, sampai) {
    return (D().keuangan || []).filter(function (k) { return k.tanggal >= dari && k.tanggal <= sampai; });
  }
  function jumlah(arr, jenis) {
    return arr.reduce(function (a, k) { return a + (k.jenis === jenis ? k.nominal : 0); }, 0);
  }

  Hitung.ringkasan = function () {
    const hari = Z.hariIni();
    const bulan = hari.slice(0, 7);
    const bulanLalu = Z.tambahHari(bulan + '-01', -1).slice(0, 7);

    const tgl = Number(hari.slice(8, 10));
    const hariIniKeu = keuPeriode(hari, hari);
    const bulanKeu = (D().keuangan || []).filter(function (k) { return k.tanggal.indexOf(bulan) === 0; });
    // Perbandingan adil: periode berjalan vs tanggal yang sama di bulan lalu
    const lalu = (D().keuangan || []).filter(function (k) {
      return k.tanggal.indexOf(bulanLalu) === 0 && Number(k.tanggal.slice(8, 10)) <= tgl;
    });

    const masukHari = jumlah(hariIniKeu, 'Masuk');
    const masukBulan = jumlah(bulanKeu, 'Masuk');
    const keluarBulan = jumlah(bulanKeu, 'Keluar');
    const masukLalu = jumlah(lalu, 'Masuk');
    const labaLalu = masukLalu - jumlah(lalu, 'Keluar');
    const laba = masukBulan - keluarBulan;

    const units = D().units || [];
    const aktif = units.filter(function (u) { return u.aktif; });
    const disewa = aktif.filter(function (u) { return u.status === 'Disewa'; }).length;
    const servis = aktif.filter(function (u) { return u.status === 'Servis'; }).length;
    const tersedia = aktif.length - disewa - servis;

    const pesanan = D().pesanan || [];
    const berjalan = pesanan.filter(function (o) { return o.status === 'Berjalan'; });
    const booking = pesanan.filter(function (o) { return o.status === 'Booking'; });

    // Sparkline 7 hari
    const spark = [];
    for (let i = 6; i >= 0; i--) {
      const t = Z.tambahHari(hari, -i);
      spark.push(jumlah(keuPeriode(t, t), 'Masuk'));
    }
    const sparkBulan = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const ym = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
      sparkBulan.push(jumlah((D().keuangan || []).filter(function (k) { return k.tanggal.indexOf(ym) === 0; }), 'Masuk'));
    }

    const target = Z.num(global.App.set('TARGET_BULANAN', 0));
    const hariDalamBulan = new Date(Number(bulan.slice(0, 4)), Number(bulan.slice(5, 7)), 0).getDate();
    const persenTarget = target ? Math.round(masukBulan / target * 100) : 0;
    const persenHari = Math.round(tgl / hariDalamBulan * 100);
    return {
      masukHari: masukHari, masukBulan: masukBulan, keluarBulan: keluarBulan, laba: laba,
      deltaBulan: masukLalu ? ((masukBulan - masukLalu) / masukLalu) * 100 : null,
      deltaLaba: labaLalu ? ((laba - labaLalu) / Math.abs(labaLalu)) * 100 : null,
      margin: masukBulan ? Math.round(laba / masukBulan * 100) : 0,
      totalUnit: aktif.length, disewa: disewa, tersedia: tersedia, servis: servis,
      berjalan: berjalan.length, booking: booking.length,
      spark: spark, sparkBulan: sparkBulan,
      target: target, persenTarget: persenTarget, persenHari: persenHari,
      // Pembanding jujur: pencapaian dibandingkan porsi hari yang sudah berjalan
      lajuTarget: persenHari ? persenTarget / persenHari : 0,
      sisaHari: hariDalamBulan - tgl,
      rataHarian: tgl ? Math.round(masukBulan / tgl) : 0,
      proyeksi: tgl ? Math.round(masukBulan / tgl * hariDalamBulan) : 0
    };
  };

  Hitung.perhatian = function () {
    const hari = Z.hariIni(), out = [];
    (D().pesanan || []).forEach(function (o) {
      if (o.status !== 'Berjalan') return;
      const telat = Z.selisihHari(o.kembali, hari);
      if (telat > 0) out.push({ tipe: 'telat', prioritas: 1, order: o, hari: telat });
      else if (o.kembali === hari) out.push({ tipe: 'kembali', prioritas: 2, order: o });
    });
    (D().pesanan || []).forEach(function (o) {
      if (o.status === 'Booking' && o.mulai === hari) out.push({ tipe: 'ambil', prioritas: 2, order: o });
    });
    const batasPajak = Z.num(global.App.set('INGAT_PAJAK_HARI', 14));
    const batasKm = Z.num(global.App.set('INGAT_SERVIS_KM', 500));
    (D().units || []).forEach(function (u) {
      if (!u.aktif) return;
      if (u.pajak) {
        const sisa = Z.selisihHari(hari, u.pajak);
        if (sisa <= batasPajak) out.push({ tipe: 'pajak', prioritas: sisa < 0 ? 1 : 3, unitRef: u, sisa: sisa });
      }
      if (u.servisNext !== undefined && u.servisNext <= batasKm) {
        out.push({ tipe: 'servis', prioritas: u.servisNext < 0 ? 1 : 3, unitRef: u, sisa: u.servisNext });
      }
    });
    (D().pesanan || []).forEach(function (o) {
      if (o.status === 'Selesai' && o.statusBayar !== 'Lunas' && (o.total - o.dibayar) > 0) {
        out.push({ tipe: 'piutang', prioritas: 2, order: o });
      }
    });
    return out.sort(function (a, b) { return a.prioritas - b.prioritas; });
  };

  Hitung.tren = function (mode) {
    const hari = Z.hariIni();
    if (mode === 'Harian') {
      const label = [], masuk = [], keluar = [];
      for (let i = 6; i >= 0; i--) {
        const t = Z.tambahHari(hari, -i);
        const k = keuPeriode(t, t);
        label.push(Z.HARI_P[(Z.parseTgl(t) || new Date()).getDay()]);
        masuk.push(jumlah(k, 'Masuk')); keluar.push(jumlah(k, 'Keluar'));
      }
      return { label: label, masuk: masuk, keluar: keluar };
    }
    if (mode === 'Mingguan') {
      const label = [], masuk = [], keluar = [];
      for (let i = 4; i >= 0; i--) {
        const a = Z.tambahHari(hari, -(i * 7 + 6)), b = Z.tambahHari(hari, -(i * 7));
        const k = keuPeriode(a, b);
        label.push('M-' + (5 - i));
        masuk.push(jumlah(k, 'Masuk')); keluar.push(jumlah(k, 'Keluar'));
      }
      return { label: label, masuk: masuk, keluar: keluar };
    }
    const label = [], masuk = [], keluar = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const ym = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
      const k = (D().keuangan || []).filter(function (x) { return x.tanggal.indexOf(ym) === 0; });
      label.push(Z.BULAN_P[d.getMonth()]);
      masuk.push(jumlah(k, 'Masuk')); keluar.push(jumlah(k, 'Keluar'));
    }
    return { label: label, masuk: masuk, keluar: keluar };
  };

  Hitung.unitTerlaris = function (bulan, batas) {
    const peta = {};
    (D().pesanan || []).forEach(function (o) {
      if (o.status === 'Batal') return;
      if (bulan && o.mulai.indexOf(bulan) !== 0) return;
      peta[o.unit] = peta[o.unit] || { sewa: 0, hari: 0, hasil: 0 };
      peta[o.unit].sewa++;
      peta[o.unit].hari += o.durasi;
      peta[o.unit].hasil += o.dibayar;
    });
    return Object.keys(peta).map(function (id) {
      const u = unit(id);
      return { id: id, nama: u.nama || id, plat: u.plat || '', s: peta[id], nilai: peta[id].hasil };
    }).sort(function (a, b) { return b.nilai - a.nilai; }).slice(0, batas || 5);
  };

  Hitung.statUnit = function (id) {
    const ord = (D().pesanan || []).filter(function (o) { return o.unit === id && o.status !== 'Batal'; });
    const srv = (D().servis || []).filter(function (s) { return s.unit === id; });
    const biaya = srv.reduce(function (a, s) { return a + s.biaya; }, 0);
    const hasil = ord.reduce(function (a, o) { return a + o.dibayar; }, 0);
    return { sewa: ord.length, hari: ord.reduce(function (a, o) { return a + o.durasi; }, 0),
             hasil: hasil, biaya: biaya, laba: hasil - biaya, servis: srv.length };
  };

  Hitung.unitTersedia = function (mulai, kembali, kecuali) {
    return (D().units || []).filter(function (u) {
      if (!u.aktif || u.status === 'Servis') return false;
      const bentrok = (D().pesanan || []).some(function (o) {
        if (o.unit !== u.id) return false;
        if (kecuali && o.id === kecuali) return false;
        if (o.status === 'Batal' || o.status === 'Selesai') return false;
        return mulai < o.kembali && kembali > o.mulai;
      });
      return !bentrok;
    });
  };

  /* ================================================================
   * HALAMAN: BERANDA
   * ================================================================ */
  Hal.beranda = {
    judul: 'Beranda', nav: 'beranda',
    render: function () {
      const r = Hitung.ringkasan();
      const jam = new Date().getHours();
      const sapa = jam < 11 ? 'Selamat pagi' : (jam < 15 ? 'Selamat siang' : (jam < 18 ? 'Selamat sore' : 'Selamat malam'));
      const perhatian = Hitung.perhatian();
      const mode = Z.Simpan.ambil('trenMode', 'Harian');
      const tren = Hitung.tren(mode);
      const terlaris = Hitung.unitTerlaris(Z.hariIni().slice(0, 7), 4);
      const nama = global.App.set('NAMA_PEMILIK', 'Mas Zan');

      let html = '';

      /* Hero sapaan */
      html += '<section class="kartu kartu-ungu">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
          '<div class="t-judul" style="color:#fff">' + esc(sapa) + ', ' + esc(nama) + '!</div>' +
          '<span class="badge badge-kuning">Pemilik</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;opacity:.92;font-size:12.5px">' +
          Z.Ikon('kalender', 15) + '<span>' + esc(Z.tglPanjang(Z.hariIni())) + ' • Jember</span>' +
        '</div>' +
        '<div class="kotak" style="background:rgba(0,0,0,.22);margin-top:12px;color:#fff;font-size:12.5px;line-height:1.6">' +
          '<b style="color:var(--aksen-teks)">' + perhatian.filter(function (p) { return p.tipe === 'kembali'; }).length + '</b> motor kembali hari ini • ' +
          '<b style="color:#ff9c9c">' + perhatian.filter(function (p) { return p.tipe === 'telat'; }).length + '</b> terlambat • ' +
          '<b>' + r.disewa + '</b> aktif di jalan' +
        '</div>' +
        '<div class="btn-grid" style="margin-top:12px">' +
          '<button class="btn btn-utama" data-nav="order-baru">' + Z.Ikon('plus', 18) + 'Order Baru</button>' +
          '<button class="btn" style="background:rgba(255,255,255,.16);color:#fff" data-aksi="catat-keluar">' +
            Z.Ikon('dompet', 18) + 'Pengeluaran</button>' +
        '</div>' +
      '</section>';

      /* KPI */
      html += '<section class="dsk-kpi4 grid2">' +
        U.kartuKpi({ label: 'Pemasukan Hari Ini', nilai: Z.rp(r.masukHari), ikon: 'masuk', warna: 'ok',
                     spark: r.spark, sparkWarna: 'var(--ungu)' }) +
        U.kartuKpi({ label: 'Pemasukan Bulan Ini', nilai: Z.rpSingkat(r.masukBulan), ikon: 'dompet',
                     delta: r.deltaBulan, spark: r.sparkBulan, sparkWarna: 'var(--ungu)' }) +
        U.kartuKpi({ label: 'Unit Terpakai', ikon: 'motor', tagKanan: r.totalUnit + ' total',
                     nilaiHtml: '<span>' + r.disewa + '</span><span class="t-sm t-var"> / ' + r.totalUnit + ' unit</span>',
                     bawah: '<div class="progress" style="height:7px;margin:7px 0 5px">' +
                       '<i style="width:' + (r.totalUnit ? r.disewa / r.totalUnit * 100 : 0) + '%;background:var(--ungu)"></i>' +
                       '<i style="width:' + (r.totalUnit ? r.tersedia / r.totalUnit * 100 : 0) + '%;background:var(--ok-terang)"></i>' +
                       '<i style="width:' + (r.totalUnit ? r.servis / r.totalUnit * 100 : 0) + '%;background:var(--warn-terang)"></i></div>' +
                       'Sewa ' + r.disewa + ' • Siap ' + r.tersedia + ' • Servis ' + r.servis,
                     aksi: 'armada' }) +
        U.kartuKpi({ label: 'Order Berjalan', nilai: r.berjalan + ' order', ikon: 'order', warna: 'info',
                     tagKanan: r.booking + ' booking',
                     bawah: perhatian.filter(function (p) { return p.tipe === 'kembali'; }).length + ' jadwal kembali hari ini',
                     aksi: 'order' }) +
      '</section>';

      /* Laba bersih */
      html += '<section class="kartu">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<span class="kpi-ikon kuning">' + Z.Ikon('grafik', 19) + '</span>' +
            '<div><div style="font-weight:700;font-size:14px">Laba Bersih Bulan Ini</div>' +
            '<div class="t-sm t-var">Margin ' + r.margin + '% ' +
            (r.margin >= 60 ? '(sangat sehat)' : (r.margin >= 35 ? '(sehat)' : '(perlu ditinjau)')) + '</div></div>' +
          '</div>' +
          '<span class="badge badge-' + (r.margin >= 50 ? 'ok' : (r.margin >= 25 ? 'warn' : 'danger')) + '">' + r.margin + '% margin</span>' +
        '</div>' +
        '<div style="display:flex;align-items:baseline;justify-content:space-between;margin:13px 0 9px">' +
          '<div class="t-kpi">' + Z.rp(r.laba) + '</div>' +
          '<div class="t-sm t-var">Net profit</div>' +
        '</div>' +
        U.progressDua(r.masukBulan ? (r.laba / r.masukBulan) * 100 : 0, 'var(--ink)', 'rgba(220,38,38,.75)') +
        '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11.5px" class="t-var">' +
          '<span>' + Z.Ikon('masuk', 12) + ' Masuk <b style="color:var(--teks)">' + Z.rpSingkat(r.masukBulan) + '</b></span>' +
          '<span>' + Z.Ikon('keluar', 12) + ' Biaya <b style="color:var(--teks)">' + Z.rpSingkat(r.keluarBulan) + '</b></span>' +
        '</div>' +
      '</section>';

      /* Perlu perhatian */
      html += '<section>' +
        '<div class="seksi-head"><div class="kiri"><h2 class="t-judul">Perlu Perhatian</h2>' +
        (perhatian.length ? '<span class="badge badge-danger">' + perhatian.length + ' item</span>' : '') + '</div>' +
        (perhatian.length > 3 ? '<button class="tautan" data-nav="order">Lihat semua</button>' : '') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:10px;margin-top:9px">' +
        (perhatian.length ? perhatian.slice(0, 4).map(kartuPerhatian).join('')
          : '<div class="kartu">' + U.kosong('perisai', 'Semua terkendali', 'Tidak ada motor terlambat, jatuh tempo pajak, atau jadwal servis mendesak hari ini.') + '</div>') +
        '</div></section>';

      /* Grafik + gauge */
      html += '<div class="dsk-sisi">';
      html += '<section class="kartu">' +
        '<div class="seksi-head"><div><h3 class="t-judul">Tren Pemasukan</h3>' +
        '<div class="t-sm t-var">Rata-rata ' + Z.rp(rataRata(tren.masuk)) + ' / periode</div></div>' +
        '<div class="seg" data-grup="tren" style="max-width:210px">' +
          ['Harian', 'Mingguan', 'Bulanan'].map(function (m) {
            return '<button data-tren="' + m + '"' + (m === mode ? ' class="on"' : '') + '>' + m + '</button>';
          }).join('') + '</div></div>' +
        '<div style="margin-top:10px">' +
        U.grafikBatang({ label: tren.label, judul: 'Tren pemasukan', seri: [
          { nama: 'Masuk', nilai: tren.masuk, warna: 'var(--kuning)' },
          { nama: 'Keluar', nilai: tren.keluar, warna: 'var(--ungu)' }
        ] }) + '</div></section>';

      const laju = r.lajuTarget;
      html += '<section class="kartu">' +
        '<div class="seksi-head"><h3 class="t-judul">Target Bulanan</h3>' +
        '<span class="badge badge-' + (laju >= 0.95 ? 'ok' : (laju >= 0.7 ? 'warn' : 'danger')) + '">' +
        (laju >= 0.95 ? 'Sesuai laju' : (laju >= 0.7 ? 'Perlu dikejar' : 'Tertinggal')) + '</span></div>' +
        U.gauge(r.persenTarget) +
        '<div style="text-align:center;margin-top:6px">' +
          '<div class="t-rp">' + Z.rp(r.masukBulan) + ' <span class="t-sm t-var" style="font-weight:400">/ target ' + Z.rp(r.target) + '</span></div>' +
          '<div class="t-sm t-var" style="margin-top:3px">' + r.persenHari + '% bulan berjalan • sisa ' + r.sisaHari + ' hari</div>' +
        '</div>' +
        '<div class="kotak" style="margin-top:11px">' +
          U.baris('Rata-rata harian', Z.rp(r.rataHarian)) +
          U.baris('Proyeksi akhir bulan', '<b>' + Z.rp(r.proyeksi) + '</b>') +
        '</div></section>';
      html += '</div>';

      /* Armada terlaris */
      html += '<section class="kartu">' +
        '<div class="seksi-head"><h3 class="t-judul">Armada Terlaris Bulan Ini</h3>' +
        '<button class="tautan" data-nav="laporan">Laporan</button></div>' +
        '<div style="margin-top:12px">' +
        U.peringkat(terlaris.map(function (t) {
          return { nama: t.nama, sub: t.plat + ' • ' + t.s.hari + ' hari sewa', nilai: t.nilai };
        })) + '</div></section>';

      return html;
    },
    setelah: function (root) {
      Z.$$('[data-tren]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          Z.Simpan.taruh('trenMode', b.getAttribute('data-tren'));
          global.App.render();
        });
      });
      const btn = Z.$('[data-aksi="catat-keluar"]', root);
      if (btn) btn.addEventListener('click', function () { global.Hal.keuangan.formTransaksi('Keluar'); });
    }
  };

  function rataRata(arr) {
    if (!arr || !arr.length) return 0;
    return Math.round(arr.reduce(function (a, b) { return a + b; }, 0) / arr.length);
  }

  function kartuPerhatian(p) {
    if (p.tipe === 'telat' || p.tipe === 'kembali' || p.tipe === 'ambil' || p.tipe === 'piutang') {
      const o = p.order, u = unit(o.unit), c = pel(o.pelanggan);
      const cfg = {
        telat:   { kelas: 'danger', label: 'TERLAMBAT ' + p.hari + ' HARI', pita: 'var(--danger)' },
        kembali: { kelas: 'warn',   label: 'KEMBALI HARI INI',              pita: 'var(--warn)' },
        ambil:   { kelas: 'info',   label: 'DIAMBIL HARI INI',              pita: 'var(--info)' },
        piutang: { kelas: 'ungu',   label: 'BELUM LUNAS',                   pita: 'var(--ungu)' }
      }[p.tipe];
      const denda = dendaBerjalan(o);
      return '<article class="kartu ord-kartu kartu-klik" data-order="' + esc(o.id) + '">' +
        '<div class="ord-pita" style="background:' + cfg.pita + '"></div>' +
        '<div class="ord-head">' +
          U.badge(cfg.label, cfg.kelas) +
          '<span class="plat">' + esc(u.plat || '-') + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;gap:10px;margin-top:9px">' +
          '<div style="min-width:0">' +
            '<div style="font-weight:700;font-size:14px">' + esc(u.nama || '-') + '</div>' +
            '<div class="t-sm t-var">Penyewa: ' + esc(c.nama || '-') + '</div>' +
            '<div class="t-sm t-var" style="font-size:11px;margin-top:2px">' +
              (p.tipe === 'ambil' ? 'Ambil ' + esc(o.jamMulai) + ' WIB' :
                'Jatuh tempo: ' + esc(Z.relatif(o.kembali)) + ', ' + esc(o.jamKembali) + ' WIB') +
            '</div>' +
          '</div>' +
          (denda || p.tipe === 'piutang' ?
            '<div style="text-align:right;flex:none">' +
              '<div class="t-cap" style="color:var(--danger)">' + (p.tipe === 'piutang' ? 'Sisa tagihan' : 'Denda berjalan') + '</div>' +
              '<div class="t-rp" style="color:var(--danger)">' + Z.rp(p.tipe === 'piutang' ? (o.total - o.dibayar) : denda) + '</div>' +
            '</div>' : '') +
        '</div>' +
        '<div class="btn-grid" style="margin-top:11px">' +
          '<button class="btn btn-kecil btn-hijau" data-wa="' + esc(o.id) + '" data-wa-tipe="' +
            (p.tipe === 'telat' ? 'TAGIH_TELAT' : (p.tipe === 'ambil' ? 'ORDER_BARU' : 'INGAT_KEMBALI')) + '">' +
            Z.Ikon('wa', 15) + (p.tipe === 'telat' ? 'Tagih via WA' : 'Chat WA') + '</button>' +
          (p.tipe === 'kembali' || p.tipe === 'telat'
            ? '<button class="btn btn-kecil btn-utama" data-selesai="' + esc(o.id) + '">' + Z.Ikon('check', 15) + 'Selesaikan</button>'
            : '<button class="btn btn-kecil btn-netral" data-order="' + esc(o.id) + '">Detail order</button>') +
        '</div></article>';
    }
    if (p.tipe === 'pajak') {
      const u = p.unitRef;
      const lewat = p.sisa < 0;
      return '<article class="kartu ord-kartu kartu-klik" data-unit="' + esc(u.id) + '">' +
        '<div class="ord-pita" style="background:' + (lewat ? 'var(--danger-terang)' : 'var(--warn-terang)') + '"></div>' +
        '<div class="ord-head">' + U.badge(lewat ? 'PAJAK TERLAMBAT' : 'PAJAK STNK', lewat ? 'danger' : 'warn', 'dokumen') +
        '<span class="plat">' + esc(u.plat) + '</span></div>' +
        '<div style="margin-top:8px"><div style="font-weight:700;font-size:14px">' + esc(u.nama) + '</div>' +
        '<div class="t-sm" style="color:' + (lewat ? 'var(--danger-terang)' : 'var(--warn-terang)') + '">' +
        (lewat ? 'Lewat ' + Math.abs(p.sisa) + ' hari dari jatuh tempo' : 'Jatuh tempo ' + Z.tglId(u.pajak) + ' (' + p.sisa + ' hari lagi)') +
        '</div></div></article>';
    }
    const u = p.unitRef;
    const lewat = p.sisa < 0;
    return '<article class="kartu ord-kartu kartu-klik" data-unit="' + esc(u.id) + '">' +
      '<div class="ord-pita" style="background:' + (lewat ? 'var(--danger-terang)' : 'var(--info-terang)') + '"></div>' +
      '<div class="ord-head">' + U.badge('SERVIS BERKALA', lewat ? 'danger' : 'info', 'perkakas') +
      '<span class="plat">' + esc(u.plat) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px">' +
      '<div><div style="font-weight:700;font-size:14px">' + esc(u.nama) + '</div>' +
      '<div class="t-sm" style="color:' + (lewat ? 'var(--danger)' : 'var(--teks-var)') + '">' +
      (lewat ? 'Lewat ' + Math.abs(p.sisa) + ' km dari jadwal servis' : 'Sisa ' + p.sisa + ' km menuju servis') + '</div></div>' +
      '<button class="btn btn-kecil btn-netral" data-servis-unit="' + esc(u.id) + '">Jadwalkan</button></div></article>';
  }

  /* ================================================================
   * HALAMAN: ORDER
   * ================================================================ */
  Hal.order = {
    judul: 'Order', nav: 'order',
    render: function () {
      const f = Z.Simpan.ambil('orderFilter', 'semua');
      const q = (global.App.cari || '').toLowerCase();
      const semua = (D().pesanan || []).slice().sort(function (a, b) {
        const pa = prioritasOrder(a), pb = prioritasOrder(b);
        if (pa !== pb) return pa - pb;
        return (b.tglOrder || '').localeCompare(a.tglOrder || '');
      });
      const hitung = {
        semua: semua.length,
        berjalan: semua.filter(function (o) { return o.status === 'Berjalan'; }).length,
        terlambat: semua.filter(function (o) { return statusEfektif(o) === 'Terlambat'; }).length,
        booking: semua.filter(function (o) { return o.status === 'Booking'; }).length,
        selesai: semua.filter(function (o) { return o.status === 'Selesai'; }).length,
        batal: semua.filter(function (o) { return o.status === 'Batal'; }).length
      };
      const daftar = semua.filter(function (o) {
        if (f === 'berjalan' && o.status !== 'Berjalan') return false;
        if (f === 'terlambat' && statusEfektif(o) !== 'Terlambat') return false;
        if (f === 'booking' && o.status !== 'Booking') return false;
        if (f === 'selesai' && o.status !== 'Selesai') return false;
        if (f === 'batal' && o.status !== 'Batal') return false;
        if (!q) return true;
        const u = unit(o.unit), c = pel(o.pelanggan);
        return (o.id + ' ' + (c.nama || '') + ' ' + (c.wa || '') + ' ' + (u.nama || '') + ' ' + (u.plat || ''))
          .toLowerCase().indexOf(q) >= 0;
      }).slice(0, 60);

      let html = '';
      html += '<section>' +
        '<div class="seksi-head"><div><h1 class="t-hero" style="font-size:22px">Manajemen Order</h1>' +
        '<div class="t-sm t-var">Kelola sewa motor & jadwal pengembalian armada</div></div>' +
        '<button class="ikon-btn" data-nav="kalender" title="Kalender ketersediaan">' + Z.Ikon('kalender', 21) + '</button></div>' +
        '<div class="btn-grid" style="margin-top:12px">' +
        '<button class="btn btn-utama" data-nav="order-baru">' + Z.Ikon('plus', 18) + 'Buat Order Baru</button>' +
        '<button class="btn btn-netral" data-aksi="ekspor-order">' + Z.Ikon('unduh', 18) + 'Ekspor CSV</button></div>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:8px">' + Pilih.tombol('order') + '</div>' +
      '</section>';

      html += '<section class="grid4">' +
        pilCounter('Semua', hitung.semua, '') +
        pilCounter('Aktif', hitung.berjalan, 'var(--ungu)') +
        pilCounter('Booking', hitung.booking, 'var(--info)') +
        pilCounter('Telat', hitung.terlambat, 'var(--danger)') +
      '</section>';

      html += '<section>' + kolomCari('Cari penyewa, plat, no. order…') +
        U.chips([
          { kunci: 'semua', teks: 'Semua', jumlah: hitung.semua },
          { kunci: 'berjalan', teks: 'Berjalan', jumlah: hitung.berjalan, titik: 'ungu' },
          { kunci: 'terlambat', teks: 'Terlambat', jumlah: hitung.terlambat, titik: 'danger', kelas: hitung.terlambat ? 'danger' : '' },
          { kunci: 'booking', teks: 'Booking', jumlah: hitung.booking, titik: 'info' },
          { kunci: 'selesai', teks: 'Selesai', jumlah: hitung.selesai, titik: 'ok' },
          { kunci: 'batal', teks: 'Batal', jumlah: hitung.batal }
        ], f, 'data-filter-order') + '</section>';

      html += '<section style="display:flex;flex-direction:column;gap:12px">' +
        (daftar.length ? daftar.map(kartuOrder).join('')
          : '<div class="kartu">' + U.kosong('order', 'Tidak ada order', 'Coba ubah filter atau kata kunci pencarian.') + '</div>') +
        '</section>';

      if (daftar.length) {
        html += '<div class="t-sm t-var" style="text-align:center;padding:6px 0 10px">Menampilkan ' +
          daftar.length + ' dari ' + semua.length + ' order</div>';
      }
      return html;
    },
    setelah: function (root) {
      Pilih.pasang(root, '[data-order]', 'data-order', {
        hal: 'order', atr: 'data-order', nama: 'order', aksi: 'order.hapusBanyak',
        peringatan: 'Order yang dihapus beserta baris keuangan yang menempel padanya akan hilang permanen. ' +
                    'Unit yang terkunci oleh order ini akan kembali tersedia.'
      });
      Z.$$('[data-filter-order]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          Z.Simpan.taruh('orderFilter', b.getAttribute('data-filter-order'));
          global.App.render();
        });
      });
      const eks = Z.$('[data-aksi="ekspor-order"]', root);
      if (eks) eks.addEventListener('click', eksporOrder);
    }
  };

  function prioritasOrder(o) {
    const s = statusEfektif(o);
    return { 'Terlambat': 0, 'Berjalan': 1, 'Booking': 2, 'Selesai': 3, 'Batal': 4 }[s] !== undefined
      ? { 'Terlambat': 0, 'Berjalan': 1, 'Booking': 2, 'Selesai': 3, 'Batal': 4 }[s] : 5;
  }

  function pilCounter(label, nilai, warna) {
    return '<div class="kartu kartu-rapat" style="text-align:center;padding:11px 6px">' +
      '<div class="t-cap t-var" style="font-size:10px">' + esc(label.toUpperCase()) + '</div>' +
      '<div class="t-kpi" style="font-size:20px;' + (warna ? 'color:' + warna : '') + '">' + nilai + '</div></div>';
  }

  function kolomCari(ph) {
    return '<div class="cari" style="margin-bottom:9px">' + Z.Ikon('cari', 19) +
      '<input type="search" id="kotakCari" placeholder="' + esc(ph) + '" value="' + esc(global.App.cari || '') + '" autocomplete="off">' +
      (global.App.cari ? '<button class="bersih" data-aksi="bersih-cari" aria-label="Hapus">' + Z.Ikon('x', 17) + '</button>' : '') +
      '</div>';
  }

  function kartuOrder(o) {
    const u = unit(o.unit), c = pel(o.pelanggan);
    const s = statusEfektif(o);
    const pita = { Terlambat: 'var(--danger)', Berjalan: 'var(--ungu)', Booking: 'var(--info)',
                   Selesai: 'var(--ok)', Batal: 'var(--outline)' }[s];
    const telat = hariTelat(o);
    const sisa = Math.max(0, o.total - o.dibayar);
    const sisaHari = o.status === 'Berjalan' ? Z.selisihHari(Z.hariIni(), o.kembali) : null;

    return '<article class="kartu ord-kartu kartu-klik" data-order="' + esc(o.id) + '">' +
      '<div class="ord-pita" style="background:' + pita + '"></div>' +
      '<div class="ord-head">' +
        '<div style="display:flex;align-items:center;gap:7px;min-width:0">' +
          '<span class="ord-id">#' + esc(o.id) + '</span>' +
          (c.tag === 'Langganan' ? U.badge('Langganan', 'kuning', 'bintang') : '') +
        '</div>' +
        (s === 'Terlambat' ? U.badge('TELAT ' + telat + ' HARI', 'danger', 'alert') : U.badgeOrder(s)) +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;gap:11px;margin-top:10px">' +
        '<div style="min-width:0;flex:1">' +
          '<div class="ord-nama">' + esc(c.nama || '-') + '</div>' +
          '<div class="t-sm t-var" style="display:flex;align-items:center;gap:5px;margin-top:2px">' +
            Z.Ikon(o.antar ? 'lokasi' : 'telp', 13) +
            '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            esc(o.antar ? (o.alamatAntar || 'Antar-jemput') : Z.hpCantik(c.wa) || '-') + '</span></div>' +
          '<div style="display:flex;align-items:center;gap:7px;margin-top:7px;flex-wrap:wrap">' +
            '<span style="font-weight:600;font-size:13px">' + esc(u.nama || '-') + '</span>' +
            '<span class="plat">' + esc(u.plat || '-') + '</span></div>' +
        '</div>' +
        '<div style="width:70px;flex:none;border-radius:13px;overflow:hidden">' +
          Z.fotoUnit(u.foto, { tinggi: 58, alt: u.nama }) + '</div>' +
      '</div>' +
      '<div class="kotak" style="margin-top:10px">' +
        '<div style="display:flex;justify-content:space-between;gap:8px">' +
          '<span class="t-cap t-var">' + (s === 'Selesai' ? 'PERIODE SEWA' : 'PENGEMBALIAN') + '</span>' +
          '<span class="t-cap" style="color:' + (s === 'Terlambat' ? 'var(--danger)' : (sisaHari === 0 ? 'var(--warn)' : 'var(--teks-var)')) + '">' +
            (s === 'Terlambat' ? 'Jatuh tempo lewat!' :
              (sisaHari === 0 ? 'Hari ini' : (sisaHari > 0 ? 'Sisa ' + sisaHari + ' hari' : o.durasi + ' hari'))) +
          '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:3px;font-size:12.5px;font-weight:500">' +
          Z.Ikon('kalender', 14) + esc(Z.tglId(o.mulai)) + ' → ' + esc(Z.tglId(o.kembali)) + ', ' + esc(o.jamKembali) + ' WIB</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-top:10px">' +
        '<div><div class="t-cap t-var">TOTAL</div>' +
          '<div class="t-rp">' + Z.rp(o.total) + ' ' + U.badgeBayar(o.statusBayar) + '</div></div>' +
        (telat > 0 ? '<div style="text-align:right"><div class="t-cap" style="color:var(--danger)">DENDA BERJALAN</div>' +
          '<div class="t-rp" style="color:var(--danger)">+' + Z.rp(dendaBerjalan(o)) + '</div></div>'
          : (sisa > 0 ? '<div style="text-align:right"><div class="t-cap" style="color:var(--warn)">SISA</div>' +
            '<div class="t-rp" style="color:var(--warn)">' + Z.rp(sisa) + '</div></div>' : '')) +
      '</div>' +
      '<div class="btn-grid" style="margin-top:11px">' + tombolOrder(o, s) + '</div>' +
    '</article>';
  }

  function tombolOrder(o, s) {
    if (s === 'Terlambat') {
      return '<button class="btn btn-kecil btn-hijau" data-wa="' + esc(o.id) + '" data-wa-tipe="TAGIH_TELAT">' +
        Z.Ikon('wa', 15) + 'Tagih (WA)</button>' +
        '<button class="btn btn-kecil btn-ink" data-selesai="' + esc(o.id) + '">Selesaikan / Denda</button>';
    }
    if (s === 'Berjalan') {
      return '<button class="btn btn-kecil btn-hijau" data-wa="' + esc(o.id) + '" data-wa-tipe="INGAT_KEMBALI">' +
        Z.Ikon('wa', 15) + 'Ingatkan</button>' +
        '<button class="btn btn-kecil btn-utama" data-selesai="' + esc(o.id) + '">' + Z.Ikon('check', 15) + 'Selesaikan</button>';
    }
    if (s === 'Booking') {
      return '<button class="btn btn-kecil btn-netral" data-wa="' + esc(o.id) + '" data-wa-tipe="ORDER_BARU">' +
        Z.Ikon('kirim', 15) + 'Konfirmasi WA</button>' +
        '<button class="btn btn-kecil btn-ink" data-mulai="' + esc(o.id) + '">' + Z.Ikon('kunci', 15) + 'Serah Terima</button>';
    }
    return '<button class="btn btn-kecil btn-netral" data-kwitansi="' + esc(o.id) + '">' + Z.Ikon('dokumen', 15) + 'Kwitansi</button>' +
      '<button class="btn btn-kecil btn-netral" data-order="' + esc(o.id) + '">Detail</button>';
  }

  function eksporOrder() {
    const rows = [['ID Order', 'Tanggal Order', 'Pelanggan', 'No WA', 'Unit', 'Plat', 'Mulai', 'Kembali',
                   'Durasi', 'Total', 'Dibayar', 'Status Bayar', 'Status Order']];
    (D().pesanan || []).forEach(function (o) {
      const u = unit(o.unit), c = pel(o.pelanggan);
      rows.push([o.id, o.tglOrder, c.nama || '', "'" + (c.wa || ''), u.nama || '', u.plat || '',
                 o.mulai, o.kembali, o.durasi, o.total, o.dibayar, o.statusBayar, o.status]);
    });
    unduhCsv(rows, 'order-zan-rental-' + Z.hariIni() + '.csv');
  }

  function unduhCsv(rows, nama) {
    const csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c === null || c === undefined ? '' : c).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nama;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    Z.toast('Berkas CSV diunduh.');
  }
  global.unduhCsv = unduhCsv;

  /* ================================================================
   * HALAMAN: BUAT / UBAH ORDER
   * ================================================================ */
  const FormOrder = { data: null, idSumber: null, cariUnit: '' };

  /* Daftar perlengkapan yang bisa dicentang — diatur pemilik di Pengaturan. */
  function lengkapOpsi() {
    try {
      const a = JSON.parse(global.App.set('PERLENGKAPAN_OPSI', '[]') || '[]');
      if (a && a.length) return a.map(function (x) { return { n: String(x.n || ''), j: Math.max(1, Z.num(x.j) || 1) }; })
        .filter(function (x) { return x.n; });
    } catch (e) {}
    return [{ n: 'Helm SNI', j: 2 }, { n: 'Jas Hujan', j: 2 }, { n: 'Jas Sepatu', j: 1 }];
  }
  function lengkapCari(f, nama) {
    for (let i = 0; i < f.perlengkapan.length; i++) if (f.perlengkapan[i].n === nama) return f.perlengkapan[i];
    return null;
  }

  Hal['order-baru'] = {
    judul: 'Buat Order', nav: 'order',

    /* Angka turunan — satu sumber kebenaran, dipakai render awal & tiap pembaruan. */
    hitung: function () {
      const f = FormOrder.data;
      const u = f.unit ? unit(f.unit) : null;
      const durasi = Math.max(1, Z.selisihHari(f.mulai, f.kembali));
      const hargaHari = u ? u.harga : 0;
      const sewa = hargaHari * durasi;
      const biayaAntar = f.antar ? Math.max(0, Z.num(f.biayaAntar)) : 0;
      const total = Math.max(0, sewa + biayaAntar - Z.num(f.diskon));
      return {
        u: u, c: f.pelanggan ? pel(f.pelanggan) : null,
        durasi: durasi, hargaHari: hargaHari, sewa: sewa, biayaAntar: biayaAntar, total: total,
        tersedia: Hitung.unitTersedia(f.mulai, f.kembali, f.id)
      };
    },

    /* Daftar unit (dipengaruhi tanggal + kotak cari). Kotak carinya sendiri
       berada DI LUAR wadah ini supaya fokus mengetik tidak pernah hilang. */
    htmlUnitList: function (h) {
      const f = FormOrder.data;
      const q = String(FormOrder.cariUnit || '').toLowerCase().trim();
      const hasil = !q ? h.tersedia : h.tersedia.filter(function (x) {
        return ((x.nama || '') + ' ' + (x.plat || '') + ' ' + (x.merek || '') + ' ' +
                (x.tipe || '')).toLowerCase().indexOf(q) >= 0;
      });
      if (!h.tersedia.length) {
        return U.kosong('motor', 'Tidak ada unit bebas',
          'Semua motor sudah dipesan pada rentang tanggal ini. Coba geser tanggalnya.');
      }
      if (!hasil.length) {
        return U.kosong('cari', 'Tidak ada yang cocok',
          'Tidak ada unit bebas yang cocok dengan "' + esc(FormOrder.cariUnit) + '".');
      }
      return hasil.map(function (x) { return pilihUnit(x, f.unit === x.id, h.durasi); }).join('');
    },

    htmlPerlengkapan: function () {
      const f = FormOrder.data;
      const opsi = lengkapOpsi();
      // Item kustom yang pernah ditambahkan pemilik ikut ditampilkan
      f.perlengkapan.forEach(function (p) {
        if (!opsi.some(function (o) { return o.n === p.n; })) opsi.push({ n: p.n, j: p.j });
      });
      return opsi.map(function (o) {
        const ada = lengkapCari(f, o.n);
        const jml = ada ? ada.j : o.j;
        return '<div class="lengkap-baris' + (ada ? ' on' : '') + '" data-lengkap="' + esc(o.n) + '">' +
          '<label class="lengkap-cek">' +
            '<input type="checkbox" data-lengkap-cek="' + esc(o.n) + '"' + (ada ? ' checked' : '') + '>' +
            '<span class="lengkap-nama">' + esc(o.n) + '</span>' +
          '</label>' +
          '<div class="stepper" role="group" aria-label="Jumlah ' + esc(o.n) + '">' +
            '<button type="button" class="stepper-b" data-lengkap-kurang="' + esc(o.n) + '" aria-label="Kurangi">−</button>' +
            '<span class="stepper-n" data-lengkap-jml="' + esc(o.n) + '">' + jml + '</span>' +
            '<button type="button" class="stepper-b" data-lengkap-tambah="' + esc(o.n) + '" aria-label="Tambah">+</button>' +
          '</div></div>';
      }).join('');
    },

    render: function (param) {
      const edit = param && param.id ? orderById(param.id) : null;
      if (!FormOrder.data || FormOrder.idSumber !== (edit ? edit.id : '_baru')) {
        FormOrder.idSumber = edit ? edit.id : '_baru';
        FormOrder.cariUnit = '';
        const antarBawaan = Z.num(global.App.set('BIAYA_ANTAR', 20000));
        FormOrder.data = edit ? {
          id: edit.id, pelanggan: edit.pelanggan, unit: edit.unit, mulai: edit.mulai, jamMulai: edit.jamMulai,
          kembali: edit.kembali, jamKembali: edit.jamKembali, antar: edit.antar, alamatAntar: edit.alamatAntar,
          biayaAntar: edit.biayaAntar !== undefined && edit.biayaAntar !== null ? Z.num(edit.biayaAntar) : antarBawaan,
          diskon: edit.diskon, deposit: edit.deposit, dibayar: edit.dibayar, metode: edit.metode,
          catatan: edit.catatan, status: edit.status,
          perlengkapan: (edit.perlengkapan || []).map(function (p) { return { n: p.n, j: Z.num(p.j) || 1 }; })
        } : {
          pelanggan: '', unit: '', mulai: Z.hariIni(), jamMulai: '09:00',
          kembali: Z.tambahHari(Z.hariIni(), 1), jamKembali: '09:00',
          antar: false, alamatAntar: '', biayaAntar: antarBawaan,
          diskon: 0, deposit: 0, dibayar: 0, metode: 'Tunai', catatan: '',
          perlengkapan: lengkapOpsi().slice(0, 2).map(function (o) { return { n: o.n, j: o.j }; })
        };
      }
      if (!FormOrder.data.perlengkapan) FormOrder.data.perlengkapan = [];
      const f = FormOrder.data;
      const h = this.hitung();
      const c = h.c, u = h.u;
      const langkah = !c ? 1 : (!u ? 2 : 3);

      let html = '';
      html += '<section>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<button class="ikon-btn" data-nav="order" aria-label="Kembali">' + Z.Ikon('panahKiri', 20) + '</button>' +
          '<div style="flex:1;min-width:0"><h1 class="t-judul">' + (f.id ? 'Ubah Order ' + esc(f.id) : 'Buat Order Baru') + '</h1>' +
          '<div class="t-sm t-var">Catat pesanan sewa lalu mulai langsung</div></div>' +
          (f.id ? '<span class="badge badge-ink">' + esc(f.id) + '</span>' : '') +
        '</div></section>';

      /* Stepper */
      html += '<section class="kartu kartu-rapat" id="oStepWrap">' + this.htmlStep(langkah) + '</section>';

      /* 1. Pelanggan */
      html += '<section class="kartu">' +
        '<div class="seksi-head"><div class="kiri"><span class="kpi-ikon">' + Z.Ikon('orang', 17) + '</span>' +
        '<div><div style="font-weight:700">Informasi Pelanggan</div><div class="t-sm t-var">Pilih kontak atau buat baru</div></div></div></div>' +
        '<div id="oPelanggan">' + this.htmlPelanggan(c) + '</div></section>';

      /* 2. Tanggal */
      html += '<section class="kartu">' +
        '<div class="seksi-head"><div class="kiri"><span class="kpi-ikon">' + Z.Ikon('kalender', 17) + '</span>' +
        '<div><div style="font-weight:700">Durasi & Jadwal Sewa</div><div class="t-sm t-var">Waktu pengambilan dan pengembalian</div></div></div></div>' +
        '<div class="grid2" style="margin-top:11px">' +
          '<div class="field" style="margin:0"><label>Mulai sewa</label>' +
            '<input class="inp" type="date" data-f="mulai" value="' + esc(f.mulai) + '">' +
            '<input class="inp" type="time" data-f="jamMulai" value="' + esc(f.jamMulai) + '" style="margin-top:6px"></div>' +
          '<div class="field" style="margin:0"><label>Selesai sewa</label>' +
            '<input class="inp" type="date" data-f="kembali" value="' + esc(f.kembali) + '" min="' + esc(Z.tambahHari(f.mulai, 1)) + '">' +
            '<input class="inp" type="time" data-f="jamKembali" value="' + esc(f.jamKembali) + '" style="margin-top:6px"></div>' +
        '</div>' +
        '<div class="pita-durasi">' +
          '<span style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px">' + Z.Ikon('jam', 18) + 'Total durasi sewa</span>' +
          '<span class="pita-durasi-n" id="nDurasi">' + h.durasi + ' hari (' + (h.durasi * 24) + ' jam)</span></div>';

      /* Antar-jemput — tarif bisa diubah tiap order, boleh digratiskan */
      if (global.App.set('FITUR_ANTAR', 'YA') === 'YA') {
        html += '<div class="kotak" style="margin-top:11px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
            '<div style="display:flex;align-items:center;gap:9px;min-width:0">' +
              '<span class="kpi-ikon" style="width:30px;height:30px;border-radius:9px">' + Z.Ikon('lokasi', 16) + '</span>' +
              '<div><div style="font-weight:600;font-size:12.5px">Layanan Antar-Jemput</div>' +
              '<div class="t-sm t-var" style="font-size:10.5px">Motor diantar ke lokasi pelanggan</div></div></div>' +
            '<label class="switch"><input type="checkbox" data-f="antar"' + (f.antar ? ' checked' : '') + '><i></i></label>' +
          '</div>' +
          '<div id="oAntarDetail" style="margin-top:9px' + (f.antar ? '' : ';display:none') + '">' +
            '<div class="field" style="margin:0"><label>Alamat antar / jemput</label>' +
              '<input class="inp" data-f="alamatAntar" placeholder="Contoh: Stasiun Jember, pintu keluar barat" value="' + esc(f.alamatAntar) + '"></div>' +
            '<div class="field" style="margin:9px 0 0"><label>Tarif antar-jemput order ini</label>' +
              '<div class="inp-rp"><span>Rp</span>' +
                '<input type="number" data-f="biayaAntar" min="0" step="5000" value="' + Z.num(f.biayaAntar) + '" placeholder="0"></div>' +
              '<div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">' +
                '<button type="button" class="chip" data-antar-cepat="0">Gratis</button>' +
                '<button type="button" class="chip" data-antar-cepat="10000">Rp 10rb</button>' +
                '<button type="button" class="chip" data-antar-cepat="20000">Rp 20rb</button>' +
                '<button type="button" class="chip" data-antar-cepat="' + Z.num(global.App.set('BIAYA_ANTAR', 20000)) + '">Tarif standar</button>' +
              '</div>' +
              '<div class="t-sm t-var" style="margin-top:6px">Isi <b>0</b> bila digratiskan — kwitansi akan menulis “Gratis”.</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
      html += '</section>';

      /* 3. Unit + pencarian */
      html += '<section class="kartu">' +
        '<div class="seksi-head"><div class="kiri"><span class="kpi-ikon">' + Z.Ikon('motor', 17) + '</span>' +
        '<div><div style="font-weight:700">Pilih Unit Motor</div><div class="t-sm t-var">Ketersediaan nyata pada tanggal tersebut</div></div></div>' +
        '<span class="badge badge-netral" id="oUnitJml">' + h.tersedia.length + ' unit</span></div>' +
        '<div class="cari" style="margin-top:11px">' + Z.Ikon('cari', 18) +
          '<input id="oCariUnit" placeholder="Cari nama motor atau plat (P …)" autocomplete="off" value="' + esc(FormOrder.cariUnit) + '">' +
          '<button type="button" class="cari-x" id="oCariUnitX" aria-label="Hapus pencarian"' +
            (FormOrder.cariUnit ? '' : ' hidden') + '>' + Z.Ikon('x', 15) + '</button></div>' +
        '<div id="oUnitList" class="daftar-unit">' + this.htmlUnitList(h) + '</div></section>';

      /* 4. Perlengkapan dibawa */
      html += '<section class="kartu">' +
        '<div class="seksi-head"><div class="kiri"><span class="kpi-ikon">' + Z.Ikon('perisai', 17) + '</span>' +
        '<div><div style="font-weight:700">Perlengkapan Dibawa</div>' +
        '<div class="t-sm t-var">Ikut tercetak di kwitansi, struk, dan pesan WA</div></div></div>' +
        '<span class="badge badge-netral" id="oLengkapJml">' + f.perlengkapan.length + ' item</span></div>' +
        '<div id="oLengkap" class="lengkap-daftar">' + this.htmlPerlengkapan() + '</div>' +
        '<button type="button" class="btn btn-netral btn-blok btn-kecil" style="margin-top:9px" data-aksi="lengkap-baru">' +
          Z.Ikon('plus', 16) + 'Tambah perlengkapan lain</button>' +
      '</section>';

      /* 5. Biaya */
      html += '<section class="kartu">' +
        '<div class="seksi-head"><div class="kiri"><span class="kpi-ikon">' + Z.Ikon('dompet', 17) + '</span>' +
        '<div><div style="font-weight:700">Rincian Biaya & Deposit</div><div class="t-sm t-var">Perhitungan otomatis</div></div></div></div>' +
        '<div class="kotak" style="margin-top:11px">' +
          '<div class="baris"><span class="baris-l" id="nSewaLabel">Sewa ' + h.durasi + ' hari × ' + Z.rp(h.hargaHari) + '</span>' +
            '<span class="baris-n" id="nSewa">' + Z.rp(h.sewa) + '</span></div>' +
          '<div class="baris" id="nAntarBaris"' + (f.antar ? '' : ' hidden') + '>' +
            '<span class="baris-l">Layanan antar-jemput</span>' +
            '<span class="baris-n" id="nAntar">' + (h.biayaAntar ? Z.rp(h.biayaAntar) : 'Gratis') + '</span></div>' +
          '<div class="baris"><span class="baris-l">Diskon</span><span class="baris-n">' +
            '<input class="inp inp-angka-kecil" type="number" data-f="diskon" value="' + Z.num(f.diskon) + '" min="0" step="5000"></span></div>' +
          '<div class="baris-catat" id="nDiskonPeringatan" hidden>' + Z.Ikon('alert', 14) +
            '<span>Diskon melebihi subtotal — total dibulatkan ke Rp 0.</span></div>' +
          (global.App.set('FITUR_DEPOSIT', 'YA') === 'YA' ?
            '<div class="baris"><span class="baris-l">Deposit jaminan</span><span class="baris-n">' +
            '<input class="inp inp-angka-kecil" type="number" data-f="deposit" value="' + Z.num(f.deposit) + '" min="0" step="10000"></span></div>' : '') +
          '<div class="baris baris-total"><span class="baris-l" style="font-weight:600;color:var(--teks)">Total tagihan</span>' +
            '<span class="baris-n" id="nTotalBaris">' + Z.rp(h.total) + '</span></div>' +
        '</div>' +
        '<div class="kartu-gelap" style="border-radius:16px;padding:14px;margin-top:11px;display:flex;' +
          'align-items:center;justify-content:space-between;gap:10px">' +
          '<div><div class="t-cap" style="opacity:.7">TOTAL TAGIHAN</div>' +
          '<div class="t-sm" style="opacity:.65" id="nHeroKet">Termasuk BBM awal & perlengkapan</div></div>' +
          '<div class="t-hero" style="color:var(--aksen-teks)" id="nTotalHero">' + Z.rp(h.total) + '</div></div>' +
        '<div class="field" style="margin-top:13px"><label>Pembayaran diterima sekarang</label>' +
          '<div class="inp-rp"><span>Rp</span><input type="number" data-f="dibayar" value="' + Z.num(f.dibayar) +
          '" min="0" step="10000" placeholder="0"></div>' +
          '<div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">' +
            '<button type="button" class="chip" data-bayar="0">Belum bayar</button>' +
            '<button type="button" class="chip" data-bayar="100000">DP 100rb</button>' +
            '<button type="button" class="chip" id="chipLunas" data-bayar="' + h.total + '">Lunas ' + Z.rpSingkat(h.total) + '</button>' +
          '</div></div>' +
        '<div class="field"><label>Metode pembayaran</label>' +
          '<div class="pilih-grid" id="oMetode">' +
            Z.metodeBayarOpsi().concat(['Lainnya']).map(function (m) {
              return '<button type="button" class="pilih' + (f.metode === m ? ' on' : '') + '" data-metode="' + esc(m) + '">' +
                '<span class="j">' + esc(m) + '</span></button>';
            }).join('') + '</div></div>' +
        '<div class="field" style="margin-bottom:0"><label>Catatan kondisi unit / permintaan</label>' +
          '<textarea class="ta" data-f="catatan" maxlength="300" placeholder="Contoh: bensin 3 bar, diantar tepat jam 9 pagi…">' +
          esc(f.catatan) + '</textarea></div>' +
      '</section>';

      html += '<section class="kartu" style="position:sticky;bottom:12px;z-index:5">' +
        '<div id="oAksi">' + this.htmlAksi(!!c && !!u, f.id) + '</div>' +
        '<div class="t-sm t-var" style="text-align:center;margin-top:9px;display:flex;align-items:center;' +
          'justify-content:center;gap:6px">' + Z.Ikon('wa', 13) +
          'Draft konfirmasi WhatsApp otomatis disiapkan setelah disimpan</div>' +
      '</section>';

      return html;
    },

    /**
     * Bar proses. DOM-nya dibuat SEKALI lalu hanya kelasnya yang berubah —
     * kalau di-innerHTML ulang setiap isian berubah, elemennya diganti baru
     * sehingga tidak ada transisi CSS yang bisa berjalan (terlihat berkedip).
     */
    htmlStep: function (langkah) {
      // [nomor, label panjang, label pendek untuk layar sempit]
      const L = [[1, 'Pelanggan', 'Pelanggan'], [2, 'Unit & Tanggal', 'Unit'], [3, 'Biaya & Bayar', 'Biaya']];
      return '<div class="ord-step" data-langkah="' + langkah + '">' +
        L.map(function (x, i) {
          const kead = x[0] < langkah ? ' selesai' : (x[0] === langkah ? ' aktif' : '');
          const garis = i > 0
            ? '<i class="ord-step-garis' + (langkah > i ? ' isi' : '') + '"><b></b></i>'
            : '';
          return garis +
            '<button type="button" class="ord-step-item' + kead + '" data-lompat="' + x[0] +
              '" aria-label="Ke langkah ' + x[1] + '">' +
              '<span class="ord-step-bul">' +
                '<span class="ord-step-no">' + x[0] + '</span>' +
                '<span class="ord-step-ok">' + Z.Ikon('check', 14) + '</span>' +
              '</span>' +
              '<span class="ord-step-teks"><span class="pjg">' + esc(x[1]) + '</span>' +
                '<span class="pdk">' + esc(x[2]) + '</span></span>' +
            '</button>';
        }).join('') +
      '</div>';
    },

    /** Perbarui bar proses tanpa menggambar ulang (supaya animasinya jalan). */
    segarStep: function (root, langkah) {
      const el = (root || document).querySelector('.ord-step');
      if (!el) return;
      const lama = Z.num(el.getAttribute('data-langkah')) || 1;
      el.setAttribute('data-langkah', langkah);
      Z.$$('.ord-step-item', el).forEach(function (it) {
        const n = Z.num(it.getAttribute('data-lompat'));
        it.classList.toggle('selesai', n < langkah);
        it.classList.toggle('aktif', n === langkah);
        // Denyut kecil hanya pada langkah yang BARU saja rampung.
        if (n < langkah && n >= lama) {
          it.classList.remove('baru-selesai');
          void it.offsetWidth;                 // paksa ulang animasi
          it.classList.add('baru-selesai');
        }
      });
      Z.$$('.ord-step-garis', el).forEach(function (g, i) {
        g.classList.toggle('isi', langkah > i + 1);
      });
    },

    htmlPelanggan: function (c) {
      if (c && c.id) {
        return '<div class="kotak" style="margin-top:11px;display:flex;flex-direction:column;gap:9px">' +
          '<div style="display:flex;align-items:center;gap:11px">' +
            U.avatar(c.nama) +
            '<div style="flex:1;min-width:0">' +
              '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
                '<b style="font-size:14px">' + esc(c.nama) + '</b>' +
                (c.tag === 'Langganan' ? U.badge('Langganan ' + c.totalSewa + 'x', 'kuning', 'bintang') :
                  (c.tag === 'Bermasalah' ? U.badge('Perlu perhatian', 'danger', 'alert') : U.badge('Baru', 'info'))) +
              '</div>' +
              '<div class="t-sm t-var">' + esc(Z.hpCantik(c.wa) || 'Nomor WA belum ada') + ' • ' + esc(c.asal || c.alamat || '-') + '</div>' +
            '</div>' +
            '<button class="ikon-btn" data-aksi="ganti-pelanggan" aria-label="Ganti">' + Z.Ikon('sinkron', 18) + '</button>' +
          '</div>' +
          '<div class="grid2" style="gap:8px">' +
            miniInfo('perisai', 'Status KYC', c.kyc || 'Belum', c.kyc === 'Lengkap' ? 'var(--ok)' : 'var(--warn)') +
            miniInfo('bintang', 'Riwayat sewa', c.totalSewa + 'x • ' + Z.rpSingkat(c.totalBelanja), '') +
          '</div></div>';
      }
      return '<button class="btn btn-netral btn-blok" style="margin-top:11px" data-aksi="pilih-pelanggan">' +
        Z.Ikon('cari', 18) + 'Pilih pelanggan terdaftar</button>' +
        '<button class="btn btn-ink btn-blok" style="margin-top:8px" data-aksi="pelanggan-baru">' +
        Z.Ikon('plus', 18) + 'Pelanggan baru</button>';
    },

    htmlAksi: function (siap, id) {
      const off = siap ? '' : ' disabled';
      return '<button class="btn btn-utama btn-blok" data-aksi="simpan-order"' + off + '>' +
        Z.Ikon('kirim', 18) + (id ? 'Simpan Perubahan' : 'Simpan & Mulai Sewa') + '</button>' +
        '<div class="btn-grid" style="margin-top:9px">' +
          '<button class="btn btn-kecil btn-netral" data-aksi="simpan-booking"' + off + '>' +
          Z.Ikon('kalender', 15) + 'Simpan sebagai Booking</button>' +
          '<button class="btn btn-kecil btn-netral" data-aksi="reset-order">' + Z.Ikon('sinkron', 15) + 'Reset form</button>' +
        '</div>';
    },

    /**
     * Pembaruan BEDAH. Hanya menulis ulang angka dan daftar yang benar-benar
     * berubah — tidak pernah menyentuh elemen <input>. Inilah sebabnya mengetik
     * di kolom diskon atau tarif antar tidak lagi memutus fokus dan tidak berkedip.
     */
    segar: function (root, apa) {
      apa = apa || {};
      const diri = this, f = FormOrder.data, h = this.hitung();
      const $ = function (s) { return Z.$(s, root); };
      const set = function (sel, teks) { const e = $(sel); if (e) e.textContent = teks; };

      set('#nDurasi', h.durasi + ' hari (' + (h.durasi * 24) + ' jam)');
      set('#nSewaLabel', 'Sewa ' + h.durasi + ' hari × ' + Z.rp(h.hargaHari));
      set('#nSewa', Z.rp(h.sewa));
      set('#nAntar', h.biayaAntar ? Z.rp(h.biayaAntar) : 'Gratis');
      set('#nTotalBaris', Z.rp(h.total));
      set('#nTotalHero', Z.rp(h.total));
      const barisAntar = $('#nAntarBaris');
      if (barisAntar) barisAntar.hidden = !f.antar;
      const detailAntar = $('#oAntarDetail');
      if (detailAntar) detailAntar.style.display = f.antar ? '' : 'none';
      const chip = $('#chipLunas');
      if (chip) { chip.setAttribute('data-bayar', h.total); chip.textContent = 'Lunas ' + Z.rpSingkat(h.total); }
      set('#oUnitJml', h.tersedia.length + ' unit');
      set('#oLengkapJml', f.perlengkapan.length + ' item');

      // Diskon yang melampaui subtotal dibulatkan ke 0 oleh perhitungan —
      // katakan terus terang daripada membiarkan total diam-diam jadi Rp 0.
      const peringatan = $('#nDiskonPeringatan');
      if (peringatan) peringatan.hidden = Z.num(f.diskon) <= (h.sewa + h.biayaAntar);

      this.segarStep(root, !h.c ? 1 : (!h.u ? 2 : 3));

      const aksiEl = $('#oAksi');
      if (aksiEl) { aksiEl.innerHTML = this.htmlAksi(!!h.c && !!h.u, f.id); diri.ikatAksi(root); }

      if (apa.pelanggan) {
        const pe = $('#oPelanggan');
        if (pe) { pe.innerHTML = this.htmlPelanggan(h.c); diri.ikatPelanggan(root); }
      }
      if (apa.unit) {
        const ue = $('#oUnitList');
        if (ue) { ue.innerHTML = this.htmlUnitList(h); diri.ikatUnit(root); }
      }
      if (apa.lengkap) {
        const le = $('#oLengkap');
        if (le) { le.innerHTML = this.htmlPerlengkapan(); diri.ikatLengkap(root); }
      }
    },

    ikatUnit: function (root) {
      const diri = this, f = FormOrder.data;
      Z.$$('[data-unit-pilih]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          f.unit = b.getAttribute('data-unit-pilih');
          diri.segar(root, { unit: true });
        });
      });
    },

    ikatPelanggan: function (root) {
      const diri = this, f = FormOrder.data;
      const gp = Z.$('[data-aksi="ganti-pelanggan"]', root) || Z.$('[data-aksi="pilih-pelanggan"]', root);
      if (gp) gp.addEventListener('click', function () {
        pilihPelangganSheet(function (id) { f.pelanggan = id; diri.segar(root, { pelanggan: true }); });
      });
      const pb = Z.$('[data-aksi="pelanggan-baru"]', root);
      if (pb) pb.addEventListener('click', function () {
        Hal.pelanggan.form(null, function (id) { f.pelanggan = id; diri.segar(root, { pelanggan: true }); });
      });
    },

    ikatLengkap: function (root) {
      const diri = this, f = FormOrder.data;
      Z.$$('[data-lengkap-cek]', root).forEach(function (cb) {
        cb.addEventListener('change', function () {
          const nama = cb.getAttribute('data-lengkap-cek');
          const baris = cb.closest('.lengkap-baris');
          if (cb.checked) {
            const jml = Z.num((Z.$('[data-lengkap-jml="' + nama.replace(/"/g, '\\"') + '"]', root) || {}).textContent) || 1;
            if (!lengkapCari(f, nama)) f.perlengkapan.push({ n: nama, j: jml });
          } else {
            f.perlengkapan = f.perlengkapan.filter(function (p) { return p.n !== nama; });
          }
          if (baris) baris.classList.toggle('on', cb.checked);
          diri.segar(root, {});
        });
      });
      function ubahJml(nama, delta) {
        const el = Z.$('[data-lengkap-jml="' + nama.replace(/"/g, '\\"') + '"]', root);
        if (!el) return;
        let j = Math.min(20, Math.max(1, (Z.num(el.textContent) || 1) + delta));
        el.textContent = j;                                   // hanya angkanya yang ditulis ulang
        const ada = lengkapCari(f, nama);
        if (ada) ada.j = j;
        else {
          const cb = Z.$('[data-lengkap-cek="' + nama.replace(/"/g, '\\"') + '"]', root);
          if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); const a2 = lengkapCari(f, nama); if (a2) a2.j = j; }
        }
      }
      Z.$$('[data-lengkap-tambah]', root).forEach(function (b) {
        b.addEventListener('click', function () { ubahJml(b.getAttribute('data-lengkap-tambah'), 1); });
      });
      Z.$$('[data-lengkap-kurang]', root).forEach(function (b) {
        b.addEventListener('click', function () { ubahJml(b.getAttribute('data-lengkap-kurang'), -1); });
      });
    },

    ikatAksi: function (root) {
      const simpan = Z.$('[data-aksi="simpan-order"]', root);
      if (simpan) simpan.addEventListener('click', function () { simpanOrder('Berjalan'); });
      const booking = Z.$('[data-aksi="simpan-booking"]', root);
      if (booking) booking.addEventListener('click', function () { simpanOrder('Booking'); });
      const reset = Z.$('[data-aksi="reset-order"]', root);
      if (reset) reset.addEventListener('click', function () {
        Z.konfirmasi({
          judul: 'Reset form?', pesan: 'Semua isian pada form ini akan dikosongkan.',
          ya: 'Ya, reset', bahaya: false
        }).then(function (setuju) {
          if (!setuju) return;
          FormOrder.data = null; FormOrder.idSumber = null; FormOrder.cariUnit = '';
          global.App.render();
        });
      });
    },

    setelah: function (root) {
      const diri = this, f = FormOrder.data;

      Z.$$('[data-f]', root).forEach(function (inp) {
        const k = inp.getAttribute('data-f');
        const ev = (inp.type === 'checkbox' || inp.type === 'date' || inp.type === 'time') ? 'change' : 'input';
        inp.addEventListener(ev, function () {
          f[k] = inp.type === 'checkbox' ? inp.checked : inp.value;
          if (k === 'mulai' && f.kembali <= f.mulai) {
            f.kembali = Z.tambahHari(f.mulai, 1);
            const ik = Z.$('[data-f="kembali"]', root);
            if (ik) { ik.value = f.kembali; ik.min = Z.tambahHari(f.mulai, 1); }
          }
          // Hanya tanggal yang mengubah daftar ketersediaan unit.
          diri.segar(root, { unit: k === 'mulai' || k === 'kembali' });
        });
      });

      /* Pencarian unit — kotaknya di luar wadah daftar, jadi fokus tidak hilang. */
      const cari = Z.$('#oCariUnit', root), cariX = Z.$('#oCariUnitX', root);
      if (cari) {
        let jeda = null;
        cari.addEventListener('input', function () {
          FormOrder.cariUnit = cari.value;
          if (cariX) cariX.hidden = !cari.value;
          clearTimeout(jeda);
          jeda = setTimeout(function () { diri.segar(root, { unit: true }); }, 140);
        });
      }
      if (cariX) cariX.addEventListener('click', function () {
        FormOrder.cariUnit = ''; cari.value = ''; cariX.hidden = true;
        diri.segar(root, { unit: true }); cari.focus();
      });

      Z.$$('[data-antar-cepat]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          f.biayaAntar = Z.num(b.getAttribute('data-antar-cepat'));
          const inp = Z.$('[data-f="biayaAntar"]', root);
          if (inp) inp.value = f.biayaAntar;
          diri.segar(root, {});
        });
      });

      Z.$$('[data-metode]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          f.metode = b.getAttribute('data-metode');
          Z.$$('[data-metode]', root).forEach(function (x) { x.classList.toggle('on', x === b); });
        });
      });
      Z.$$('[data-bayar]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          f.dibayar = Z.num(b.getAttribute('data-bayar'));
          const inp = Z.$('[data-f="dibayar"]', root);
          if (inp) inp.value = f.dibayar;
        });
      });

      const tambahLengkap = Z.$('[data-aksi="lengkap-baru"]', root);
      if (tambahLengkap) tambahLengkap.addEventListener('click', function () {
        Z.tanya({
          judul: 'Tambah perlengkapan', label: 'Nama perlengkapan',
          placeholder: 'Contoh: Box Belakang', maks: 40
        }).then(function (nama) {
          nama = String(nama || '').trim();
          if (!nama) return;
          if (lengkapCari(f, nama)) return Z.toast('“' + nama + '” sudah ada di daftar.', 'err');
          f.perlengkapan.push({ n: nama, j: 1 });
          diri.segar(root, { lengkap: true });
          Z.toast('“' + nama + '” ditambahkan.');
        });
      });

      /* Klik pada sebuah langkah menggulirkan ke bagian isiannya. Bar proses
         jadi alat bantu navigasi, bukan sekadar hiasan penunjuk posisi. */
      Z.$$('[data-lompat]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          const n = Z.num(b.getAttribute('data-lompat'));
          const tujuan = root.querySelectorAll('section.kartu');
          // 0 = bar proses, 1 = pelanggan, 2 = unit & tanggal, sisanya biaya
          const idx = n === 1 ? 1 : (n === 2 ? 2 : tujuan.length - 1);
          const el = tujuan[Math.min(idx, tujuan.length - 1)];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      diri.ikatUnit(root);
      diri.ikatPelanggan(root);
      diri.ikatLengkap(root);
      diri.ikatAksi(root);
    }
  };

  function step(no, teks, keadaan) {
    const warna = keadaan === 'selesai' ? 'var(--ok-bg)' : (keadaan === 'aktif' ? 'var(--kuning)' : 'var(--c)');
    const warnaT = keadaan === 'selesai' ? 'var(--ok)' : (keadaan === 'aktif' ? '#0B0B0F' : 'var(--teks-var)');
    return '<div style="display:flex;align-items:center;gap:7px;min-width:0;opacity:' + (keadaan ? 1 : .55) + '">' +
      '<span style="width:26px;height:26px;border-radius:50%;background:' + warna + ';color:' + warnaT +
      ';display:grid;place-items:center;font-size:11.5px;font-weight:700;flex:none">' +
      (keadaan === 'selesai' ? Z.Ikon('check', 14) : no) + '</span>' +
      '<div style="min-width:0"><div style="font-size:11px;font-weight:700;line-height:1.2">' + esc(teks) + '</div></div></div>';
  }

  function miniInfo(ikon, label, nilai, warna) {
    return '<div style="background:var(--kartu);border-radius:11px;padding:8px 10px;display:flex;align-items:center;gap:8px">' +
      '<span style="color:' + (warna || 'var(--teks-var)') + '">' + Z.Ikon(ikon, 16) + '</span>' +
      '<div style="min-width:0"><div class="t-cap t-var" style="font-size:9.5px">' + esc(label.toUpperCase()) + '</div>' +
      '<div style="font-size:11.5px;font-weight:600;color:' + (warna || 'var(--teks)') + ';white-space:nowrap;' +
      'overflow:hidden;text-overflow:ellipsis">' + esc(nilai) + '</div></div></div>';
  }

  function pilihUnit(u, terpilih, durasi) {
    return '<button class="kotak" data-unit-pilih="' + esc(u.id) + '" style="display:block;width:100%;text-align:left;' +
      'border:1.5px solid ' + (terpilih ? 'var(--kuning)' : 'transparent') + ';' +
      (terpilih ? 'background:linear-gradient(100deg,rgba(255,230,0,.16),transparent);' : '') + 'transition:all .18s">' +
      '<div style="display:flex;align-items:center;gap:11px">' +
        '<div style="width:72px;flex:none;border-radius:11px;overflow:hidden">' +
          Z.fotoUnit(u.foto, { tinggi: 54, alt: u.nama }) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:13px;line-height:1.25">' + esc(u.nama) + '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap">' +
            '<span class="plat" style="font-size:10.5px">' + esc(u.plat) + '</span>' +
            U.badge('Tersedia', 'ok') + '</div>' +
          '<div class="t-sm t-var" style="margin-top:4px">' + esc(u.tipe || '') +
            (u.tahun ? ' • ' + esc(u.tahun) : '') + '</div>' +
        '</div>' +
        '<div style="text-align:right;flex:none">' +
          '<div class="t-rp">' + Z.rp(u.harga) + '</div>' +
          '<div class="t-sm t-var">/hari</div>' +
          '<div class="t-sm" style="color:var(--ungu);font-weight:600;margin-top:2px">' + Z.rpSingkat(u.harga * durasi) + '</div>' +
        '</div>' +
        '<span style="width:24px;height:24px;border-radius:50%;flex:none;display:grid;place-items:center;' +
          'background:' + (terpilih ? 'var(--ink)' : 'var(--c-high)') + ';color:' + (terpilih ? 'var(--aksen-teks)' : 'transparent') + '">' +
          Z.Ikon('check', 14) + '</span>' +
      '</div></button>';
  }

  async function simpanOrder(status) {
    const f = FormOrder.data;
    if (!f.pelanggan) return Z.toast('Pilih pelanggan dulu.', 'err');
    if (!f.unit) return Z.toast('Pilih unit motor dulu.', 'err');
    if (f.kembali <= f.mulai) return Z.toast('Tanggal kembali harus setelah tanggal mulai.', 'err');
    const u = unit(f.unit);
    const r = await global.App.kirim('order.simpan', {
      id: f.id || '', pelanggan: f.pelanggan, unit: f.unit, mulai: f.mulai, jamMulai: f.jamMulai,
      kembali: f.kembali, jamKembali: f.jamKembali, hargaHari: u.harga, antar: f.antar,
      alamatAntar: f.alamatAntar,
      biayaAntar: f.antar ? Math.max(0, Z.num(f.biayaAntar)) : 0,
      perlengkapan: (f.perlengkapan || []).map(function (p) { return { n: p.n, j: Z.num(p.j) || 1 }; }),
      diskon: Z.num(f.diskon), deposit: Z.num(f.deposit), dibayar: Z.num(f.dibayar),
      metode: f.metode, catatan: f.catatan, status: status
    });
    if (!r.success) return;
    FormOrder.data = null; FormOrder.idSumber = null;
    await global.App.muatUlang(true);
    global.App.ke('order');
    setTimeout(function () { global.Hal.detailOrder(r.data.id, true); }, 220);
  }

  function pilihPelangganSheet(pilih) {
    const daftar = (D().pelanggan || []).slice().sort(function (a, b) {
      return (b.terakhir || '').localeCompare(a.terakhir || '');
    });
    const isi = '<div class="cari" style="margin-bottom:10px">' + Z.Ikon('cari', 19) +
      '<input id="cariPel" placeholder="Cari nama atau nomor WA…" autocomplete="off"></div>' +
      '<div id="daftarPel" style="display:flex;flex-direction:column;gap:7px;max-height:50vh;overflow-y:auto"></div>';
    const wrap = Z.Sheet.buka({ judul: 'Pilih Pelanggan', ikon: 'orang', isi: isi,
      aksi: '<button class="btn btn-netral" data-batal>Batal</button>' +
            '<button class="btn btn-ink" data-baru>' + Z.Ikon('plus', 16) + 'Pelanggan Baru</button>' });

    function gambar(q) {
      const el = Z.$('#daftarPel', wrap);
      const hasil = daftar.filter(function (p) {
        if (!q) return true;
        return (p.nama + ' ' + p.wa + ' ' + (p.asal || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0;
      }).slice(0, 40);
      el.innerHTML = hasil.length ? hasil.map(function (p) {
        return '<button class="kotak" data-pel="' + esc(p.id) + '" style="display:flex;align-items:center;gap:10px;' +
          'width:100%;text-align:left">' + U.avatar(p.nama, 'avatar-kecil') +
          '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">' + esc(p.nama) + '</div>' +
          '<div class="t-sm t-var">' + esc(Z.hpCantik(p.wa) || '-') + ' • ' + p.totalSewa + 'x sewa</div></div>' +
          (p.tag === 'Langganan' ? U.badge('Langganan', 'kuning') : (p.tag === 'Bermasalah' ? U.badge('!', 'danger') : '')) +
          '</button>';
      }).join('') : U.kosong('orang', 'Tidak ditemukan', 'Coba kata kunci lain, atau buat pelanggan baru.');
      Z.$$('[data-pel]', el).forEach(function (b) {
        b.addEventListener('click', function () { Z.Sheet.tutup(); pilih(b.getAttribute('data-pel')); });
      });
    }
    gambar('');
    Z.$('#cariPel', wrap).addEventListener('input', function (e) { gambar(e.target.value); });
    Z.$('[data-batal]', wrap).addEventListener('click', function () { Z.Sheet.tutup(); });
    Z.$('[data-baru]', wrap).addEventListener('click', function () {
      Z.Sheet.tutup();
      setTimeout(function () { Hal.pelanggan.form(null, pilih); }, 250);
    });
  }
  global.pilihPelangganSheet = pilihPelangganSheet;

  /* ================================================================
   * HALAMAN: ARMADA
   * ================================================================ */
  Hal.armada = {
    judul: 'Armada', nav: 'armada',
    render: function () {
      const f = Z.Simpan.ambil('armadaFilter', 'semua');
      const tampilan = Z.Simpan.ambil('armadaTampilan', 'grid');
      const q = (global.App.cari || '').toLowerCase();
      const units = (D().units || []).filter(function (u) { return u.aktif; });
      const hari = Z.hariIni();
      const batasPajak = Z.num(global.App.set('INGAT_PAJAK_HARI', 14));

      const hitung = {
        semua: units.length,
        tersedia: units.filter(function (u) { return u.status === 'Tersedia'; }).length,
        disewa: units.filter(function (u) { return u.status === 'Disewa'; }).length,
        servis: units.filter(function (u) { return u.status === 'Servis'; }).length,
        pajak: units.filter(function (u) { return u.pajak && Z.selisihHari(hari, u.pajak) <= batasPajak; }).length
      };
      const daftar = units.filter(function (u) {
        if (f === 'tersedia' && u.status !== 'Tersedia') return false;
        if (f === 'disewa' && u.status !== 'Disewa') return false;
        if (f === 'servis' && u.status !== 'Servis') return false;
        if (f === 'pajak' && !(u.pajak && Z.selisihHari(hari, u.pajak) <= batasPajak)) return false;
        if (!q) return true;
        return (u.nama + ' ' + u.plat + ' ' + u.merek + ' ' + u.tipe).toLowerCase().indexOf(q) >= 0;
      });

      let html = '';
      html += '<section><div class="seksi-head">' +
        '<div><h1 class="t-hero" style="font-size:22px">Katalog Armada</h1>' +
        '<div class="t-sm t-var">Pantau ketersediaan, performa & jadwal servis</div></div>' +
        '<span class="badge badge-ink">' + hitung.semua + ' motor</span></div>' +
        '<div class="btn-grid" style="margin-top:12px">' +
        '<button class="btn btn-utama" data-aksi="unit-baru">' + Z.Ikon('plus', 18) + 'Tambah Motor</button>' +
        '<button class="btn btn-netral" data-aksi="ekspor-unit">' + Z.Ikon('unduh', 18) + 'Laporan CSV</button></div>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:8px">' + Pilih.tombol('armada') + '</div></section>';

      html += '<section class="grid4">' +
        pilCounter('Total', hitung.semua, '') +
        pilCounter('Tersedia', hitung.tersedia, 'var(--ok)') +
        pilCounter('Disewa', hitung.disewa, 'var(--ungu)') +
        pilCounter('Servis', hitung.servis, 'var(--warn)') + '</section>';

      html += '<section>' +
        '<div style="display:flex;gap:9px;align-items:center">' +
          '<div style="flex:1">' + kolomCari('Cari motor atau plat (P …)') + '</div>' +
          '<div class="seg" style="width:88px;flex:none;margin-bottom:9px">' +
            '<button data-tampilan="grid"' + (tampilan === 'grid' ? ' class="on"' : '') + ' aria-label="Grid">' + Z.Ikon('grid', 16) + '</button>' +
            '<button data-tampilan="list"' + (tampilan === 'list' ? ' class="on"' : '') + ' aria-label="List">' + Z.Ikon('daftar', 16) + '</button>' +
          '</div></div>' +
        U.chips([
          { kunci: 'semua', teks: 'Semua', jumlah: hitung.semua },
          { kunci: 'tersedia', teks: 'Tersedia', jumlah: hitung.tersedia, titik: 'ok' },
          { kunci: 'disewa', teks: 'Sedang Disewa', jumlah: hitung.disewa, titik: 'ungu' },
          { kunci: 'servis', teks: 'Jadwal Servis', jumlah: hitung.servis, titik: 'warn' },
          { kunci: 'pajak', teks: 'Pajak Dekat', jumlah: hitung.pajak, titik: 'danger' }
        ], f, 'data-filter-armada') + '</section>';

      html += '<section class="' + (tampilan === 'grid' ? 'unit-grid' : '') + '" ' +
        'style="display:' + (tampilan === 'grid' ? 'grid' : 'flex') + ';flex-direction:column;gap:14px">' +
        (daftar.length ? daftar.map(function (u) {
          return tampilan === 'grid' ? kartuUnit(u) : barisUnit(u);
        }).join('') : '<div class="kartu">' + U.kosong('motor', 'Tidak ada unit', 'Ubah filter atau tambahkan motor baru.') + '</div>') +
        '</section>';

      html += '<div class="t-sm t-var" style="text-align:center;padding:4px 0 10px">Menampilkan ' +
        daftar.length + ' dari ' + hitung.semua + ' armada</div>';
      return html;
    },
    setelah: function (root) {
      Pilih.pasang(root, '[data-unit]', 'data-unit', {
        hal: 'armada', atr: 'data-unit', nama: 'unit motor', aksi: 'unit.hapusBanyak',
        peringatan: 'Unit yang masih punya order Booking atau Berjalan akan dilewati secara otomatis.'
      });
      Z.$$('[data-filter-armada]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          Z.Simpan.taruh('armadaFilter', b.getAttribute('data-filter-armada'));
          global.App.render();
        });
      });
      Z.$$('[data-tampilan]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          Z.Simpan.taruh('armadaTampilan', b.getAttribute('data-tampilan'));
          global.App.render();
        });
      });
      const tb = Z.$('[data-aksi="unit-baru"]', root);
      if (tb) tb.addEventListener('click', function () { Hal.armada.form(null); });
      const ek = Z.$('[data-aksi="ekspor-unit"]', root);
      if (ek) ek.addEventListener('click', function () {
        const rows = [['ID', 'Nama', 'Plat', 'Tahun', 'Tipe', 'Harga/Hari', 'Status', 'Odometer', 'Pajak STNK',
                       'Kali Disewa', 'Pendapatan', 'Biaya Servis', 'Laba']];
        (D().units || []).forEach(function (u) {
          const s = Hitung.statUnit(u.id);
          rows.push([u.id, u.nama, u.plat, u.tahun, u.tipe, u.harga, u.status, u.odo, u.pajak,
                     s.sewa, s.hasil, s.biaya, s.laba]);
        });
        unduhCsv(rows, 'armada-zan-rental-' + Z.hariIni() + '.csv');
      });
    },

    /* Form tambah/ubah unit */
    form: function (id) {
      const u = id ? unit(id) : { nama: '', merek: 'Honda', plat: '', tahun: new Date().getFullYear(), tipe: 'Matic',
        harga: 100000, status: 'Tersedia', warna: '', odo: 0, pajak: '',
        foto: 'art:beat:#2E7D32', servisNext: 2000 };
      const seniPilihan = ['scoopy', 'nmax', 'vario', 'beat', 'pcx', 'aerox', 'fazzio', 'genio', 'mio', 'lexi', 'adv', 'supra', 'verza'];
      const warnaPilihan = ['#1F2430', '#C62828', '#1565C0', '#F2EDE3', '#2E7D32', '#F9A825', '#7E6B8F', '#0097A7', '#D84315', '#8D6E63'];
      const artNow = String(u.foto || 'art:beat:#2E7D32').split(':');

      const isi =
        '<div class="field"><label>Nama motor</label><input class="inp" data-u="nama" value="' + esc(u.nama) + '" placeholder="Honda Scoopy Prestige"></div>' +
        '<div class="grid2"><div class="field"><label>Merek</label><input class="inp" data-u="merek" value="' + esc(u.merek) + '"></div>' +
        '<div class="field"><label>Plat nomor</label><input class="inp" data-u="plat" value="' + esc(u.plat) + '" placeholder="P 1234 AB" style="text-transform:uppercase"></div></div>' +
        '<div class="grid2"><div class="field"><label>Tahun</label><input class="inp" type="number" data-u="tahun" value="' + Z.num(u.tahun) + '"></div>' +
        '<div class="field"><label>Harga / hari</label><div class="inp-rp"><span>Rp</span><input type="number" data-u="harga" value="' + Z.num(u.harga) + '" step="5000"></div></div></div>' +
        '<div class="grid2"><div class="field"><label>Tipe</label><select class="sel" data-u="tipe">' +
        ['Matic', 'Retro Matic', 'Sport Matic', 'Maxi Scooter', 'Eco Matic', 'Adventure', 'Bebek', 'Sport'].map(function (t) {
          return '<option' + (u.tipe === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Status</label><select class="sel" data-u="status">' +
        ['Tersedia', 'Disewa', 'Servis'].map(function (t) {
          return '<option' + (u.status === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="grid2"><div class="field"><label>Odometer (km)</label><input class="inp" type="number" data-u="odo" value="' + Z.num(u.odo) + '"></div>' +
        '<div class="field"><label>Jatuh tempo pajak STNK</label><input class="inp" type="date" data-u="pajak" value="' + esc(u.pajak) + '"></div></div>' +
        '<div class="field"><label>Tampilan kartu (ilustrasi)</label>' +
          '<div id="praFoto" style="border-radius:14px;overflow:hidden;margin-bottom:9px">' + Z.fotoUnit(u.foto, { tinggi: 120 }) + '</div>' +
          '<div class="chips" style="margin-bottom:7px">' + seniPilihan.map(function (s) {
            return '<button class="chip' + (artNow[1] === s ? ' on' : '') + '" data-art="' + s + '">' + s + '</button>'; }).join('') + '</div>' +
          '<div style="display:flex;gap:7px;flex-wrap:wrap">' + warnaPilihan.map(function (w) {
            return '<button data-warna="' + w + '" style="width:30px;height:30px;border-radius:9px;background:' + w +
              ';border:2.5px solid ' + (artNow[2] === w ? 'var(--kuning)' : 'transparent') + '"></button>'; }).join('') + '</div>' +
          '<div class="bantu" style="margin-top:8px">Atau unggah foto asli unit:</div>' +
          '<input class="inp" type="file" accept="image/*" id="fotoUnitFile" style="margin-top:6px;padding:9px">' +
        '</div>';

      const wrap = Z.Sheet.buka({
        judul: id ? 'Ubah Unit' : 'Tambah Motor', sub: id ? u.plat : 'Lengkapi data armada', ikon: 'motor', isi: isi,
        aksi: (id ? '<button class="btn btn-netral" data-hapus style="flex:0 0 auto;padding:0 16px">' + Z.Ikon('sampah', 17) + '</button>' : '') +
              '<button class="btn btn-utama" data-simpan>' + Z.Ikon('check', 17) + 'Simpan</button>'
      });

      let foto = u.foto || 'art:beat:#2E7D32';
      function perbaruiPra() {
        Z.$('#praFoto', wrap).innerHTML = Z.fotoUnit(foto, { tinggi: 120 });
      }
      Z.$$('[data-art]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          const p = String(foto).indexOf('art:') === 0 ? foto.split(':') : ['art', 'beat', '#2E7D32'];
          foto = 'art:' + b.getAttribute('data-art') + ':' + (p[2] || '#2E7D32');
          Z.$$('[data-art]', wrap).forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          perbaruiPra();
        });
      });
      Z.$$('[data-warna]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          const p = String(foto).indexOf('art:') === 0 ? foto.split(':') : ['art', 'beat', '#2E7D32'];
          foto = 'art:' + (p[1] || 'beat') + ':' + b.getAttribute('data-warna');
          Z.$$('[data-warna]', wrap).forEach(function (x) { x.style.borderColor = 'transparent'; });
          b.style.borderColor = 'var(--kuning)';
          perbaruiPra();
        });
      });
      const file = Z.$('#fotoUnitFile', wrap);
      file.addEventListener('change', async function () {
        const f = file.files[0];
        if (!f) return;
        Z.toast('Mengompres & mengunggah foto…', 'info');
        const b64 = await kompresGambar(f, 900);
        const r = await global.App.kirim('upload.foto', { base64: b64, mime: 'image/jpeg', jenis: 'unit', nama: 'unit' });
        if (r.success) { foto = r.data.url; perbaruiPra(); }
      });

      Z.$('[data-simpan]', wrap).addEventListener('click', async function () {
        const d = { id: id || '', foto: foto };
        Z.$$('[data-u]', wrap).forEach(function (i) { d[i.getAttribute('data-u')] = i.value; });
        if (!d.nama) return Z.toast('Nama motor wajib diisi.', 'err');
        if (!d.plat) return Z.toast('Plat nomor wajib diisi.', 'err');
        const r = await global.App.kirim('unit.simpan', d);
        if (r.success) { Z.Sheet.tutup(); await global.App.muatUlang(true); }
      });
      const hps = Z.$('[data-hapus]', wrap);
      if (hps) hps.addEventListener('click', async function () {
        const ya = await Z.konfirmasi({ judul: 'Hapus unit?', bahaya: true,
          pesan: 'Unit ' + u.nama + ' (' + u.plat + ') akan dihapus permanen. Riwayat order yang sudah ada tetap tersimpan.' });
        if (!ya) return;
        const r = await global.App.kirim('unit.hapus', { id: id });
        if (r.success) { Z.Sheet.tutup(); await global.App.muatUlang(true); }
      });
    }
  };

  function kartuUnit(u) {
    const s = Hitung.statUnit(u.id);
    const hari = Z.hariIni();
    const sisaPajak = u.pajak ? Z.selisihHari(hari, u.pajak) : null;
    const order = (D().pesanan || []).filter(function (o) { return o.unit === u.id && o.status === 'Berjalan'; })[0];
    const c = order ? pel(order.pelanggan) : null;
    const telat = order ? hariTelat(order) : 0;

    return '<article class="kartu unit-kartu kartu-klik" data-unit="' + esc(u.id) + '">' +
      '<div class="unit-gbr">' + Z.fotoUnit(u.foto, { tinggi: 172, alt: u.nama }) +
        '<div class="unit-ovl">' +
          '<div class="ovl-ki"><span class="plat" style="font-size:12px;padding:5px 10px">' + esc(u.plat) + '</span></div>' +
          '<div class="ovl-ka">' + (telat > 0 ? U.badge('Telat ' + telat + ' hari', 'danger', 'alert') : U.badgeUnit(u.status)) + '</div>' +
          '<div class="ovl-bki"><span class="harga-pil"><b>' + Z.rp(u.harga) + '</b><span>/hari</span></span></div>' +
          '<div class="ovl-bka"><span class="pil-putih">Tahun ' + esc(u.tahun) + '</span></div>' +
        '</div></div>' +
      '<div class="unit-isi">' +
        '<div><div style="font-weight:700;font-size:15px;line-height:1.25">' + esc(u.nama) + '</div>' +
        '<div class="t-sm t-var">' + esc(u.tipe) + (u.tahun ? ' • ' + esc(u.tahun) : '') +
          (Z.num(u.odo) ? ' • ' + Z.ribuan(Z.num(u.odo)) + ' km' : '') + '</div></div>' +
        (order ? '<div class="kotak ' + (telat > 0 ? 'kotak-danger' : '') + '" style="display:flex;align-items:center;gap:9px">' +
            U.avatar(c.nama, 'avatar-kecil') +
            '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:12.5px">' + esc(c.nama) + '</div>' +
            '<div class="t-sm" style="color:' + (telat > 0 ? 'var(--danger)' : 'var(--ungu)') + '">' +
            esc(order.id) + ' • ' + (telat > 0 ? 'telat ' + telat + ' hari' : 'kembali ' + Z.relatif(order.kembali)) + '</div></div>' +
            '<a class="ikon-btn" href="https://wa.me/' + esc(Z.hp62(c.wa)) + '" target="_blank" rel="noopener" ' +
            'style="color:var(--ok)" aria-label="WhatsApp">' + Z.Ikon('wa', 18) + '</a></div>'
          : '<div class="grid2" style="gap:8px">' +
            miniInfo('dokumen', 'Pajak STNK', u.pajak ? Z.tglId(u.pajak) : '-',
              sisaPajak !== null && sisaPajak <= 14 ? 'var(--danger)' : '') +
            miniInfo('perkakas', 'Servis berkala', (u.servisNext < 0 ? 'Lewat ' + Math.abs(u.servisNext) : u.servisNext) + ' km',
              u.servisNext < 0 ? 'var(--danger)' : '') + '</div>') +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px" class="t-var">' +
          '<span>' + Z.Ikon('sinkron', 12) + ' Disewa ' + s.sewa + '×</span>' +
          '<span style="font-weight:600;color:var(--teks)">' + Z.Ikon('dompet', 12) + ' ' + Z.rpSingkat(s.hasil) + '</span></div>' +
        '<div class="btn-grid">' +
          (u.status === 'Tersedia'
            ? '<button class="btn btn-kecil btn-utama" data-order-unit="' + esc(u.id) + '">' + Z.Ikon('order', 15) + 'Buat Order</button>'
            : (u.status === 'Servis'
              ? '<button class="btn btn-kecil btn-warn" data-servis-unit="' + esc(u.id) + '">' + Z.Ikon('perkakas', 15) + 'Selesai Servis</button>'
              : '<button class="btn btn-kecil btn-netral" data-order="' + esc(order ? order.id : '') + '">Detail Order</button>')) +
          '<button class="btn btn-kecil btn-netral" data-unit-edit="' + esc(u.id) + '">' + Z.Ikon('pensil', 15) + 'Ubah</button>' +
        '</div>' +
      '</div></article>';
  }

  function barisUnit(u) {
    const s = Hitung.statUnit(u.id);
    return '<article class="kartu kartu-rapat kartu-klik" data-unit="' + esc(u.id) + '" ' +
      'style="display:flex;align-items:center;gap:11px">' +
      '<div style="width:78px;flex:none;border-radius:12px;overflow:hidden">' + Z.fotoUnit(u.foto, { tinggi: 56, alt: u.nama }) + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(u.nama) + '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:3px"><span class="plat" style="font-size:10px">' + esc(u.plat) + '</span>' +
        U.badgeUnit(u.status) + '</div>' +
        '<div class="t-sm t-var" style="margin-top:3px">' + s.sewa + '× sewa • ' + Z.rpSingkat(s.hasil) + '</div>' +
      '</div>' +
      '<div style="text-align:right;flex:none"><div class="t-rp">' + Z.rp(u.harga) + '</div>' +
      '<div class="t-sm t-var">/hari</div></div></article>';
  }

  async function kompresGambar(file, maksLebar) {
    return new Promise(function (selesai) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          const skala = Math.min(1, (maksLebar || 900) / img.width);
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * skala);
          c.height = Math.round(img.height * skala);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          selesai(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  global.kompresGambar = kompresGambar;

  /**
   * Varian PNG untuk logo & favicon: latar dibiarkan TRANSPARAN.
   * JPEG akan memberi kotak putih di belakang logo — terlihat jelek pada
   * bar atas gelap dan pada mode gelap.
   */
  async function kecilkanGambar(file, maksSisi) {
    return new Promise(function (selesai, tolak) {
      const reader = new FileReader();
      reader.onerror = function () { tolak(new Error('berkas tidak terbaca')); };
      reader.onload = function (e) {
        const img = new Image();
        img.onerror = function () { tolak(new Error('format gambar tidak dikenali')); };
        img.onload = function () {
          const m = maksSisi || 320;
          const skala = Math.min(1, m / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * skala));
          c.height = Math.max(1, Math.round(img.height * skala));
          const ctx = c.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, c.width, c.height);
          selesai(c.toDataURL('image/png'));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  global.kecilkanGambar = kecilkanGambar;

  /* ================================================================
   * HALAMAN: PELANGGAN (CRM)
   * ================================================================ */
  Hal.pelanggan = {
    judul: 'Pelanggan', nav: 'pelanggan',
    render: function () {
      const f = Z.Simpan.ambil('crmFilter', 'semua');
      const q = (global.App.cari || '').toLowerCase();
      const semua = (D().pelanggan || []).slice().sort(function (a, b) {
        return (b.terakhir || '').localeCompare(a.terakhir || '');
      });
      const hitung = {
        semua: semua.length,
        langganan: semua.filter(function (p) { return p.tag === 'Langganan'; }).length,
        baru: semua.filter(function (p) { return p.dibuat >= Z.tambahHari(Z.hariIni(), -30) || (p.terakhir >= Z.tambahHari(Z.hariIni(), -30) && p.totalSewa <= 1); }).length,
        masalah: semua.filter(function (p) { return p.tag === 'Bermasalah'; }).length,
        kyc: semua.filter(function (p) { return p.kyc === 'Lengkap'; }).length
      };
      const daftar = semua.filter(function (p) {
        if (f === 'langganan' && p.tag !== 'Langganan') return false;
        if (f === 'baru' && !(p.totalSewa <= 1)) return false;
        if (f === 'masalah' && p.tag !== 'Bermasalah') return false;
        if (f === 'kyc' && p.kyc !== 'Lengkap') return false;
        if (!q) return true;
        return (p.nama + ' ' + p.wa + ' ' + (p.asal || '') + ' ' + (p.ket || '')).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 50);

      let html = '';
      html += '<section><div class="seksi-head">' +
        '<div><h1 class="t-hero" style="font-size:22px">CRM & Data Pelanggan</h1>' +
        '<div class="t-sm t-var">Basis penyewa, riwayat sewa, verifikasi, dan loyalitas</div></div>' +
        '<span class="badge badge-ink">' + hitung.semua + '</span></div>' +
        '<div class="btn-grid" style="margin-top:12px">' +
        '<button class="btn btn-utama" data-aksi="pelanggan-baru">' + Z.Ikon('orang', 18) + 'Tambah Pelanggan</button>' +
        '<button class="btn btn-netral" data-aksi="ekspor-pelanggan">' + Z.Ikon('unduh', 18) + 'Ekspor Kontak</button></div>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:8px">' + Pilih.tombol('pelanggan') + '</div></section>';

      html += '<section class="grid2">' +
        U.kartuKpi({ label: 'Total Terdaftar', nilai: hitung.semua, ikon: 'orang', tagKanan: 'penyewa' }) +
        U.kartuKpi({ label: 'Langganan', nilai: hitung.langganan, ikon: 'bintang', warna: 'kuning',
                     tagKanan: hitung.semua ? Math.round(hitung.langganan / hitung.semua * 100) + '% loyal' : '' }) +
        U.kartuKpi({ label: 'KYC Lengkap', nilai: hitung.kyc, ikon: 'perisai', warna: 'ok' }) +
        U.kartuKpi({ label: 'Perlu Perhatian', nilai: hitung.masalah, ikon: 'alert', warna: 'danger' }) +
      '</section>';

      /* Broadcast */
      html += '<section class="kartu kartu-ungu">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">' +
          '<div style="display:flex;align-items:center;gap:10px;min-width:0">' +
            '<span style="width:34px;height:34px;border-radius:50%;background:var(--kuning);color:#0B0B0F;' +
              'display:grid;place-items:center;flex:none">' + Z.Ikon('kirim', 17) + '</span>' +
            '<div style="min-width:0"><div style="font-weight:700;font-size:13.5px">Broadcast Promo Loyalitas</div>' +
            '<div style="font-size:11px;opacity:.85">' + hitung.langganan + ' langganan aktif siap dihubungi</div></div>' +
          '</div><span class="badge badge-ink" style="flex:none">WA Blast</span></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:11px;flex-wrap:wrap">' +
          '<div style="font-size:12px;opacity:.92;flex:1;min-width:150px">Kirim template promo ke pelanggan terpilih</div>' +
          '<button class="btn btn-kecil btn-utama" data-aksi="blast">Buka Blast ' + Z.Ikon('panah', 14) + '</button></div>' +
      '</section>';

      html += '<section>' + kolomCari('Cari nama, No. WA (08…), asal…') +
        U.chips([
          { kunci: 'semua', teks: 'Semua', jumlah: hitung.semua },
          { kunci: 'langganan', teks: 'Langganan', jumlah: hitung.langganan, ikon: 'bintang' },
          { kunci: 'baru', teks: 'Pelanggan Baru', jumlah: hitung.baru, titik: 'info' },
          { kunci: 'masalah', teks: 'Bermasalah', jumlah: hitung.masalah, titik: 'danger', kelas: hitung.masalah ? 'danger' : '' },
          { kunci: 'kyc', teks: 'KYC Lengkap', jumlah: hitung.kyc, titik: 'ok' }
        ], f, 'data-filter-crm') + '</section>';

      html += '<section style="display:flex;flex-direction:column;gap:13px">' +
        (daftar.length ? daftar.map(kartuPelanggan).join('')
          : '<div class="kartu">' + U.kosong('orang', 'Tidak ditemukan', 'Ubah filter atau kata kunci pencarian.') + '</div>') +
        '</section>';

      html += '<div class="t-sm t-var" style="text-align:center;padding:4px 0 10px">Menampilkan ' +
        daftar.length + ' dari ' + hitung.semua + ' pelanggan</div>';
      return html;
    },
    setelah: function (root) {
      Pilih.pasang(root, '[data-pelanggan]', 'data-pelanggan', {
        hal: 'pelanggan', atr: 'data-pelanggan', nama: 'pelanggan', aksi: 'pelanggan.hapusBanyak',
        peringatan: 'Pelanggan yang sudah punya riwayat order akan dilewati agar laporan tetap utuh.'
      });
      Z.$$('[data-filter-crm]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          Z.Simpan.taruh('crmFilter', b.getAttribute('data-filter-crm'));
          global.App.render();
        });
      });
      const tb = Z.$('[data-aksi="pelanggan-baru"]', root);
      if (tb) tb.addEventListener('click', function () { Hal.pelanggan.form(null); });
      const ek = Z.$('[data-aksi="ekspor-pelanggan"]', root);
      if (ek) ek.addEventListener('click', function () {
        const rows = [['ID', 'Nama', 'No WA', 'Alamat', 'Asal', 'Keterangan', 'KYC', 'Total Sewa', 'Total Belanja', 'Sewa Terakhir', 'Tag']];
        (D().pelanggan || []).forEach(function (p) {
          rows.push([p.id, p.nama, "'" + p.wa, p.alamat, p.asal, p.ket, p.kyc, p.totalSewa, p.totalBelanja, p.terakhir, p.tag]);
        });
        unduhCsv(rows, 'pelanggan-zan-rental-' + Z.hariIni() + '.csv');
      });
      const bl = Z.$('[data-aksi="blast"]', root);
      if (bl) bl.addEventListener('click', function () { global.App.ke('notifikasi'); });
    },

    /* Form pelanggan */
    form: function (id, setelahSimpan) {
      const p = id ? pel(id) : { nama: '', wa: '', alamat: '', asal: '', ket: '', kyc: 'Belum', tag: 'Baru', catatan: '' };
      const isi =
        '<div class="field"><label>Nama lengkap</label><input class="inp" data-p="nama" value="' + esc(p.nama) + '" placeholder="Nama sesuai KTP"></div>' +
        '<div class="field"><label>Nomor WhatsApp</label><input class="inp" type="tel" data-p="wa" value="' + esc(p.wa) + '" placeholder="08123456789" inputmode="numeric"></div>' +
        '<div class="grid2"><div class="field"><label>Alamat / Kecamatan</label><input class="inp" data-p="alamat" value="' + esc(p.alamat) + '" placeholder="Sumbersari, Jember"></div>' +
        '<div class="field"><label>Kota asal</label><input class="inp" data-p="asal" value="' + esc(p.asal) + '" placeholder="Jember"></div></div>' +
        '<div class="field"><label>Keterangan</label><input class="inp" data-p="ket" value="' + esc(p.ket) + '" placeholder="Mahasiswa UNEJ / Tamu hotel / Karyawan"></div>' +
        '<div class="grid2"><div class="field"><label>Status KYC</label><select class="sel" data-p="kyc">' +
        ['Belum', 'KTP Saja', 'Lengkap'].map(function (t) { return '<option' + (p.kyc === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') +
        '</select></div><div class="field"><label>Tag</label><select class="sel" data-p="tag">' +
        ['Baru', 'Langganan', 'Bermasalah'].map(function (t) { return '<option' + (p.tag === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') +
        '</select></div></div>' +
        (global.App.set('FITUR_KTP', 'YA') === 'YA' ?
          '<div class="field"><label>Foto KTP / SIM (opsional)</label>' +
          '<input class="inp" type="file" accept="image/*" id="fileKtp" style="padding:9px">' +
          '<div class="bantu">Tersimpan di folder Drive milik Anda, bukan di perangkat ini.</div></div>' : '') +
        '<div class="field" style="margin-bottom:0"><label>Catatan</label><textarea class="ta" data-p="catatan" maxlength="300">' + esc(p.catatan) + '</textarea></div>';

      const wrap = Z.Sheet.buka({
        judul: id ? 'Ubah Pelanggan' : 'Pelanggan Baru', ikon: 'orang', isi: isi,
        aksi: '<button class="btn btn-netral" data-batal>Batal</button>' +
              '<button class="btn btn-utama" data-simpan>' + Z.Ikon('check', 17) + 'Simpan</button>'
      });
      let ktp = p.ktp || '';
      const fk = Z.$('#fileKtp', wrap);
      if (fk) fk.addEventListener('change', async function () {
        const file = fk.files[0];
        if (!file) return;
        Z.toast('Mengunggah berkas…', 'info');
        const b64 = await kompresGambar(file, 1200);
        const r = await global.App.kirim('upload.foto', { base64: b64, mime: 'image/jpeg', jenis: 'pelanggan', nama: 'ktp' });
        if (r.success) { ktp = r.data.url; Z.toast('Berkas tersimpan di Drive.'); }
      });
      Z.$('[data-batal]', wrap).addEventListener('click', function () { Z.Sheet.tutup(); });
      Z.$('[data-simpan]', wrap).addEventListener('click', async function () {
        const d = { id: id || '' };
        Z.$$('[data-p]', wrap).forEach(function (i) { d[i.getAttribute('data-p')] = i.value; });
        if (ktp) d.ktp = ktp;
        if (!d.nama) return Z.toast('Nama wajib diisi.', 'err');
        const r = await global.App.kirim('pelanggan.simpan', d);
        if (!r.success) return;
        Z.Sheet.tutup();
        await global.App.muatUlang(true);
        if (setelahSimpan) setelahSimpan(r.data.id);
      });
    }
  };

  function kartuPelanggan(p) {
    const ord = (D().pesanan || []).filter(function (o) { return o.pelanggan === p.id; });
    const aktif = ord.filter(function (o) { return o.status === 'Berjalan'; })[0];
    const telat = aktif ? hariTelat(aktif) : 0;
    const masalah = p.tag === 'Bermasalah' || telat > 0;
    const aksen = masalah ? 'var(--danger)' : (p.tag === 'Langganan' ? 'var(--kuning)' : 'transparent');

    return '<article class="kartu pel-kartu kartu-klik" data-pelanggan="' + esc(p.id) + '">' +
      (aksen !== 'transparent' ? '<div class="pel-aksen" style="background:' + aksen + '"></div>' : '') +
      '<div style="display:flex;align-items:flex-start;gap:11px;padding-top:' + (aksen !== 'transparent' ? '4px' : '0') + '">' +
        U.avatar(p.nama) +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
            '<b style="font-size:15px">' + esc(p.nama) + '</b>' +
            (p.kyc === 'Lengkap' ? '<span style="color:var(--info)" title="KYC lengkap">' + Z.Ikon('perisai', 15) + '</span>' : '') +
          '</div>' +
          '<div class="t-sm t-var" style="display:flex;align-items:center;gap:5px;margin-top:2px">' +
            Z.Ikon(p.ket && /mahasiswa/i.test(p.ket) ? 'kampus' : (p.ket && /hotel|tamu/i.test(p.ket) ? 'hotel' : 'lokasi'), 13) +
            '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            esc(p.ket || p.alamat || p.asal || '-') + '</span></div>' +
        '</div>' +
        (masalah ? U.badge(telat > 0 ? 'Telat ' + telat + ' hari' : 'Bermasalah', 'danger', 'alert')
          : (p.tag === 'Langganan' ? U.badge(p.totalSewa + '× Sewa', 'kuning', 'bintang')
            : U.badge(p.totalSewa + '× Sewa', 'info'))) +
      '</div>' +
      '<div class="kotak" style="margin-top:11px;display:flex;align-items:center;justify-content:space-between;gap:9px">' +
        '<div style="display:flex;align-items:center;gap:8px;min-width:0">' +
          '<span style="color:' + (p.kyc === 'Lengkap' ? 'var(--ok)' : 'var(--warn)') + '">' + Z.Ikon('perisai', 17) + '</span>' +
          '<span style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          esc(p.kyc === 'Lengkap' ? 'KTP & SIM terverifikasi' : (p.kyc === 'KTP Saja' ? 'KTP tersimpan' : 'Dokumen belum lengkap')) + '</span></div>' +
        (p.ktp ? '<a class="tautan" href="' + esc(p.ktp) + '" target="_blank" rel="noopener">Lihat berkas</a>' :
          '<span class="t-sm t-var">' + esc(p.statusWA === 'Terdaftar' ? 'WA aktif' : '') + '</span>') +
      '</div>' +
      '<div class="grid2" style="margin-top:9px;gap:8px">' +
        miniInfo('dompet', 'Total belanja', Z.rp(p.totalBelanja), '') +
        (aktif ? miniInfo('motor', 'Sedang sewa', unit(aktif.unit).nama || '-', 'var(--ungu)')
               : miniInfo('jam', 'Terakhir sewa', p.terakhir ? Z.relatif(p.terakhir) : 'Belum pernah', '')) +
      '</div>' +
      (p.catatan ? '<div class="t-sm t-var" style="font-style:italic;margin-top:9px;line-height:1.5">“' + esc(p.catatan) + '”</div>' : '') +
      '<div class="btn-grid" style="margin-top:11px">' +
        '<a class="btn btn-kecil btn-hijau" href="https://wa.me/' + esc(Z.hp62(p.wa)) + '" target="_blank" rel="noopener">' +
          Z.Ikon('wa', 15) + 'Chat WA</a>' +
        (masalah && aktif
          ? '<button class="btn btn-kecil btn-bahaya" data-wa="' + esc(aktif.id) + '" data-wa-tipe="TAGIH_TELAT">' +
            Z.Ikon('alert', 15) + 'Tagih</button>'
          : '<button class="btn btn-kecil btn-ink" data-order-pelanggan="' + esc(p.id) + '">' + Z.Ikon('plus', 15) + 'Buat Order</button>') +
      '</div></article>';
  }

  /* dipakai pages2.js */
  global.PagesUtil = {
    D: D, unit: unit, pel: pel, orderById: orderById, kolomCari: kolomCari,
    pilCounter: pilCounter, miniInfo: miniInfo, unduhCsv: unduhCsv, FormOrder: FormOrder
  };
})(window);
