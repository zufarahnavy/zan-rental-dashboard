/* ================================================================
 *  ZAN RENTAL — pages2.js (bagian 2)
 *  Halaman: Keuangan, Servis & Pajak, Laporan, Notifikasi WA,
 *  Pengaturan, Lainnya, Model Struk, Import, Detail Order/Kwitansi,
 *  dan halaman publik Verifikasi.
 * ================================================================ */
(function (global) {
  'use strict';
  const Z = global.ZAN, U = global.UI, esc = Z.esc;
  const Hal = global.Hal, H = global.Hitung, P = global.PagesUtil;
  const D = P.D, unit = P.unit, pel = P.pel, orderById = P.orderById;

  /* ================================================================
   * KEUANGAN
   * ================================================================ */
  /* Satu baris metode pembayaran: nama + naik/turun + hapus.
     Berada di lingkup modul karena dipakai oleh DUA fungsi berbeda —
     perakit HTML halaman dan penggambar ulang saat daftar diubah. */
  /** Satu baris pengaturan kotak foto serah terima: nama + saklar wajib + hapus. */
  function fotoBarisHtml(arr) {
    if (!arr.length) return '<div class="t-sm t-var" style="padding:10px 2px">Belum ada kotak foto.</div>';
    return arr.map(function (x, i) {
      return '<div class="lengkap-baris on">' +
        '<input class="inp lengkap-nama-inp" data-fnama="' + i + '" value="' + esc(x.l) +
          '" maxlength="24" placeholder="Nama kotak foto">' +
        '<label class="pil-wajib" title="Wajib difoto">' +
          '<input type="checkbox" data-fwajib="' + i + '"' + (x.wajib ? ' checked' : '') + '>' +
          '<span>Wajib</span></label>' +
        '<button type="button" class="ikon-btn ikon-btn-kecil" data-fhapus="' + i + '" aria-label="Hapus">' +
          Z.Ikon('sampah', 16) + '</button>' +
      '</div>';
    }).join('');
  }

  /** Kunci stabil dari nama kotak foto; dipakai sebagai nama berkas di Drive. */
  function kunciSudut(label, dipakai) {
    let k = String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
    if (!k) k = 'foto';
    let n = k, i = 2;
    while (dipakai.indexOf(n) >= 0) { n = k + '-' + (i++); }
    return n;
  }

  function bayarBarisHtml(arr) {
    if (!arr.length) return '<div class="t-sm t-var" style="padding:10px 2px">Belum ada metode.</div>';
    return arr.map(function (nama, i) {
      return '<div class="lengkap-baris on">' +
        '<input class="inp lengkap-nama-inp" data-bnama="' + i + '" value="' + esc(nama) + '" maxlength="30">' +
        '<div class="stepper">' +
          '<button type="button" class="stepper-b" data-bnaik="' + i + '" aria-label="Naikkan urutan"' +
            (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" class="stepper-b" data-bturun="' + i + '" aria-label="Turunkan urutan"' +
            (i === arr.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '</div>' +
        '<button type="button" class="ikon-btn ikon-btn-kecil" data-bhapus="' + i + '" aria-label="Hapus">' +
          Z.Ikon('sampah', 16) + '</button>' +
      '</div>';
    }).join('');
  }

  const KATEGORI_MASUK = ['Sewa Motor', 'DP / Booking', 'Denda Keterlambatan', 'Penjualan Aset', 'Lainnya'];
  const KATEGORI_KELUAR = ['Servis & Sparepart', 'BBM & Operasional', 'Cuci & Perawatan', 'Pajak & Administrasi',
                           'Promosi', 'Gaji & Upah', 'Sewa Tempat', 'Lain-lain'];

  Hal.keuangan = {
    judul: 'Keuangan', nav: 'lainnya',
    render: function () {
      const periode = Z.Simpan.ambil('keuPeriode', 'bulan');
      const filter = Z.Simpan.ambil('keuFilter', 'semua');
      const rentang = hitungRentang(periode);
      const semua = (D().keuangan || []).filter(function (k) {
        return k.tanggal >= rentang.dari && k.tanggal <= rentang.sampai;
      }).sort(function (a, b) { return (b.tanggal + b.id).localeCompare(a.tanggal + a.id); });

      const masuk = semua.filter(function (k) { return k.jenis === 'Masuk'; });
      const keluar = semua.filter(function (k) { return k.jenis === 'Keluar'; });
      const tMasuk = jml(masuk), tKeluar = jml(keluar), laba = tMasuk - tKeluar;
      const margin = tMasuk ? Math.round(laba / tMasuk * 100) : 0;

      const sewa = jml(masuk.filter(function (k) { return /sewa|dp/i.test(k.kategori); }));
      const denda = jml(masuk.filter(function (k) { return /denda/i.test(k.kategori); }));
      const servis = jml(keluar.filter(function (k) { return /servis|sparepart/i.test(k.kategori); }));
      const opex = tKeluar - servis;

      const tren = H.tren(periode === 'hari' ? 'Harian' : (periode === 'minggu' ? 'Harian' : 'Mingguan'));
      const target = Z.num(global.App.set('TARGET_BULANAN', 0));

      const daftar = semua.filter(function (k) {
        if (filter === 'masuk') return k.jenis === 'Masuk';
        if (filter === 'keluar') return k.jenis === 'Keluar';
        if (filter === 'servis') return /servis|sparepart/i.test(k.kategori);
        if (filter === 'denda') return /denda/i.test(k.kategori);
        return true;
      }).slice(0, 40);

      let html = '';
      html += '<section><div class="seksi-head">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<h1 class="t-hero" style="font-size:22px">Keuangan & Arus Kas</h1>' +
        '<span class="badge badge-netral">' + esc(rentang.label) + '</span></div>' +
        '<span class="badge badge-ok"><i class="titik denyut"></i>Tersinkron</span></div>' +
        '<div class="btn-grid" style="margin-top:12px">' +
        '<button class="btn btn-utama" data-aksi="catat">' + Z.Ikon('plus', 18) + 'Catat Transaksi</button>' +
        '<button class="btn btn-netral" data-aksi="ekspor-keu">' + Z.Ikon('unduh', 18) + 'Ekspor CSV</button></div></section>';

      /* Hero gelap */
      html += '<section class="kartu kartu-gelap">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">' +
          '<div><div class="t-cap" style="opacity:.72">LABA BERSIH ' + esc(rentang.label.toUpperCase()) + '</div>' +
          '<div class="t-sm" style="opacity:.6">Zan Rental • Jember</div></div>' +
          '<div style="text-align:right">' +
            '<span class="badge" style="background:rgba(22,163,74,.22);color:#6ee7a0">' +
            Z.Ikon(laba >= 0 ? 'naik' : 'turun', 13) + (laba >= 0 ? 'Surplus' : 'Defisit') + '</span>' +
            '<div style="font-size:10.5px;color:var(--kuning);margin-top:4px">Margin ' + margin + '%</div></div>' +
        '</div>' +
        '<div class="t-hero" style="color:var(--kuning);margin:12px 0 4px">' + Z.rp(laba) + '</div>' +
        '<div class="grid2" style="margin-top:11px">' +
          kotakGelap('masuk', 'Pemasukan', tMasuk, masuk.length + ' transaksi', '#6ee7a0') +
          kotakGelap('keluar', 'Pengeluaran', tKeluar, keluar.length + ' transaksi', '#ff9c9c') +
        '</div>' +
        '<div style="margin-top:13px">' +
          '<div style="display:flex;justify-content:space-between;font-size:10.5px;opacity:.78;margin-bottom:6px">' +
            '<span>Rasio beban operasional ' + (tMasuk ? Math.round(tKeluar / tMasuk * 100) : 0) + '%</span>' +
            (target ? '<span>Target ' + Math.round(tMasuk / target * 100) + '% tercapai</span>' : '') +
          '</div>' + U.progressDua(tMasuk ? (laba / tMasuk) * 100 : 0, 'var(--kuning)', 'rgba(220,38,38,.8)') +
        '</div></section>';

      /* Filter periode */
      html += '<section><div class="seg" data-grup="periode">' +
        [['hari', 'Hari Ini'], ['minggu', 'Minggu Ini'], ['bulan', 'Bulan Ini'], ['tahun', 'Tahun Ini']].map(function (p) {
          return '<button data-periode="' + p[0] + '"' + (periode === p[0] ? ' class="on"' : '') + '>' + p[1] + '</button>';
        }).join('') + '</div></section>';

      /* KPI 2x2 */
      html += '<section class="grid2">' +
        U.kartuKpi({ label: 'Kas Masuk Sewa', nilai: Z.rpSingkat(sewa), ikon: 'motor', warna: 'ok',
                     bawah: tMasuk ? Math.round(sewa / tMasuk * 100) + '% dari total masuk' : '-' }) +
        U.kartuKpi({ label: 'Denda & Overtime', nilai: Z.rp(denda), ikon: 'jam', warna: 'warn',
                     bawah: masuk.filter(function (k) { return /denda/i.test(k.kategori); }).length + ' kejadian' }) +
        U.kartuKpi({ label: 'Servis & Sparepart', nilai: Z.rp(servis), ikon: 'perkakas', warna: 'danger',
                     bawah: keluar.filter(function (k) { return /servis/i.test(k.kategori); }).length + ' transaksi' }) +
        U.kartuKpi({ label: 'Operasional Lain', nilai: Z.rp(opex), ikon: 'bensin', warna: 'info',
                     bawah: 'BBM, cuci, administrasi' }) +
      '</section>';

      /* Grafik arus kas */
      html += '<section class="kartu">' +
        '<div class="seksi-head"><div><h3 class="t-judul">Tren Arus Kas</h3>' +
        '<div class="t-sm t-var">' + esc(rentang.label) + '</div></div></div>' +
        '<div style="margin-top:10px">' + U.grafikBatang({ label: tren.label, seri: [
          { nama: 'Masuk', nilai: tren.masuk, warna: 'var(--kuning)' },
          { nama: 'Keluar', nilai: tren.keluar, warna: 'var(--ungu)' }] }) + '</div>' +
        (target ? '<div class="kotak" style="margin-top:9px;display:flex;align-items:center;justify-content:space-between;gap:9px">' +
          '<span style="display:flex;align-items:center;gap:7px;font-size:12px">' +
          '<span class="kpi-ikon info" style="width:26px;height:26px;border-radius:8px">' + Z.Ikon('grafik', 14) + '</span>' +
          'Target bulan ini <b>' + Z.rp(target) + '</b></span>' +
          '<b style="color:var(--ok);font-size:12px">' + Math.round(tMasuk / target * 100) + '% tercapai</b></div>' : '') +
      '</section>';

      /* Daftar transaksi */
      html += '<section>' +
        '<div class="seksi-head"><h3 class="t-judul">Daftar Transaksi</h3>' +
        '<span class="t-sm t-var">' + semua.length + ' entri</span></div>' +
        U.chips([
          { kunci: 'semua', teks: 'Semua', jumlah: semua.length },
          { kunci: 'masuk', teks: 'Pemasukan', jumlah: masuk.length, titik: 'ok' },
          { kunci: 'keluar', teks: 'Pengeluaran', jumlah: keluar.length, titik: 'danger' },
          { kunci: 'servis', teks: 'Servis' },
          { kunci: 'denda', teks: 'Denda' }
        ], filter, 'data-filter-keu') +
        '<div style="display:flex;flex-direction:column;gap:9px;margin-top:9px">' +
        (daftar.length ? daftar.map(barisTx).join('')
          : '<div class="kartu">' + U.kosong('dompet', 'Belum ada transaksi', 'Catat pemasukan atau pengeluaran pertama Anda.') + '</div>') +
        '</div></section>';

      html += '<div class="kotak" style="display:flex;align-items:center;justify-content:center;gap:8px;' +
        'text-align:center;font-size:11px;margin-bottom:10px" class="t-var">' +
        '<span style="color:var(--ok)">' + Z.Ikon('check', 15) + '</span>' +
        'Tersinkronisasi otomatis dengan Google Sheets “Database — ZAN Rental Jember”</div>';
      return html;
    },
    setelah: function (root) {
      Z.$$('[data-periode]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          Z.Simpan.taruh('keuPeriode', b.getAttribute('data-periode'));
          global.App.render();
        });
      });
      Z.$$('[data-filter-keu]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          Z.Simpan.taruh('keuFilter', b.getAttribute('data-filter-keu'));
          global.App.render();
        });
      });
      const c = Z.$('[data-aksi="catat"]', root);
      if (c) c.addEventListener('click', function () { Hal.keuangan.formTransaksi('Masuk'); });
      const e = Z.$('[data-aksi="ekspor-keu"]', root);
      if (e) e.addEventListener('click', function () {
        const rows = [['ID', 'Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Metode', 'Order', 'Unit', 'Keterangan']];
        (D().keuangan || []).forEach(function (k) {
          rows.push([k.id, k.tanggal, k.jenis, k.kategori, k.nominal, k.metode, k.order, k.unit, k.ket]);
        });
        P.unduhCsv(rows, 'keuangan-zan-rental-' + Z.hariIni() + '.csv');
      });
      Z.$$('[data-tx]', root).forEach(function (el) {
        el.addEventListener('click', function () { Hal.keuangan.formTransaksi(null, el.getAttribute('data-tx')); });
      });
    },

    formTransaksi: function (jenisAwal, id) {
      const t = id ? (D().keuangan || []).filter(function (k) { return k.id === id; })[0] : null;
      let jenis = t ? t.jenis : (jenisAwal || 'Masuk');

      function isiForm() {
        const kat = jenis === 'Masuk' ? KATEGORI_MASUK : KATEGORI_KELUAR;
        return '<div class="seg" style="margin-bottom:13px">' +
            '<button data-jenis="Masuk"' + (jenis === 'Masuk' ? ' class="on"' : '') + '>' + Z.Ikon('masuk', 15) + ' Pemasukan</button>' +
            '<button data-jenis="Keluar"' + (jenis === 'Keluar' ? ' class="on"' : '') + '>' + Z.Ikon('keluar', 15) + ' Pengeluaran</button>' +
          '</div>' +
          '<div class="field"><label>Nominal</label><div class="inp-rp"><span>Rp</span>' +
            '<input type="number" data-k="nominal" value="' + (t ? t.nominal : '') + '" placeholder="0" step="1000" inputmode="numeric"></div>' +
            '<div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">' +
            [20000, 50000, 100000, 300000].map(function (n) {
              return '<button class="chip" data-cepat="' + n + '">+' + Z.rpSingkat(n) + '</button>'; }).join('') + '</div></div>' +
          '<div class="grid2"><div class="field"><label>Kategori</label><select class="sel" data-k="kategori">' +
            kat.map(function (c) { return '<option' + (t && t.kategori === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><label>Tanggal</label><input class="inp" type="date" data-k="tanggal" value="' +
            esc(t ? t.tanggal : Z.hariIni()) + '"></div></div>' +
          '<div class="field"><label>Metode / rekening</label><div class="pilih-grid">' +
            Z.metodeBayarOpsi().map(function (m) {
              return '<button class="pilih' + ((t ? t.metode : 'Tunai') === m ? ' on' : '') + '" data-metode="' + m +
                '"><span class="j" style="font-size:11.5px">' + m + '</span></button>'; }).join('') + '</div></div>' +
          '<div class="field"><label>Kaitkan unit motor (opsional)</label><select class="sel" data-k="unit">' +
            '<option value="">— Tidak dikaitkan —</option>' +
            (D().units || []).map(function (u) {
              return '<option value="' + esc(u.id) + '"' + (t && t.unit === u.id ? ' selected' : '') + '>' +
                esc(u.nama + ' (' + u.plat + ')') + '</option>'; }).join('') + '</select></div>' +
          '<div class="field" style="margin-bottom:0"><label>Keterangan</label>' +
            '<input class="inp" data-k="ket" value="' + esc(t ? t.ket : '') + '" placeholder="Contoh: bensin antar unit ke stasiun"></div>';
      }

      const wrap = Z.Sheet.buka({
        judul: id ? 'Ubah Transaksi' : 'Catat Transaksi', ikon: 'dompet',
        sub: 'Tersimpan otomatis ke Google Sheets', isi: isiForm(),
        aksi: (id ? '<button class="btn btn-netral" data-hapus style="flex:0 0 auto;padding:0 16px">' + Z.Ikon('sampah', 17) + '</button>' : '') +
              '<button class="btn btn-utama" data-simpan>' + Z.Ikon('check', 17) + 'Simpan</button>'
      });

      let metode = t ? t.metode : 'Tunai';
      function pasang() {
        Z.$$('[data-jenis]', wrap).forEach(function (b) {
          b.addEventListener('click', function () {
            jenis = b.getAttribute('data-jenis');
            Z.$('.sheet-isi', wrap).innerHTML = isiForm();
            pasang();
          });
        });
        Z.$$('[data-metode]', wrap).forEach(function (b) {
          b.addEventListener('click', function () {
            metode = b.getAttribute('data-metode');
            Z.$$('[data-metode]', wrap).forEach(function (x) { x.classList.remove('on'); });
            b.classList.add('on');
          });
        });
        Z.$$('[data-cepat]', wrap).forEach(function (b) {
          b.addEventListener('click', function () {
            const inp = Z.$('[data-k="nominal"]', wrap);
            inp.value = Z.num(inp.value) + Z.num(b.getAttribute('data-cepat'));
          });
        });
      }
      pasang();

      Z.$('[data-simpan]', wrap).addEventListener('click', async function () {
        const d = { id: id || '', jenis: jenis, metode: metode };
        Z.$$('[data-k]', wrap).forEach(function (i) { d[i.getAttribute('data-k')] = i.value; });
        if (Z.num(d.nominal) <= 0) return Z.toast('Nominal harus lebih dari 0.', 'err');
        const r = await global.App.kirim('keuangan.simpan', d);
        if (r.success) { Z.Sheet.tutup(); await global.App.muatUlang(true); }
      });
      const hps = Z.$('[data-hapus]', wrap);
      if (hps) hps.addEventListener('click', async function () {
        const ya = await Z.konfirmasi({ judul: 'Hapus transaksi?', bahaya: true, pesan: 'Transaksi ini akan dihapus permanen dari buku kas.' });
        if (!ya) return;
        const r = await global.App.kirim('keuangan.hapus', { id: id });
        if (r.success) { Z.Sheet.tutup(); await global.App.muatUlang(true); }
      });
    }
  };

  function jml(arr) { return arr.reduce(function (a, k) { return a + k.nominal; }, 0); }

  function hitungRentang(p) {
    const hari = Z.hariIni();
    if (p === 'hari') return { dari: hari, sampai: hari, label: 'Hari ini' };
    if (p === 'minggu') return { dari: Z.tambahHari(hari, -6), sampai: hari, label: '7 hari terakhir' };
    if (p === 'tahun') return { dari: hari.slice(0, 4) + '-01-01', sampai: hari, label: 'Tahun ' + hari.slice(0, 4) };
    return { dari: hari.slice(0, 7) + '-01', sampai: hari, label: Z.bulanId(hari.slice(0, 7)) };
  }

  function kotakGelap(arah, label, nilai, sub, warna) {
    return '<div style="background:rgba(255,255,255,.07);border-radius:14px;padding:11px">' +
      '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">' +
      '<span style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.12);color:' + warna +
      ';display:grid;place-items:center">' + Z.Ikon(arah, 14) + '</span>' +
      '<span style="font-size:10.5px;opacity:.78">' + esc(label) + '</span></div>' +
      '<div style="font-size:15px;font-weight:700;font-variant-numeric:tabular-nums">' + Z.rp(nilai) + '</div>' +
      '<div style="font-size:10px;opacity:.6;margin-top:2px">' + esc(sub) + '</div></div>';
  }

  function barisTx(k) {
    const masuk = k.jenis === 'Masuk';
    const ikon = /denda/i.test(k.kategori) ? 'jam' : (/servis/i.test(k.kategori) ? 'perkakas' :
      (/bbm|operasional|cuci/i.test(k.kategori) ? 'bensin' : (/dp|booking/i.test(k.kategori) ? 'kalender' : (masuk ? 'masuk' : 'keluar'))));
    const warna = /denda/i.test(k.kategori) ? 'warn' : (masuk ? 'ok' : 'danger');
    const u = k.unit ? unit(k.unit) : null;
    return '<article class="kartu tx kartu-klik" data-tx="' + esc(k.id) + '">' +
      '<div class="tx-kiri">' +
        '<span class="tx-ikon kpi-ikon ' + warna + '">' + Z.Ikon(ikon, 18) + '</span>' +
        '<div style="min-width:0">' +
          '<div class="tx-judul">' + esc(k.ket || k.kategori) + '</div>' +
          '<div class="tx-sub">' + esc(k.kategori) + (u ? ' • ' + esc(u.nama) : '') + ' • ' + esc(k.metode || 'Tunai') + '</div>' +
          '<div class="tx-wkt">' + esc(Z.relatif(k.tanggal)) + (k.order ? ' • ' + esc(k.order) : '') + '</div>' +
        '</div></div>' +
      '<div class="tx-kanan">' +
        '<span class="tx-nom ' + (masuk ? 'nom-masuk' : 'nom-keluar') + '">' + (masuk ? '+' : '−') + Z.rp(k.nominal) + '</span>' +
        U.badge(k.kategori.length > 14 ? k.kategori.slice(0, 13) + '…' : k.kategori, warna) +
      '</div></article>';
  }

  /* ================================================================
   * SERVIS & PAJAK
   * ================================================================ */
  Hal.servis = {
    judul: 'Servis & Pajak', nav: 'lainnya',
    render: function () {
      const hari = Z.hariIni();
      const units = (D().units || []).filter(function (u) { return u.aktif; });
      const batasPajak = Z.num(global.App.set('INGAT_PAJAK_HARI', 14));
      const batasKm = Z.num(global.App.set('INGAT_SERVIS_KM', 500));
      const pajakDekat = units.filter(function (u) { return u.pajak && Z.selisihHari(hari, u.pajak) <= batasPajak; })
        .sort(function (a, b) { return (a.pajak || '').localeCompare(b.pajak || ''); });
      const perluServis = units.filter(function (u) { return u.servisNext <= batasKm; })
        .sort(function (a, b) { return a.servisNext - b.servisNext; });
      const riwayat = (D().servis || []).slice().sort(function (a, b) { return b.tanggal.localeCompare(a.tanggal); }).slice(0, 25);
      const biayaBulan = (D().servis || []).filter(function (s) { return s.tanggal.indexOf(hari.slice(0, 7)) === 0; })
        .reduce(function (a, s) { return a + s.biaya; }, 0);

      let html = '';
      html += '<section><div class="seksi-head">' +
        '<div style="display:flex;align-items:center;gap:9px">' +
        '<button class="ikon-btn" data-nav="lainnya">' + Z.Ikon('panahKiri', 20) + '</button>' +
        '<div><h1 class="t-judul">Servis & Pajak</h1>' +
        '<div class="t-sm t-var">Riwayat servis, jadwal berikutnya, jatuh tempo STNK</div></div></div></div>' +
        '<button class="btn btn-utama btn-blok" style="margin-top:12px" data-aksi="servis-baru">' +
        Z.Ikon('plus', 18) + 'Catat Servis Baru</button></section>';

      html += '<section class="grid3">' +
        P.pilCounter('Pajak dekat', pajakDekat.length, pajakDekat.length ? 'var(--danger)' : '') +
        P.pilCounter('Perlu servis', perluServis.length, perluServis.length ? 'var(--warn)' : '') +
        P.pilCounter('Biaya bulan ini', Z.rpSingkat(biayaBulan), '') + '</section>';

      if (pajakDekat.length) {
        html += '<section><h3 class="t-seksi" style="margin-bottom:9px">Jatuh Tempo Pajak STNK</h3>' +
          '<div style="display:flex;flex-direction:column;gap:9px">' + pajakDekat.map(function (u) {
            const sisa = Z.selisihHari(hari, u.pajak);
            const lewat = sisa < 0;
            return '<article class="kartu kartu-rapat" style="display:flex;align-items:center;gap:11px">' +
              '<span class="kpi-ikon ' + (lewat ? 'danger' : 'warn') + '">' + Z.Ikon('dokumen', 18) + '</span>' +
              '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">' + esc(u.nama) + '</div>' +
              '<div class="t-sm" style="color:' + (lewat ? 'var(--danger)' : 'var(--warn)') + '">' +
              (lewat ? 'Terlambat ' + Math.abs(sisa) + ' hari' : sisa + ' hari lagi') + ' • ' + Z.tglId(u.pajak) + '</div></div>' +
              '<span class="plat">' + esc(u.plat) + '</span></article>';
          }).join('') + '</div></section>';
      }

      if (perluServis.length) {
        html += '<section><h3 class="t-seksi" style="margin-bottom:9px">Jadwal Servis Berkala</h3>' +
          '<div style="display:flex;flex-direction:column;gap:9px">' + perluServis.map(function (u) {
            const lewat = u.servisNext < 0;
            return '<article class="kartu kartu-rapat" style="display:flex;align-items:center;gap:11px">' +
              '<span class="kpi-ikon ' + (lewat ? 'danger' : 'info') + '">' + Z.Ikon('perkakas', 18) + '</span>' +
              '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">' + esc(u.nama) + '</div>' +
              '<div class="t-sm" style="color:' + (lewat ? 'var(--danger)' : 'var(--teks-var)') + '">' +
              (lewat ? 'Lewat ' + Math.abs(u.servisNext) + ' km dari jadwal' : 'Sisa ' + u.servisNext + ' km') +
              ' • Odo ' + Z.ribuan(u.odo) + ' km</div></div>' +
              '<button class="btn btn-kecil btn-netral" data-servis-unit="' + esc(u.id) + '">Jadwalkan</button></article>';
          }).join('') + '</div></section>';
      }

      html += '<section><h3 class="t-seksi" style="margin-bottom:9px">Riwayat Servis</h3>' +
        '<div style="display:flex;flex-direction:column;gap:9px">' +
        (riwayat.length ? riwayat.map(function (s) {
          const u = unit(s.unit);
          return '<article class="kartu kartu-rapat" style="display:flex;align-items:center;gap:11px">' +
            '<span class="kpi-ikon">' + Z.Ikon('perkakas', 17) + '</span>' +
            '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:12.5px">' + esc(s.jenis) + '</div>' +
            '<div class="t-sm t-var">' + esc(u.nama || s.unit) + ' • ' + esc(s.bengkel || '-') + '</div>' +
            '<div class="t-sm t-var" style="font-size:10.5px">' + esc(Z.tglId(s.tanggal)) + '</div></div>' +
            '<div class="t-rp" style="color:var(--danger)">−' + Z.rp(s.biaya) + '</div></article>';
        }).join('') : '<div class="kartu">' + U.kosong('perkakas', 'Belum ada riwayat servis', 'Catat servis pertama untuk mulai memantau biaya perawatan.') + '</div>') +
        '</div></section>';
      return html;
    },
    setelah: function (root) {
      const b = Z.$('[data-aksi="servis-baru"]', root);
      if (b) b.addEventListener('click', function () { Hal.servis.form(null); });
    },
    form: function (idUnit) {
      const units = (D().units || []).filter(function (u) { return u.aktif; });
      const u = idUnit ? unit(idUnit) : null;
      const isi =
        '<div class="field"><label>Unit motor</label><select class="sel" data-s="unit">' +
          units.map(function (x) {
            return '<option value="' + esc(x.id) + '"' + (idUnit === x.id ? ' selected' : '') + '>' +
              esc(x.nama + ' — ' + x.plat) + '</option>'; }).join('') + '</select></div>' +
        '<div class="grid2"><div class="field"><label>Tanggal servis</label>' +
          '<input class="inp" type="date" data-s="tanggal" value="' + Z.hariIni() + '"></div>' +
          '<div class="field"><label>Odometer (km)</label><input class="inp" type="number" data-s="odo" value="' +
          (u ? u.odo : '') + '"></div></div>' +
        '<div class="field"><label>Jenis servis</label><select class="sel" data-s="jenis">' +
          ['Servis Rutin + Ganti Oli', 'Ganti Oli Mesin', 'Servis CVT & Roller', 'Ganti Ban', 'Ganti Kampas Rem',
           'Servis Besar', 'Tune Up Mesin', 'Perbaikan Kerusakan', 'Lainnya'].map(function (j) {
            return '<option>' + j + '</option>'; }).join('') + '</select></div>' +
        '<div class="grid2"><div class="field"><label>Biaya</label><div class="inp-rp"><span>Rp</span>' +
          '<input type="number" data-s="biaya" placeholder="0" step="5000"></div></div>' +
          '<div class="field"><label>Bengkel</label><input class="inp" data-s="bengkel" placeholder="Bengkel Mitra Jaya"></div></div>' +
        '<div class="field"><label>Servis berikutnya setelah (km)</label>' +
          '<input class="inp" type="number" data-s="servisNextKm" value="2000" step="500"></div>' +
        '<div class="kotak" style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
          '<div><div style="font-weight:600;font-size:12.5px">Motor masuk bengkel</div>' +
          '<div class="t-sm t-var">Status unit menjadi “Servis” dan tidak bisa dipesan</div></div>' +
          '<label class="switch"><input type="checkbox" data-s="masukBengkel"><i></i></label></div>' +
        '<div class="kotak" style="margin-top:9px;display:flex;align-items:center;justify-content:space-between;gap:10px">' +
          '<div><div style="font-weight:600;font-size:12.5px">Servis sudah selesai</div>' +
          '<div class="t-sm t-var">Unit kembali berstatus “Tersedia”</div></div>' +
          '<label class="switch"><input type="checkbox" data-s="selesai" checked><i></i></label></div>' +
        '<div class="field" style="margin-top:13px;margin-bottom:0"><label>Catatan</label>' +
          '<textarea class="ta" data-s="catatan" maxlength="250" placeholder="Sparepart yang diganti, keluhan, dll."></textarea></div>';

      const wrap = Z.Sheet.buka({
        judul: 'Catat Servis', ikon: 'perkakas', sub: 'Otomatis tercatat sebagai pengeluaran', isi: isi,
        aksi: '<button class="btn btn-netral" data-batal>Batal</button>' +
              '<button class="btn btn-utama" data-simpan>' + Z.Ikon('check', 17) + 'Simpan</button>'
      });
      Z.$('[data-batal]', wrap).addEventListener('click', function () { Z.Sheet.tutup(); });
      Z.$('[data-simpan]', wrap).addEventListener('click', async function () {
        const d = {};
        Z.$$('[data-s]', wrap).forEach(function (i) {
          d[i.getAttribute('data-s')] = i.type === 'checkbox' ? i.checked : i.value;
        });
        const r = await global.App.kirim('servis.simpan', d);
        if (r.success) { Z.Sheet.tutup(); await global.App.muatUlang(true); }
      });
    }
  };

  /* ================================================================
   * LAPORAN
   * ================================================================ */
  Hal.laporan = {
    judul: 'Laporan', nav: 'lainnya',
    render: function () {
      const bulan = Z.Simpan.ambil('lapBulan', Z.hariIni().slice(0, 7));
      const keu = (D().keuangan || []).filter(function (k) { return k.tanggal.indexOf(bulan) === 0; });
      const ord = (D().pesanan || []).filter(function (o) { return o.mulai.indexOf(bulan) === 0 && o.status !== 'Batal'; });
      const masuk = jml(keu.filter(function (k) { return k.jenis === 'Masuk'; }));
      const keluar = jml(keu.filter(function (k) { return k.jenis === 'Keluar'; }));
      const hariSewa = ord.reduce(function (a, o) { return a + o.durasi; }, 0);
      const terlaris = H.unitTerlaris(bulan, 10);
      const pelTeratas = pelangganTeratas(bulan, 5);

      const perKat = {};
      keu.forEach(function (k) {
        const key = k.jenis + '|' + k.kategori;
        perKat[key] = (perKat[key] || 0) + k.nominal;
      });

      const bulanPilihan = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
        bulanPilihan.push(d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2));
      }

      let html = '';
      html += '<section><div class="seksi-head">' +
        '<div style="display:flex;align-items:center;gap:9px">' +
        '<button class="ikon-btn" data-nav="lainnya">' + Z.Ikon('panahKiri', 20) + '</button>' +
        '<div><h1 class="t-judul">Laporan</h1><div class="t-sm t-var">Statistik & unduhan berkas</div></div></div></div>' +
        '<div class="field" style="margin-top:12px"><label>Periode laporan</label>' +
        '<select class="sel" id="pilihBulan">' + bulanPilihan.map(function (b) {
          return '<option value="' + b + '"' + (b === bulan ? ' selected' : '') + '>' + Z.bulanId(b) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="btn-grid">' +
        '<button class="btn btn-utama" data-aksi="pdf">' + Z.Ikon('dokumen', 17) + 'Laporan PDF</button>' +
        '<button class="btn btn-netral" data-aksi="xls">' + Z.Ikon('unduh', 17) + 'Data Excel/CSV</button></div></section>';

      html += '<section class="grid2">' +
        U.kartuKpi({ label: 'Pemasukan', nilai: Z.rpSingkat(masuk), ikon: 'masuk', warna: 'ok' }) +
        U.kartuKpi({ label: 'Pengeluaran', nilai: Z.rpSingkat(keluar), ikon: 'keluar', warna: 'danger' }) +
        U.kartuKpi({ label: 'Laba Bersih', nilai: Z.rpSingkat(masuk - keluar), ikon: 'grafik', warna: 'kuning' }) +
        U.kartuKpi({ label: 'Order & Hari Sewa', nilai: ord.length + ' / ' + hariSewa, ikon: 'order', warna: 'info',
                     bawah: 'order / total hari' }) +
      '</section>';

      html += '<section class="kartu"><h3 class="t-judul">Peringkat Unit</h3>' +
        '<div style="margin-top:12px">' + U.peringkat(terlaris.map(function (t) {
          return { nama: t.nama, sub: t.plat + ' • ' + t.s.sewa + ' order • ' + t.s.hari + ' hari', nilai: t.nilai };
        })) + '</div></section>';

      html += '<section class="kartu"><h3 class="t-judul">Pelanggan Teratas</h3>' +
        '<div style="margin-top:12px">' + U.peringkat(pelTeratas) + '</div></section>';

      html += '<section class="kartu"><h3 class="t-judul">Rincian per Kategori</h3>' +
        '<div class="tabel-gulir" style="margin-top:10px"><table class="tabel"><thead><tr>' +
        '<th>Jenis</th><th>Kategori</th><th class="kanan">Jumlah</th></tr></thead><tbody>' +
        (Object.keys(perKat).length ? Object.keys(perKat).sort().map(function (k) {
          const b = k.split('|');
          return '<tr><td>' + U.badge(b[0], b[0] === 'Masuk' ? 'ok' : 'danger') + '</td><td>' + esc(b[1]) +
            '</td><td class="kanan">' + Z.rp(perKat[k]) + '</td></tr>';
        }).join('') : '<tr><td colspan="3" style="text-align:center;padding:18px" class="t-var">Belum ada transaksi pada periode ini.</td></tr>') +
        '</tbody></table></div></section>';
      return html;
    },
    setelah: function (root) {
      const sel = Z.$('#pilihBulan', root);
      if (sel) sel.addEventListener('change', function () {
        Z.Simpan.taruh('lapBulan', sel.value); global.App.render();
      });
      const pdf = Z.$('[data-aksi="pdf"]', root);
      if (pdf) pdf.addEventListener('click', async function () {
        const bulan = Z.Simpan.ambil('lapBulan', Z.hariIni().slice(0, 7));
        pdf.disabled = true;
        pdf.innerHTML = Z.Ikon('sinkron', 17, 'putar') + 'Menyiapkan…';
        const r = await global.App.kirim('dok.laporan', { bulan: bulan });
        pdf.disabled = false;
        pdf.innerHTML = Z.Ikon('dokumen', 17) + 'Laporan PDF';
        if (r.success) {
          window.open(r.data.url, '_blank', 'noopener');
          Z.toast('Laporan ' + r.data.judul + ' siap diunduh.');
        }
      });
      const xls = Z.$('[data-aksi="xls"]', root);
      if (xls) xls.addEventListener('click', function () {
        const bulan = Z.Simpan.ambil('lapBulan', Z.hariIni().slice(0, 7));
        const rows = [['Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Metode', 'Order', 'Unit', 'Keterangan']];
        (D().keuangan || []).filter(function (k) { return k.tanggal.indexOf(bulan) === 0; }).forEach(function (k) {
          const u = k.unit ? unit(k.unit) : null;
          rows.push([k.tanggal, k.jenis, k.kategori, k.nominal, k.metode, k.order, u ? u.nama : '', k.ket]);
        });
        P.unduhCsv(rows, 'laporan-' + bulan + '.csv');
      });
    }
  };

  function pelangganTeratas(bulan, batas) {
    const peta = {};
    (D().pesanan || []).forEach(function (o) {
      if (o.status === 'Batal') return;
      if (bulan && o.mulai.indexOf(bulan) !== 0) return;
      peta[o.pelanggan] = (peta[o.pelanggan] || 0) + o.dibayar;
    });
    return Object.keys(peta).map(function (id) {
      const p = pel(id);
      return { nama: p.nama || id, sub: (p.tag || '') + ' • ' + (p.totalSewa || 0) + '× sewa', nilai: peta[id] };
    }).sort(function (a, b) { return b.nilai - a.nilai; }).slice(0, batas || 5);
  }

  /* ================================================================
   * NOTIFIKASI WHATSAPP
   * ================================================================ */
  Hal.notifikasi = {
    judul: 'WhatsApp & Notifikasi', nav: 'lainnya',
    cfg: null,
    render: function () {
      const tab = Z.Simpan.ambil('notifTab', 'blast');
      const c = Hal.notifikasi.cfg;
      let html = '';
      html += '<section><div style="display:flex;align-items:center;gap:9px">' +
        '<button class="ikon-btn" data-nav="lainnya">' + Z.Ikon('panahKiri', 20) + '</button>' +
        '<div><h1 class="t-judul">WhatsApp & Notifikasi</h1>' +
        '<div class="t-sm t-var">Draft manual, pengingat otomatis, dan blast promo</div></div></div>' +
        '<div class="seg" style="margin-top:12px">' +
        [['blast', 'Blast'], ['antrean', 'Antrean'], ['atur', 'Konfigurasi']].map(function (t) {
          return '<button data-tab="' + t[0] + '"' + (tab === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>';
        }).join('') + '</div></section>';

      if (!c) { html += '<section>' + U.skeleton(3, 110) + '</section>'; return html; }

      if (tab === 'blast') html += tabBlast(c);
      else if (tab === 'antrean') html += tabAntrean();
      else html += tabAtur(c);
      return html;
    },
    setelah: function (root) {
      Z.$$('[data-tab]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          Z.Simpan.taruh('notifTab', b.getAttribute('data-tab'));
          global.App.render();
        });
      });
      if (!Hal.notifikasi.cfg) {
        global.App.kirim('notif.config', {}, { diam: true }).then(function (r) {
          if (r.success) { Hal.notifikasi.cfg = r.data; global.App.render(); }
        });
        return;
      }
      pasangBlast(root);
      pasangAtur(root);
      pasangAntrean(root);
    }
  };

  function tabBlast(c) {
    const daftar = (D().pelanggan || []).filter(function (p) { return p.wa && !p.optOut; });
    const langganan = daftar.filter(function (p) { return p.tag === 'Langganan'; });
    const pilihan = Z.Simpan.ambil('blastTarget', 'langganan');
    const target = pilihan === 'semua' ? daftar : (pilihan === 'langganan' ? langganan :
      daftar.filter(function (p) { return p.terakhir && p.terakhir < Z.tambahHari(Z.hariIni(), -60); }));
    const pesanDefault = (c.matriks && c.matriks.PROMO ? c.matriks.PROMO.pesan : '') ||
      'Halo {nama}! 🎉 Ada promo dari {usaha}.';

    return '<section class="kartu">' +
      '<h3 class="t-judul">1. Pilih Sasaran</h3>' +
      '<div class="pilih-grid" style="grid-template-columns:repeat(3,1fr);margin-top:11px">' +
        [['semua', 'Semua', daftar.length], ['langganan', 'Langganan', langganan.length],
         ['tidur', 'Lama tak sewa', daftar.filter(function (p) { return p.terakhir && p.terakhir < Z.tambahHari(Z.hariIni(), -60); }).length]]
        .map(function (t) {
          return '<button class="pilih' + (pilihan === t[0] ? ' on' : '') + '" data-blast-target="' + t[0] + '">' +
            '<div><div class="j" style="font-size:11.5px">' + t[1] + '</div><div class="s">' + t[2] + ' kontak</div></div></button>';
        }).join('') + '</div>' +
      '<div class="kotak" style="margin-top:11px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
        '<span class="t-sm t-var">Penerima valid</span><b>' + target.length + ' nomor</b></div>' +
      '<h3 class="t-judul" style="margin-top:17px">2. Tulis Pesan</h3>' +
      '<div class="field" style="margin-top:9px"><label>Isi pesan</label>' +
        '<textarea class="ta" id="blastPesan" rows="6" maxlength="1200">' + esc(pesanDefault) + '</textarea>' +
        '<div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">' +
        ['{nama}', '{usaha}', '{link}'].map(function (v) {
          return '<button class="chip" data-sisip="' + v + '">' + v + '</button>'; }).join('') + '</div></div>' +
      '<h3 class="t-judul" style="margin-top:6px">3. Kecepatan</h3>' +
      '<div class="grid2" style="margin-top:9px">' +
        '<div class="field" style="margin:0"><label>Batch per menit</label>' +
        '<select class="sel" id="blastBatch">' + [10, 20, 50].map(function (n) {
          return '<option value="' + n + '"' + (String(c.batch) === String(n) ? ' selected' : '') + '>' + n + ' pesan</option>';
        }).join('') + '</select></div>' +
        '<div class="field" style="margin:0"><label>Jeda antarpesan (detik)</label>' +
        '<input class="inp" id="blastJeda" value="' + esc(c.jeda) + '" placeholder="5 atau 3-8"></div></div>' +
      '<div class="kotak kotak-info" style="margin-top:11px;font-size:11.5px;line-height:1.6">' +
        Z.Ikon('info', 14) + ' Perkiraan selesai ± ' + Math.ceil(target.length / Number(c.batch || 20)) +
        ' menit. Server tetap mengirim walau halaman ditutup.</div>' +
      (!c.waAktif ? '<div class="kotak kotak-warn" style="margin-top:9px;font-size:11.5px">' +
        Z.Ikon('alert', 14) + ' WhatsApp otomatis belum aktif. Aktifkan di tab <b>Konfigurasi</b> agar blast bisa jalan. ' +
        'Tanpa itu Anda tetap bisa memakai tombol <b>Chat WA</b> manual di tiap kartu.</div>' : '') +
      '<button class="btn btn-utama btn-blok" style="margin-top:13px" id="blastKirim"' + (!c.waAktif ? ' disabled' : '') + '>' +
        Z.Ikon('kirim', 18) + 'Mulai Blast (' + target.length + ' nomor)</button>' +
    '</section>';
  }

  function pasangBlast(root) {
    Z.$$('[data-blast-target]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        Z.Simpan.taruh('blastTarget', b.getAttribute('data-blast-target'));
        global.App.render();
      });
    });
    Z.$$('[data-sisip]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        const ta = Z.$('#blastPesan', root);
        if (!ta) return;
        const pos = ta.selectionStart || ta.value.length;
        ta.value = ta.value.slice(0, pos) + b.getAttribute('data-sisip') + ta.value.slice(pos);
        ta.focus();
      });
    });
    const kirim = Z.$('#blastKirim', root);
    if (kirim) kirim.addEventListener('click', async function () {
      const pilihan = Z.Simpan.ambil('blastTarget', 'langganan');
      const daftar = (D().pelanggan || []).filter(function (p) { return p.wa && !p.optOut; });
      const target = pilihan === 'semua' ? daftar : (pilihan === 'langganan'
        ? daftar.filter(function (p) { return p.tag === 'Langganan'; })
        : daftar.filter(function (p) { return p.terakhir && p.terakhir < Z.tambahHari(Z.hariIni(), -60); }));
      const ya = await Z.konfirmasi({ judul: 'Kirim blast?',
        pesan: target.length + ' pesan WhatsApp akan dikirim bertahap. Pastikan isi pesan sudah benar.' });
      if (!ya) return;
      const r = await global.App.kirim('wa.blast', {
        pesan: Z.$('#blastPesan', root).value,
        batch: Number(Z.$('#blastBatch', root).value),
        penerima: target.map(function (p) { return p.id; })
      });
      if (r.success) { Z.Simpan.taruh('notifTab', 'antrean'); global.App.render(); }
    });
  }

  function tabAntrean() {
    const a = Hal.notifikasi.antrean;
    if (!a) return '<section>' + U.skeleton(2, 90) + '</section>';
    return '<section class="grid4">' +
      P.pilCounter('Antri', a.ringkas.Antri, 'var(--warn)') +
      P.pilCounter('Terkirim', a.ringkas.Terkirim, 'var(--ok)') +
      P.pilCounter('Gagal', a.ringkas.Gagal, 'var(--danger)') +
      P.pilCounter('Batal', a.ringkas.Batal, '') + '</section>' +
      '<section class="btn-grid">' +
      '<button class="btn btn-netral" id="prosesSekarang">' + Z.Ikon('kirim', 17) + 'Proses Sekarang</button>' +
      '<button class="btn btn-netral" id="ulangiGagal">' + Z.Ikon('sinkron', 17) + 'Ulangi yang Gagal</button></section>' +
      '<section style="display:flex;flex-direction:column;gap:8px">' +
      (a.rows.length ? a.rows.slice(0, 30).map(function (r) {
        const warna = r.status === 'Terkirim' ? 'ok' : (r.status === 'Gagal' ? 'danger' : 'warn');
        return '<article class="kartu kartu-rapat" style="display:flex;align-items:center;gap:10px">' +
          '<span class="kpi-ikon ' + warna + '">' + Z.Ikon(r.kanal === 'WA' ? 'wa' : 'kirim', 16) + '</span>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:12.5px">' + esc(r.nama || r.tujuan) + '</div>' +
          '<div class="t-sm t-var" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          esc(r.pesan.replace(/\n/g, ' ')) + '</div></div>' + U.badge(r.status, warna) + '</article>';
      }).join('') : '<div class="kartu">' + U.kosong('kirim', 'Antrean kosong', 'Semua notifikasi sudah terkirim.') + '</div>') +
      '</section>';
  }

  function pasangAntrean(root) {
    if (Z.Simpan.ambil('notifTab', 'blast') !== 'antrean') return;
    if (!Hal.notifikasi.antrean) {
      global.App.kirim('notif.antrean', {}, { diam: true }).then(function (r) {
        if (r.success) { Hal.notifikasi.antrean = r.data; global.App.render(); }
      });
      return;
    }
    const p = Z.$('#prosesSekarang', root);
    if (p) p.addEventListener('click', async function () {
      p.disabled = true;
      const r = await global.App.kirim('notif.proses', {});
      p.disabled = false;
      if (r.success) { Hal.notifikasi.antrean = null; global.App.render(); }
    });
    const u = Z.$('#ulangiGagal', root);
    if (u) u.addEventListener('click', async function () {
      const r = await global.App.kirim('notif.ulangi', {});
      if (r.success) { Hal.notifikasi.antrean = null; global.App.render(); }
    });
  }

  function tabAtur(c) {
    return '<section class="kartu">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
        '<div><div style="font-weight:700">WhatsApp Otomatis (Fonnte)</div>' +
        '<div class="t-sm t-var">Kirim pengingat & konfirmasi tanpa dibuka manual</div></div>' +
        '<label class="switch"><input type="checkbox" id="swWa"' + (c.waAktif ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="field" style="margin-top:13px"><label>Token Fonnte</label>' +
        '<input class="inp" type="password" id="fonnteToken" autocomplete="off" placeholder="' +
        esc(c.token.ada ? c.token.samar + ' (biarkan kosong bila tidak diubah)' : 'Tempel token dari fonnte.com') + '">' +
        '<div class="bantu">Token disimpan di Script Properties pada server Anda — tidak pernah dikirim balik ke peramban.</div></div>' +
      '<div class="btn-grid"><button class="btn btn-kecil btn-netral" id="cekDevice">' + Z.Ikon('perisai', 15) + 'Cek Perangkat</button>' +
        '<button class="btn btn-kecil btn-netral" id="tesWa">' + Z.Ikon('wa', 15) + 'Kirim Tes WA</button></div>' +
      '<div id="hasilDevice" class="t-sm t-var" style="margin-top:9px"></div>' +
      '<div class="grid2" style="margin-top:13px">' +
        '<div class="field" style="margin:0"><label>Batch blast</label><select class="sel" id="atBatch">' +
        [10, 20, 50].map(function (n) {
          return '<option value="' + n + '"' + (String(c.batch) === String(n) ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field" style="margin:0"><label>Jeda (detik)</label>' +
        '<input class="inp" id="atJeda" value="' + esc(c.jeda) + '"></div></div>' +
    '</section>' +

    '<section class="kartu">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
        '<div><div style="font-weight:700">Notifikasi Email</div>' +
        '<div class="t-sm t-var">Sisa kuota hari ini: ' + (c.kuotaEmail >= 0 ? c.kuotaEmail : '-') + ' email</div></div>' +
        '<label class="switch"><input type="checkbox" id="swEmail"' + (c.emailAktif ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="field" style="margin-top:13px;margin-bottom:0"><label>Email pemilik</label>' +
        '<input class="inp" type="email" id="emailPemilik" value="' + esc(c.emailPemilik) + '" placeholder="nama@gmail.com">' +
        '<div class="bantu">Penerima pengingat harian & laporan bulanan PDF.</div></div></section>' +

    '<section class="kartu"><h3 class="t-judul">Matriks Notifikasi Otomatis</h3>' +
      '<div class="t-sm t-var" style="margin-bottom:11px">Pilih kejadian mana yang dikirim lewat WhatsApp atau Email.</div>' +
      '<div style="display:flex;flex-direction:column;gap:9px">' +
      Object.keys(c.matriks).map(function (k) {
        const m = c.matriks[k];
        return '<div class="kotak" data-ev="' + esc(k) + '">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
            '<div style="min-width:0"><div style="font-weight:600;font-size:12.5px">' + esc(m.label) + '</div>' +
            '<div class="t-sm t-var" style="font-size:10px;font-family:ui-monospace,monospace">' + esc(k) + '</div></div>' +
            '<div style="display:flex;align-items:center;gap:12px;flex:none">' +
              '<label style="display:flex;align-items:center;gap:5px;font-size:11px">' +
                '<input type="checkbox" data-ev-wa="' + esc(k) + '"' + (m.wa ? ' checked' : '') + '> WA</label>' +
              '<label style="display:flex;align-items:center;gap:5px;font-size:11px">' +
                '<input type="checkbox" data-ev-em="' + esc(k) + '"' + (m.email ? ' checked' : '') + '> Email</label>' +
              '<button class="ikon-btn" style="width:30px;height:30px" data-ev-edit="' + esc(k) + '">' + Z.Ikon('pensil', 15) + '</button>' +
            '</div></div></div>';
      }).join('') + '</div>' +
      '<button class="btn btn-utama btn-blok" style="margin-top:14px" id="simpanNotif">' +
      Z.Ikon('check', 17) + 'Simpan Konfigurasi</button></section>';
  }

  function pasangAtur(root) {
    if (Z.Simpan.ambil('notifTab', 'blast') !== 'atur') return;
    const c = Hal.notifikasi.cfg;
    const cek = Z.$('#cekDevice', root);
    if (cek) cek.addEventListener('click', async function () {
      const el = Z.$('#hasilDevice', root);
      el.textContent = 'Memeriksa…';
      const r = await global.App.kirim('wa.device', {});
      el.innerHTML = r.success
        ? '<div class="kotak kotak-ok" style="font-size:11.5px">Nomor <b>' + esc(r.data.nomor) + '</b> • status <b>' +
          esc(r.data.status) + '</b> • paket ' + esc(r.data.paket) + ' • kuota ' + esc(String(r.data.kuota)) + '</div>'
        : '<div class="kotak kotak-danger" style="font-size:11.5px">' + esc(r.message) + '</div>';
    });
    const tes = Z.$('#tesWa', root);
    if (tes) tes.addEventListener('click', async function () {
      const no = prompt('Kirim pesan tes ke nomor WA mana?', global.App.set('WA_PEMILIK', ''));
      if (!no) return;
      await global.App.kirim('wa.test', { nomor: no });
    });
    Z.$$('[data-ev-edit]', root).forEach(function (b) {
      b.addEventListener('click', function () { editTemplate(b.getAttribute('data-ev-edit')); });
    });
    const simpan = Z.$('#simpanNotif', root);
    if (simpan) simpan.addEventListener('click', async function () {
      const matriks = {};
      Object.keys(c.matriks).forEach(function (k) {
        matriks[k] = {
          wa: Z.$('[data-ev-wa="' + k + '"]', root).checked,
          email: Z.$('[data-ev-em="' + k + '"]', root).checked,
          subjek: c.matriks[k].subjek, pesan: c.matriks[k].pesan
        };
      });
      const token = Z.$('#fonnteToken', root).value.trim();
      if (token) await global.App.kirim('rahasia.simpan', { kunci: 'FONNTE_TOKEN', nilai: token });
      const r = await global.App.kirim('notif.simpan', {
        waAktif: Z.$('#swWa', root).checked, emailAktif: Z.$('#swEmail', root).checked,
        batch: Number(Z.$('#atBatch', root).value), jeda: Z.$('#atJeda', root).value,
        emailPemilik: Z.$('#emailPemilik', root).value, matriks: matriks
      });
      if (r.success) {
        Hal.notifikasi.cfg = r.data;
        Z.toast('Konfigurasi notifikasi tersimpan.');
        await global.App.muatUlang(true);
      }
    });
  }

  function editTemplate(kode) {
    const c = Hal.notifikasi.cfg, m = c.matriks[kode];
    const isi = '<div class="field"><label>Judul / subjek email</label>' +
      '<input class="inp" id="tplSub" value="' + esc(m.subjek) + '"></div>' +
      '<div class="field"><label>Isi pesan</label>' +
      '<textarea class="ta" id="tplPesan" rows="9">' + esc(m.pesan) + '</textarea>' +
      '<div class="bantu">Variabel tersedia: {nama} {usaha} {unit} {plat} {order} {mulai} {kembali} {jam} ' +
      '{durasi} {total} {sisa} {denda} {hari} {perlengkapan} {kwitansi}<br>' +
      '<b>{kwitansi}</b> otomatis menjadi tautan kwitansi &amp; tanda terima order tersebut — ' +
      'penyewa bisa membukanya tanpa login. Kosong sendiri bila URL aplikasi belum diisi.</div></div>';
    const wrap = Z.Sheet.buka({ judul: m.label, ikon: 'wa', isi: isi,
      aksi: '<button class="btn btn-netral" data-reset>Kembalikan bawaan</button>' +
            '<button class="btn btn-utama" data-ok>Terapkan</button>' });
    Z.$('[data-reset]', wrap).addEventListener('click', function () {
      Z.$('#tplSub', wrap).value = m.subjekDefault;
      Z.$('#tplPesan', wrap).value = m.pesanDefault;
    });
    Z.$('[data-ok]', wrap).addEventListener('click', function () {
      m.subjek = Z.$('#tplSub', wrap).value;
      m.pesan = Z.$('#tplPesan', wrap).value;
      Z.Sheet.tutup();
      Z.toast('Template diperbarui — jangan lupa Simpan Konfigurasi.', 'info');
    });
  }

  /* ================================================================
   * PENGATURAN
   * ================================================================ */
  Hal.pengaturan = {
    judul: 'Pengaturan', nav: 'lainnya',
    render: function () {
      const s = D().pengaturan || {};
      function f(kunci, label, opsi) {
        opsi = opsi || {};
        return '<div class="field"><label>' + esc(label) + '</label>' +
          (opsi.rp ? '<div class="inp-rp"><span>Rp</span><input type="number" data-set="' + kunci + '" value="' +
            Z.num(s[kunci]) + '" step="' + (opsi.step || 5000) + '"></div>'
            : '<input class="inp" type="' + (opsi.tipe || 'text') + '" data-set="' + kunci + '" value="' +
              esc(s[kunci] || '') + '" placeholder="' + esc(opsi.ph || '') + '">') +
          (opsi.bantu ? '<div class="bantu">' + esc(opsi.bantu) + '</div>' : '') + '</div>';
      }
      function sw(kunci, label, bantu) {
        return '<div class="kotak" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px">' +
          '<div style="min-width:0"><div style="font-weight:600;font-size:12.5px">' + esc(label) + '</div>' +
          '<div class="t-sm t-var">' + esc(bantu) + '</div></div>' +
          '<label class="switch"><input type="checkbox" data-sw="' + kunci + '"' + (s[kunci] === 'YA' ? ' checked' : '') +
          '><i></i></label></div>';
      }

      /* Kotak unggah gambar (logo / favicon) — nilainya URL Drive hasil unggah. */
      function gambarKotak(kunci, label, nilai, bantu) {
        const ada = String(nilai || '').trim();
        return '<div class="unggah-kotak" data-unggah="' + kunci + '">' +
          '<div class="unggah-pratinjau" data-pratinjau="' + kunci + '">' +
            (ada ? '<img src="' + esc(ada) + '" alt="">' : Z.Ikon('kamera', 22)) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;font-size:12.5px">' + esc(label) + '</div>' +
            '<div class="t-sm t-var">' + esc(bantu || '') + '</div>' +
            '<div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">' +
              '<button type="button" class="btn btn-kecil btn-netral" data-pilih-gambar="' + kunci + '">Pilih berkas</button>' +
              (ada ? '<button type="button" class="btn btn-kecil btn-netral" data-hapus-gambar="' + kunci + '">Hapus</button>' : '') +
            '</div>' +
          '</div>' +
          '<input type="hidden" data-set="' + kunci + '" value="' + esc(ada) + '">' +
          '<input type="file" accept="image/*" hidden data-file="' + kunci + '">' +
        '</div>';
      }

      function warnaKotak(kunci, label, nilai) {
        return '<div class="warna-kotak">' +
          '<input type="color" data-warna="' + kunci + '" value="' + esc(nilai) + '" aria-label="' + esc(label) + '">' +
          '<div style="min-width:0"><div style="font-weight:600;font-size:12px">' + esc(label) + '</div>' +
          '<div class="t-sm t-var warna-kode" data-kode="' + kunci + '">' + esc(nilai.toUpperCase()) + '</div></div>' +
          '<input type="hidden" data-set="' + kunci + '" value="' + esc(nilai) + '">' +
        '</div>';
      }

      function lengkapBarisHtml(arr) {
        if (!arr.length) return '<div class="t-sm t-var" style="padding:10px 2px">Belum ada perlengkapan.</div>';
        return arr.map(function (o, i) {
          return '<div class="lengkap-baris on" data-set-lengkap="' + i + '">' +
            '<input class="inp lengkap-nama-inp" data-lnama="' + i + '" value="' + esc(o.n) + '" maxlength="40">' +
            '<div class="stepper">' +
              '<button type="button" class="stepper-b" data-lkurang="' + i + '" aria-label="Kurangi">−</button>' +
              '<span class="stepper-n" data-ljml="' + i + '">' + (Z.num(o.j) || 1) + '</span>' +
              '<button type="button" class="stepper-b" data-ltambah="' + i + '" aria-label="Tambah">+</button>' +
            '</div>' +
            '<button type="button" class="ikon-btn ikon-btn-kecil" data-lhapus="' + i + '" aria-label="Hapus">' +
              Z.Ikon('sampah', 16) + '</button>' +
          '</div>';
        }).join('');
      }

      let html = '';
      html += '<section><div style="display:flex;align-items:center;gap:9px">' +
        '<button class="ikon-btn" data-nav="lainnya">' + Z.Ikon('panahKiri', 20) + '</button>' +
        '<div><h1 class="t-judul">Pengaturan</h1><div class="t-sm t-var">Identitas usaha, tarif, dan fitur opsional</div></div></div></section>';

      html += '<section class="kartu"><h3 class="t-judul">Identitas Usaha</h3><div style="margin-top:12px">' +
        f('NAMA_USAHA', 'Nama usaha') + f('SLOGAN', 'Slogan') + f('ALAMAT', 'Alamat') +
        f('WA_PEMILIK', 'Nomor WA pemilik', { tipe: 'tel', bantu: 'Penerima pengingat harian.' }) +
        f('APP_URL', 'Alamat aplikasi (GitHub Pages)', { ph: 'https://nama.github.io/zan-rental-dashboard/',
          bantu: 'Dipakai untuk QR kwitansi dan tautan kwitansi {kwitansi} di pesan WhatsApp. ' +
            'Selama kosong, tautan itu tidak ikut terkirim.' }) +
        '</div></section>';

      html += '<section class="kartu"><h3 class="t-judul">Tarif & Kebijakan</h3><div style="margin-top:12px">' +
        f('TARIF_DENDA_HARI', 'Denda keterlambatan per hari', { rp: true }) +
        f('BIAYA_ANTAR', 'Biaya antar-jemput standar', { rp: true }) +
        f('TARGET_BULANAN', 'Target pemasukan bulanan', { rp: true, step: 500000 }) +
        f('BATAS_LANGGANAN', 'Jumlah sewa agar jadi “Langganan”', { tipe: 'number' }) +
        f('INGAT_PAJAK_HARI', 'Peringatan pajak STNK (H- berapa hari)', { tipe: 'number' }) +
        f('INGAT_SERVIS_KM', 'Peringatan servis (sisa km)', { tipe: 'number' }) +
        '</div></section>';

      html += '<section class="kartu"><h3 class="t-judul">Fitur Opsional</h3><div style="margin-top:12px">' +
        sw('FITUR_DEPOSIT', 'Deposit jaminan', 'Tampilkan kolom deposit pada form order') +
        sw('FITUR_DENDA', 'Denda otomatis', 'Hitung denda saat pengembalian terlambat') +
        sw('FITUR_KTP', 'Unggah KTP/SIM', 'Simpan berkas identitas pelanggan ke Drive') +
        sw('FITUR_ANTAR', 'Antar-jemput', 'Aktifkan layanan antar unit ke lokasi') +
        '</div></section>';

      /* ---------- Merek: logo, favicon, judul ---------- */
      html += '<section class="kartu"><h3 class="t-judul">Logo & Identitas Aplikasi</h3>' +
        '<div class="grid2" style="margin-top:12px;gap:10px">' +
          gambarKotak('MEREK_LOGO', 'Logo aplikasi', s.MEREK_LOGO, 'Tampil di bar atas, side-rail, dan layar masuk.') +
          global.panduanUnggah([
            'Pakai <b>PNG berlatar transparan</b> supaya logo menyatu di tema terang maupun gelap. ' +
              'JPG selalu punya latar kotak putih.',
            'Bentuk <b>persegi atau mendekati persegi</b>, minimal 320×320 px.',
            'Beri sedikit ruang kosong di tepi — logo yang mepet akan terlihat terpotong di dudukan bulat.',
            'Logo bertulisan panjang akan mengecil dan tidak terbaca; pakai versi ikon/inisialnya saja.'
          ], 'Otomatis dikecilkan ke 320 px. Setelah diunggah, tekan <b>Simpan Pengaturan</b> agar diterapkan.') +
          gambarKotak('MEREK_FAVICON', 'Favicon tab', s.MEREK_FAVICON, 'Ikon kecil pada tab peramban.') +
          global.panduanUnggah([
            'Tampil hanya <b>16–32 px</b> — pakai satu huruf atau simbol, jangan logo lengkap.',
            'Kontras tinggi, PNG transparan, bentuk persegi.'
          ], 'Otomatis dikecilkan ke 128 px. Kosongkan untuk memakai ikon bawaan warna merek Anda.') +
        '</div>' +
        '<div style="margin-top:12px">' +
          f('MEREK_JUDUL', 'Judul pada bar atas', { ph: 'ZAN Dashboard' }) +
          f('MEREK_SUBJUDUL', 'Subjudul kecil', { ph: 'Operasional' }) +
        '</div></section>';

      /* ---------- Warna & font ---------- */
      const PRESET = [
        { n: 'ZAN Kuning', a: '#FFE600', t: '#0B0B0F', u: '#69567E' },
        { n: 'Jingga',     a: '#FF8A00', t: '#101014', u: '#5B4B8A' },
        { n: 'Hijau',      a: '#21C05B', t: '#0C1410', u: '#2F6F57' },
        { n: 'Biru',       a: '#2F7BFF', t: '#0B1020', u: '#4A5A8A' },
        { n: 'Merah',      a: '#FF4D4D', t: '#140B0B', u: '#8A4B5B' }
      ];
      html += '<section class="kartu"><h3 class="t-judul">Warna & Font</h3>' +
        '<div class="t-sm t-var" style="margin-top:4px">Perubahan langsung terlihat sebelum disimpan.</div>' +
        '<div class="preset-baris">' + PRESET.map(function (p) {
          return '<button type="button" class="preset-warna" data-preset=\'' + JSON.stringify(p) + '\' title="' + esc(p.n) + '">' +
            '<span style="background:' + p.a + '"></span><span style="background:' + p.u + '"></span>' +
            '<span style="background:' + p.t + '"></span><b>' + esc(p.n) + '</b></button>';
        }).join('') + '</div>' +
        '<div class="grid2" style="margin-top:12px;gap:10px">' +
          warnaKotak('WARNA_AKSEN', 'Aksi utama', s.WARNA_AKSEN || '#FFE600') +
          warnaKotak('WARNA_SEKUNDER', 'Panel & grafik', s.WARNA_SEKUNDER || '#69567E') +
          warnaKotak('WARNA_TINTA', 'Teks & kontras', s.WARNA_TINTA || '#0B0B0F') +
        '</div>' +
        '<div class="field" style="margin-top:12px;margin-bottom:0"><label>Font aplikasi</label>' +
          '<div class="pilih-grid" id="pilihFont">' +
          ['Poppins', 'Sistem', 'Bulat', 'Serif'].map(function (nf) {
            const on = (s.FONT_APP || 'Poppins') === nf;
            return '<button type="button" class="pilih' + (on ? ' on' : '') + '" data-font="' + nf + '">' +
              '<span class="j">' + nf + '</span></button>';
          }).join('') + '</div>' +
          '<div class="bantu">Poppins dipaketkan bersama aplikasi sehingga selalu tampil sama. ' +
          'Tiga pilihan lain memakai font bawaan perangkat — paling ringan, tetapi bentuknya ' +
          'bisa sedikit berbeda antara Android, iPhone, dan komputer.</div></div>' +
        '<button class="btn btn-netral btn-blok btn-kecil" style="margin-top:10px" id="resetWarna">' +
          Z.Ikon('sinkron', 15) + 'Kembalikan warna & font bawaan</button>' +
      '</section>';

      /* ---------- Perlengkapan ---------- */
      let lengkap = [];
      try { lengkap = JSON.parse(s.PERLENGKAPAN_OPSI || '[]') || []; } catch (e) { lengkap = []; }
      html += '<section class="kartu"><h3 class="t-judul">Daftar Perlengkapan</h3>' +
        '<div class="t-sm t-var" style="margin-top:4px">Pilihan yang muncul saat membuat order. ' +
        'Angka di sebelahnya adalah jumlah bawaan saat dicentang.</div>' +
        '<div id="setLengkap" class="lengkap-daftar">' + lengkapBarisHtml(lengkap) + '</div>' +
        '<button class="btn btn-netral btn-blok btn-kecil" style="margin-top:9px" id="setLengkapTambah">' +
          Z.Ikon('plus', 15) + 'Tambah jenis perlengkapan</button></section>';

      /* ---------- Metode pembayaran ---------- */
      let bayar = [];
      try { bayar = JSON.parse(s.METODE_BAYAR_OPSI || '[]') || []; } catch (e) { bayar = []; }
      if (!bayar.length) bayar = ['Tunai', 'Transfer BCA', 'QRIS'];
      html += '<section class="kartu"><h3 class="t-judul">Metode Pembayaran</h3>' +
        '<div class="t-sm t-var" style="margin-top:4px">Pilihan yang muncul di form order dan catat transaksi. ' +
        'Urutannya di sini menentukan urutan tombolnya.</div>' +
        '<div id="setBayar" class="lengkap-daftar">' + bayarBarisHtml(bayar) + '</div>' +
        '<button class="btn btn-netral btn-blok btn-kecil" style="margin-top:9px" id="setBayarTambah">' +
          Z.Ikon('plus', 15) + 'Tambah metode pembayaran</button></section>';

      /* ---------- Foto serah terima ---------- */
      html += '<section class="kartu"><h3 class="t-judul">Foto Serah Terima</h3>' +
        '<div class="t-sm t-var" style="margin-top:4px">Foto bukti <b>penyerahan unit dari Anda ke penyewa</b>. ' +
        'Centang <b>Wajib</b> agar serah terima tidak bisa disimpan sebelum foto itu diambil.</div>' +
        '<div id="setFoto" style="margin-top:10px;display:flex;flex-direction:column;gap:7px">' +
          fotoBarisHtml(sudutFoto()) +
        '</div>' +
        '<button class="btn btn-netral btn-blok btn-kecil" style="margin-top:9px" id="setFotoTambah">' +
          Z.Ikon('plus', 15) + 'Tambah kotak foto</button>' +
        '<div class="kotak" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px">' +
          '<div style="min-width:0"><div style="font-weight:600;font-size:12.5px">Foto saat unit dikembalikan</div>' +
          '<div class="t-sm t-var">Tambahan opsional. Bila mati, aplikasi hanya meminta foto serah terima.</div></div>' +
          '<label class="switch"><input type="checkbox" id="setFotoKembali"' +
            (fotoKembaliAktif() ? ' checked' : '') + '><span></span></label>' +
        '</div></section>';
      /* ---------- Template kwitansi ---------- */
      let kw = {};
      try { kw = JSON.parse(s.KWITANSI_OPSI || '{}') || {}; } catch (e) { kw = {}; }
      function kwSw(k, label, bantu) {
        return '<div class="kotak" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px">' +
          '<div style="min-width:0"><div style="font-weight:600;font-size:12.5px">' + esc(label) + '</div>' +
          '<div class="t-sm t-var">' + esc(bantu) + '</div></div>' +
          '<label class="switch"><input type="checkbox" data-kw="' + k + '"' + (kw[k] !== false ? ' checked' : '') +
          '><i></i></label></div>';
      }
      html += '<section class="kartu"><h3 class="t-judul">Template Kwitansi PDF</h3>' +
        '<div class="field" style="margin-top:12px"><label>Bentuk kop surat</label>' +
          '<div class="pilih-grid" id="pilihKop">' +
          [['penuh', 'Kop penuh'], ['ringkas', 'Ringkas'], ['polos', 'Tanpa kop']].map(function (o) {
            const on = (kw.kop || 'penuh') === o[0];
            return '<button type="button" class="pilih' + (on ? ' on' : '') + '" data-kop="' + o[0] + '">' +
              '<span class="j">' + o[1] + '</span></button>';
          }).join('') + '</div></div>' +
        kwSw('logo', 'Tampilkan logo', 'Logo usaha di sudut kiri atas kwitansi') +
        kwSw('qr', 'QR verifikasi', 'Pelanggan bisa memeriksa keaslian kwitansi') +
        kwSw('perlengkapan', 'Rincian perlengkapan', 'Cantumkan helm, jas hujan, dll yang dibawa') +
        kwSw('catatan', 'Catatan order', 'Tampilkan catatan kondisi unit') +
        kwSw('tandaTangan', 'Kolom tanda tangan', 'Ruang tanda tangan penyewa & petugas') +
        kwSw('warna', 'Cetak berwarna', 'Matikan untuk hemat tinta printer') +
        '<div class="field"><label>Judul dokumen</label>' +
          '<input class="inp" data-kwteks="judul" maxlength="60" value="' + esc(kw.judul || '') + '" ' +
          'placeholder="KWITANSI SEWA MOTOR"></div>' +
        '<div class="field"><label>Kalimat pembuka</label>' +
          '<input class="inp" data-kwteks="pembuka" maxlength="160" value="' + esc(kw.pembuka || '') + '" ' +
          'placeholder="Telah diterima pembayaran sewa kendaraan dengan rincian berikut."></div>' +
        '<div class="field"><label>Syarat & ketentuan</label>' +
          '<textarea class="inp" data-kwteks="syarat" rows="4" maxlength="600" ' +
          'placeholder="Satu baris satu poin. Contoh:\nKerusakan di luar pemakaian wajar menjadi tanggung jawab penyewa.">' +
          esc(kw.syarat || '') + '</textarea>' +
          '<div class="bantu">Satu baris akan dicetak sebagai satu poin bernomor.</div></div>' +
        '<div class="field" style="margin-bottom:0"><label>Kalimat penutup</label>' +
          '<input class="inp" data-kwteks="kakiTeks" maxlength="120" value="' + esc(kw.kakiTeks || '') + '" ' +
          'placeholder="Terima kasih telah menyewa di ZAN Rental."></div>' +
        '<button class="btn btn-netral btn-blok btn-kecil" style="margin-top:10px" id="pratinjauKwitansi">' +
          Z.Ikon('dokumen', 15) + 'Pratinjau kwitansi contoh</button></section>';

      /* ---------- Draft WA ---------- */
      html += '<section class="kartu"><h3 class="t-judul">Draft Pesan WhatsApp</h3>' +
        '<div class="t-sm t-var" style="margin-top:4px">Teks yang terisi otomatis saat menghubungi pelanggan — ' +
        'konfirmasi order, pengingat kembali, penagihan denda, dan ucapan terima kasih. ' +
        'Tersedia penanda seperti {nama}, {unit}, {total}, {tanggal}.</div>' +
        '<button class="btn btn-netral btn-blok" style="margin-top:11px" data-nav="notifikasi">' +
          Z.Ikon('wa', 17) + 'Buka editor draft pesan</button></section>';

      html += '<section class="kartu"><h3 class="t-judul">Tampilan</h3>' +
        '<div class="kotak" style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px">' +
        '<div><div style="font-weight:600;font-size:12.5px">Mode gelap</div>' +
        '<div class="t-sm t-var">Nyaman dipakai malam hari</div></div>' +
        '<label class="switch"><input type="checkbox" id="swTema"' +
        (document.documentElement.getAttribute('data-tema') === 'gelap' ? ' checked' : '') + '><i></i></label></div></section>';

      html += '<section class="kartu"><h3 class="t-judul">Keamanan</h3>' +
        '<button class="btn btn-netral btn-blok" style="margin-top:12px" id="gantiPin">' +
        Z.Ikon('kunci', 17) + 'Ganti PIN Masuk</button>' +
        '<button class="btn btn-netral btn-blok" style="margin-top:9px" data-nav="impor">' +
        Z.Ikon('import', 17) + 'Import Data dari Aplikasi Lama</button>' +
        '<button class="btn btn-netral btn-blok" style="margin-top:9px" data-nav="struk">' +
        Z.Ikon('cetak', 17) + 'Atur Model Struk & Printer</button></section>';

      html += '<section><button class="btn btn-utama btn-blok" id="simpanSet">' +
        Z.Ikon('check', 18) + 'Simpan Pengaturan</button></section>';
      return html;
    },
    setelah: function (root) {
      const sw = Z.$('#swTema', root);
      if (sw) sw.addEventListener('change', function (e) { global.App.gantiTema(sw.checked ? 'gelap' : 'terang', e); });
      const gp = Z.$('#gantiPin', root);
      if (gp) gp.addEventListener('click', formGantiPin);

      /* ---------- Unggah logo & favicon ---------- */
      Z.$$('[data-pilih-gambar]', root).forEach(function (b) {
        const k = b.getAttribute('data-pilih-gambar');
        b.addEventListener('click', function () { Z.$('[data-file="' + k + '"]', root).click(); });
      });
      Z.$$('[data-file]', root).forEach(function (inp) {
        const k = inp.getAttribute('data-file');
        inp.addEventListener('change', async function () {
          const berkas = inp.files && inp.files[0];
          if (!berkas) return;
          if (!/^image\//.test(berkas.type)) return Z.toast('Pilih berkas gambar.', 'err');
          try {
            // Dikecilkan di peramban dulu: logo besar tidak ada gunanya dan
            // hanya memperlambat pemuatan aplikasi tiap kali dibuka.
            const kecil = await kecilkanGambar(berkas, k === 'MEREK_FAVICON' ? 128 : 320);
            Z.toast('Mengunggah…');
            const r = await global.App.kirim('upload.foto', {
              base64: kecil, mime: 'image/png', jenis: 'dokumen', nama: k.toLowerCase()
            });
            if (!r.success) return;
            Z.$('[data-set="' + k + '"]', root).value = r.data.url;
            const pv = Z.$('[data-pratinjau="' + k + '"]', root);
            if (pv) pv.innerHTML = '<img src="' + Z.esc(r.data.url) + '" alt="">';
            Z.toast('Gambar siap. Tekan Simpan Pengaturan untuk menerapkan.');
          } catch (e) { Z.toast('Gagal memproses gambar: ' + e.message, 'err'); }
          inp.value = '';
        });
      });
      Z.$$('[data-hapus-gambar]', root).forEach(function (b) {
        const k = b.getAttribute('data-hapus-gambar');
        b.addEventListener('click', function () {
          Z.$('[data-set="' + k + '"]', root).value = '';
          const pv = Z.$('[data-pratinjau="' + k + '"]', root);
          if (pv) pv.innerHTML = Z.Ikon('kamera', 22);
          b.remove();
          Z.toast('Gambar dilepas. Tekan Simpan Pengaturan.');
        });
      });

      /* ---------- Warna: pratinjau langsung ---------- */
      const PETA_VAR = { WARNA_AKSEN: '--kuning', WARNA_SEKUNDER: '--ungu', WARNA_TINTA: '--ink' };
      function pakaiWarna(k, v) {
        Z.$('[data-set="' + k + '"]', root).value = v;
        const kode = Z.$('[data-kode="' + k + '"]', root);
        if (kode) kode.textContent = v.toUpperCase();
        const inp = Z.$('[data-warna="' + k + '"]', root);
        if (inp && inp.value !== v) inp.value = v;
        document.documentElement.style.setProperty(PETA_VAR[k], v);
      }
      Z.$$('[data-warna]', root).forEach(function (inp) {
        inp.addEventListener('input', function () { pakaiWarna(inp.getAttribute('data-warna'), inp.value); });
      });
      Z.$$('[data-preset]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          let p; try { p = JSON.parse(b.getAttribute('data-preset')); } catch (e) { return; }
          pakaiWarna('WARNA_AKSEN', p.a); pakaiWarna('WARNA_SEKUNDER', p.u); pakaiWarna('WARNA_TINTA', p.t);
        });
      });
      let fontPilih = (D().pengaturan || {}).FONT_APP || 'Poppins';
      Z.$$('[data-font]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          fontPilih = b.getAttribute('data-font');
          Z.$$('[data-font]', root).forEach(function (x) { x.classList.toggle('on', x === b); });
          document.documentElement.style.setProperty('--font-app',
            (global.Merek && global.Merek.FONT[fontPilih]) || 'Poppins, sans-serif');
        });
      });
      const rw = Z.$('#resetWarna', root);
      if (rw) rw.addEventListener('click', function () {
        pakaiWarna('WARNA_AKSEN', '#FFE600'); pakaiWarna('WARNA_SEKUNDER', '#69567E'); pakaiWarna('WARNA_TINTA', '#0B0B0F');
        fontPilih = 'Poppins';
        Z.$$('[data-font]', root).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-font') === 'Poppins'); });
        document.documentElement.style.setProperty('--font-app', global.Merek.FONT.Poppins);
        Z.toast('Warna & font kembali ke bawaan. Tekan Simpan Pengaturan.');
      });

      /* ---------- Daftar perlengkapan ---------- */
      let lengkap = [];
      try { lengkap = JSON.parse((D().pengaturan || {}).PERLENGKAPAN_OPSI || '[]') || []; } catch (e) { lengkap = []; }
      function gambarLengkap() {
        const wadah = Z.$('#setLengkap', root);
        if (!wadah) return;
        wadah.innerHTML = lengkap.length
          ? lengkap.map(function (o, i) {
              return '<div class="lengkap-baris on" data-set-lengkap="' + i + '">' +
                '<input class="inp lengkap-nama-inp" data-lnama="' + i + '" value="' + esc(o.n) + '" maxlength="40">' +
                '<div class="stepper">' +
                  '<button type="button" class="stepper-b" data-lkurang="' + i + '" aria-label="Kurangi">−</button>' +
                  '<span class="stepper-n" data-ljml="' + i + '">' + (Z.num(o.j) || 1) + '</span>' +
                  '<button type="button" class="stepper-b" data-ltambah="' + i + '" aria-label="Tambah">+</button>' +
                '</div>' +
                '<button type="button" class="ikon-btn ikon-btn-kecil" data-lhapus="' + i + '" aria-label="Hapus">' +
                  Z.Ikon('sampah', 16) + '</button></div>';
            }).join('')
          : '<div class="t-sm t-var" style="padding:10px 2px">Belum ada perlengkapan.</div>';
        ikatLengkap();
      }
      function ikatLengkap() {
        Z.$$('[data-lnama]', root).forEach(function (i) {
          i.addEventListener('input', function () { lengkap[Z.num(i.getAttribute('data-lnama'))].n = i.value; });
        });
        Z.$$('[data-ltambah]', root).forEach(function (b) {
          b.addEventListener('click', function () {
            const n = Z.num(b.getAttribute('data-ltambah'));
            lengkap[n].j = Math.min(20, (Z.num(lengkap[n].j) || 1) + 1);
            Z.$('[data-ljml="' + n + '"]', root).textContent = lengkap[n].j;
          });
        });
        Z.$$('[data-lkurang]', root).forEach(function (b) {
          b.addEventListener('click', function () {
            const n = Z.num(b.getAttribute('data-lkurang'));
            lengkap[n].j = Math.max(1, (Z.num(lengkap[n].j) || 1) - 1);
            Z.$('[data-ljml="' + n + '"]', root).textContent = lengkap[n].j;
          });
        });
        Z.$$('[data-lhapus]', root).forEach(function (b) {
          b.addEventListener('click', function () {
            lengkap.splice(Z.num(b.getAttribute('data-lhapus')), 1);
            gambarLengkap();
          });
        });
      }
      ikatLengkap();
      const tl = Z.$('#setLengkapTambah', root);
      if (tl) tl.addEventListener('click', function () {
        Z.tanya({ judul: 'Tambah perlengkapan', label: 'Nama', placeholder: 'Contoh: Box Belakang', maks: 40 })
          .then(function (nama) {
            nama = String(nama || '').trim();
            if (!nama) return;
            if (lengkap.some(function (o) { return o.n.toLowerCase() === nama.toLowerCase(); }))
              return Z.toast('“' + nama + '” sudah ada.', 'err');
            lengkap.push({ n: nama, j: 1 });
            gambarLengkap();
          });
      });

      /* ---------- Daftar metode pembayaran ---------- */
      let bayar = [];
      try { bayar = JSON.parse((D().pengaturan || {}).METODE_BAYAR_OPSI || '[]') || []; } catch (e) { bayar = []; }
      if (!bayar.length) bayar = ['Tunai', 'Transfer BCA', 'QRIS'];
      function gambarBayar() {
        const wadah = Z.$('#setBayar', root);
        if (!wadah) return;
        wadah.innerHTML = bayarBarisHtml(bayar);
        ikatBayar();
      }
      function ikatBayar() {
        Z.$$('[data-bnama]', root).forEach(function (i) {
          i.addEventListener('input', function () { bayar[Z.num(i.getAttribute('data-bnama'))] = i.value; });
        });
        Z.$$('[data-bnaik]', root).forEach(function (b2) {
          b2.addEventListener('click', function () {
            const n = Z.num(b2.getAttribute('data-bnaik'));
            if (n <= 0) return;
            const t = bayar[n - 1]; bayar[n - 1] = bayar[n]; bayar[n] = t;
            gambarBayar();
          });
        });
        Z.$$('[data-bturun]', root).forEach(function (b2) {
          b2.addEventListener('click', function () {
            const n = Z.num(b2.getAttribute('data-bturun'));
            if (n >= bayar.length - 1) return;
            const t = bayar[n + 1]; bayar[n + 1] = bayar[n]; bayar[n] = t;
            gambarBayar();
          });
        });
        Z.$$('[data-bhapus]', root).forEach(function (b2) {
          b2.addEventListener('click', function () {
            if (bayar.length <= 1) return Z.toast('Minimal satu metode pembayaran harus ada.', 'err');
            bayar.splice(Z.num(b2.getAttribute('data-bhapus')), 1);
            gambarBayar();
          });
        });
      }
      ikatBayar();
      const tb = Z.$('#setBayarTambah', root);
      if (tb) tb.addEventListener('click', function () {
        Z.tanya({ judul: 'Tambah metode pembayaran', label: 'Nama metode', placeholder: 'Contoh: Transfer BRI', maks: 30 })
          .then(function (nama) {
            nama = String(nama || '').trim();
            if (!nama) return;
            if (bayar.some(function (x) { return String(x).toLowerCase() === nama.toLowerCase(); }))
              return Z.toast('“' + nama + '” sudah ada.', 'err');
            if (bayar.length >= 10) return Z.toast('Maksimal 10 metode pembayaran.', 'err');
            bayar.push(nama);
            gambarBayar();
          });
      });

      /* ---------- Kotak foto serah terima ---------- */
      let sudut = sudutFoto();
      function gambarFoto() {
        const wadah = Z.$('#setFoto', root);
        if (!wadah) return;
        wadah.innerHTML = fotoBarisHtml(sudut);
        ikatFoto();
      }
      function ikatFoto() {
        Z.$$('[data-fnama]', root).forEach(function (i) {
          i.addEventListener('input', function () { sudut[Z.num(i.getAttribute('data-fnama'))].l = i.value; });
        });
        Z.$$('[data-fwajib]', root).forEach(function (i) {
          i.addEventListener('change', function () { sudut[Z.num(i.getAttribute('data-fwajib'))].wajib = i.checked; });
        });
        Z.$$('[data-fhapus]', root).forEach(function (b2) {
          b2.addEventListener('click', function () {
            if (sudut.length <= 1) return Z.toast('Minimal satu kotak foto harus ada.', 'err');
            sudut.splice(Z.num(b2.getAttribute('data-fhapus')), 1);
            gambarFoto();
          });
        });
      }
      ikatFoto();
      const tf = Z.$('#setFotoTambah', root);
      if (tf) tf.addEventListener('click', function () {
        Z.tanya({ judul: 'Tambah kotak foto', label: 'Nama kotak', placeholder: 'Contoh: KTP penyewa', maks: 24 })
          .then(function (nama) {
            nama = String(nama || '').trim();
            if (!nama) return;
            if (sudut.some(function (x) { return x.l.toLowerCase() === nama.toLowerCase(); }))
              return Z.toast('“' + nama + '” sudah ada.', 'err');
            if (sudut.length >= 10) return Z.toast('Maksimal 10 kotak foto.', 'err');
            sudut.push({ k: kunciSudut(nama, sudut.map(function (x) { return x.k; })), l: nama, wajib: false });
            gambarFoto();
          });
      });

      /* ---------- Template kwitansi ---------- */
      let kop = null;
      Z.$$('[data-kop]', root).forEach(function (b) {
        if (b.classList.contains('on')) kop = b.getAttribute('data-kop');
        b.addEventListener('click', function () {
          kop = b.getAttribute('data-kop');
          Z.$$('[data-kop]', root).forEach(function (x) { x.classList.toggle('on', x === b); });
        });
      });
      const pk = Z.$('#pratinjauKwitansi', root);
      if (pk) pk.addEventListener('click', async function () {
        const o = (D().pesanan || []).filter(function (x) { return x.status === 'Selesai'; })[0] || (D().pesanan || [])[0];
        if (!o) return Z.toast('Belum ada order untuk dijadikan contoh.', 'err');
        Z.toast('Menyiapkan pratinjau…');
        const r = await global.App.kirim('dok.kwitansi', { id: o.id });
        if (r.success && r.data && r.data.url) global.open(r.data.url, '_blank');
      });

      /* ---------- Simpan ---------- */
      const sp = Z.$('#simpanSet', root);
      if (sp) sp.addEventListener('click', async function () {
        const nilai = {};
        Z.$$('[data-set]', root).forEach(function (i) { nilai[i.getAttribute('data-set')] = i.value; });
        Z.$$('[data-sw]', root).forEach(function (i) { nilai[i.getAttribute('data-sw')] = i.checked ? 'YA' : 'TIDAK'; });
        nilai.FONT_APP = fontPilih;
        nilai.PERLENGKAPAN_OPSI = JSON.stringify(
          lengkap.map(function (o) { return { n: String(o.n || '').trim(), j: Z.num(o.j) || 1 }; })
                 .filter(function (o) { return o.n; }));
        nilai.METODE_BAYAR_OPSI = JSON.stringify(
          bayar.map(function (x) { return String(x || '').trim(); })
               .filter(function (x, i, arr) { return x && arr.indexOf(x) === i; }));
        // Kotak foto: nama boleh diubah, kuncinya dipertahankan supaya foto
        // yang sudah tersimpan tetap cocok dengan kotaknya.
        const dipakai = [];
        const sdSimpan = sudut.map(function (x) {
          const l = String(x.l || '').trim();
          if (!l) return null;
          const k = x.k || kunciSudut(l, dipakai);
          dipakai.push(k);
          return { k: k, l: l, wajib: !!x.wajib };
        }).filter(Boolean);
        if (sdSimpan.length) nilai.FOTO_SERAH_SUDUT = JSON.stringify(sdSimpan);
        const swFk = Z.$('#setFotoKembali', root);
        if (swFk) nilai.FOTO_KEMBALI_AKTIF = swFk.checked ? 'YA' : 'TIDAK';

        const kw = { kop: kop || 'penuh' };
        Z.$$('[data-kw]', root).forEach(function (i) { kw[i.getAttribute('data-kw')] = i.checked; });
        Z.$$('[data-kwteks]', root).forEach(function (i) { kw[i.getAttribute('data-kwteks')] = i.value; });
        nilai.KWITANSI_OPSI = JSON.stringify(kw);

        sp.disabled = true;
        const r = await global.App.kirim('pengaturan.simpan', { nilai: nilai });
        sp.disabled = false;
        if (r.success) {
          await global.App.muatUlang(true);
          global.Merek.terapkan();
        }
      });
    }
  };

  function formGantiPin() {
    const isi = '<div class="field"><label>PIN lama</label>' +
      '<input class="inp" type="password" id="pinLama" inputmode="numeric" maxlength="6" autocomplete="off"></div>' +
      '<div class="field"><label>PIN baru (6 angka)</label>' +
      '<input class="inp" type="password" id="pinBaru" inputmode="numeric" maxlength="6" autocomplete="off"></div>' +
      '<div class="field" style="margin-bottom:0"><label>Ulangi PIN baru</label>' +
      '<input class="inp" type="password" id="pinUlang" inputmode="numeric" maxlength="6" autocomplete="off"></div>' +
      '<div class="kotak kotak-warn" style="margin-top:12px;font-size:11.5px">' + Z.Ikon('info', 14) +
      ' Setelah PIN diganti, Anda akan diminta masuk ulang.</div>';
    const wrap = Z.Sheet.buka({ judul: 'Ganti PIN', ikon: 'kunci', isi: isi,
      aksi: '<button class="btn btn-netral" data-batal>Batal</button>' +
            '<button class="btn btn-utama" data-ok>Ganti PIN</button>' });
    Z.$('[data-batal]', wrap).addEventListener('click', function () { Z.Sheet.tutup(); });
    Z.$('[data-ok]', wrap).addEventListener('click', async function () {
      const lama = Z.$('#pinLama', wrap).value, baru = Z.$('#pinBaru', wrap).value, ulang = Z.$('#pinUlang', wrap).value;
      if (baru !== ulang) return Z.toast('PIN baru dan ulangannya tidak sama.', 'err');
      if (!/^\d{6}$/.test(baru)) return Z.toast('PIN baru harus 6 angka.', 'err');
      const r = await global.App.kirim('auth.gantiPin', { lama: lama, baru: baru });
      if (r.success) { Z.Sheet.tutup(); setTimeout(function () { global.App.keluar(true); }, 900); }
    });
  }

  /* ================================================================
   * LAINNYA (menu)
   * ================================================================ */
  Hal.lainnya = {
    judul: 'Lainnya', nav: 'lainnya',
    render: function () {
      const menu = [
        ['keuangan', 'dompet', 'Keuangan & Arus Kas', 'Pemasukan, pengeluaran, laba bersih'],
        ['servis', 'perkakas', 'Servis & Pajak', 'Riwayat servis dan jatuh tempo STNK'],
        ['laporan', 'grafik', 'Laporan', 'Statistik bulanan, PDF & Excel'],
        ['notifikasi', 'wa', 'WhatsApp & Notifikasi', 'Template pesan, blast, antrean'],
        ['struk', 'cetak', 'Model Struk & Printer', 'Atur tata letak struk thermal 58/80 mm'],
        ['impor', 'import', 'Import Data Lama', 'Pindahkan data dari aplikasi sebelumnya'],
        ['pengaturan', 'gear', 'Pengaturan', 'Identitas usaha, tarif, fitur, keamanan']
      ];
      const r = H.ringkasan();
      let html = '<section><h1 class="t-hero" style="font-size:22px">Menu Lainnya</h1>' +
        '<div class="t-sm t-var">Semua modul operasional Zan Rental</div></section>';

      html += '<section class="grid2">' +
        U.kartuKpi({ label: 'Laba bulan ini', nilai: Z.rpSingkat(r.laba), ikon: 'grafik', warna: 'kuning', aksi: 'keuangan' }) +
        U.kartuKpi({ label: 'Unit aktif', nilai: r.totalUnit, ikon: 'motor', aksi: 'armada' }) + '</section>';

      html += '<section style="display:flex;flex-direction:column;gap:9px">' + menu.map(function (m) {
        return '<button class="kartu kartu-rapat kartu-klik" data-nav="' + m[0] + '" ' +
          'style="display:flex;align-items:center;gap:12px;text-align:left;width:100%">' +
          '<span class="kpi-ikon">' + Z.Ikon(m[1], 19) + '</span>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px">' + esc(m[2]) + '</div>' +
          '<div class="t-sm t-var">' + esc(m[3]) + '</div></div>' +
          '<span class="t-var">' + Z.Ikon('panah', 17) + '</span></button>';
      }).join('') + '</section>';

      html += '<section class="kartu"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
        '<div><div style="font-weight:600;font-size:13px">Mode gelap</div>' +
        '<div class="t-sm t-var">Tema hitam keunguan dengan aksen kuning</div></div>' +
        '<label class="switch"><input type="checkbox" id="swTema2"' +
        (document.documentElement.getAttribute('data-tema') === 'gelap' ? ' checked' : '') + '><i></i></label></div></section>';

      html += '<section><button class="btn btn-netral btn-blok" id="btnKeluar">' +
        Z.Ikon('keluarApp', 17) + 'Keluar dari Aplikasi</button>' +
        '<div class="t-sm t-var" style="text-align:center;margin-top:12px;line-height:1.7">' +
        esc(global.ZAN_CONFIG.APP_NAMA) + ' v' + esc(global.ZAN_CONFIG.VERSI) +
        '<br>Backend v' + esc((D().versi) || '-') + ' • Data per ' + esc(Z.jamDari(D().waktu) || '-') + '</div></section>';
      return html;
    },
    setelah: function (root) {
      const sw = Z.$('#swTema2', root);
      if (sw) sw.addEventListener('change', function (e) { global.App.gantiTema(sw.checked ? 'gelap' : 'terang', e); });
      const k = Z.$('#btnKeluar', root);
      if (k) k.addEventListener('click', async function () {
        const ya = await Z.konfirmasi({ judul: 'Keluar dari aplikasi?', pesan: 'Anda perlu memasukkan PIN lagi untuk masuk.' });
        if (ya) global.App.keluar();
      });
    }
  };

  /* ================================================================
   * MODEL STRUK & PRINTER
   * ================================================================ */
  Hal.struk = {
    judul: 'Model Struk', nav: 'lainnya',
    render: function () {
      const templates = D().struk || [];
      const kode = Z.Simpan.ambil('strukEdit', templates.length ? templates[0].kode : '');
      const tpl = templates.filter(function (t) { return t.kode === kode; })[0] || templates[0];
      const st = global.Struk.Printer.pengaturan();

      let html = '<section><div style="display:flex;align-items:center;gap:9px">' +
        '<button class="ikon-btn" data-nav="lainnya">' + Z.Ikon('panahKiri', 20) + '</button>' +
        '<div><h1 class="t-judul">Model Struk & Printer</h1>' +
        '<div class="t-sm t-var">Ubah tata letak struk tanpa menyentuh kode</div></div></div></section>';

      html += '<section class="kartu"><h3 class="t-judul">Pengaturan Printer</h3>' +
        '<div class="grid2" style="margin-top:12px">' +
          '<div class="field" style="margin:0"><label>Lebar kertas</label><select class="sel" id="prLebar">' +
          [58, 80].map(function (l) {
            return '<option value="' + l + '"' + (Number(st.lebar) === l ? ' selected' : '') + '>' + l + ' mm</option>'; }).join('') +
          '</select></div>' +
          '<div class="field" style="margin:0"><label>Metode cetak</label><select class="sel" id="prMetode">' +
          [['browser', 'Dialog cetak browser'], ['bt', 'Bluetooth langsung'], ['rawbt', 'Aplikasi RawBT (Android)']]
            .map(function (m) {
              return '<option value="' + m[0] + '"' + (st.metode === m[0] ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') +
          '</select></div></div>' +
        '<div class="grid2" style="margin-top:4px">' +
          '<div class="field" style="margin:0"><label>Rangkap</label>' +
          '<input class="inp" type="number" id="prSalinan" min="1" max="3" value="' + Number(st.salinan || 1) + '"></div>' +
          '<div class="field" style="margin:0"><label>Cetak QR verifikasi</label>' +
          '<select class="sel" id="prQr"><option value="1"' + (st.qr !== false ? ' selected' : '') + '>Ya</option>' +
          '<option value="0"' + (st.qr === false ? ' selected' : '') + '>Tidak</option></select></div></div>' +
        '<div class="btn-grid" style="margin-top:9px">' +
          '<button class="btn btn-kecil btn-netral" id="tesPrinter">' + Z.Ikon('cetak', 15) + 'Tes Printer</button>' +
          '<button class="btn btn-kecil btn-netral" id="simpanPrinter">' + Z.Ikon('check', 15) + 'Simpan Perangkat</button></div>' +
        (!global.Struk.BT.didukung() ? '<div class="kotak kotak-info" style="margin-top:9px;font-size:11.5px">' +
          Z.Ikon('info', 14) + ' Peramban ini tidak mendukung Bluetooth langsung (biasanya iPhone). Pakai dialog cetak browser atau RawBT di Android.</div>' : '') +
      '</section>';

      if (tpl) {
        html += '<section class="kartu"><div class="seksi-head"><h3 class="t-judul">Editor Model</h3>' +
          '<select class="sel" id="pilihTpl" style="width:auto;min-height:38px;padding:6px 32px 6px 12px;font-size:12px">' +
          templates.map(function (t) {
            return '<option value="' + esc(t.kode) + '"' + (t.kode === tpl.kode ? ' selected' : '') + '>' + esc(t.nama) + '</option>';
          }).join('') + '</select></div>' +
          '<textarea class="ta" id="strukIsi" rows="14" spellcheck="false" ' +
          'style="font-family:ui-monospace,monospace;font-size:12px;line-height:1.5;margin-top:11px">' + esc(tpl.isi) + '</textarea>' +
          '<div class="chips" style="margin-top:9px">' +
          ['[C]', '[B]', '[2]', '[LR]a||b', '[-]', '[=]', '[BOX]', '[QR]', '[FEED]', '{{TOTAL|rp}}', '{{NOTA}}', '{{?DEPOSIT}}']
            .map(function (d) { return '<button class="chip" data-sisip-struk="' + esc(d) + '">' + esc(d) + '</button>'; }).join('') +
          '</div>' +
          '<div class="btn-grid" style="margin-top:11px">' +
          '<button class="btn btn-kecil btn-netral" id="resetTpl">' + Z.Ikon('sinkron', 15) + 'Kembalikan bawaan</button>' +
          '<button class="btn btn-kecil btn-utama" id="simpanTpl">' + Z.Ikon('check', 15) + 'Simpan model</button></div>' +
        '</section>';

        html += '<section class="kartu"><h3 class="t-judul">Pratinjau 1:1</h3>' +
          '<div class="sk-panggung" style="margin-top:11px" id="praStruk"></div></section>';
      }
      return html;
    },
    setelah: function (root) {
      const sel = Z.$('#pilihTpl', root);
      if (sel) sel.addEventListener('change', function () { Z.Simpan.taruh('strukEdit', sel.value); global.App.render(); });

      function contoh() {
        const o = (D().pesanan || []).filter(function (x) { return x.status !== 'Batal'; }).slice(-1)[0];
        if (!o) return { TOKO_NAMA: 'ZAN RENTAL MOTOR', NOTA: 'ORD-0001', TOTAL: 360000 };
        return global.Struk.dariOrder({ order: o, pelanggan: pel(o.pelanggan), unit: unit(o.unit),
          pengaturan: D().pengaturan, urlVerifikasi: urlVerif(o.kode) });
      }
      function pra() {
        const ta = Z.$('#strukIsi', root);
        const el = Z.$('#praStruk', root);
        if (!ta || !el) return;
        const kolom = Number(Z.$('#prLebar', root).value) >= 80 ? 48 : 32;
        const hasil = global.Struk.render(ta.value, contoh(), kolom, { qr: true });
        el.innerHTML = global.Struk.keHtml(hasil);
      }
      const ta = Z.$('#strukIsi', root);
      if (ta) {
        ta.addEventListener('input', pra);
        pra();
      }
      Z.$$('[data-sisip-struk]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          const pos = ta.selectionStart || ta.value.length;
          const sisip = b.getAttribute('data-sisip-struk');
          ta.value = ta.value.slice(0, pos) + sisip + ta.value.slice(pos);
          ta.focus(); pra();
        });
      });
      const lb = Z.$('#prLebar', root);
      if (lb) lb.addEventListener('change', pra);

      const sp = Z.$('#simpanPrinter', root);
      if (sp) sp.addEventListener('click', function () {
        global.Struk.Printer.simpan({
          lebar: Number(Z.$('#prLebar', root).value),
          metode: Z.$('#prMetode', root).value,
          salinan: Number(Z.$('#prSalinan', root).value) || 1,
          qr: Z.$('#prQr', root).value === '1',
          kode58: 'STRUK_58', kode80: 'STRUK_80', autoCut: true, beep: false
        });
        Z.toast('Pengaturan printer tersimpan di perangkat ini.');
      });
      const tp = Z.$('#tesPrinter', root);
      if (tp) tp.addEventListener('click', async function () {
        const st = global.Struk.Printer.pengaturan({
          lebar: Number(Z.$('#prLebar', root).value), metode: Z.$('#prMetode', root).value
        });
        const r = await global.Struk.Printer.tes(st);
        Z.toast(r.cadangan ? 'Beralih ke dialog cetak: ' + r.cadangan : 'Perintah cetak dikirim (' + r.cara + ').',
          r.cadangan ? 'info' : 'ok');
      });
      const st = Z.$('#simpanTpl', root);
      if (st) st.addEventListener('click', async function () {
        const kode = Z.$('#pilihTpl', root).value;
        const r = await global.App.kirim('struk.simpan', { kode: kode, isi: ta.value });
        if (r.success) await global.App.muatUlang(true);
      });
      const rs = Z.$('#resetTpl', root);
      if (rs) rs.addEventListener('click', async function () {
        const ya = await Z.konfirmasi({ judul: 'Kembalikan model bawaan?', pesan: 'Perubahan tata letak Anda akan diganti dengan model asli.' });
        if (!ya) return;
        const r = await global.App.kirim('struk.reset', { kode: Z.$('#pilihTpl', root).value });
        if (r.success) await global.App.muatUlang(true);
      });
    }
  };

  /* ================================================================
   * IMPORT DATA LAMA
   * ================================================================ */
  Hal.impor = {
    judul: 'Import Data', nav: 'lainnya',
    hasil: null,
    render: function () {
      const h = Hal.impor.hasil;
      let html = '<section><div style="display:flex;align-items:center;gap:9px">' +
        '<button class="ikon-btn" data-nav="lainnya">' + Z.Ikon('panahKiri', 20) + '</button>' +
        '<div><h1 class="t-judul">Import Data Lama</h1>' +
        '<div class="t-sm t-var">Pindahkan unit, pelanggan, dan order dari spreadsheet lama</div></div></div></section>';

      html += '<section class="kartu">' +
        '<div class="kotak kotak-info" style="font-size:11.5px;line-height:1.6;margin-bottom:13px">' +
        Z.Ikon('perisai', 14) + ' Spreadsheet lama hanya <b>DIBACA</b>, tidak pernah diubah. ' +
        'Pastikan memakai akun Google yang sama.</div>' +
        '<div class="field"><label>URL atau ID spreadsheet lama</label>' +
        '<input class="inp" id="impSumber" placeholder="https://docs.google.com/spreadsheets/d/…"></div>' +
        '<div class="field"><label>Data yang diimpor</label>' +
        ['unit', 'pelanggan', 'pesanan', 'keuangan'].map(function (k) {
          return '<label class="kotak" style="display:flex;align-items:center;gap:10px;margin-bottom:7px">' +
            '<input type="checkbox" data-imp="' + k + '"' + (k !== 'keuangan' ? ' checked' : '') + '>' +
            '<span style="font-weight:600;font-size:12.5px;text-transform:capitalize">' + k + '</span></label>';
        }).join('') + '</div>' +
        '<label class="kotak" style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="impTimpa">' +
        '<span><span style="font-weight:600;font-size:12.5px">Timpa data yang sudah ada</span>' +
        '<div class="t-sm t-var">Biarkan mati agar perubahan di aplikasi ini tidak tertimpa.</div></span></label>' +
        '<div class="btn-grid" style="margin-top:13px">' +
        '<button class="btn btn-netral" id="impPindai">' + Z.Ikon('cari', 17) + 'Pindai (uji coba)</button>' +
        '<button class="btn btn-utama" id="impJalan">' + Z.Ikon('import', 17) + 'Jalankan Import</button></div></section>';

      if (h) {
        html += '<section class="kartu"><h3 class="t-judul">' + (h.dryRun ? 'Hasil Pemindaian' : 'Hasil Import') + '</h3>' +
          '<div class="t-sm t-var" style="margin-bottom:9px">Sumber: ' + esc(h.sumber.nama) + '</div>' +
          '<div class="tabel-gulir"><table class="tabel"><thead><tr><th>Data</th><th class="kanan">Di sumber</th>' +
          '<th class="kanan">Tambah</th><th class="kanan">Perbarui</th><th class="kanan">Lewati</th></tr></thead><tbody>' +
          Object.keys(h.laporan).map(function (k) {
            const r = h.laporan[k];
            return '<tr><td><b>' + esc(k) + '</b></td><td class="kanan">' + r.sumber + '</td><td class="kanan" style="color:var(--ok)">' +
              r.ditambah + '</td><td class="kanan" style="color:var(--info)">' + r.diperbarui + '</td>' +
              '<td class="kanan t-var">' + r.dilewati + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          (h.peringatan.length ? '<div class="kotak kotak-warn" style="margin-top:11px;font-size:11.5px;line-height:1.7">' +
            h.peringatan.map(function (p) { return '• ' + esc(p); }).join('<br>') + '</div>' : '') +
          '</section>';
      }
      return html;
    },
    setelah: function (root) {
      function kumpul() {
        const sheets = {};
        Z.$$('[data-imp]', root).forEach(function (i) { sheets[i.getAttribute('data-imp')] = i.checked; });
        return { sumber: Z.$('#impSumber', root).value, sheets: sheets, timpa: Z.$('#impTimpa', root).checked };
      }
      const p = Z.$('#impPindai', root);
      if (p) p.addEventListener('click', async function () {
        const d = kumpul();
        if (!d.sumber) return Z.toast('Isi URL spreadsheet lama dulu.', 'err');
        const r = await global.App.kirim('import.pindai', d);
        if (r.success) { Hal.impor.hasil = r.data; global.App.render(); }
      });
      const j = Z.$('#impJalan', root);
      if (j) j.addEventListener('click', async function () {
        const d = kumpul();
        if (!d.sumber) return Z.toast('Isi URL spreadsheet lama dulu.', 'err');
        const ya = await Z.konfirmasi({ judul: 'Jalankan import?',
          pesan: 'Data dari spreadsheet lama akan ditambahkan ke aplikasi ini. Aman diulang — data ganda tidak akan dibuat.' });
        if (!ya) return;
        const r = await global.App.kirim('import.jalankan', d);
        if (r.success) { Hal.impor.hasil = r.data; await global.App.muatUlang(true); }
      });
    }
  };

  /* ================================================================
   * DETAIL ORDER / E-KWITANSI
   * ================================================================ */
  function urlVerif(kode) {
    const base = global.App.set('APP_URL', '') || location.origin + location.pathname;
    return base.replace(/\/+$/, '') + '/#/v/' + kode;
  }

  Hal.detailOrder = function (id, baruSaja) {
    const o = orderById(id);
    if (!o) return Z.toast('Order tidak ditemukan.', 'err');
    const c = pel(o.pelanggan), u = unit(o.unit);
    const s = H.statusEfektif(o);
    const denda = H.dendaBerjalan(o);
    const sisa = Math.max(0, o.total - o.dibayar);
    const hargaHari = o.durasi ? Math.round(o.sewa / o.durasi) : u.harga;
    const qr = Z.qrDataUrl(urlVerif(o.kode), 4);

    const isi =
      (baruSaja ? '<div class="kotak kotak-ok" style="margin-bottom:12px;display:flex;align-items:center;gap:9px">' +
        '<span style="color:var(--ok)">' + Z.Ikon('check', 18) + '</span>' +
        '<div><div style="font-weight:700;font-size:13px">Order berhasil dibuat!</div>' +
        '<div class="t-sm t-var">Kirim konfirmasi ke pelanggan atau cetak struk sekarang.</div></div></div>' : '') +

      '<div class="btn-grid" style="margin-bottom:10px">' +
        '<button class="btn btn-utama" data-k="wa">' + Z.Ikon('wa', 17) + 'Kirim WhatsApp</button>' +
        '<button class="btn btn-ink" data-k="struk">' + Z.Ikon('cetak', 17) + 'Cetak Struk</button></div>' +
      '<div class="btn-grid" style="margin-bottom:14px">' +
        '<button class="btn btn-kecil btn-netral" data-k="pdf">' + Z.Ikon('dokumen', 15) + 'Kwitansi PDF</button>' +
        '<button class="btn btn-kecil btn-netral" data-k="salin">' + Z.Ikon('salin', 15) + 'Salin ringkasan</button></div>' +

      /* Kwitansi digital */
      '<div class="kwt"><div class="kwt-garis-atas"></div><div class="kwt-isi" style="position:relative">' +
        '<div class="kwt-kop">' +
          '<div style="display:flex;gap:10px;min-width:0">' +
            '<span style="width:38px;height:38px;border-radius:12px;background:#FFE600;color:#0B0B0F;display:grid;' +
              'place-items:center;font-weight:800;font-size:18px;flex:none">Z</span>' +
            '<div style="min-width:0"><div style="font-weight:800;font-size:14px;letter-spacing:.02em">' +
              esc(global.App.set('NAMA_USAHA', 'ZAN RENTAL MOTOR')) + '</div>' +
              '<div style="font-size:10.5px;color:#666">' + esc(global.App.set('SLOGAN', '')) + '</div></div></div>' +
          '<span class="badge badge-' + (o.statusBayar === 'Lunas' ? 'ok' : 'warn') + '">' + esc(o.statusBayar) + '</span>' +
        '</div>' +
        '<div style="font-size:10.5px;color:#666;margin-top:9px;line-height:1.6">' + esc(global.App.set('ALAMAT', '')) +
        '<br>WhatsApp ' + esc(global.App.set('WA_PEMILIK', '')) + '</div>' +
        '<div style="display:flex;justify-content:space-between;gap:10px;margin-top:13px;font-size:11px">' +
          '<div><div style="color:#888;font-size:9.5px;letter-spacing:.06em">NOMOR ORDER</div>' +
          '<b style="font-size:12.5px">' + esc(o.id) + '</b></div>' +
          '<div style="text-align:right"><div style="color:#888;font-size:9.5px;letter-spacing:.06em">TANGGAL</div>' +
          '<b style="font-size:12.5px">' + esc(Z.tglId(o.tglOrder)) + '</b></div></div>' +
        '<div class="kwt-sobek" style="margin-top:13px"></div>' +

        '<div style="font-size:9.5px;color:#888;letter-spacing:.06em;margin-top:11px">DATA PENYEWA</div>' +
        '<div style="font-weight:700;font-size:13.5px;margin-top:2px">' + esc(c.nama || '-') + '</div>' +
        '<div style="font-size:11px;color:#555">' + esc(Z.hpCantik(c.wa) || '-') + ' • ' + esc(c.alamat || c.asal || '-') + '</div>' +

        '<div style="font-size:9.5px;color:#888;letter-spacing:.06em;margin-top:13px">UNIT & PERIODE</div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:6px">' +
          '<div style="width:74px;flex:none;border-radius:10px;overflow:hidden">' + Z.fotoUnit(u.foto, { tinggi: 52, alt: u.nama }) + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:12.5px">' + esc(u.nama || '-') + '</div>' +
          '<div style="font-size:10.5px;color:#555">' + esc(u.tahun || '') + ' • ' + esc(u.tipe || '') + '</div></div>' +
          '<span class="plat" style="flex:none">' + esc(u.plat || '-') + '</span></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">' +
          kotakKwt('Ambil unit', Z.tglId(o.mulai), o.jamMulai + ' WIB' + (o.antar ? ' • diantar' : '')) +
          kotakKwt('Kembali unit', Z.tglId(o.kembali), o.jamKembali + ' WIB • ' + o.durasi + ' hari') + '</div>' +

        '<div style="font-size:9.5px;color:#888;letter-spacing:.06em;margin-top:14px">RINCIAN PEMBAYARAN</div>' +
        '<div style="background:#f7f7f9;border-radius:12px;padding:11px;margin-top:6px;color:#15171c">' +
          U.baris('Sewa ' + o.durasi + ' hari × ' + Z.rp(hargaHari), Z.rp(o.sewa)) +
          (o.biayaAntar ? U.baris('Antar-jemput', Z.rp(o.biayaAntar)) : '') +
          (o.denda ? U.baris('Denda keterlambatan', '<span style="color:#DC2626">' + Z.rp(o.denda) + '</span>') : '') +
          (o.diskon ? U.baris('Diskon', '<span style="color:#16A34A">−' + Z.rp(o.diskon) + '</span>') : '') +
          (o.deposit ? U.baris('Deposit jaminan', Z.rp(o.deposit)) : '') +
          '<div class="baris baris-total"><span class="baris-l" style="color:#15171c;font-weight:600">Total tagihan</span>' +
          '<span class="baris-n">' + Z.rp(o.total) + '</span></div>' +
          U.baris('Dibayar (' + esc(o.metode || 'Tunai') + ')', Z.rp(o.dibayar)) +
          U.baris('Sisa', sisa ? '<b style="color:#D97706">' + Z.rp(sisa) + '</b>' : '<b style="color:#16A34A">Rp 0</b>') +
        '</div>' +
        '<div style="font-size:10px;color:#777;font-style:italic;margin-top:7px">Terbilang: ' +
          esc(Z.terbilang(o.total)) + ' rupiah.</div>' +
        (o.catatan ? '<div style="font-size:10.5px;color:#555;margin-top:8px">Catatan: ' + esc(o.catatan) + '</div>' : '') +

        '<div style="display:flex;align-items:center;gap:11px;margin-top:14px;padding-top:12px;border-top:1px dashed #ddd">' +
          (qr ? '<img src="' + qr + '" alt="QR verifikasi" style="width:76px;height:76px;image-rendering:pixelated">' :
            '<div style="width:76px;height:76px;background:#eee;border-radius:8px;display:grid;place-items:center;font-size:9px;color:#999">QR</div>') +
          '<div style="min-width:0;font-size:10px;color:#666;line-height:1.6">' +
            'Pindai untuk memeriksa keaslian kwitansi.<br>Kode: <b style="color:#15171c;font-family:ui-monospace,monospace">' +
            esc(o.kode || '-') + '</b><br>Dokumen elektronik sah tanpa tanda tangan basah.</div>' +
        '</div>' +
        (o.statusBayar === 'Lunas' ? '<div class="kwt-cap">LUNAS</div>' : '') +
      '</div></div>' +

      /* Bukti serah terima & pengembalian */
      blokBukti(o) +

      /* Aksi lanjutan */
      '<div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">' +
        (s === 'Berjalan' || s === 'Terlambat'
          ? '<button class="btn btn-utama btn-blok" data-k="selesai">' + Z.Ikon('check', 17) + 'Selesaikan Sewa' +
            (denda ? ' (denda ' + Z.rp(denda) + ')' : '') + '</button>' +
            '<div class="btn-grid">' +
            '<button class="btn btn-netral" data-k="perpanjang">' + Z.Ikon('jam', 16) + 'Perpanjang</button>' +
            '<button class="btn btn-netral" data-k="bayar">' + Z.Ikon('dompet', 16) + 'Catat Bayar</button></div>' +
            (fotoKembaliAktif()
              ? '<button class="btn btn-netral btn-blok" data-k="fotoKembali">' + Z.Ikon('kamera', 16) +
                'Foto Kondisi Saat Kembali</button>' : '') : '') +
        (s === 'Booking'
          ? '<button class="btn btn-utama btn-blok" data-k="mulai">' + Z.Ikon('kunci', 17) + 'Serah Terima & Mulai Sewa</button>' : '') +
        (s === 'Selesai' && fotoKembaliAktif()
          ? '<button class="btn btn-netral btn-blok" data-k="fotoKembali">' + Z.Ikon('kamera', 16) +
            'Lengkapi Foto Pengembalian</button>' : '') +
        '<button class="btn btn-netral btn-blok" data-k="tautan">' + Z.Ikon('tautan', 16) +
        'Salin Tautan Kwitansi</button>' +
        '<div class="btn-grid">' +
          '<button class="btn btn-netral" data-k="ubah">' + Z.Ikon('pensil', 16) + 'Ubah Order</button>' +
          (s !== 'Selesai' && s !== 'Batal'
            ? '<button class="btn btn-netral" data-k="batal" style="color:var(--danger)">' + Z.Ikon('x', 16) + 'Batalkan</button>'
            : '<button class="btn btn-netral" data-k="pelanggan">' + Z.Ikon('orang', 16) + 'Profil Penyewa</button>') +
        '</div></div>';

    const wrap = Z.Sheet.buka({ judul: 'Order ' + o.id, sub: c.nama + ' • ' + u.nama, ikon: 'order', isi: isi, lebar: true });

    const ctx = { order: o, pelanggan: c, unit: u, pengaturan: D().pengaturan, urlVerifikasi: urlVerif(o.kode) };

    Z.$$('[data-k]', wrap).forEach(function (b) {
      b.addEventListener('click', async function () {
        const k = b.getAttribute('data-k');
        if (k === 'wa') { kirimWa(o, s === 'Terlambat' ? 'TAGIH_TELAT' : (s === 'Selesai' ? 'ORDER_SELESAI' : 'ORDER_BARU')); return; }
        if (k === 'struk') { Z.Sheet.tutup(); setTimeout(function () { pratinjauStruk(ctx); }, 240); return; }
        if (k === 'pdf') {
          b.disabled = true;
          b.innerHTML = Z.Ikon('sinkron', 15, 'putar') + 'Menyiapkan…';
          const png = await Z.qrPngDataUrl(urlVerif(o.kode), 240);
          const r = await global.App.kirim('dok.kwitansi', { id: o.id, qr: png });
          b.disabled = false;
          b.innerHTML = Z.Ikon('dokumen', 15) + 'Kwitansi PDF';
          if (r.success) window.open(r.data.url, '_blank', 'noopener');
          return;
        }
        if (k === 'salin') {
          const teks = ringkasOrder(ctx);
          try { await navigator.clipboard.writeText(teks); Z.toast('Ringkasan disalin.'); }
          catch (e) { Z.toast('Tidak bisa menyalin otomatis.', 'err'); }
          return;
        }
        if (k === 'selesai') { Z.Sheet.tutup(); setTimeout(function () { formSelesai(o); }, 240); return; }
        if (k === 'perpanjang') { Z.Sheet.tutup(); setTimeout(function () { formPerpanjang(o); }, 240); return; }
        if (k === 'bayar') { Z.Sheet.tutup(); setTimeout(function () { formBayar(o); }, 240); return; }
        if (k === 'mulai')  { Z.Sheet.tutup(); setTimeout(function () { formFotoSerah(o, 'serah'); }, 240); return; }
        if (k === 'fotoKembali') { Z.Sheet.tutup(); setTimeout(function () { formFotoSerah(o, 'kembali'); }, 240); return; }
        if (k === 'tautan') {
          const tautan = urlVerif(o.kode);
          try { await navigator.clipboard.writeText(tautan); Z.toast('Tautan kwitansi disalin. Tempel di pesan WA.'); }
          catch (e) { Z.tanya({ judul: 'Tautan kwitansi', label: 'Salin tautan ini', nilai: tautan, maks: 300 }); }
          return;
        }
        if (k === 'ubah') { Z.Sheet.tutup(); P.FormOrder.data = null; global.App.ke('order-baru', { id: o.id }); return; }
        if (k === 'batal') {
          const ya = await Z.konfirmasi({ judul: 'Batalkan order?', bahaya: true,
            pesan: 'Order ' + o.id + ' akan ditandai Batal dan unit kembali tersedia.' });
          if (!ya) return;
          const r = await global.App.kirim('order.batal', { id: o.id, alasan: 'Dibatalkan dari dashboard' });
          if (r.success) { Z.Sheet.tutup(); await global.App.muatUlang(true); }
          return;
        }
        if (k === 'pelanggan') { Z.Sheet.tutup(); setTimeout(function () { Hal.pelanggan.form(c.id); }, 240); }
      });
    });
  };

  /**
   * Urutan tampil foto tersimpan: ikut urutan pengaturan, lalu sudut lain yang
   * sudah terlanjur difoto sebelum pemilik mengubah daftarnya — supaya bukti
   * lama tidak hilang dari layar hanya karena setelan berubah.
   */
  function urutSudut(f) {
    const ada = Object.keys(f || {});
    const urut = sudutFoto().map(function (x) { return x.k; });
    return urut.filter(function (k) { return f[k]; })
      .concat(ada.filter(function (k) { return urut.indexOf(k) < 0; }));
  }

  /** Nama ramah untuk satu sudut foto; kunci tak dikenal dipakai apa adanya. */
  function labelSudut(k) {
    const sd = sudutFoto().concat(SUDUT_BAWAAN).filter(function (x) { return x.k === k; })[0];
    return sd ? sd.l : String(k || '').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  /**
   * Satu thumbnail bukti foto. Memakai <img> sungguhan, bukan background-image,
   * supaya ada teks alternatif dan supaya foto yang gagal dimuat tetap terlihat
   * sebagai kotak berlabel — bukan kotak kosong tanpa penjelasan.
   */
  function imgBukti(url, label) {
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener" title="' + esc(label) + '">' +
      '<img src="' + esc(url) + '" alt="Foto ' + esc(label) + '" loading="lazy" ' +
      'onerror="this.closest(\'a\').classList.add(\'gagal\')">' +
      '<span>' + esc(label) + '</span></a>';
  }

  /** Galeri bukti foto yang sudah tersimpan di satu order (serah terima + pengembalian). */
  function blokBukti(o) {
    const bagian = [
      { rec: o.serah, judul: 'Bukti Serah Terima ke Penyewa', ikon: 'kunci' },
      { rec: o.pengembalian, judul: 'Bukti Pengembalian', ikon: 'check' }
    ].filter(function (b) { return b.rec && b.rec.foto && Object.keys(b.rec.foto).length; });
    if (!bagian.length) return '';

    return bagian.map(function (b) {
      const f = b.rec.foto;
      const meta = [
        b.rec.odo ? 'Odometer ' + Z.ribuan(b.rec.odo) + ' km' : '',
        b.rec.bbm ? 'BBM ' + esc(b.rec.bbm) : '',
        b.rec.at ? Z.tglId(String(b.rec.at).slice(0, 10)) : ''
      ].filter(Boolean).join(' • ');

      return '<div class="kartu kartu-rapat" style="margin-top:12px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
        '<h3 class="t-judul" style="font-size:14px;display:flex;align-items:center;gap:7px">' +
        Z.Ikon(b.ikon, 16) + esc(b.judul) + '</h3>' +
        '<span class="badge badge-ok">' + Object.keys(f).length + ' foto</span></div>' +
        (meta ? '<div class="t-sm t-var" style="margin:6px 0 9px">' + meta + '</div>' : '<div style="height:9px"></div>') +
        '<div class="foto-bukti">' +
          urutSudut(f).map(function (k) { return imgBukti(f[k], labelSudut(k)); }).join('') +
        '</div>' +
        (b.rec.catatan ? '<div class="t-sm t-var" style="margin-top:8px">Catatan: ' + esc(b.rec.catatan) + '</div>' : '') +
        '</div>';
    }).join('');
  }

  function kotakKwt(label, nilai, sub) {
    return '<div style="background:#f7f7f9;border-radius:11px;padding:9px 11px">' +
      '<div style="font-size:9.5px;color:#888;letter-spacing:.05em">' + esc(label.toUpperCase()) + '</div>' +
      '<div style="font-weight:700;font-size:12px;margin-top:2px;color:#15171c">' + esc(nilai) + '</div>' +
      '<div style="font-size:10px;color:#666">' + esc(sub) + '</div></div>';
  }

  function ringkasOrder(ctx) {
    const o = ctx.order, c = ctx.pelanggan, u = ctx.unit;
    return '*' + global.App.set('NAMA_USAHA', 'ZAN Rental') + '*\n' +
      'Order: ' + o.id + '\nPenyewa: ' + c.nama + '\nUnit: ' + u.nama + ' (' + u.plat + ')\n' +
      'Mulai: ' + Z.tglId(o.mulai) + ' ' + o.jamMulai + '\nKembali: ' + Z.tglId(o.kembali) + ' ' + o.jamKembali + '\n' +
      'Durasi: ' + o.durasi + ' hari\nTotal: ' + Z.rp(o.total) + '\nDibayar: ' + Z.rp(o.dibayar) +
      '\nSisa: ' + Z.rp(Math.max(0, o.total - o.dibayar)) + '\n\nVerifikasi: ' + ctx.urlVerifikasi;
  }

  /** Nilai semua penanda {…} untuk satu order. */
  function varsOrder(o) {
    const c = pel(o.pelanggan), u = unit(o.unit);
    return {
      nama: c.nama, usaha: global.App.set('NAMA_USAHA', 'ZAN Rental'),
      unit: u.nama, plat: u.plat, order: o.id,
      mulai: Z.tglId(o.mulai), jamMulai: o.jamMulai || '09:00',
      kembali: Z.tglId(o.kembali), jam: o.jamKembali, durasi: o.durasi,
      total: Z.rp(o.total), dibayar: Z.rp(o.dibayar), sisa: Z.rp(Math.max(0, o.total - o.dibayar)),
      denda: Z.rp(H.dendaBerjalan(o)), hari: H.hariTelat(o),
      alamat: global.App.set('ALAMAT', ''),
      alamatAntar: o.alamatAntar || '(alamat belum diisi di order)',
      perlengkapan: (o.perlengkapan || []).map(function (x) {
        return (Z.num(x.j) > 1 ? x.j + ' ' : '') + x.n; }).join(', ') || '-',
      link: urlVerif(o.kode),
      kwitansi: o.kode ? '\n\n📄 Kwitansi & tanda terima:\n' + urlVerif(o.kode) : ''
    };
  }

  function isiTpl(tpl, vars) {
    return String(tpl || '').replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] === undefined ? '' : String(vars[k]);
    });
  }

  function tplPesan(tipe) {
    const cfg = Hal.notifikasi.cfg;
    return (cfg && cfg.matriks && cfg.matriks[tipe] ? cfg.matriks[tipe].pesan : '') || TPL_CADANGAN[tipe] || '';
  }

  /**
   * Pilihan pesan yang masuk akal untuk kondisi order saat ini. Sengaja
   * disaring: menawarkan "tagih sisa" pada order lunas atau "OTW antar" pada
   * order tanpa antar-jemput hanya membuat pemilik salah kirim.
   */
  function opsiIngatkan(o) {
    const s = H.statusEfektif(o);
    const sisa = Math.max(0, o.total - o.dibayar);
    const berjalan = s === 'Berjalan' || s === 'Terlambat';
    const d = [
      { k: 'ORDER_BARU',       l: 'Konfirmasi booking',        i: 'check',   ket: 'Rincian sewa, unit, dan jadwalnya',          ada: s === 'Booking' },
      { k: 'UNIT_SIAP',        l: 'Unit siap diambil',         i: 'kunci',   ket: 'Penyewa menjemput sendiri ke tempat Anda',   ada: s === 'Booking' && !o.antar },
      { k: 'OTW_JEMPUT',       l: 'Saya OTW mengantar unit',   i: 'motor',   ket: 'Beri tahu penyewa Anda sedang di jalan',     ada: s === 'Booking' && !!o.antar },
      { k: 'TAGIH_BAYAR',      l: 'Tagih sisa pembayaran',     i: 'dompet',  ket: 'Sisa ' + Z.rp(sisa),                         ada: sisa > 0 && s !== 'Batal' },
      { k: 'INGAT_KEMBALI',    l: 'Ingatkan pengembalian',     i: 'jam',     ket: 'Jatuh tempo ' + Z.tglId(o.kembali) + ', ' + o.jamKembali, ada: berjalan },
      { k: 'TAWAR_PERPANJANG', l: 'Tawarkan perpanjangan',     i: 'plus',  ket: 'Sebelum kena denda',                         ada: berjalan },
      { k: 'OTW_AMBIL',        l: 'Saya OTW menjemput unit',   i: 'motor',   ket: 'Untuk order dengan layanan antar-jemput',    ada: berjalan && !!o.antar },
      { k: 'TAGIH_TELAT',      l: 'Tagih denda keterlambatan', i: 'alert',   ket: 'Telat ' + H.hariTelat(o) + ' hari • denda ' + Z.rp(H.dendaBerjalan(o)), ada: s === 'Terlambat' },
      { k: 'ORDER_SELESAI',    l: 'Ucapan terima kasih',       i: 'bintang',    ket: 'Setelah unit kembali',                       ada: s === 'Selesai' },
      { k: '_BEBAS',           l: 'Tulis pesan sendiri',       i: 'pensil',  ket: 'Mulai dari kosong',                          ada: true }
    ];
    return d.filter(function (x) { return x.ada; });
  }

  /**
   * Ambil template milik pemilik di latar belakang bila belum ada.
   * Tanpa ini, pesan yang sudah disunting pemilik di Pengaturan → Notifikasi
   * tidak terpakai sampai halaman itu pernah dibuka; yang muncul cuma bawaan.
   * Menu tetap terbuka seketika — hasilnya dipakai pratinjau berikutnya.
   */
  function pastikanTplPemilik() {
    if (Hal.notifikasi.cfg || Hal.notifikasi._muatCfg) return;
    Hal.notifikasi._muatCfg = true;
    global.App.kirim('notif.config', {}, { diam: true }).then(function (r) {
      if (r && r.success) Hal.notifikasi.cfg = r.data;
    }).catch(function () {}).then(function () { Hal.notifikasi._muatCfg = false; });
  }

  /** Daftar pilihan pesan; tiap pilihan membuka pratinjau yang masih bisa disunting. */
  function menuIngatkan(o) {
    const c = pel(o.pelanggan);
    if (!Z.hp62(c.wa)) return Z.toast('Pelanggan ini belum punya nomor WhatsApp.', 'err');
    pastikanTplPemilik();

    const isi = '<div class="t-sm t-var" style="margin-bottom:10px">Pilih pesan untuk <b>' + esc(c.nama) +
      '</b> — teksnya masih bisa disunting sebelum dikirim.</div>' +
      '<div class="pilih-list">' + opsiIngatkan(o).map(function (x) {
        return '<button class="pilih-baris" data-tpl="' + esc(x.k) + '">' +
          '<span class="pilih-ikon">' + Z.Ikon(x.i, 18) + '</span>' +
          '<span class="pilih-teks"><b>' + esc(x.l) + '</b><span>' + esc(x.ket) + '</span></span>' +
          Z.Ikon('panah', 17) + '</button>';
      }).join('') + '</div>';

    const wrap = Z.Sheet.buka({ judul: 'Ingatkan Penyewa', sub: o.id + ' • ' + c.nama, ikon: 'wa', isi: isi });
    Z.$$('[data-tpl]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.getAttribute('data-tpl');
        Z.Sheet.tutup();
        setTimeout(function () { pratinjauWa(o, k); }, 240);
      });
    });
  }

  /** Pratinjau pesan yang sudah terisi; pemilik bisa menyunting lalu mengirim. */
  function pratinjauWa(o, tipe) {
    const c = pel(o.pelanggan);
    const vars = varsOrder(o);
    const awal = tipe === '_BEBAS' ? '' : isiTpl(tplPesan(tipe), vars);
    const judul = (opsiIngatkan(o).filter(function (x) { return x.k === tipe; })[0] || {}).l || 'Pesan WhatsApp';

    const isi = '<div class="field"><label>Isi pesan</label>' +
      '<textarea class="ta" id="waTeks" rows="12" placeholder="Tulis pesan…">' + esc(awal) + '</textarea>' +
      '<div class="bantu">Akan dibuka di WhatsApp ke <b>' + esc(Z.hpCantik(c.wa)) + '</b>. ' +
      'Suntingan di sini hanya untuk pengiriman ini — template tetapnya diubah di Pengaturan → Notifikasi.</div></div>';

    const wrap = Z.Sheet.buka({ judul: judul, sub: o.id + ' • ' + c.nama, ikon: 'wa', isi: isi,
      aksi: '<button class="btn btn-netral" data-kembali>Pilihan lain</button>' +
            '<button class="btn btn-hijau" data-kirim>' + Z.Ikon('wa', 17) + 'Buka WhatsApp</button>' });

    Z.$('[data-kembali]', wrap).addEventListener('click', function () {
      Z.Sheet.tutup();
      setTimeout(function () { menuIngatkan(o); }, 240);
    });
    Z.$('[data-kirim]', wrap).addEventListener('click', function () {
      const teks = Z.$('#waTeks', wrap).value.trim();
      if (!teks) return Z.toast('Pesannya masih kosong.', 'err');
      Z.Sheet.tutup();
      window.open('https://wa.me/' + Z.hp62(c.wa) + '?text=' + encodeURIComponent(teks), '_blank', 'noopener');
    });
  }

  function kirimWa(o, tipe) {
    const c = pel(o.pelanggan);
    if (!Z.hp62(c.wa)) return Z.toast('Pelanggan ini belum punya nomor WhatsApp.', 'err');
    if (!tipe || tipe === 'MENU') return menuIngatkan(o);
    return pratinjauWa(o, tipe);
  }
  global.kirimWa = kirimWa;
  global.menuIngatkan = menuIngatkan;

  /* Cadangan dipakai saat pengaturan notifikasi belum sempat dimuat. Harus
     memuat SEMUA jenis pesan: kalau satu jenis tidak ada di sini, pemilik
     yang membuka "Ingatkan" sebelum pernah masuk ke Pengaturan → Notifikasi
     akan mendapat kotak pesan kosong. */
  const TPL_CADANGAN = {
    ORDER_BARU: 'Halo {nama}! 🏍️\n\nTerima kasih sudah menyewa di *{usaha}*.\n\nNo. Order : *{order}*\n' +
      'Unit      : {unit} ({plat})\nMulai     : {mulai}\nKembali   : {kembali} pukul {jam}\n' +
      'Durasi    : {durasi} hari\nBawaan    : {perlengkapan}\nTotal     : *{total}*\n' +
      'Sisa bayar: {sisa}\n\n' +
      'Mohon kembalikan tepat waktu beserta perlengkapannya ya. Hati-hati di jalan! 🙏{kwitansi}\n' +
      '— {usaha}',
    ORDER_UBAH: 'Halo {nama}, data order *{order}* telah diperbarui.\nUnit: {unit}\n' +
      'Kembali: {kembali} pukul {jam}\nTotal: *{total}*\n— {usaha}',
    UNIT_SIAP: 'Halo {nama}! ✅\n\n' +
      '*{unit}* ({plat}) sudah siap dan bisa diambil mulai *{mulai}* pukul *{jamMulai}*.\n\n' +
      'Jangan lupa bawa KTP/SIM asli ya. Alamat kami:\n{alamat}\n\nSampai jumpa 🙏{kwitansi}\n' +
      '— {usaha}',
    OTW_JEMPUT: 'Halo {nama} 🏍️💨\n\nSaya sedang dalam perjalanan mengantar *{unit}* ({plat}) ke:\n' +
      '{alamatAntar}\n\nMohon ditunggu sebentar ya. Siapkan KTP/SIM untuk serah terima.\n\n' +
      'Terima kasih 🙏\n— {usaha}',
    TAGIH_BAYAR: 'Halo {nama} 🙏\n\nMengingatkan sisa pembayaran sewa *{unit}* ({order}):\n\n' +
      'Total      : {total}\nSudah bayar: {dibayar}\n*Sisa       : {sisa}*\n\n' +
      'Bisa ditransfer atau dibayar tunai saat pengembalian ya. Terima kasih!{kwitansi}\n— {usaha}',
    INGAT_KEMBALI: 'Halo {nama} 👋\n\nPengingat: *{unit}* ({plat}) dijadwalkan kembali *hari ini* pukul *{jam}*.' +
      '\n\nOrder: {order}\nMohon konfirmasi bila ingin memperpanjang agar tidak terkena denda.\n\n' +
      'Terima kasih 🙏{kwitansi}\n— {usaha}',
    TAWAR_PERPANJANG: 'Halo {nama} 👋\n\nSewa *{unit}* jatuh tempo *{kembali}* pukul *{jam}*.\n\n' +
      'Kalau masih butuh, bisa diperpanjang — balas pesan ini sebelum jatuh tempo supaya tidak kena denda ya.' +
      '\n\nTerima kasih 🙏\n— {usaha}',
    ORDER_PERPANJANG: 'Halo {nama}, sewa *{unit}* berhasil diperpanjang sampai *{kembali}*.\n' +
      'Total menjadi *{total}*.\nTerima kasih 🙏\n— {usaha}',
    OTW_AMBIL: 'Halo {nama} 👋\n\nSaya sedang menuju lokasi untuk menjemput *{unit}* ({plat}).\n\n' +
      'Mohon unit disiapkan beserta perlengkapannya: {perlengkapan}\n\nTerima kasih 🙏\n— {usaha}',
    TAGIH_TELAT: 'Halo {nama},\n\nUnit *{unit}* (order {order}) sudah melewati jatuh tempo *{hari} hari*.\n' +
      'Denda berjalan: *{denda}*\n\n' +
      'Mohon segera dikembalikan atau hubungi kami untuk perpanjangan. Terima kasih 🙏\n— {usaha}',
    ORDER_SELESAI: 'Terima kasih {nama}! ✅\n\nUnit *{unit}* sudah kami terima kembali dengan baik.\n' +
      'Total transaksi: *{total}*\n\n' +
      'Semoga berkenan menyewa lagi di lain waktu. Sampai jumpa! 🏍️{kwitansi}\n— {usaha}'
  };

  function pratinjauStruk(ctx) {
    global.Struk.Printer.pasang(D().struk || []);
    const st = global.Struk.Printer.pengaturan();
    const data = global.Struk.dariOrder(ctx);

    function gambar(wrap) {
      const lebar = Number(Z.$('#skLebar', wrap).value);
      const hasil = global.Struk.Printer.siapkan(data, { lebar: lebar });
      if (!hasil) { Z.$('#skPra', wrap).innerHTML = U.kosong('cetak', 'Model struk belum ada', 'Jalankan ulang setup di Apps Script.'); return null; }
      Z.$('#skPra', wrap).innerHTML = global.Struk.keHtml(hasil);
      return hasil;
    }

    const isi =
      '<div class="grid2" style="margin-bottom:11px">' +
        '<div class="field" style="margin:0"><label>Lebar kertas</label><select class="sel" id="skLebar">' +
        [58, 80].map(function (l) {
          return '<option value="' + l + '"' + (Number(st.lebar) === l ? ' selected' : '') + '>' + l + ' mm</option>'; }).join('') +
        '</select></div>' +
        '<div class="field" style="margin:0"><label>Metode</label><select class="sel" id="skMetode">' +
        [['browser', 'Dialog browser'], ['bt', 'Bluetooth'], ['rawbt', 'RawBT']].map(function (m) {
          return '<option value="' + m[0] + '"' + (st.metode === m[0] ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') +
        '</select></div></div>' +
      '<div class="sk-panggung" id="skPra"></div>' +
      '<div class="btn-grid" style="margin-top:12px">' +
        '<button class="btn btn-kecil btn-netral" id="skPng">' + Z.Ikon('unduh', 15) + 'Unduh PNG</button>' +
        '<button class="btn btn-kecil btn-netral" id="skWa">' + Z.Ikon('wa', 15) + 'Kirim via WA</button></div>';

    const wrap = Z.Sheet.buka({ judul: 'Cetak Struk', sub: ctx.order.id + ' • ' + ctx.pelanggan.nama, ikon: 'cetak', isi: isi,
      aksi: '<button class="btn btn-netral" data-tutup>Tutup</button>' +
            '<button class="btn btn-utama" id="skCetak">' + Z.Ikon('cetak', 17) + 'Cetak</button>' });

    gambar(wrap);
    Z.$('#skLebar', wrap).addEventListener('change', function () { gambar(wrap); });
    Z.$('[data-tutup]', wrap).addEventListener('click', function () { Z.Sheet.tutup(); });
    Z.$('#skCetak', wrap).addEventListener('click', async function () {
      const hasil = gambar(wrap);
      if (!hasil) return;
      const stNow = global.Struk.Printer.pengaturan({
        lebar: Number(Z.$('#skLebar', wrap).value), metode: Z.$('#skMetode', wrap).value });
      global.Struk.Printer.simpan(stNow);
      const r = await global.Struk.Printer.cetak(hasil, stNow);
      Z.toast(r.cadangan ? 'Beralih ke dialog cetak: ' + r.cadangan : 'Perintah cetak dikirim.', r.cadangan ? 'info' : 'ok');
    });
    Z.$('#skPng', wrap).addEventListener('click', async function () {
      const hasil = gambar(wrap);
      const url = await global.Struk.kePng(hasil);
      const a = document.createElement('a');
      a.href = url; a.download = 'struk-' + ctx.order.id + '.png'; a.click();
    });
    Z.$('#skWa', wrap).addEventListener('click', function () {
      const hasil = gambar(wrap);
      const teks = global.Struk.waMonospace(hasil, 'KWITANSI ' + ctx.order.id, ctx.urlVerifikasi);
      const no = Z.hp62(ctx.pelanggan.wa);
      window.open('https://wa.me/' + (no || '') + '?text=' + encodeURIComponent(teks), '_blank', 'noopener');
    });
  }
  global.pratinjauStruk = pratinjauStruk;

  function formSelesai(o) {
    const u = unit(o.unit);
    const tarif = Z.num(global.App.set('TARIF_DENDA_HARI', 50000));
    const isi =
      '<div class="field"><label>Tanggal pengembalian sebenarnya</label>' +
        '<input class="inp" type="date" id="slTgl" value="' + Z.hariIni() + '"></div>' +
      '<div class="kotak" id="slInfo" style="margin-bottom:13px"></div>' +
      '<div class="field"><label>Denda (bisa diubah / dibebaskan)</label>' +
        '<div class="inp-rp"><span>Rp</span><input type="number" id="slDenda" step="5000" min="0"></div></div>' +
      '<div class="field"><label>Total diterima saat ini</label>' +
        '<div class="inp-rp"><span>Rp</span><input type="number" id="slBayar" step="10000" min="0"></div></div>' +
      '<div class="field" style="margin-bottom:0"><label>Catatan kondisi unit saat kembali</label>' +
        '<textarea class="ta" id="slCatatan" maxlength="250" placeholder="Contoh: bensin 2 bar, body mulus, helm lengkap"></textarea></div>';
    const wrap = Z.Sheet.buka({ judul: 'Selesaikan Sewa', sub: o.id + ' • ' + u.nama, ikon: 'check', isi: isi,
      aksi: '<button class="btn btn-netral" data-batal>Batal</button>' +
            '<button class="btn btn-utama" data-ok>' + Z.Ikon('check', 17) + 'Selesaikan</button>' });

    function hitung() {
      const tgl = Z.$('#slTgl', wrap).value;
      const telat = Math.max(0, Z.selisihHari(o.kembali, tgl));
      const denda = telat * tarif;
      Z.$('#slDenda', wrap).value = denda;
      const total = o.sewa + o.biayaAntar + denda - o.diskon;
      Z.$('#slBayar', wrap).value = Math.max(o.dibayar, total);
      Z.$('#slInfo', wrap).innerHTML =
        U.baris('Jatuh tempo', Z.tglId(o.kembali)) +
        U.baris('Keterlambatan', telat ? '<b style="color:var(--danger)">' + telat + ' hari</b>' : '<b style="color:var(--ok)">Tepat waktu</b>') +
        U.baris('Sudah dibayar', Z.rp(o.dibayar)) +
        '<div class="baris baris-total"><span class="baris-l">Total akhir</span><span class="baris-n">' + Z.rp(total) + '</span></div>';
    }
    hitung();
    Z.$('#slTgl', wrap).addEventListener('change', hitung);
    Z.$('[data-batal]', wrap).addEventListener('click', function () { Z.Sheet.tutup(); });
    Z.$('[data-ok]', wrap).addEventListener('click', async function () {
      const r = await global.App.kirim('order.selesai', {
        id: o.id, tglKembali: Z.$('#slTgl', wrap).value, denda: Z.num(Z.$('#slDenda', wrap).value),
        dibayar: Z.num(Z.$('#slBayar', wrap).value), catatan: Z.$('#slCatatan', wrap).value
      });
      if (r.success) {
        Z.Sheet.tutup();
        await global.App.muatUlang(true);
        setTimeout(function () { Hal.detailOrder(o.id); }, 260);
      }
    });
  }

  function formPerpanjang(o) {
    const isi = '<div class="field"><label>Perpanjang berapa hari?</label>' +
      '<input class="inp" type="number" id="ppHari" value="1" min="1" max="30"></div>' +
      '<div class="kotak" id="ppInfo"></div>';
    const wrap = Z.Sheet.buka({ judul: 'Perpanjang Sewa', sub: o.id, ikon: 'jam', isi: isi,
      aksi: '<button class="btn btn-netral" data-batal>Batal</button>' +
            '<button class="btn btn-utama" data-ok>Perpanjang</button>' });
    function hitung() {
      const n = Math.max(1, Z.num(Z.$('#ppHari', wrap).value));
      const hargaHari = o.durasi ? Math.round(o.sewa / o.durasi) : unit(o.unit).harga;
      Z.$('#ppInfo', wrap).innerHTML =
        U.baris('Kembali semula', Z.tglId(o.kembali)) +
        U.baris('Kembali baru', '<b>' + Z.tglId(Z.tambahHari(o.kembali, n)) + '</b>') +
        U.baris('Tambahan biaya', Z.rp(hargaHari * n)) +
        '<div class="baris baris-total"><span class="baris-l">Total baru</span><span class="baris-n">' +
        Z.rp(o.total + hargaHari * n) + '</span></div>';
    }
    hitung();
    Z.$('#ppHari', wrap).addEventListener('input', hitung);
    Z.$('[data-batal]', wrap).addEventListener('click', function () { Z.Sheet.tutup(); });
    Z.$('[data-ok]', wrap).addEventListener('click', async function () {
      const r = await global.App.kirim('order.perpanjang', { id: o.id, hari: Z.num(Z.$('#ppHari', wrap).value) });
      if (r.success) { Z.Sheet.tutup(); await global.App.muatUlang(true); }
    });
  }

  function formBayar(o) {
    const sisa = Math.max(0, o.total - o.dibayar);
    const isi = '<div class="kotak" style="margin-bottom:13px">' +
        U.baris('Total tagihan', Z.rp(o.total)) + U.baris('Sudah dibayar', Z.rp(o.dibayar)) +
        '<div class="baris baris-total"><span class="baris-l">Sisa</span><span class="baris-n">' + Z.rp(sisa) + '</span></div></div>' +
      '<div class="field"><label>Nominal diterima</label><div class="inp-rp"><span>Rp</span>' +
      '<input type="number" id="byNom" value="' + sisa + '" step="10000"></div></div>' +
      '<div class="field" style="margin-bottom:0"><label>Metode</label><div class="pilih-grid" style="grid-template-columns:repeat(3,1fr)">' +
      ['Tunai', 'Transfer BCA', 'QRIS'].map(function (m, i) {
        return '<button class="pilih' + (i === 0 ? ' on' : '') + '" data-bym="' + m + '"><span class="j" style="font-size:11.5px">' + m + '</span></button>';
      }).join('') + '</div></div>';
    const wrap = Z.Sheet.buka({ judul: 'Catat Pembayaran', sub: o.id, ikon: 'dompet', isi: isi,
      aksi: '<button class="btn btn-netral" data-batal>Batal</button>' +
            '<button class="btn btn-utama" data-ok>Simpan</button>' });
    let metode = 'Tunai';
    Z.$$('[data-bym]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        metode = b.getAttribute('data-bym');
        Z.$$('[data-bym]', wrap).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
    Z.$('[data-batal]', wrap).addEventListener('click', function () { Z.Sheet.tutup(); });
    Z.$('[data-ok]', wrap).addEventListener('click', async function () {
      const r = await global.App.kirim('order.bayar', { id: o.id, nominal: Z.num(Z.$('#byNom', wrap).value), metode: metode });
      if (r.success) { Z.Sheet.tutup(); await global.App.muatUlang(true); }
    });
  }

  /* ================================================================
   * HALAMAN PUBLIK: VERIFIKASI KWITANSI
   * ================================================================ */
  /* ================================================================
   *  FORM FOTO SERAH TERIMA / PENGEMBALIAN
   *  Bukti kondisi unit saat berpindah tangan. Foto dikompres di
   *  peramban sebelum dikirim supaya hemat kuota dan cepat di sinyal
   *  lemah — serah terima sering terjadi di pinggir jalan.
   * ================================================================ */
  const SUDUT_BAWAAN = [
    { k: 'penyewa',  l: 'Penyewa + unit', wajib: true,  bantu: 'Wajah penyewa terlihat jelas bersama motornya' },
    { k: 'depan',    l: 'Tampak depan',   wajib: false, bantu: '' },
    { k: 'belakang', l: 'Tampak belakang',wajib: false, bantu: '' },
    { k: 'kiri',     l: 'Sisi kiri',      wajib: false, bantu: '' },
    { k: 'kanan',    l: 'Sisi kanan',     wajib: false, bantu: '' },
    { k: 'odometer', l: 'Odometer',       wajib: false, bantu: 'Untuk bukti jarak tempuh' }
  ];
  const BANTU_SUDUT = { penyewa: 'Wajah penyewa terlihat jelas bersama motornya',
                        odometer: 'Untuk bukti jarak tempuh' };

  /** Kotak foto sesuai pengaturan pemilik; setelan rusak jatuh ke bawaan. */
  function sudutFoto() {
    let d = null;
    try { d = JSON.parse(global.App.set('FOTO_SERAH_SUDUT', '') || 'null'); } catch (e) {}
    if (!Array.isArray(d) || !d.length) return SUDUT_BAWAAN.slice();
    const out = [];
    d.forEach(function (x) {
      const k = x && String(x.k || '');
      if (!k || out.some(function (y) { return y.k === k; })) return;
      out.push({ k: k, l: String(x.l || k), wajib: !!x.wajib, bantu: BANTU_SUDUT[k] || '' });
    });
    return out.length ? out : SUDUT_BAWAAN.slice();
  }
  function fotoKembaliAktif() { return global.App.set('FOTO_KEMBALI_AKTIF', 'TIDAK') === 'YA'; }

  /* Nama lama dipertahankan supaya galeri bukti & halaman publik tetap bisa
     memberi label pada foto yang sudah terlanjur tersimpan. */
  const SUDUT = SUDUT_BAWAAN;

  /**
   * Perkecil foto di peramban sebelum dikirim.
   * Kamera HP menghasilkan 3–8 MB per foto; enam foto sekaligus akan
   * melewati batas unggah dan sangat lambat di jaringan seluler.
   */
  function kecilkanFoto(file, maksSisi, mutu) {
    return new Promise(function (selesai, gagal) {
      const fr = new FileReader();
      fr.onerror = function () { gagal(new Error('Gagal membaca berkas.')); };
      fr.onload = function () {
        const img = new Image();
        img.onerror = function () { gagal(new Error('Berkas bukan gambar yang bisa dibaca.')); };
        img.onload = function () {
          const sisi = maksSisi || 1280;
          let w = img.width, h = img.height;
          if (w > sisi || h > sisi) {
            if (w >= h) { h = Math.round(h * sisi / w); w = sisi; }
            else { w = Math.round(w * sisi / h); h = sisi; }
          }
          try {
            // Selalu JPEG: foto serah terima datang dari kamera, dan PNG untuk
            // foto kamera bisa 3–5× lebih besar tanpa manfaat apa pun.
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const g = c.getContext('2d');
            g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
            g.drawImage(img, 0, 0, w, h);
            selesai(c.toDataURL('image/jpeg', mutu || 0.72));
          } catch (e) { gagal(e); }
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /** @param mode 'serah' (unit diserahkan) atau 'kembali' (unit diterima lagi) */
  function formFotoSerah(o, mode) {
    const u = unit(o.unit), c = pel(o.pelanggan);
    const serah = mode === 'serah';
    const lama = (serah ? o.serah : o.pengembalian) || {};
    const fotoLama = lama.foto || {};
    const terkumpul = {};                       // k → dataURL baru dari sesi ini

    const kotak = sudutFoto().map(function (sd) {
      const ada = fotoLama[sd.k];
      return '<label class="foto-slot' + (ada ? ' ada' : '') + (sd.wajib ? ' wajib' : '') + '" data-slot="' + sd.k + '">' +
        '<input type="file" accept="image/*" capture="environment" data-foto="' + sd.k + '" hidden>' +
        '<div class="foto-pratinjau" data-pra="' + sd.k + '"' +
          (ada ? ' style="background-image:url(' + esc(ada) + ')"' : '') + '>' +
          (ada ? '' : Z.Ikon('kamera', 22)) + '</div>' +
        '<div class="foto-nama">' + esc(sd.l) + (sd.wajib ? ' <b style="color:var(--danger)">*</b>' : '') + '</div>' +
      '</label>';
    }).join('');

    const isi =
      '<div class="kotak" style="display:flex;gap:9px;align-items:center;margin-bottom:12px">' +
        '<span style="color:var(--ungu)">' + Z.Ikon(serah ? 'kunci' : 'check', 18) + '</span>' +
        '<div class="t-sm">' + (serah
          ? 'Bukti <b>penyerahan unit dari Anda ke penyewa</b>. Difoto saat motor diserahkan, ' +
            'bukan saat dikembalikan. Setelah disimpan, order berubah menjadi <b>Berjalan</b>.'
          : 'Foto kondisi unit <b>saat diterima kembali</b>, untuk dibandingkan dengan foto serah terima.') +
        '</div></div>' +

      '<div class="t-cap t-var" style="margin-bottom:7px">' +
      (serah ? 'FOTO SAAT PENYERAHAN' : 'FOTO SAAT PENGEMBALIAN') + '</div>' +
      '<div class="foto-grid">' + kotak + '</div>' +
      global.panduanUnggah([
        'Foto penyewa: <b>wajah dan motornya satu bingkai</b>, plat nomor ikut terlihat.',
        'Foto bodi: ambil dari jarak sekitar 1,5 meter, <b>mendatar</b>, di tempat terang.',
        'Kalau ada lecet atau penyok, foto dari dekat juga — ini yang menolong kalau nanti ada selisih klaim.',
        'Odometer: dekatkan sampai <b>angkanya terbaca</b>, jangan sampai buram.'
      ], 'Ketuk kotak untuk membuka kamera. Foto otomatis dikecilkan di HP Anda sebelum dikirim, ' +
         'jadi tidak boros kuota.') +

      '<div class="grid2" style="margin-top:13px">' +
        '<div class="field"><label>Odometer (km)</label>' +
          '<input class="inp" type="number" id="fsOdo" value="' + (Z.num(lama.odo) || Z.num(u.odo) || '') + '"></div>' +
        '<div class="field"><label>Sisa BBM</label>' +
          '<select class="sel" id="fsBbm">' +
          ['', 'Penuh', '3/4', '1/2', '1/4', 'Hampir habis'].map(function (x) {
            return '<option value="' + esc(x) + '"' + ((lama.bbm || '') === x ? ' selected' : '') + '>' +
              (x || '— pilih —') + '</option>'; }).join('') +
          '</select></div></div>' +
      '<div class="field" style="margin-bottom:0"><label>Catatan kondisi</label>' +
        '<textarea class="inp" id="fsCatatan" rows="2" maxlength="300" ' +
        'placeholder="Contoh: baret halus di spakbor kanan, spion kiri agak longgar">' + esc(lama.catatan || '') + '</textarea></div>';

    const wrap = Z.Sheet.buka({
      judul: serah ? 'Serah Terima ke Penyewa' : 'Foto Saat Unit Kembali',
      sub: o.id + ' • ' + c.nama + ' • ' + u.plat,
      ikon: 'kamera', isi: isi,
      aksi: '<button class="btn btn-netral" data-batal>Batal</button>' +
            '<button class="btn btn-utama" data-simpan>' + Z.Ikon('check', 17) +
            (serah ? 'Simpan & Mulai Sewa' : 'Simpan Foto') + '</button>'
    });

    Z.$$('[data-foto]', wrap).forEach(function (inp) {
      inp.addEventListener('change', async function () {
        const file = inp.files && inp.files[0];
        if (!file) return;
        const k = inp.getAttribute('data-foto');
        const pra = Z.$('[data-pra="' + k + '"]', wrap);
        pra.classList.add('memuat');
        try {
          const dataUrl = await kecilkanFoto(file, 1280, 0.72);
          terkumpul[k] = dataUrl;
          pra.style.backgroundImage = 'url(' + dataUrl + ')';
          pra.innerHTML = '';
          pra.closest('.foto-slot').classList.add('ada');
        } catch (e) {
          Z.toast('Foto "' + k + '" tidak bisa dibaca.', 'err');
        }
        pra.classList.remove('memuat');
      });
    });

    const btn = Z.$('[data-simpan]', wrap);
    btn.addEventListener('click', async function () {
      if (serah && !terkumpul.penyewa && !fotoLama.penyewa) {
        Z.toast('Foto penyewa bersama unit wajib diambil.', 'err');
        const el = Z.$('.foto-slot.wajib', wrap);
        if (el) { el.classList.add('goyang'); setTimeout(function () { el.classList.remove('goyang'); }, 460); }
        return;
      }
      btn.disabled = true;
      btn.innerHTML = Z.Ikon('sinkron', 17, 'putar') + 'Mengunggah…';
      const r = await global.App.kirim(serah ? 'order.serah' : 'order.kembali', {
        id: o.id, foto: terkumpul,
        odo: Z.num(Z.$('#fsOdo', wrap).value),
        bbm: Z.$('#fsBbm', wrap).value,
        catatan: Z.$('#fsCatatan', wrap).value
      });
      btn.disabled = false;
      btn.innerHTML = Z.Ikon('check', 17) + (serah ? 'Simpan & Mulai Sewa' : 'Simpan Foto');
      if (r.success) {
        Z.Sheet.tutup();
        await global.App.muatUlang(true);
        setTimeout(function () { Hal.detailOrder(o.id); }, 260);
      }
    });
  }

  Hal.verifikasi = {
    judul: 'Verifikasi', publik: true,
    render: function (param) {
      const h = Hal.verifikasi.hasil;
      if (h === undefined) return '<section>' + U.skeleton(1, 220) + '</section>';
      if (!h) {
        return '<section class="kartu" style="text-align:center;padding:30px 20px">' +
          '<div class="kosong-ikon" style="background:var(--danger-bg);color:var(--danger)">' + Z.Ikon('x', 26) + '</div>' +
          '<h2 class="t-judul">Kwitansi tidak ditemukan</h2>' +
          '<p class="t-sm t-var" style="margin-top:6px">Kode <b>' + esc(param.kode || '') + '</b> tidak terdaftar di sistem kami.</p>' +
          '<button class="btn btn-netral" style="margin-top:14px" data-nav="beranda">Kembali</button></section>';
      }
      return '<section class="kartu" style="text-align:center;padding:26px 20px">' +
        '<div class="kosong-ikon" style="background:' + (h.sah ? 'var(--ok-bg)' : 'var(--danger-bg)') +
          ';color:' + (h.sah ? 'var(--ok)' : 'var(--danger)') + ';width:68px;height:68px">' +
          Z.Ikon(h.sah ? 'perisai' : 'alert', 30) + '</div>' +
        '<h2 class="t-hero" style="font-size:22px;color:' + (h.sah ? 'var(--ok)' : 'var(--danger)') + '">' +
          esc(h.status) + '</h2>' +
        '<p class="t-sm t-var" style="margin-top:4px">Kwitansi resmi ' + esc(h.usaha) + '</p></section>' +
        '<section class="kartu">' +
        U.baris('Nomor order', '<b>' + esc(h.nomor) + '</b>') +
        U.baris('Tanggal', esc(h.tanggal)) +
        U.baris('Penyewa', esc(h.penyewa)) +
        U.baris('Unit', esc(h.unit) + ' (' + esc(h.plat) + ')') +
        U.baris('Periode', esc(h.periode)) +
        U.baris('Total', '<b>' + esc(h.total) + '</b>') +
        U.baris('Status bayar', U.badgeBayar(h.statusBayar)) +
        (h.statusOrder ? U.baris('Status sewa', '<b>' + esc(h.statusOrder) + '</b>') : '') +
        '</section>' +

        /* Linimasa: booking → serah terima → pengembalian → selesai */
        (Array.isArray(h.linimasa) && h.linimasa.length
          ? '<section class="kartu"><h3 class="t-judul" style="font-size:15px">Perjalanan Sewa</h3>' +
            '<div class="t-sm t-var" style="margin-top:3px">Tanda terima tiap tahap, dari pesanan dibuat sampai sewa selesai.</div>' +
            '<ol class="lini">' + h.linimasa.map(function (t) {
              const foto = t.foto && typeof t.foto === 'object' ? Object.keys(t.foto) : [];
              return '<li class="lini-item' + (t.selesai ? ' selesai' : '') + '">' +
                '<span class="lini-bul">' + (t.selesai ? Z.Ikon('check', 13) : '') + '</span>' +
                '<div class="lini-isi">' +
                  '<div class="lini-judul">' + esc(t.judul || '') + '</div>' +
                  '<div class="lini-waktu">' + esc(t.waktu || '—') + '</div>' +
                  (t.ket ? '<div class="lini-ket">' + esc(t.ket) + '</div>' : '') +
                  (foto.length
                    ? '<div class="foto-bukti" style="margin-top:8px">' + foto.map(function (k) {
                        return imgBukti(t.foto[k], labelSudut(k));
                      }).join('') + '</div>'
                    : '') +
                '</div></li>';
            }).join('') + '</ol></section>'
          : '') +

        /* Rincian biaya */
        (Array.isArray(h.rincian) && h.rincian.length
          ? '<section class="kartu"><h3 class="t-judul" style="font-size:15px">Rincian Biaya</h3>' +
            '<div style="margin-top:8px">' + h.rincian.map(function (r) {
              // U.baris() meng-escape label tapi tidak nilainya, jadi penebalan
              // label harus lewat kelas baris, bukan tag <b> di dalam teks.
              const tebal = /^total$/i.test(r[0]);
              return U.baris(r[0], tebal ? '<b>' + esc(r[1]) + '</b>' : esc(r[1]),
                tebal ? 'baris-total' : '');
            }).join('') + '</div></section>'
          : '') +

        /* Perlengkapan yang dibawa */
        (h.perlengkapan
          ? '<section class="kartu"><h3 class="t-judul" style="font-size:15px">Perlengkapan Dibawa</h3>' +
            '<div class="t-sm" style="margin-top:7px;line-height:1.7">' + esc(h.perlengkapan) + '</div></section>'
          : '') +

        '<section class="kartu"><div class="t-sm t-var" style="line-height:1.6;text-align:center">' +
        'Nama penyewa sengaja disamarkan demi privasi.<br>Sidik dokumen: <code style="font-size:10px">' +
        esc((h.hash || '').slice(0, 24) || '-') + '</code></div></section>';
    },
    setelah: function (root, param) {
      if (Hal.verifikasi.hasil !== undefined) return;
      global.App.kirim('verifikasi', { kode: param.kode }, { diam: true, publik: true }).then(function (r) {
        Hal.verifikasi.hasil = r.success ? r.data : null;
        global.App.render();
      });
    }
  };
})(window);
