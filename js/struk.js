/* ================================================================
 *  ZAN RENTAL — struk.js
 *  Mesin struk thermal 58/80 mm: render model teks → baris,
 *  lalu keluarkan sebagai pratinjau HTML, ESC/POS (Bluetooth / RawBT),
 *  dialog cetak browser, PNG, atau teks WhatsApp.
 *
 *  Satu render dipakai untuk SEMUA keluaran → yang dilihat = yang dicetak.
 * ================================================================ */
(function (global) {
  'use strict';
  const Z = global.ZAN;
  const esc = Z.esc;

  /* ================================================================
   * 1. MESIN RENDER
   * ================================================================ */
  const ASCII = { '•': '-', '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '×': 'x', '…': '...' };

  function keAscii(s) {
    return String(s || '')
      .replace(/[•–—’‘“”×…]/g, function (c) { return ASCII[c]; })
      .normalize ? String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[•–—’‘“”×…]/g, function (c) { return ASCII[c] || c; })
        .replace(/[^\x20-\x7E\n]/g, '')
      : String(s || '').replace(/[^\x20-\x7E\n]/g, '');
  }

  function ubah(nilai, mod) {
    let v = (nilai === undefined || nilai === null) ? '' : nilai;
    String(mod || '').split('|').forEach(function (p) {
      p = p.trim();
      if (!p) return;
      const nama = p.split(':')[0].toLowerCase();
      const arg = p.slice(nama.length + 1);
      if (nama === 'kosong0') { if (Z.num(v) === 0) v = ''; }
      else if (nama === 'rp') v = v === '' ? '' : Z.rp(v);
      else if (nama === 'angka') v = v === '' ? '' : Z.ribuan(v);
      else if (nama === 'kapital') v = String(v).toUpperCase();
      else if (nama === 'kecil') v = String(v).toLowerCase();
      else if (nama === 'judul') v = String(v).toLowerCase().replace(/\b\w/g, function (h) { return h.toUpperCase(); });
      else if (nama === 'tgl') v = Z.tglId(v);
      else if (nama === 'terbilang') v = Z.terbilang(v) + (arg === 'rupiah' ? ' rupiah' : '');
      else if (nama === 'potong') v = String(v).slice(0, Number(arg) || 20);
      else if (nama === 'bawaan') { if (String(v) === '') v = arg; }
      else if (nama === 'awal') { if (String(v) !== '') v = arg + v; }
      else if (nama === 'akhir') { if (String(v) !== '') v = v + arg; }
    });
    return String(v);
  }

  const POLA = /\{\{\s*([#?\/]?)\s*([A-Za-z][A-Za-z0-9_.]*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g;

  function isiPenanda(teks, data) {
    let adaPenanda = false, adaIsi = false;
    const hasil = String(teks).replace(POLA, function (m, jenis, kunci, mod) {
      adaPenanda = true;
      const v = ubah(data[kunci.toUpperCase()], mod);
      if (v !== '') adaIsi = true;
      return v;
    });
    return { teks: hasil, adaPenanda: adaPenanda, adaIsi: adaIsi };
  }

  /** Uraikan model (teks) menjadi daftar baris siap cetak. */
  function render(isi, data, kolom, opsi) {
    opsi = opsi || {};
    data = data || {};
    const K = kolom || 32;
    const baris = [];
    const sumber = String(isi || '').split('\n');

    // 1. Kembangkan blok {{#ITEM}} … {{/ITEM}} dan {{?X}} … {{/X}}
    const terbuka = [];
    for (let i = 0; i < sumber.length; i++) {
      let ln = sumber[i];
      if (/^\s*\/\//.test(ln)) continue;

      const blokBuka = ln.match(/^\s*\{\{#\s*([A-Za-z_][\w]*)\s*\}\}\s*$/);
      if (blokBuka) {
        const kunci = blokBuka[1].toUpperCase();
        const akhir = cariTutup(sumber, i, kunci);
        const isiBlok = sumber.slice(i + 1, akhir);
        const daftar = data[kunci] || [];
        daftar.forEach(function (item, idx) {
          const sub = Object.assign({}, data, { NO: String(idx + 1) });
          Object.keys(item || {}).forEach(function (k) { sub[kunci + '.' + k.toUpperCase()] = item[k]; });
          isiBlok.forEach(function (b) { tambahBaris(baris, b, sub, K, opsi); });
        });
        i = akhir;
        continue;
      }
      const syaratBuka = ln.match(/^\s*\{\{\?\s*([A-Za-z_][\w.]*)\s*\}\}\s*$/);
      if (syaratBuka) {
        const kunci = syaratBuka[1].toUpperCase();
        const akhir = cariTutup(sumber, i, kunci);
        const nilai = data[kunci];
        const kosong = nilai === undefined || nilai === null || nilai === '' || nilai === 0 || nilai === '0' ||
          (Array.isArray(nilai) && !nilai.length);
        if (!kosong) sumber.slice(i + 1, akhir).forEach(function (b) { tambahBaris(baris, b, data, K, opsi); });
        i = akhir;
        continue;
      }
      // Syarat sebaris {{?X}}…{{/X}}
      ln = ln.replace(/\{\{\?\s*([A-Za-z_][\w.]*)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g, function (m, k, isiDalam) {
        const v = data[k.toUpperCase()];
        const kosong = v === undefined || v === null || v === '' || v === 0 || v === '0';
        return kosong ? '' : isiDalam;
      });
      tambahBaris(baris, ln, data, K, opsi);
    }
    return { baris: baris, kolom: K, data: data };
  }

  function cariTutup(arr, mulai, kunci) {
    for (let j = mulai + 1; j < arr.length; j++) {
      if (new RegExp('^\\s*\\{\\{/\\s*' + kunci + '\\s*\\}\\}\\s*$', 'i').test(arr[j])) return j;
    }
    return arr.length;
  }

  function tambahBaris(out, mentah, data, K, opsi) {
    let ln = String(mentah);
    const gaya = { align: 'L', bold: false, besar: false, tinggi: false };
    let m;
    const polaDir = /^\s*\[(C|R|L|B|2|H|LR|-|=|BOX|FEED|CUT|LOGO)\]/i;
    let tipe = 'teks', lr = false;
    while ((m = ln.match(polaDir))) {
      const d = m[1].toUpperCase();
      ln = ln.slice(m[0].length);
      if (d === 'C') gaya.align = 'C';
      else if (d === 'R') gaya.align = 'R';
      else if (d === 'L') gaya.align = 'L';
      else if (d === 'B') gaya.bold = true;
      else if (d === '2') gaya.besar = true;
      else if (d === 'H') gaya.tinggi = true;
      else if (d === 'LR') lr = true;
      else if (d === '-' || d === '=') { tipe = d === '-' ? 'garis' : 'garis2'; }
      else if (d === 'BOX') tipe = 'box';
      else if (d === 'FEED') tipe = 'feed';
      else if (d === 'CUT') tipe = 'cut';
      else if (d === 'LOGO') tipe = 'logo';
    }
    if (tipe === 'garis' || tipe === 'garis2') { out.push({ tipe: tipe }); return; }
    if (tipe === 'feed') { out.push({ tipe: 'feed' }); return; }
    if (tipe === 'cut') { out.push({ tipe: 'cut' }); return; }
    if (tipe === 'logo') { if (opsi && opsi.logo && opsi.logoUrl) out.push({ tipe: 'logo', url: opsi.logoUrl }); return; }

    // QR / Barcode
    const qr = ln.match(/^\s*\[QR\]([\s\S]*)$/i);
    if (qr) {
      if (opsi && opsi.qr === false) return;
      const r = isiPenanda(qr[1], data);
      const teksQr = r.teks.trim() || String(data.URL_VERIFIKASI || '');
      if (teksQr) out.push({ tipe: 'qr', isi: teksQr });
      return;
    }
    const bar = ln.match(/^\s*\[BAR\]([\s\S]*)$/i);
    if (bar) {
      const r = isiPenanda(bar[1], data);
      if (r.teks.trim()) out.push({ tipe: 'teks', teks: r.teks.trim(), align: 'C', bold: true, besar: true });
      return;
    }

    if (lr) {
      const sisi = ln.split('||');
      const kiri = isiPenanda(sisi[0] || '', data);
      const kanan = isiPenanda(sisi[1] || '', data);
      if ((kiri.adaPenanda || kanan.adaPenanda) && !kiri.adaIsi && !kanan.adaIsi) return;
      out.push({ tipe: 'lr', kiri: kiri.teks.trim(), kanan: kanan.teks.trim(),
                 bold: gaya.bold, besar: gaya.besar, tinggi: gaya.tinggi });
      return;
    }
    const r = isiPenanda(ln, data);
    if (r.adaPenanda && !r.adaIsi) return;          // baris yang hanya berisi penanda kosong dibuang
    if (tipe === 'box') {
      if (!r.teks.trim()) return;
      out.push({ tipe: 'box', teks: r.teks.trim(), align: gaya.align || 'C' });
      return;
    }
    if (!r.teks.trim() && !r.adaPenanda) { out.push({ tipe: 'kosong' }); return; }
    if (!r.teks.trim()) return;
    out.push({ tipe: 'teks', teks: r.teks, align: gaya.align, bold: gaya.bold,
               besar: gaya.besar, tinggi: gaya.tinggi });
  }

  /* ---------- Bantu tata letak teks ---------- */
  function bungkus(teks, lebar) {
    const kata = String(teks).split(/\s+/);
    const out = [];
    let kini = '';
    kata.forEach(function (w) {
      if (!kini.length) { kini = w; return; }
      if ((kini + ' ' + w).length <= lebar) kini += ' ' + w;
      else { out.push(kini); kini = w; }
    });
    if (kini.length) out.push(kini);
    return out.length ? out : [''];
  }
  function ratakan(teks, lebar, align) {
    const sisa = Math.max(0, lebar - teks.length);
    if (align === 'C') {
      const kiri = Math.floor(sisa / 2);
      return new Array(kiri + 1).join(' ') + teks;
    }
    if (align === 'R') return new Array(sisa + 1).join(' ') + teks;
    return teks;
  }
  function barisLR(kiri, kanan, lebar) {
    const out = [];
    const ruangKiri = Math.max(4, lebar - kanan.length - 1);
    const pecah = bungkus(kiri, ruangKiri);
    pecah.forEach(function (p, i) {
      if (i < pecah.length - 1) { out.push(p); return; }
      const spasi = Math.max(1, lebar - p.length - kanan.length);
      out.push(p + new Array(spasi + 1).join(' ') + kanan);
    });
    return out;
  }

  /** Ubah hasil render menjadi baris teks monospace (dipakai WA & dialog cetak). */
  function keTeks(hasil) {
    const K = hasil.kolom;
    const out = [];
    hasil.baris.forEach(function (b) {
      if (b.tipe === 'garis') { out.push(new Array(K + 1).join('-')); return; }
      if (b.tipe === 'garis2') { out.push(new Array(K + 1).join('=')); return; }
      if (b.tipe === 'feed' || b.tipe === 'kosong') { out.push(''); return; }
      if (b.tipe === 'cut') { out.push(new Array(K + 1).join('- ').slice(0, K)); return; }
      if (b.tipe === 'qr') { out.push(ratakan('[ QR ]', K, 'C')); return; }
      if (b.tipe === 'logo') { out.push(ratakan('[ LOGO ]', K, 'C')); return; }
      if (b.tipe === 'box') { out.push(ratakan('** ' + b.teks + ' **', K, 'C')); return; }
      const lebar = b.besar ? Math.floor(K / 2) : K;
      if (b.tipe === 'lr') {
        barisLR(b.kiri, b.kanan, lebar).forEach(function (l) { out.push(l); });
        return;
      }
      bungkus(b.teks, lebar).forEach(function (l) { out.push(ratakan(l, lebar, b.align)); });
    });
    return out.join('\n');
  }

  /* ---------- Pratinjau HTML 1:1 ---------- */
  function keHtml(hasil, opsi) {
    opsi = opsi || {};
    const K = hasil.kolom;
    let html = '';
    hasil.baris.forEach(function (b) {
      if (b.tipe === 'garis') { html += '<div class="sk-ln sk-garis"></div>'; return; }
      if (b.tipe === 'garis2') { html += '<div class="sk-ln sk-garis2"></div>'; return; }
      if (b.tipe === 'feed' || b.tipe === 'kosong') { html += '<div class="sk-ln">&nbsp;</div>'; return; }
      if (b.tipe === 'cut') { html += '<div class="sk-cut"><span>potong</span></div>'; return; }
      if (b.tipe === 'logo') { html += '<div class="sk-ln sk-c"><img class="sk-logo" src="' + esc(b.url) + '" alt=""></div>'; return; }
      if (b.tipe === 'qr') {
        const d = Z.qrDataUrl(b.isi, 4);
        html += d ? '<div class="sk-ln sk-c"><img class="sk-qr" src="' + d + '" alt="QR"></div>'
                  : '<div class="sk-ln sk-c">[QR tidak tersedia]</div>';
        return;
      }
      if (b.tipe === 'box') { html += '<div class="sk-ln sk-c"><span class="sk-box">' + esc(b.teks) + '</span></div>'; return; }
      const kelas = 'sk-ln' + (b.bold ? ' sk-b' : '') + (b.besar ? ' sk-2' : '') + (b.tinggi ? ' sk-h' : '') +
        (b.align === 'C' ? ' sk-c' : (b.align === 'R' ? ' sk-r' : ''));
      const lebar = b.besar ? Math.floor(K / 2) : K;
      if (b.tipe === 'lr') {
        barisLR(b.kiri, b.kanan, lebar).forEach(function (l) {
          html += '<div class="' + kelas + '">' + esc(l).replace(/ /g, '&nbsp;') + '</div>';
        });
        return;
      }
      bungkus(b.teks, lebar).forEach(function (l) {
        html += '<div class="' + kelas + '">' + esc(ratakan(l, lebar, b.align)).replace(/ /g, '&nbsp;') + '</div>';
      });
    });
    return '<div class="sk-kertas sk-' + K + '">' + html + '</div>';
  }

  /* ================================================================
   * 2. ESC/POS
   * ================================================================ */
  const ESC = 0x1B, GS = 0x1D;

  function bytesDariTeks(s) {
    const a = keAscii(s);
    const out = [];
    for (let i = 0; i < a.length; i++) out.push(a.charCodeAt(i) & 0xff);
    return out;
  }

  /** Matriks QR → raster ESC/POS (GS v 0). */
  function qrRaster(isi, lebarTitik) {
    if (typeof qrcode !== 'function') return null;
    const q = qrcode(0, 'M');
    q.addData(String(isi));
    q.make();
    const n = q.getModuleCount();
    const skala = Math.max(2, Math.floor((lebarTitik || 240) / n));
    const sisi = n * skala;
    const byteBaris = Math.ceil(sisi / 8);
    const data = new Uint8Array(byteBaris * sisi);
    for (let y = 0; y < sisi; y++) {
      for (let x = 0; x < sisi; x++) {
        if (q.isDark(Math.floor(y / skala), Math.floor(x / skala))) {
          data[y * byteBaris + (x >> 3)] |= (0x80 >> (x & 7));
        }
      }
    }
    return { w: byteBaris, h: sisi, data: data };
  }

  function escpos(hasil, opsi) {
    opsi = opsi || {};
    const K = hasil.kolom;
    const lebarTitik = K >= 48 ? 576 : 384;
    let buf = [];
    function push(arr) { buf = buf.concat(arr); }

    push([ESC, 0x40]);                                   // init
    if (opsi.density) push([GS, 0x28, 0x4B, 0x02, 0x00, 0x31, Number(opsi.density) || 0]);

    hasil.baris.forEach(function (b) {
      if (b.tipe === 'garis')  { push([ESC, 0x61, 0]); push(bytesDariTeks(new Array(K + 1).join('-'))); push([0x0A]); return; }
      if (b.tipe === 'garis2') { push([ESC, 0x61, 0]); push(bytesDariTeks(new Array(K + 1).join('='))); push([0x0A]); return; }
      if (b.tipe === 'feed' || b.tipe === 'kosong') { push([0x0A]); return; }
      if (b.tipe === 'cut') { push([ESC, 0x64, 0x02]); push([GS, 0x56, 0x42, 0x00]); return; }
      if (b.tipe === 'qr') {
        const r = qrRaster(b.isi, Math.min(lebarTitik - 40, 280));
        if (!r) return;
        push([ESC, 0x61, 1]);
        push([GS, 0x76, 0x30, 0x00, r.w & 0xff, (r.w >> 8) & 0xff, r.h & 0xff, (r.h >> 8) & 0xff]);
        push(Array.prototype.slice.call(r.data));
        push([0x0A]);
        return;
      }
      if (b.tipe === 'box') {
        push([ESC, 0x61, 1]); push([GS, 0x42, 1]); push([ESC, 0x45, 1]);
        push(bytesDariTeks(' ' + b.teks + ' '));
        push([ESC, 0x45, 0]); push([GS, 0x42, 0]); push([0x0A]);
        return;
      }
      const align = b.align === 'C' ? 1 : (b.align === 'R' ? 2 : 0);
      push([ESC, 0x61, align]);
      if (b.bold) push([ESC, 0x45, 1]);
      if (b.besar) push([GS, 0x21, 0x11]);
      else if (b.tinggi) push([GS, 0x21, 0x01]);
      const lebar = b.besar ? Math.floor(K / 2) : K;
      const barisTeks = b.tipe === 'lr' ? barisLR(b.kiri, b.kanan, lebar) : bungkus(b.teks, lebar);
      barisTeks.forEach(function (l) { push(bytesDariTeks(l)); push([0x0A]); });
      if (b.besar || b.tinggi) push([GS, 0x21, 0x00]);
      if (b.bold) push([ESC, 0x45, 0]);
    });

    push([ESC, 0x61, 0]);
    push([ESC, 0x64, Number(opsi.feedAkhir || 4)]);
    if (opsi.beep) push([ESC, 0x42, 0x02, 0x02]);
    if (opsi.autoCut !== false) push([GS, 0x56, 0x42, 0x00]);
    return new Uint8Array(buf);
  }

  /* ================================================================
   * 3. PENCETAK
   * ================================================================ */
  const BT = {
    UUID_SERVICE: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'],
    perangkat: null, karakter: null,
    didukung: function () { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice); },
    terhubung: function () { return !!(this.karakter && this.perangkat && this.perangkat.gatt && this.perangkat.gatt.connected); },
    hubungkan: async function () {
      if (!this.didukung()) throw new Error('Peramban ini tidak mendukung Web Bluetooth. Pakai Chrome di Android/PC, atau gunakan RawBT.');
      const dev = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, optionalServices: this.UUID_SERVICE
      });
      const server = await dev.gatt.connect();
      let karakter = null;
      const layanan = await server.getPrimaryServices();
      for (let i = 0; i < layanan.length && !karakter; i++) {
        const cs = await layanan[i].getCharacteristics();
        for (let j = 0; j < cs.length; j++) {
          if (cs[j].properties.write || cs[j].properties.writeWithoutResponse) { karakter = cs[j]; break; }
        }
      }
      if (!karakter) throw new Error('Printer terhubung tetapi tidak menemukan jalur tulis. Coba printer lain atau pakai RawBT.');
      this.perangkat = dev; this.karakter = karakter;
      return dev.name || 'Printer';
    },
    kirim: async function (bytes) {
      if (!this.terhubung()) await this.hubungkan();
      const potongan = 180;
      for (let i = 0; i < bytes.length; i += potongan) {
        const bagian = bytes.slice(i, i + potongan);
        if (this.karakter.writeValueWithoutResponse) await this.karakter.writeValueWithoutResponse(bagian);
        else await this.karakter.writeValue(bagian);
        await new Promise(function (r) { setTimeout(r, 18); });
      }
    }
  };

  function rawbt(bytes) {
    let biner = '';
    for (let i = 0; i < bytes.length; i++) biner += String.fromCharCode(bytes[i]);
    const b64 = btoa(biner);
    global.location.href = 'intent:base64,' + b64 + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
  }

  function cetakBrowser(hasil, salinan) {
    const teks = keTeks(hasil);
    const mm = hasil.kolom >= 48 ? 80 : 58;
    const halaman = [];
    for (let i = 0; i < (salinan || 1); i++) halaman.push('<pre>' + esc(teks) + '</pre>');
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>Struk</title><style>' +
      '@page{size:' + mm + 'mm auto;margin:0}' +
      'html,body{margin:0;padding:0}' +
      'pre{font-family:"Courier New",monospace;font-size:' + (mm === 58 ? 10 : 11) + 'px;line-height:1.35;' +
      'white-space:pre;margin:0;padding:4mm 2mm;page-break-after:always}' +
      'pre:last-child{page-break-after:auto}</style></head><body>' + halaman.join('') + '</body></html>';
    const ifr = document.createElement('iframe');
    ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
    document.body.appendChild(ifr);
    ifr.srcdoc = html;
    ifr.onload = function () {
      try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {}
      setTimeout(function () { if (ifr.parentNode) ifr.parentNode.removeChild(ifr); }, 2000);
    };
  }

  async function kePng(hasil) {
    const K = hasil.kolom;
    const lebarTitik = K >= 48 ? 576 : 384;
    const skala = 1;
    const fontPx = Math.floor(lebarTitik / K * 1.68);
    const tinggiBaris = Math.round(fontPx * 1.32);
    const teks = keTeks(hasil).split('\n');
    const qrBaris = hasil.baris.filter(function (b) { return b.tipe === 'qr'; }).length;
    const tinggiQr = qrBaris * (lebarTitik * 0.52);
    const c = document.createElement('canvas');
    c.width = lebarTitik * skala;
    c.height = Math.round((teks.length * tinggiBaris + 48 + tinggiQr) * skala);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#000';
    ctx.font = fontPx + 'px "Courier New", monospace';
    ctx.textBaseline = 'top';

    let y = 16;
    for (let i = 0; i < hasil.baris.length; i++) {
      const b = hasil.baris[i];
      if (b.tipe === 'qr') {
        const d = Z.qrDataUrl(b.isi, 6);
        if (d) {
          await new Promise(function (ok) {
            const img = new Image();
            img.onload = function () {
              const s = Math.round(lebarTitik * 0.46);
              ctx.drawImage(img, Math.round((c.width - s) / 2), y, s, s);
              y += s + 8;
              ok();
            };
            img.onerror = function () { ok(); };
            img.src = d;
          });
        }
        continue;
      }
      const potongan = keTeks({ baris: [b], kolom: K }).split('\n');
      potongan.forEach(function (l) {
        ctx.font = (b.bold ? 'bold ' : '') + (b.besar ? Math.round(fontPx * 1.9) : fontPx) + 'px "Courier New", monospace';
        ctx.fillText(l, 8, y);
        y += b.besar ? Math.round(tinggiBaris * 1.9) : tinggiBaris;
      });
    }
    return c.toDataURL('image/png');
  }

  function waMonospace(hasil, judul, tautan) {
    const teks = keTeks(hasil);
    return (judul ? '*' + judul + '*\n\n' : '') + '```\n' + teks + '\n```' + (tautan ? '\n\n' + tautan : '');
  }

  /* ================================================================
   * 4. PENGATURAN PERANGKAT (tersimpan di perangkat ini saja)
   * ================================================================ */
  const BAWAAN = { lebar: 58, kode58: 'STRUK_58', kode80: 'STRUK_80', metode: 'browser',
                   salinan: 1, qr: true, autoCut: true, beep: false, hemat: false };

  const Printer = {
    templates: [],
    pasang: function (templates) { this.templates = templates || []; },
    pengaturan: function (sesaat) {
      const st = Object.assign({}, BAWAAN, Z.Simpan.ambil('printer', {}) || {}, sesaat || {});
      if (!BT.didukung() && st.metode === 'bt') st.metode = 'browser';
      return st;
    },
    simpan: function (st) { Z.Simpan.taruh('printer', st); return st; },
    template: function (kode) {
      return this.templates.filter(function (t) { return t.kode === kode; })[0] || null;
    },
    pilih: function (st) {
      const kode = Number(st.lebar) >= 80 ? st.kode80 : st.kode58;
      return this.template(kode) || this.templates[0] || null;
    },
    siapkan: function (data, sesaat) {
      const st = this.pengaturan(sesaat);
      const tpl = this.pilih(st);
      if (!tpl) return null;
      const kolom = Number(st.lebar) >= 80 ? 48 : 32;
      const hasil = render(tpl.isi, data, kolom, { qr: st.qr !== false });
      hasil.st = st; hasil.tpl = tpl;
      return hasil;
    },
    cetak: async function (hasil, st) {
      st = st || hasil.st || this.pengaturan();
      const bytes = escpos(hasil, { autoCut: st.autoCut !== false, beep: !!st.beep });
      if (st.metode === 'bt') {
        try {
          for (let i = 0; i < (st.salinan || 1); i++) await BT.kirim(bytes);
          return { cara: 'bt' };
        } catch (e) {
          cetakBrowser(hasil, st.salinan);
          return { cara: 'browser', cadangan: e.message };
        }
      }
      if (st.metode === 'rawbt') {
        try { rawbt(bytes); return { cara: 'rawbt' }; }
        catch (e) { cetakBrowser(hasil, st.salinan); return { cara: 'browser', cadangan: e.message }; }
      }
      cetakBrowser(hasil, st.salinan);
      return { cara: 'browser' };
    },
    tes: async function (st) {
      const hasil = render(
        '[C][B]TES PRINTER\n[C]' + (global.ZAN_CONFIG.APP_NAMA || 'ZAN Rental') + '\n[-]\n' +
        '[LR]Lebar kertas||{{LEBAR}} mm\n[LR]Kolom||{{KOLOM}}\n[LR]Waktu||{{WAKTU}}\n[-]\n' +
        '[C]Bila teks ini rapi, printer siap.\n[FEED]',
        { LEBAR: st.lebar, KOLOM: Number(st.lebar) >= 80 ? 48 : 32, WAKTU: new Date().toLocaleString('id-ID') },
        Number(st.lebar) >= 80 ? 48 : 32, { qr: false });
      hasil.st = st;
      return this.cetak(hasil, st);
    }
  };

  /* ================================================================
   * 5. PEMETA DATA: order ZAN → kamus struk
   * ================================================================ */
  function dariOrder(ctx) {
    const o = ctx.order, p = ctx.pelanggan || {}, u = ctx.unit || {}, s = ctx.pengaturan || {};
    const hargaHari = o.durasi ? Math.round(o.sewa / o.durasi) : 0;
    const sisa = Math.max(0, o.total - o.dibayar);
    return {
      TOKO_NAMA: s.NAMA_USAHA || 'ZAN RENTAL MOTOR',
      TOKO_SLOGAN: s.SLOGAN || 'Mudah - Aman - Terpercaya',
      TOKO_ALAMAT: s.ALAMAT || '',
      TOKO_WA: s.WA_PEMILIK || '',
      NOTA: o.id,
      TANGGAL: Z.tglId(o.tglOrder || o.mulai),
      JAM: Z.jamDari(o.dibuat) || o.jamMulai || '',
      PELANGGAN: p.nama || '-',
      PELANGGAN_WA: Z.hp08(p.wa),
      UNIT: u.nama || '-',
      PLAT: u.plat || '-',
      // Perlengkapan yang dicentang pada order ini; kalau order lama belum
      // punya datanya, pakai fasilitas bawaan unit sebagai cadangan.
      FASILITAS: ((o.perlengkapan || []).map(function (x) { return (x.j || 1) + ' ' + x.n; }).join(', '))
        || u.fasilitas || '2 Helm SNI',
      PERLENGKAPAN: ((o.perlengkapan || []).map(function (x) { return (x.j || 1) + ' ' + x.n; }).join(', ')) || '',
      AMBIL: Z.tglId(o.mulai) + ' ' + (o.jamMulai || ''),
      KEMBALI: Z.tglId(o.kembali) + ' ' + (o.jamKembali || ''),
      DURASI: o.durasi,
      HARGA: hargaHari,
      SUBTOTAL: o.sewa,
      ONGKIR: o.biayaAntar,
      DENDA: o.denda,
      DISKON: o.diskon,
      DEPOSIT: o.deposit,
      TOTAL: o.total,
      DITERIMA: o.dibayar,
      SISA: sisa,
      METODE: o.metode || 'Tunai',
      STATUS: o.status === 'Batal' ? 'DIBATALKAN' :
              (sisa > 0 ? 'BELUM LUNAS - SISA ' + Z.rp(sisa) : 'LUNAS (' + String(o.metode || 'Tunai').toUpperCase() + ')'),
      CATATAN: o.catatan || '',
      KODE: o.kode || '',
      URL_VERIFIKASI: ctx.urlVerifikasi || '',
      PESAN_KAKI: 'Terima kasih telah menyewa di ' + (s.NAMA_USAHA || 'ZAN Rental') + '. Hati-hati di jalan!'
    };
  }

  global.Struk = {
    render: render, keHtml: keHtml, keTeks: keTeks, escpos: escpos, kePng: kePng,
    cetakBrowser: cetakBrowser, rawbt: rawbt, BT: BT, Printer: Printer,
    waMonospace: waMonospace, dariOrder: dariOrder, ubah: ubah, BAWAAN: BAWAAN
  };
})(window);
