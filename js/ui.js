/* ================================================================
 *  ZAN RENTAL — ui.js
 *  Komponen tampilan yang dipakai ulang: kartu KPI, chip, badge,
 *  grafik SVG (sparkline, batang, area, gauge), peringkat, kosong.
 * ================================================================ */
(function (global) {
  'use strict';
  const Z = global.ZAN;
  const esc = Z.esc;

  /* ---------------- Status & warna ---------------- */
  const STATUS_UNIT = {
    'Tersedia': { kelas: 'ok',     ikon: 'check',    teks: 'Tersedia' },
    'Disewa':   { kelas: 'ungu',   ikon: 'kunci',    teks: 'Disewa' },
    'Servis':   { kelas: 'warn',   ikon: 'perkakas', teks: 'Servis' },
    'Nonaktif': { kelas: 'netral', ikon: 'x',        teks: 'Nonaktif' }
  };
  const STATUS_ORDER = {
    'Booking':  { kelas: 'info',   ikon: 'kalender', teks: 'Booking' },
    'Berjalan': { kelas: 'ungu',   ikon: 'sinkron',  teks: 'Berjalan' },
    'Selesai':  { kelas: 'ok',     ikon: 'check',    teks: 'Selesai' },
    'Batal':    { kelas: 'netral', ikon: 'x',        teks: 'Batal' },
    'Terlambat':{ kelas: 'danger', ikon: 'alert',    teks: 'Terlambat' }
  };
  const STATUS_BAYAR = {
    'Lunas': { kelas: 'ok', teks: 'Lunas' },
    'DP':    { kelas: 'warn', teks: 'DP' },
    'Belum': { kelas: 'danger', teks: 'Belum bayar' }
  };

  function badge(teks, kelas, ikon) {
    return '<span class="badge badge-' + (kelas || 'netral') + '">' +
      (ikon ? Z.Ikon(ikon, 13) : '') + '<span>' + esc(teks) + '</span></span>';
  }
  function badgeUnit(status) {
    const s = STATUS_UNIT[status] || STATUS_UNIT.Nonaktif;
    return '<span class="badge badge-' + s.kelas + '"><i class="titik"></i><span>' + esc(s.teks) + '</span></span>';
  }
  function badgeOrder(status) {
    const s = STATUS_ORDER[status] || STATUS_ORDER.Booking;
    return '<span class="badge badge-' + s.kelas + '">' + Z.Ikon(s.ikon, 13) + '<span>' + esc(s.teks) + '</span></span>';
  }
  function badgeBayar(status) {
    const s = STATUS_BAYAR[status] || STATUS_BAYAR.Belum;
    return '<span class="badge badge-' + s.kelas + '"><span>' + esc(s.teks) + '</span></span>';
  }

  /* ---------------- Kartu KPI ---------------- */
  function kartuKpi(o) {
    const delta = o.delta === undefined || o.delta === null ? '' :
      '<span class="kpi-delta ' + (o.delta >= 0 ? 'naik' : 'turun') + '">' +
      Z.Ikon(o.delta >= 0 ? 'naik' : 'turun', 13) +
      (o.delta >= 0 ? '+' : '') + (Math.round(o.delta * 10) / 10) + '%</span>';
    return '<div class="kartu kpi' + (o.kelas ? ' ' + o.kelas : '') + '"' + (o.aksi ? ' data-nav="' + esc(o.aksi) + '" role="button" tabindex="0"' : '') + '>' +
      '<div class="kpi-atas">' +
        '<span class="kpi-ikon ' + (o.warna || '') + '">' + Z.Ikon(o.ikon || 'grafik', 19) + '</span>' +
        (delta || (o.tagKanan ? '<span class="kpi-tag">' + esc(o.tagKanan) + '</span>' : '')) +
      '</div>' +
      '<div class="kpi-badan">' +
        '<div class="kpi-label">' + esc(o.label) + '</div>' +
        '<div class="kpi-nilai">' + (o.nilaiHtml || esc(o.nilai)) + '</div>' +
      '</div>' +
      (o.spark ? '<div class="kpi-spark">' + sparkline(o.spark, o.sparkWarna) + '</div>' : '') +
      (o.bawah ? '<div class="kpi-bawah">' + o.bawah + '</div>' : '') +
      '</div>';
  }

  /* ---------------- Sparkline ---------------- */
  function sparkline(nilai, warna) {
    const v = (nilai || []).map(Number);
    if (v.length < 2) return '';
    const maks = Math.max.apply(null, v), min = Math.min.apply(null, v);
    const span = maks - min || 1;
    const w = 100, h = 28;
    const titik = v.map(function (n, i) {
      return [(i / (v.length - 1)) * w, h - 3 - ((n - min) / span) * (h - 8)];
    });
    const garis = titik.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    }).join(' ');
    const area = garis + ' L' + w + ' ' + h + ' L0 ' + h + ' Z';
    const c = warna || 'var(--ungu)';
    return '<svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + area + '" fill="' + c + '" opacity=".10"/>' +
      '<path d="' + garis + '" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + titik[titik.length - 1][0].toFixed(1) + '" cy="' + titik[titik.length - 1][1].toFixed(1) +
      '" r="2.8" fill="var(--kuning)" stroke="' + c + '" stroke-width="1.4"/></svg>';
  }

  /* ---------------- Grafik batang (1–2 seri) ---------------- */
  function grafikBatang(o) {
    const label = o.label || [];
    const seri = o.seri || [];
    const n = label.length;
    if (!n) return kosong('grafik', 'Belum ada data', 'Data grafik akan tampil setelah ada transaksi.');
    const W = 320, H = 132, pad = 18, baseline = H - 22;
    let maks = 0;
    seri.forEach(function (s) { s.nilai.forEach(function (v) { if (v > maks) maks = v; }); });
    maks = maks || 1;
    const slot = (W - pad * 2) / n;
    const lebarBar = Math.min(seri.length > 1 ? 11 : 20, (slot - 8) / seri.length);

    let batang = '';
    for (let i = 0; i < n; i++) {
      const xSlot = pad + slot * i + slot / 2;
      const totalLebar = lebarBar * seri.length + (seri.length - 1) * 3;
      for (let s = 0; s < seri.length; s++) {
        const v = Number(seri[s].nilai[i] || 0);
        const t = Math.max(2, (v / maks) * (baseline - 20));
        const x = xSlot - totalLebar / 2 + s * (lebarBar + 3);
        const sorot = o.sorot === i;
        batang += '<g class="bar-g" data-i="' + i + '" data-s="' + s + '">' +
          '<rect class="bar" x="' + x.toFixed(1) + '" y="' + (baseline - t).toFixed(1) + '" width="' + lebarBar.toFixed(1) +
          '" height="' + t.toFixed(1) + '" rx="4" fill="' + (sorot && s === 0 ? 'var(--kuning)' : seri[s].warna) + '">' +
          '<title>' + esc(label[i]) + ' — ' + esc(seri[s].nama) + ': ' + Z.rp(v) + '</title></rect></g>';
      }
      batang += '<text class="bar-lbl" x="' + xSlot.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' +
        esc(label[i]) + '</text>';
    }
    let grid = '';
    [0.25, 0.5, 0.75].forEach(function (f) {
      const y = baseline - (baseline - 20) * f;
      grid += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) +
        '" class="grid-line"/>';
    });
    const legenda = seri.length > 1 ? '<div class="legenda">' + seri.map(function (s) {
      return '<span class="leg"><i style="background:' + s.warna + '"></i>' + esc(s.nama) + '</span>';
    }).join('') + '</div>' : '';

    return '<div class="grafik-wrap">' + legenda +
      '<svg class="grafik-batang" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' +
      esc(o.judul || 'Grafik batang') + '">' + grid +
      '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + baseline + '" y2="' + baseline + '" class="grid-base"/>' +
      batang + '</svg></div>';
  }

  /* ---------------- Grafik area ---------------- */
  function grafikArea(o) {
    const label = o.label || [], nilai = (o.nilai || []).map(Number);
    if (nilai.length < 2) return kosong('grafik', 'Data belum cukup', 'Minimal dua titik data untuk menggambar tren.');
    const W = 320, H = 130, pad = 16, base = H - 22;
    const maks = Math.max.apply(null, nilai) || 1;
    const titik = nilai.map(function (v, i) {
      return [pad + (i / (nilai.length - 1)) * (W - pad * 2), base - (v / maks) * (base - 16)];
    });
    let d = '';
    titik.forEach(function (p, i) {
      if (!i) { d += 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); return; }
      const q = titik[i - 1];
      const cx = (q[0] + p[0]) / 2;
      d += ' C' + cx.toFixed(1) + ' ' + q[1].toFixed(1) + ',' + cx.toFixed(1) + ' ' + p[1].toFixed(1) +
           ',' + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    });
    const area = d + ' L' + titik[titik.length - 1][0].toFixed(1) + ' ' + base + ' L' + titik[0][0].toFixed(1) + ' ' + base + ' Z';
    let lbl = '';
    label.forEach(function (t, i) {
      if (label.length > 8 && i % 2) return;
      lbl += '<text class="bar-lbl" x="' + titik[i][0].toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle">' + esc(t) + '</text>';
    });
    const uid = 'a' + Math.random().toString(36).slice(2, 7);
    return '<div class="grafik-wrap"><svg class="grafik-area" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="var(--ungu)" stop-opacity=".30"/>' +
      '<stop offset="100%" stop-color="var(--ungu)" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + uid + ')"/>' +
      '<path d="' + d + '" fill="none" stroke="var(--ungu)" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="' + titik[titik.length - 1][0].toFixed(1) + '" cy="' + titik[titik.length - 1][1].toFixed(1) +
      '" r="4" fill="var(--kuning)" stroke="var(--ungu)" stroke-width="2"/>' + lbl + '</svg></div>';
  }

  /* ---------------- Gauge setengah lingkaran ---------------- */
  function gauge(persen, o) {
    o = o || {};
    const p = Math.max(0, Math.min(150, Number(persen) || 0));
    const sudut = Math.min(100, p) / 100;
    const r = 62, keliling = Math.PI * r;
    const uid = 'g' + Math.random().toString(36).slice(2, 7);
    return '<div class="gauge">' +
      '<svg viewBox="0 0 160 92" role="img" aria-label="Pencapaian ' + p + ' persen">' +
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="var(--ungu)"/><stop offset="100%" stop-color="var(--kuning)"/></linearGradient></defs>' +
      '<path d="M18 80 A' + r + ' ' + r + ' 0 0 1 142 80" fill="none" stroke="var(--c-high)" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M18 80 A' + r + ' ' + r + ' 0 0 1 142 80" fill="none" stroke="url(#' + uid + ')" stroke-width="14" ' +
      'stroke-linecap="round" stroke-dasharray="' + keliling.toFixed(1) + '" ' +
      'stroke-dashoffset="' + (keliling * (1 - sudut)).toFixed(1) + '" class="gauge-arc"/>' +
      '</svg>' +
      '<div class="gauge-tengah"><div class="g-nilai">' + Math.round(p) + '%</div>' +
      '<div class="g-label">' + esc(o.label || 'Tercapai') + '</div></div></div>';
  }

  /* ---------------- Progress bar ---------------- */
  function progress(persen, warna, tinggi) {
    const p = Math.max(0, Math.min(100, Number(persen) || 0));
    return '<div class="progress" style="height:' + (tinggi || 8) + 'px">' +
      '<i style="width:' + p + '%;background:' + (warna || 'var(--ink)') + '"></i></div>';
  }
  /** Dua segmen berdampingan (mis. laba vs beban). */
  function progressDua(kiri, warnaKiri, warnaKanan) {
    const p = Math.max(0, Math.min(100, Number(kiri) || 0));
    return '<div class="progress progress-dua">' +
      '<i style="width:' + p + '%;background:' + (warnaKiri || 'var(--kuning)') + '"></i>' +
      '<i style="width:' + (100 - p) + '%;background:' + (warnaKanan || 'var(--danger)') + '"></i></div>';
  }

  /* ---------------- Daftar peringkat ---------------- */
  function peringkat(rows) {
    if (!rows.length) return kosong('bintang', 'Belum ada peringkat', 'Peringkat muncul setelah ada order selesai.');
    const maks = rows[0].nilai || 1;
    return '<div class="rank-list">' + rows.map(function (r, i) {
      return '<div class="rank">' +
        '<div class="rank-baris">' +
          '<div class="rank-kiri">' +
            '<span class="rank-no' + (i === 0 ? ' juara' : '') + '">' + (i + 1) + '</span>' +
            '<div><div class="rank-nama">' + esc(r.nama) + '</div>' +
            '<div class="rank-sub">' + esc(r.sub || '') + '</div></div>' +
          '</div>' +
          '<div class="rank-nilai">' + esc(r.nilaiTeks || Z.rp(r.nilai)) + '</div>' +
        '</div>' +
        progress((r.nilai / maks) * 100, i === 0 ? 'var(--ink)' : 'var(--ungu)', 7) +
      '</div>';
    }).join('') + '</div>';
  }

  /* ---------------- Keadaan kosong & skeleton ---------------- */
  function kosong(ikon, judul, pesan, aksiHtml) {
    return '<div class="kosong">' +
      '<div class="kosong-ikon">' + Z.Ikon(ikon || 'info', 26) + '</div>' +
      '<div class="kosong-judul">' + esc(judul) + '</div>' +
      (pesan ? '<div class="kosong-pesan">' + esc(pesan) + '</div>' : '') +
      (aksiHtml || '') + '</div>';
  }
  function skeleton(n, tinggi) {
    let s = '';
    for (let i = 0; i < (n || 3); i++) s += '<div class="skel" style="height:' + (tinggi || 84) + 'px"></div>';
    return '<div class="skel-wrap">' + s + '</div>';
  }

  /* ---------------- Chip filter ---------------- */
  function chips(daftar, aktif, atribut) {
    return '<div class="chips">' + daftar.map(function (c) {
      const on = c.kunci === aktif;
      return '<button type="button" class="chip' + (on ? ' on' : '') + (c.kelas ? ' chip-' + c.kelas : '') + '" ' +
        (atribut || 'data-chip') + '="' + esc(c.kunci) + '">' +
        (c.ikon ? Z.Ikon(c.ikon, 14) : (c.titik ? '<i class="titik titik-' + c.titik + '"></i>' : '')) +
        '<span>' + esc(c.teks) + '</span>' +
        (c.jumlah !== undefined ? '<b class="chip-n">' + c.jumlah + '</b>' : '') +
        '</button>';
    }).join('') + '</div>';
  }

  /* ---------------- Baris data (label : nilai) ---------------- */
  function baris(label, nilai, kelas) {
    return '<div class="baris' + (kelas ? ' ' + kelas : '') + '"><span class="baris-l">' + esc(label) +
      '</span><span class="baris-n">' + (nilai === undefined ? '' : nilai) + '</span></div>';
  }

  /* ---------------- Avatar ---------------- */
  function avatar(nama, kelas) {
    const warna = ['#69567e', '#0B0B0F', '#2563EB', '#16A34A', '#D97706', '#7B2FBE'];
    const idx = String(nama || '').split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0) % warna.length;
    return '<span class="avatar ' + (kelas || '') + '" style="background:' + warna[idx] + '">' +
      esc(Z.inisial(nama)) + '</span>';
  }

  global.UI = {
    badge: badge, badgeUnit: badgeUnit, badgeOrder: badgeOrder, badgeBayar: badgeBayar,
    kartuKpi: kartuKpi, sparkline: sparkline, grafikBatang: grafikBatang, grafikArea: grafikArea,
    gauge: gauge, progress: progress, progressDua: progressDua, peringkat: peringkat,
    kosong: kosong, skeleton: skeleton, chips: chips, baris: baris, avatar: avatar,
    STATUS_UNIT: STATUS_UNIT, STATUS_ORDER: STATUS_ORDER
  };
})(window);
