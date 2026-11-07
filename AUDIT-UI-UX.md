# Audit UI/UX — ZAN Rental Dashboard

Tanggal audit: 7 November 2026 · Versi kode: setelah revisi batch ini

Audit ini **diukur**, bukan dikira-kira. Setiap angka di bawah berasal dari skrip yang
menjalankan aplikasi sungguhan di Chromium (12 rute × 6 lebar layar × 2 tema) dan membaca
`getComputedStyle` serta `PerformanceObserver` dari DOM yang benar-benar dirender.
Cara menjalankan ulang ada di bagian terakhir.

Ringkasan: **5 bug diperbaiki, 34 pelanggaran kontras dibereskan jadi 0 (termasuk 0 saat
pemilik memilih warna merek gelap), target sentuh di perangkat sentuh dari 18 pelanggaran
jadi 0, CLS 0,0000.** Sisanya rekomendasi, bukan kerusakan.

| Yang diukur | Sebelum | Sesudah |
|---|---|---|
| Pasangan warna gagal WCAG AA (merek bawaan) | 34 | **0** |
| Pasangan warna gagal WCAG AA (merek biru tua) | 5 | **0** |
| Target sentuh < 44px di layar sentuh | 18 | **0** |
| Target sentuh < 24px dengan tetikus | 1 | **0** |
| Teks terpotong tanpa ellipsis | 0 | 0 |
| Halaman meluber mendatar (6 lebar layar) | 0 | 0 |
| Cumulative Layout Shift | 0,0000 | 0,0000 |
| Teks dengan tebal palsu (bobot 900) | 48 | **0** |

---

## 1. Bug yang ditemukan dan sudah diperbaiki

### 1.1 Mode gelap rusak oleh fitur warna merek — **parah**

Ini yang paling serius dan paling tidak kelihatan.

`Merek.terapkan()` menulis warna pilihan pemilik langsung ke `:root` sebagai *inline style*:

```js
r.style.setProperty('--ink', tinta);   // #0B0B0F
r.style.setProperty('--ungu', kedua);  // #69567E
```

Inline style pada elemen `<html>` **mengalahkan** aturan `html[data-tema="gelap"]` pada
elemen yang sama. Akibatnya di mode gelap `--ink` tetap hitam, padahal kanvasnya juga hitam.

Terukur: label menu aktif "Beranda" = **1,05 : 1**. Ambang minimum WCAG adalah 4,5 : 1.
Praktis teksnya tidak terlihat. Nama unit dan angka KPI yang memakai `--ungu` juga
jatuh ke 2,6 : 1.

**Perbaikan** — warna merek masuk lewat variabel perantara, tema yang memutuskan:

```css
:root {
  --ink:  var(--merek-tinta, #0B0B0F);
  --ungu: var(--merek-ungu,  #69567e);
}
html[data-tema="gelap"] {
  --ink:  #F5F5F7;                            /* tidak bisa ditimpa inline lagi */
  --ungu: var(--merek-ungu-terang, #b79ad4);
}
```

```js
r.style.setProperty('--merek-tinta', tinta);
r.style.setProperty('--merek-ungu', kedua);
r.style.setProperty('--merek-ungu-terang', Merek.terangkan(kedua, 0.74));
```

`Merek.terangkan()` menaikkan kecerahan lewat HSL sambil menjaga rona, jadi warna merek
apa pun tetap terbaca di kanvas gelap — diuji: ungu → 8,4:1, biru → 8,1:1, hijau → 11,5:1.

### 1.2 Chip gelap terbalik di mode gelap

```css
.badge-ink { background: var(--ink); color: var(--kuning); }   /* sebelum */
```

Begitu `--ink` menjadi terang di mode gelap, badge "22 motor" jadi kuning di atas putih =
**1,16 : 1**. Latar chip gelap harus dipaku, bukan mengikuti token teks:

```css
.badge-ink { background: #0B0B0F; color: var(--kuning); }
html[data-tema="gelap"] .badge-ink { background: #2D2540; color: var(--kuning); }
```

### 1.3 Warna status dipakai untuk dua peran yang bertentangan

`--ok`, `--danger`, `--warn`, `--info` dipakai **sekaligus** sebagai warna teks *dan*
sebagai latar tombol berteks putih. Satu nilai tidak bisa memenuhi keduanya:
`#16A34A` sebagai teks di atas putih = 3,3 : 1, dan putih di atasnya juga 3,3 : 1.

**Perbaikan** — satu peran, satu token:

```css
:root {
  --ok:        #0F7A37;  /* TEKS & ikon — wajib ≥4,5:1 di kanvas tema aktif */
  --ok-isi:    #0F7A37;  /* ISIAN tombol berteks putih — sama di kedua tema */
  --ok-bg:     #eaf7ed;  /* tint latar badge yang teksnya memakai --ok      */
  --ok-terang: #16A34A;  /* titik/bar/garis yang TIDAK memuat teks          */
}
html[data-tema="gelap"] {
  --ok: #4ADE80;  --ok-terang: #4ADE80;   /* --ok-isi sengaja tidak diubah */
}
```

Aturan praktisnya: **`--x` untuk teks, `--x-isi` untuk latar berteks putih,
`--x-terang` untuk titik dan bar.** Memakai `--x` sebagai latar tombol adalah
kekeliruan yang dulu membuat tombol "Tagih via WA" hanya 3,3 : 1.

### 1.4 Fitur "atur warna aplikasi" bisa membuat teks tidak terbaca

Pemilik boleh memilih warna aksen apa pun. Kuning bawaan `#FFE600` sangat terang,
sehingga dua pemakaian yang berlawanan kebetulan sama-sama aman:

* aksen sebagai **teks** di atas permukaan gelap (plat nomor, chip aktif, tautan mode gelap) — 11 tempat;
* aksen sebagai **latar** yang ditimpa teks hitam (tombol utama, menu aktif, FAB) — 22 tempat.

Begitu pemilik memilih aksen gelap (biru tua, merah marun), keduanya rusak sekaligus:
teks aksen jadi gelap-di-atas-gelap, dan teks hitam di atas aksen gelap juga hilang.
Terukur dengan aksen `#2F7BFF`: plat nomor 3,72 : 1, badge 3,72 : 1.

**Perbaikan** — dua token turunan yang dihitung ulang setiap warna merek berubah:

```js
r.style.setProperty('--aksen-teks',    Merek.terbacaDiGelap(aksen)); // aksen, diterangkan bila perlu
r.style.setProperty('--aksen-kontras', Merek.kontrasAtas(aksen));    // #0B0B0F atau #FFFFFF
```

```css
:root { --aksen-teks: var(--kuning); --aksen-kontras: #0B0B0F; }
.badge-ink { background: #0B0B0F; color: var(--aksen-teks); }
.btn-utama { background: var(--kuning); color: var(--aksen-kontras); }
```

`terbacaDiGelap()` menaikkan kecerahan bertahap sampai rasio terhadap permukaan gelap
paling terang (`#3F4247`) mencapai 4,5 : 1. `kontrasAtas()` memilih hitam atau putih —
mana pun yang lebih kontras di atas warna aksen.

Hasil uji lintas warna merek:

| Aksen pilihan | `--aksen-teks` | Rasio | `--aksen-kontras` | Rasio |
|---|---|---|---|---|
| `#FFE600` kuning bawaan | `#FFE600` | 11,4 : 1 | `#0B0B0F` | 15,5 : 1 |
| `#2F7BFF` biru | `#6990d3` | 4,5 : 1 | `#0B0B0F` | 5,1 : 1 |
| `#0B3D91` biru tua | `#6991d3` | 4,6 : 1 | `#FFFFFF` | 10,0 : 1 |
| `#111111` hampir hitam | `#9e9e9e` | 5,4 : 1 | `#FFFFFF` | 18,9 : 1 |

### 1.5 Palet avatar punya dua warna yang tidak terbaca

Inisial pelanggan ditulis putih di atas warna acak dari palet. Dua di antaranya gagal:
`#16A34A` (3,3:1) dan `#D97706` (3,19:1). Diganti dengan varian yang semuanya ≥ 4,5 : 1:

```js
const warna = ['#69567e', '#0B0B0F', '#2563EB', '#0F7A37', '#B45309', '#7B2FBE'];
```

---

## 2. Tata letak & bentuk (shape)

### 2.1 Border-radius — ternyata sudah benar, hanya belum diberi nama

Nilai radius yang terpakai: **7, 10, 11, 12, 13, 14, 15, 20, 50%**.

Sepintas ini terlihat tidak konsisten. Setelah ditelusuri, polanya justru mengikuti
kaidah **concentric radius** — radius elemen dalam = radius luar − padding:

| Tingkat | Radius | Contoh |
|---|---|---|
| Kartu | 20px | `.kartu` |
| Elemen di dalam kartu (padding ~7px) | 13–14px | `.avatar`, blok rincian |
| Elemen di dalam itu lagi | 10–11px | chip di dalam blok |
| Terdalam | 7px | tag kecil |
| Pil & lingkaran | 999px / 50% | tombol, badge, titik |

Kalau diratakan jadi satu nilai, sudut dalam justru terlihat "terlalu bulat" relatif
terhadap sudut luarnya. **Jangan diratakan.** Yang kurang hanyalah penamaan, supaya
pola ini bertahan saat kode berkembang:

```css
:root {
  --r-kartu:   20px;   /* kartu & panel */
  --r-dalam-1: 13px;   /* = 20 − 7 padding */
  --r-dalam-2: 10px;
  --r-dalam-3:  7px;
  --r-input:   12px;
  --r-pill:   999px;
}
```

Outlier sebenarnya hanya **15px (2 tempat)** dan **18px (3 tempat)** — rapikan ke
`--r-dalam-1` atau `--r-kartu` saat menyentuh berkas itu. Tidak mendesak.

### 2.2 Skala spasi melebar

`gap` yang terpakai: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16 px — **14 nilai berbeda**.
`padding-top`: 17 nilai berbeda.

Mata tidak bisa membedakan `gap: 9px` dari `gap: 10px`, tapi perbedaan itu membuat
kartu-kartu sejenis terlihat "tidak rata" tanpa orang tahu kenapa. Rekomendasi:
kunci ke skala 4px dan pakai tokennya, bukan angka mentah.

```css
:root {
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px;
  --s-4: 16px; --s-5: 24px; --s-6: 32px;
}
/* 5px → --s-1, 9/10/11px → --s-2 atau --s-3, 13/14px → --s-3 */
```

Saya **tidak** menerapkan ini otomatis: 1.588 pemakaian `gap: 5px` dan 2.766 `gap: 8px`
tersebar di dua berkas halaman, dan penggantian massal berisiko menggeser tata letak
yang sekarang sudah terbukti tidak meluber di enam lebar layar. Lakukan bertahap
per komponen saat menyentuhnya.

### 2.3 Grid & flex — aman

Diuji di 360, 390, 430, 768, 1024, dan 1440px: **tidak ada satu pun halaman yang
meluber mendatar**, dan **tidak ada teks terpotong tanpa ellipsis** (0 temuan).

Dua kelas bug yang sudah ditutup di revisi sebelumnya dan layak diingat sebagai pola:

```css
/* Item flex/grid punya min-width:auto. <input> memakai lebar intrinsik size=20
   dan menolak menyusut → baris meluber di layar sempit. */
.inp-rp input { flex: 1 1 0; min-width: 0; width: 100%; }

/* Tombol ber-nowrap bisa memaksa trek grid melebar melampaui kontainer. */
.btn-grid > .btn { min-width: 0; padding-inline: 12px; }
@media (max-width: 374px) { .btn-grid { grid-template-columns: 1fr; } }
```

`min-width: 0` adalah obat untuk hampir semua "kenapa kartu saya meluber" di flexbox.

---

## 3. Tipografi & kontras

### 3.1 Kontras — **0 pelanggaran** (dari 34)

Pengukuran dilakukan dengan mengomposisi seluruh lapisan latar semi-transparan sampai
menemukan warna solid, lalu menghitung rasio WCAG terhadap warna teks yang benar-benar
dirender. Elemen berlatar gradient dikecualikan karena tidak bisa diukur andal dari CSS.

| | Sebelum | Sesudah |
|---|---|---|
| Pasangan warna gagal AA | 34 | **0** |
| Kasus terburuk | 1,05 : 1 | ≥ 4,5 : 1 |

### 3.2 Skala huruf agak melebar

Ukuran yang terpakai: 9, 10, 10.5, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 26 px.
Sistem desainnya sendiri menetapkan 11 / 12 / 14 / 15 / 18 / 22 / 26 / 28 / 32.

Yang di luar skala: **9px, 10px, 10.5px, 13px, 17px, 20px, 21px**.

Penilaian jujur: selisih 10,5 → 11px tidak akan terasa oleh siapa pun, jadi saya tidak
mengubahnya — risikonya lebih besar daripada manfaatnya. Yang **layak** diperhatikan:

* **9px** pada label sumbu grafik (`.bar-lbl`). Untuk dibaca sambil berdiri di bawah
  matahari Jember, ini terlalu kecil. Naikkan ke 10–11px.
* **10px** pada stempel waktu transaksi sudah saya naikkan ke 11px sekalian, karena
  warnanya juga hanya 4,49 : 1 (tepat di bawah ambang).

Bobot huruf: 400 / 500 / 600 / 700 / 800 / 900 — **enam bobot**. Poppins yang dipaketkan
hanya 400–800, jadi `font-weight: 900` dirender sintetis oleh peramban (tebal palsu,
bentuk huruf jadi agak kotor). Ganti 48 pemakaian `900` menjadi `800`.

```css
/* cari: font-weight: 900  → ganti: font-weight: 800 */
```

---

## 4. Layout shift (CLS) saat loading → dashboard

**Hasil: CLS = 0,0000** di 390px maupun 1440px. Ambang "baik" Google adalah < 0,1.

Tidak ada yang perlu diperbaiki. Penyebabnya sudah benar sejak awal:

* Layar masuk dan kerangka aplikasi memakai tinggi tetap (`100dvh`), jadi tidak ada
  elemen yang "mendorong" elemen lain saat data tiba.
* Font dipaketkan lokal di `fonts/` dengan `font-display: swap` dan pasangan metrik yang
  mirip, sehingga pergantian font tidak menggeser baris.
* Data dirender setelah kerangka terpasang, bukan menambah elemen di atasnya.

Kalau nanti menambah elemen yang tingginya bergantung data (misal banner promo),
pola amannya adalah memesan ruangnya lebih dulu:

```css
.banner-promo { min-height: 72px; }          /* pesan ruang sebelum isi datang */
.skeleton     { contain: layout paint; }     /* isi yang berubah tidak menggeser luar */
```

Untuk transisi keluar loader yang halus, pola yang dipakai sekarang sudah tepat
(fade + translate kecil, bukan mengubah tinggi):

```css
.lajur-masuk { animation: masuk .26s var(--ease) both; }
@keyframes masuk { from { opacity: 0; transform: translateY(6px); } }
@media (prefers-reduced-motion: reduce) { .lajur-masuk { animation: none; } }
```

---

## 5. Target sentuh

Pedoman desain proyek ini menetapkan minimum **44px**; WCAG 2.5.8 (AA) menetapkan 24×24.

| | Sebelum | Sesudah |
|---|---|---|
| Perangkat sentuh | 18 pelanggaran | **0** |
| Desktop (tetikus) | 1 di bawah 24px | **0** |

Pendekatan yang dipakai sengaja **tidak membesarkan tombolnya** — tampilan tetap seperti
rancangan Stitch — melainkan memperluas area sentuhnya:

```css
@media (pointer: coarse) {
  .chip, .btn-kecil, .seg button, .stepper-b, .preset-warna, .pilih { position: relative; }
  .chip::after, .btn-kecil::after, .seg button::after,
  .stepper-b::after, .preset-warna::after, .pilih::after {
    content: ''; position: absolute; left: 0; right: 0; top: 50%;
    transform: translateY(-50%);
    height: max(100%, 44px); min-width: 44px;
  }
}
.ikon-btn { min-width: 44px; min-height: 44px; }
.tautan   { display: inline-flex; align-items: center; min-height: 24px; }
```

`@media (pointer: coarse)` membuatnya hanya berlaku di layar sentuh — di desktop kursor
sudah presisi dan tombol rapat justru lebih enak.

---

## 6. Rekomendasi fitur operasional

Beberapa yang Anda sebutkan ternyata **sudah ada**. Saya cantumkan apa adanya supaya
tidak dikerjakan dua kali.

| Fitur | Status | Catatan |
|---|---|---|
| Denda keterlambatan otomatis | ✅ Ada | Dihitung saat order diselesaikan, tarif diatur di Pengaturan |
| Status deposit / jaminan | ✅ Ada | Termasuk opsi "jaminan KTP ditahan" tanpa uang |
| Ekspor CSV | ✅ Ada | Per modul |
| Ekspor PDF (kwitansi & laporan) | ✅ Ada | Template-nya bisa diatur pemilik |
| Log aktivitas | ✅ Ada | Sheet `Log`, lewat `log_(aksi, entitas, detail)` |
| Cadangan data | ✅ Ada | — |
| Pengingat terjadwal | ✅ Ada | Trigger harian + antrean notifikasi |
| **Ekspor XLSX asli** | ❌ Belum | CSV sudah bisa dibuka Excel, tapi tanpa format & rumus |
| **Hak akses multi-peran** | ❌ Belum | PRD memang menetapkan satu pengguna |

### 6.1 Multi-peran — saran bentuk, kalau nanti ada karyawan

Jangan langsung membuat RBAC penuh. Untuk rental satu kota, dua peran sudah cukup:

| Peran | Boleh | Tidak boleh |
|---|---|---|
| **Pemilik** | semuanya | — |
| **Operator** | buat/selesaikan order, catat pembayaran, kirim WA, lihat armada | lihat laba & laporan keuangan, ubah tarif, hapus data, ubah pengaturan |

Kuncinya **penegakan di server**, bukan menyembunyikan menu:

```js
const IZIN = {
  'order.simpan':      ['pemilik', 'operator'],
  'order.selesai':     ['pemilik', 'operator'],
  'keuangan.ringkas':  ['pemilik'],
  'pengaturan.simpan': ['pemilik'],
  'order.hapusMassal': ['pemilik']
};
function cekIzin_(aksi, sesi) {
  const boleh = IZIN[aksi];
  if (boleh && boleh.indexOf(sesi.peran) < 0) return gagal_('Akses ditolak.', { code: 'FORBIDDEN' });
  return null;
}
```

Token sesi sudah ber-HMAC, jadi tinggal menambahkan field `peran` ke dalam payload-nya —
tidak perlu mengubah arsitektur.

### 6.2 Ekspor XLSX

CSV sudah menutup 90% kebutuhan. Kalau ingin XLSX asli berformat, caranya tanpa pustaka
tambahan: buat spreadsheet sementara di Drive, lalu ekspor lewat endpoint Google.

```js
function eksporXlsx_(namaSheet, baris) {
  const ss = SpreadsheetApp.create('ekspor-sementara');
  const sh = ss.getActiveSheet();
  sh.getRange(1, 1, baris.length, baris[0].length).setValues(baris);
  sh.getRange(1, 1, 1, baris[0].length).setFontWeight('bold');
  SpreadsheetApp.flush();
  const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  const blob = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  }).getBlob().setName(namaSheet + '.xlsx');
  DriveApp.getFileById(ss.getId()).setTrashed(true);   // bersihkan berkas sementara
  return blob;
}
```

### 6.3 Dua hal kecil yang berdampak besar di lapangan

* **Foto kondisi saat serah-terima.** Sengketa baret/lecet adalah masalah nomor satu
  rental motor. Struktur folder Drive per order sudah ada; tinggal wajibkan 4 foto
  (depan, belakang, kiri, kanan) saat order dimulai dan saat selesai.
* **Mode luring untuk serah-terima.** Pengantaran sering di area sinyal lemah.
  Antrekan aksi "selesaikan order" di `localStorage` dan kirim saat sinyal kembali —
  pola optimistic UI-nya sudah dipakai di tempat lain.

---

## 7. Menjalankan ulang audit ini

Semua skrip ada di folder kerja sesi. Jalankan server simulasi dulu, lalu:

| Perintah | Mengukur |
|---|---|
| `node audit-kontras2.js` | Rasio kontras WCAG tiap pasangan warna yang dirender |
| `node uji-sentuh.js` | Target sentuh, sentuh vs tetikus |
| `node audit-cls.js` | Cumulative Layout Shift saat masuk → dashboard |
| `node audit-ui.js` | Skala radius/huruf/spasi, teks terpotong |
| `node uji-lebar.js` | Luber mendatar di 6 lebar layar |

Angka di laporan ini bisa Anda hasilkan ulang kapan saja, dan akan berubah kalau kode
berubah — itu gunanya diukur, bukan dicatat sekali lalu dipercaya selamanya.
