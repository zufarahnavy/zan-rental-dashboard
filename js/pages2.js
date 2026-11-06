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
          '<div class="field"><label>Metode / rekening</label><div class="pilih-grid" style="grid-template-columns:repeat(3,1fr)">' +
            ['Tunai', 'Transfer BCA', 'QRIS'].map(function (m) {
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
      '<div class="bantu">Variabel tersedia: {nama} {usaha} {unit} {plat} {order} {mulai} {kembali} {jam} {durasi} {total} {sisa} {denda} {hari}</div></div>';
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

      let html = '';
      html += '<section><div style="display:flex;align-items:center;gap:9px">' +
        '<button class="ikon-btn" data-nav="lainnya">' + Z.Ikon('panahKiri', 20) + '</button>' +
        '<div><h1 class="t-judul">Pengaturan</h1><div class="t-sm t-var">Identitas usaha, tarif, dan fitur opsional</div></div></div></section>';

      html += '<section class="kartu"><h3 class="t-judul">Identitas Usaha</h3><div style="margin-top:12px">' +
        f('NAMA_USAHA', 'Nama usaha') + f('SLOGAN', 'Slogan') + f('ALAMAT', 'Alamat') +
        f('WA_PEMILIK', 'Nomor WA pemilik', { tipe: 'tel', bantu: 'Penerima pengingat harian.' }) +
        f('APP_URL', 'Alamat aplikasi (GitHub Pages)', { ph: 'https://nama.github.io/zan-rental-dashboard/',
          bantu: 'Dipakai untuk tautan verifikasi pada QR kwitansi.' }) +
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
      const sp = Z.$('#simpanSet', root);
      if (sp) sp.addEventListener('click', async function () {
        const nilai = {};
        Z.$$('[data-set]', root).forEach(function (i) { nilai[i.getAttribute('data-set')] = i.value; });
        Z.$$('[data-sw]', root).forEach(function (i) { nilai[i.getAttribute('data-sw')] = i.checked ? 'YA' : 'TIDAK'; });
        const r = await global.App.kirim('pengaturan.simpan', { nilai: nilai });
        if (r.success) await global.App.muatUlang(true);
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
          '<div style="font-size:10.5px;color:#555">' + esc(u.tahun || '') + ' • ' + esc(u.fasilitas || '') + '</div></div>' +
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

      /* Aksi lanjutan */
      '<div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">' +
        (s === 'Berjalan' || s === 'Terlambat'
          ? '<button class="btn btn-utama btn-blok" data-k="selesai">' + Z.Ikon('check', 17) + 'Selesaikan Sewa' +
            (denda ? ' (denda ' + Z.rp(denda) + ')' : '') + '</button>' +
            '<div class="btn-grid">' +
            '<button class="btn btn-netral" data-k="perpanjang">' + Z.Ikon('jam', 16) + 'Perpanjang</button>' +
            '<button class="btn btn-netral" data-k="bayar">' + Z.Ikon('dompet', 16) + 'Catat Bayar</button></div>' : '') +
        (s === 'Booking'
          ? '<button class="btn btn-utama btn-blok" data-k="mulai">' + Z.Ikon('kunci', 17) + 'Serah Terima & Mulai Sewa</button>' : '') +
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
        if (k === 'mulai') {
          const r = await global.App.kirim('order.simpan', { id: o.id, pelanggan: o.pelanggan, unit: o.unit,
            mulai: o.mulai, jamMulai: o.jamMulai, kembali: o.kembali, jamKembali: o.jamKembali,
            hargaHari: o.durasi ? Math.round(o.sewa / o.durasi) : u.harga, antar: o.antar, alamatAntar: o.alamatAntar,
            biayaAntar: o.biayaAntar, diskon: o.diskon, deposit: o.deposit, dibayar: o.dibayar,
            metode: o.metode, catatan: o.catatan, status: 'Berjalan' });
          if (r.success) { Z.Sheet.tutup(); await global.App.muatUlang(true); }
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

  function kirimWa(o, tipe) {
    const c = pel(o.pelanggan), u = unit(o.unit);
    const cfg = Hal.notifikasi.cfg;
    const usaha = global.App.set('NAMA_USAHA', 'ZAN Rental');
    const vars = {
      nama: c.nama, usaha: usaha, unit: u.nama, plat: u.plat, order: o.id,
      mulai: Z.tglId(o.mulai), kembali: Z.tglId(o.kembali), jam: o.jamKembali, durasi: o.durasi,
      total: Z.rp(o.total), sisa: Z.rp(Math.max(0, o.total - o.dibayar)),
      denda: Z.rp(H.dendaBerjalan(o)), hari: H.hariTelat(o), link: urlVerif(o.kode)
    };
    let tpl = cfg && cfg.matriks && cfg.matriks[tipe] ? cfg.matriks[tipe].pesan : TPL_CADANGAN[tipe];
    const pesan = String(tpl || '').replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] === undefined ? '' : String(vars[k]);
    });
    const no = Z.hp62(c.wa);
    if (!no) return Z.toast('Pelanggan ini belum punya nomor WhatsApp.', 'err');
    window.open('https://wa.me/' + no + '?text=' + encodeURIComponent(pesan), '_blank', 'noopener');
  }
  global.kirimWa = kirimWa;

  const TPL_CADANGAN = {
    ORDER_BARU: 'Halo {nama}! 🏍️\n\nTerima kasih sudah menyewa di *{usaha}*.\n\nNo. Order: *{order}*\nUnit: {unit} ({plat})\n' +
      'Mulai: {mulai}\nKembali: {kembali} pukul {jam}\nTotal: *{total}*\nSisa bayar: {sisa}\n\nHati-hati di jalan! 🙏',
    INGAT_KEMBALI: 'Halo {nama} 👋\n\nPengingat: *{unit}* ({plat}) dijadwalkan kembali *hari ini* pukul *{jam}*.\n' +
      'Order: {order}\n\nMohon konfirmasi bila ingin memperpanjang. Terima kasih 🙏\n— {usaha}',
    TAGIH_TELAT: 'Halo {nama},\n\nUnit *{unit}* (order {order}) sudah melewati jatuh tempo *{hari} hari*.\n' +
      'Denda berjalan: *{denda}*\n\nMohon segera dikembalikan atau hubungi kami. Terima kasih 🙏\n— {usaha}',
    ORDER_SELESAI: 'Terima kasih {nama}! ✅\n\nUnit *{unit}* sudah kami terima kembali.\nTotal transaksi: *{total}*\n\n' +
      'Semoga berkenan menyewa lagi. Sampai jumpa! 🏍️\n— {usaha}'
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
        '<div class="t-sm t-var" style="margin-top:12px;line-height:1.6;text-align:center">' +
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
