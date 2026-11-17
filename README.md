# ZAN Rental Operasional — Frontend

Dashboard web untuk pemilik Zan Rental Motor (Jember): order, armada, pelanggan (CRM),
keuangan, servis & pajak, laporan, dan notifikasi WhatsApp dalam satu tempat.

Dirancang **mobile-first** — pemilik lebih sering membukanya dari HP.

Modul yang menjawab kerja harian 50+ unit:

* **Papan Ketersediaan** — kisi unit × tanggal seperti papan kamar hotel: ready, booking,
  berjalan, servis, dan hari serah terima, langsung terbaca untuk tanggal mana pun.
* **Riwayat Unit** — satu plat, satu halaman: siapa saja yang pernah menyewanya dan semua
  catatan servisnya.
* **Servis Berkala** — oli mesin, gardan, CVT, filter, kampas; interval km/hari diatur
  sendiri, jatuh tempo diingatkan di Beranda, biayanya otomatis masuk buku kas.
* **Jaminan 2 identitas** — KTP + satu identitas pendukung, diunggah dari galeri atau
  dipotret langsung, dan **disalin ke tiap order** agar penyewa lama yang memperbarui
  KTP tidak merusak bukti order lamanya.
* **Galeri Identitas** & **Riwayat sewa per penyewa**.
* **Kwitansi online** terpisah dari dashboard, dengan syarat & ketentuan yang bisa diubah
  sendiri.

## Isi folder ini

```
index.html        halaman tunggal (SPA)
css/style.css     seluruh gaya tampilan + mode gelap
js/config.js      ← SATU-SATUNYA berkas yang perlu Anda ubah
js/core.js        util, format, penyimpanan lokal, lapisan API, toast, bottom-sheet, ikon
js/ui.js          komponen: kartu KPI, badge, grafik SVG, peringkat
js/pages.js       halaman Beranda, Order, Buat Order, Armada, Pelanggan
js/pages2.js      Keuangan, Servis, Papan Ketersediaan, Riwayat Unit, Servis Berkala,
                  Kalender, Galeri Foto, Galeri Identitas, Laporan, Notifikasi,
                  Pengaturan, Impor, Kwitansi publik
js/struk.js       mesin struk & resi thermal 58/80 mm (ESC/POS)
js/vendor-qrcode.js  pembuat QR (MIT) — dipaketkan lokal agar jalan tanpa internet
js/app.js         login PIN, router, navigasi, sinkronisasi data, tema
fonts/            Poppins 400–800 (lokal, tidak memanggil Google Fonts)
```

**Tidak ada berkas backend (`.gs`) di sini** — itu dipasang terpisah di Google Apps Script.

## Cara pakai

Baca **PANDUAN-INSTALASI.md**. Ringkasnya:

1. Pasang backend di Apps Script, jalankan `setupAppEnvironment()`, deploy sebagai Web App.
2. Isi `GAS_URL` di `js/config.js` dengan URL `/exec` hasil deploy.
3. Unggah **isi folder ini** (bukan foldernya) ke GitHub, nyalakan GitHub Pages dari branch `main`, folder `/ (root)`.

> `index.html` harus berada di **akar repository**. Kalau ia terkubur di dalam subfolder,
> GitHub Pages menampilkan 404 tanpa pesan error apa pun.

## Arsitektur

Frontend statis murni (HTML/CSS/JS vanilla, tanpa framework dan tanpa proses build).
Berkomunikasi dengan Google Apps Script sebagai REST API lewat `fetch()` — tidak ada
iframe dan tidak ada `google.script.run`.

```
Peramban (GitHub Pages)  ──POST text/plain──►  Apps Script /exec  ──►  Google Sheets
                         ◄──── JSON ─────────                      └─►  Google Drive
```

Mengapa terasa cepat:

* **Semua data dimuat sekali** saat masuk, lalu disimpan di memori dan `localStorage`.
  Berpindah menu tidak memanggil server sama sekali — perpindahan terjadi dalam satu frame.
* **Stale-while-revalidate**: tampilan langsung digambar dari data lokal, pembaruan dari
  server menyusul di belakang layar.
* **Optimistic UI**: menyimpan data langsung tampak berubah; kalau server menolak, perubahan dibatalkan.
* Server memakai cache berversi dan menulis ke Sheets secara berblok, bukan per sel.

## Keamanan

* Tidak ada PIN, token, atau kunci API di dalam folder ini. Semuanya ada di Script Properties
  sisi server. `GAS_URL` memang bukan rahasia.
* Sesi memakai token bertanda tangan HMAC yang kedaluwarsa otomatis.
* PIN disimpan sebagai hash + salt, dengan pembatasan 5 kali percobaan lalu terkunci 15 menit.

## Mengubah tampilan

Warna, radius, bayangan, dan ukuran huruf semuanya variabel CSS di bagian atas
`css/style.css` (blok `:root` dan `html[data-tema="gelap"]`). Mengubah satu nilai di sana
berlaku untuk seluruh aplikasi.

Identitas: kuning `#FFE600` sebagai aksi utama, hitam `#0B0B0F` sebagai teks dan kontras,
ungu tua `#69567E` untuk panel dan grafik, kanvas abu terang dengan kartu putih berbayang.
Tipografi Poppins.

## Lisensi & catatan

Kode aplikasi ini milik Anda. `js/vendor-qrcode.js` adalah pustaka pihak ketiga berlisensi MIT.
Ilustrasi motor pada data demo adalah gambar vektor yang digambar oleh kode — bukan foto berhak cipta.
