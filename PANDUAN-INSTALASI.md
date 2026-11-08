# Panduan Instalasi — ZAN Rental Operasional

Panduan ini ditulis untuk pemilik yang **belum pernah memakai Git, GitHub, atau Apps Script**.
Ikuti berurutan. Jangan melompat. Setiap tahap ada cara memastikan tahap itu berhasil sebelum lanjut.

Total waktu: sekitar 30–45 menit untuk pemasangan pertama.

Yang Anda butuhkan:

* Satu akun Google (pakai akun yang nanti memang jadi pemilik data — semua spreadsheet dan foto tersimpan di Drive akun ini).
* Komputer dengan peramban. Tahap GitHub butuh terminal, tapi perintahnya sudah disiapkan lengkap.

---

## Bagian A — Backend (Google Apps Script)

Backend adalah "mesin" aplikasi: tempat data disimpan dan aturan dijalankan.

### A1. Buat proyek Apps Script

1. Buka [script.google.com](https://script.google.com) → **Proyek Baru**.
2. Di kiri atas, klik nama proyek (`Untitled project`) → ganti menjadi **ZAN Rental Operasional** → **Ganti nama**.

### A2. Tempel keempat berkas kode

Proyek baru sudah punya satu berkas bernama `Code.gs`.

1. Klik nama `Code.gs` → ikon ⋮ → **Ganti nama** → ketik `Kode`.
2. Hapus seluruh isinya (Ctrl+A lalu Delete), lalu tempel seluruh isi berkas **`Kode.gs`** yang saya kirimkan.
3. Buat berkas kedua: ikon **+** di samping tulisan "Files" → **Script** → beri nama `Data`. Tempel isi **`Data.gs`**.
4. Ulangi untuk `Dokumen` (isi **`Dokumen.gs`**) dan `Notifikasi` (isi **`Notifikasi.gs`**).
5. Tekan **Ctrl+S** untuk menyimpan.

> Nama berkas tidak perlu memakai akhiran `.gs` — Apps Script menambahkannya sendiri.
> Urutan berkas tidak penting.

Setelah selesai, daftar berkas Anda harus berisi tepat empat nama: **Kode, Data, Dokumen, Notifikasi**.

### A3. Jalankan setup satu kali

1. Di bar atas, pada kotak pilihan fungsi, pilih **`setupAppEnvironment`**.
2. Klik **▶ Run**.
3. Google akan meminta izin:
   * **Review permissions** → pilih akun Google Anda.
   * Muncul layar "Google hasn't verified this app" → klik **Advanced** → **Go to ZAN Rental Operasional (unsafe)**.
     Peringatan ini normal: aplikasinya milik Anda sendiri dan belum didaftarkan ke Google. Ia hanya meminta akses ke Drive, Sheets, dan Gmail milik Anda.
   * **Allow**.
4. Tunggu sampai muncul **Execution log** di bawah.

**Yang harus Anda lihat di log — dan yang WAJIB dicatat sekarang:**

```
✅ SETUP SELESAI
   Spreadsheet : https://docs.google.com/spreadsheets/d/..../edit
   Folder Drive: https://drive.google.com/drive/folders/....
   Data demo   : diisi (22 unit, 84 pelanggan, 30+ order)

🔐 PIN MASUK (catat sekarang — hanya tampil sekali!)
   ┌──────────────┐
   │  PIN: 481920 │
   └──────────────┘
```

> ⚠️ **Salin PIN itu ke tempat aman sekarang juga.** PIN hanya ditampilkan satu kali.
> Kalau terlewat: pilih fungsi `resetPin` → **Run** → PIN baru muncul di log.

**Memastikan berhasil:** buka Google Drive Anda. Harus ada folder **📁 ZAN Rental Operasional** berisi spreadsheet **🗃️ Database — ZAN Rental Jember** dan empat subfolder.

> `setupAppEnvironment` aman dijalankan berulang kali. Ia tidak pernah menimpa PIN, data, atau pengaturan yang sudah ada.

### A4. Deploy sebagai Web App

1. Kanan atas → **Deploy** → **New deployment**.
2. Klik ikon ⚙️ di samping "Select type" → pilih **Web app**.
3. Isi:

   | Kolom | Nilai |
   |---|---|
   | Description | `v1` |
   | Execute as | **Me** |
   | Who has access | **Anyone** |

4. **Deploy** → izinkan bila diminta lagi.
5. Salin **Web app URL**. Bentuknya:
   `https://script.google.com/macros/s/AKfycb................/exec`

> **"Who has access: Anyone" apakah berbahaya?** Tidak. Yang terbuka hanyalah alamat API-nya.
> Setiap permintaan tetap harus membawa token sesi yang sah, dan token itu hanya terbit setelah
> PIN yang benar dimasukkan. PIN disimpan sebagai hash, bukan teks biasa.

**Memastikan berhasil:** tempel URL `/exec` tadi di tab peramban baru. Anda harus melihat tulisan JSON seperti
`{"success":false,"message":"Aksi hanya tersedia lewat POST."}`. Itu **tandanya benar** — backend hidup.

---

## Bagian B — Frontend (GitHub Pages)

Frontend adalah tampilan yang Anda buka sehari-hari dari HP.

### B1. Siapkan folder di komputer

1. Unduh **`zan-rental-dashboard.zip`**, lalu **ekstrak** (klik kanan → Extract All).
2. Buka folder hasil ekstraksi. **Isi folder itu harus langsung terlihat seperti ini:**

   ```
   index.html      ← wajib ada di sini, bukan di dalam subfolder
   README.md
   PANDUAN-INSTALASI.md
   css/
   js/
   fonts/
   ```

   > ⚠️ Kalau yang Anda lihat justru satu folder lagi bernama `zan-rental-dashboard`, masuklah ke dalamnya.
   > Folder yang berisi `index.html` **itulah** folder kerja Anda. Salah folder di langkah ini adalah
   > penyebab nomor satu situs jadi 404 nanti — dan Git tidak akan memberi peringatan apa pun.

### B2. Isi alamat backend

1. Buka `js/config.js` dengan Notepad (Windows) atau TextEdit (Mac).
2. Ganti baris `GAS_URL` dengan URL `/exec` dari langkah A4:

   ```js
   GAS_URL: 'https://script.google.com/macros/s/AKfycb................/exec',
   ```

3. Simpan.

> Ini satu-satunya berkas frontend yang perlu Anda ubah. Tidak ada token atau PIN di sini —
> hanya alamat, dan alamat memang bukan rahasia.

### B3. Pasang Git (sekali seumur komputer)

* **Windows:** unduh di [git-scm.com/download/win](https://git-scm.com/download/win), pasang dengan pengaturan bawaan (klik Next terus).
* **Mac:** buka Terminal, ketik `git --version`. Kalau belum ada, macOS menawarkan memasangnya.

Pastikan berhasil — buka PowerShell (Windows) atau Terminal (Mac), ketik:

```bash
git --version
```

Harus muncul nomor versi, misal `git version 2.45.1`.

Lalu perkenalkan diri Anda ke Git (sekali saja, seumur hidup komputer itu):

```bash
git config --global user.name "Nama Anda"
git config --global user.email "email@akun-github-anda.com"
```

> `user.name` bebas, hanya label di riwayat. `user.email` sebaiknya sama dengan email akun GitHub.

### B4. Buat repository di GitHub

1. Daftar di [github.com](https://github.com) kalau belum punya akun.
   Username yang Anda pilih akan jadi bagian alamat situs: `username.github.io`.
2. Klik **+** kanan atas → **New repository**.
3. Isi:
   * **Repository name:** `zan-rental`
   * **Public** (wajib — GitHub Pages gratis hanya untuk repo publik)
   * **JANGAN** centang "Add a README file", `.gitignore`, atau license.
4. **Create repository**. Biarkan halaman berikutnya terbuka.

> **Publik berarti kode saya dilihat orang?** Ya, berkas tampilan bisa dilihat. Itu aman:
> tidak ada PIN, token, atau data pelanggan di dalamnya. Semua itu ada di sisi Google milik Anda.

### B5. Unggah (push) pertama kali

Buka PowerShell **di dalam folder kerja** dari langkah B1.

> 💡 Cara cepat di Windows: buka folder itu di File Explorer, klik kotak alamat di atas,
> ketik `powershell`, tekan Enter. PowerShell langsung terbuka di folder tersebut.

**Pertama, pastikan Anda di folder yang benar:**

```powershell
dir
```

Di daftar yang muncul **harus ada `index.html`**. Kalau tidak ada, Anda salah folder — jangan lanjut.

Lalu jalankan perintah berikut **satu per satu**:

```bash
git init
```
```bash
git add .
```
> Ada **titik** di akhir, artinya "semua berkas". Tidak muncul apa-apa = berhasil.

```bash
git commit -m "Pasang ZAN Rental Operasional"
```
```bash
git branch -M main
```
```bash
git remote add origin https://github.com/USERNAME/zan-rental.git
```
> Ganti `USERNAME` dengan username GitHub Anda.

```bash
git push -u origin main
```

Saat diminta:

* **Username:** username GitHub Anda.
* **Password:** **bukan** password akun — GitHub menolak itu. Lihat B6.

> 💡 Saat mengetik atau menempel password, **layar tidak menampilkan apa pun** — tidak ada titik atau bintang.
> Itu normal, bukan tanda gagal. Tempel lalu tekan Enter.

Tanda berhasil: muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### B6. Membuat Personal Access Token

Kalau muncul `Password authentication is not supported`:

1. Buka [github.com/settings/tokens](https://github.com/settings/tokens).
2. **Generate new token** → **Generate new token (classic)**.
3. Isi: **Note** `zan-rental`, **Expiration** `90 days` (atau `No expiration`).
4. Centang kotak **`repo`** (wajib).
5. **Generate token** → **salin token** (`ghp_...`). Token hanya tampil sekali — simpan dulu di Notepad.
6. Jalankan `git push -u origin main` lagi, tempel token itu sebagai password.

> Masih kesulitan dengan terminal? Pasang [GitHub Desktop](https://desktop.github.com):
> login lewat peramban → **Add Local Repository** → pilih folder kerja → **Publish repository**.

### B7. Nyalakan GitHub Pages

1. Buka repo Anda di github.com. **Periksa dulu:** di daftar berkas harus terlihat `index.html`,
   `css`, `js`, `fonts`. Kalau yang terlihat malah sebuah folder, berarti folder yang ter-push salah —
   lihat bagian *Situs 404* di Pemecahan Masalah.
2. **Settings** (tab paling kanan) → **Pages** (menu kiri).
3. Isi:

   | Kolom | Nilai |
   |---|---|
   | Source | **Deploy from a branch** |
   | Branch | **main** · **/ (root)** |

4. **Save**. Centang juga **Enforce HTTPS** bila tersedia.
5. Tunggu 1–2 menit, muat ulang halaman. Akan muncul:
   *Your site is live at `https://username.github.io/zan-rental/`*

### B8. Masuk untuk pertama kali

Buka alamat itu di HP. Masukkan **PIN 6 angka** dari langkah A3.

Begitu masuk, Anda akan melihat dashboard sudah terisi **data demo**: 22 motor dengan foto,
84 pelanggan, ratusan order dan transaksi. Ini supaya Anda bisa mencoba semua menu
tanpa takut merusak apa pun.

**Langkah pertama yang disarankan:** menu **Lainnya → Pengaturan → Ganti PIN**.
Ganti PIN acak tadi dengan angka yang Anda ingat.

---

## Bagian C — Mengganti data demo dengan data asli

Data demo sengaja dibuat agar aplikasi tidak terasa kosong. Setelah Anda yakin, hapus dan isi data sendiri.

**Cara paling bersih:**

1. Buka spreadsheet **🗃️ Database — ZAN Rental Jember** di Drive.
2. Untuk tiap sheet `Unit`, `Pelanggan`, `Pesanan`, `Keuangan`, `Servis`:
   pilih baris 2 sampai baris terakhir → klik kanan → **Delete rows**.
   **Jangan hapus baris 1** (judul kolom).
3. Kembali ke aplikasi → tombol **↻ Segarkan** di kanan atas.
4. Isi armada Anda lewat menu **Armada → + Tambah Motor**.

Sheet `Pengaturan`, `ST_Template`, dan `AppConfig` jangan dikosongkan — itu pengaturan, bukan data.

> Punya data di aplikasi atau spreadsheet lama? Pakai menu **Lainnya → Impor Data**.
> Tempel alamat spreadsheet lama, klik **Pindai (uji coba)** dulu untuk melihat
> berapa yang akan ditambahkan — tanpa menulis apa pun. Baru klik **Jalankan Import**
> kalau angkanya masuk akal. Aman dijalankan berulang: data yang sama tidak akan dobel.

---

## Bagian D — Notifikasi WhatsApp (opsional)

Tanpa pengaturan apa pun, tombol WhatsApp sudah bisa dipakai: aplikasi membuka WhatsApp
dengan pesan yang sudah terisi otomatis, Anda tinggal menekan kirim. Itu gratis dan cukup
untuk kebanyakan pemilik.

Kalau ingin pesan terkirim **otomatis tanpa Anda buka WhatsApp**, Anda perlu Fonnte (berbayar, pihak ketiga):

1. Daftar di [fonnte.com](https://fonnte.com) → menu **Device** → **Add Device**.
2. Pindai QR dengan WhatsApp nomor usaha Anda (Pengaturan WhatsApp → Perangkat tertaut).
3. Salin **token** perangkat.
4. Di aplikasi: **Lainnya → Notifikasi WA → Konfigurasi** → tempel token → **Cek Perangkat**
   (harus `connect`) → **Kirim Tes WA** ke nomor Anda sendiri → nyalakan saklar **Notifikasi WhatsApp**.
5. Di tabel **Matriks Notifikasi**, pilih kejadian mana yang dikirim otomatis
   (konfirmasi booking, pengingat kembali, penagihan denda, ucapan terima kasih).

> Token disimpan di Script Properties sisi server, tidak pernah dikirim ke peramban,
> dan di layar hanya tampil tersamar (`ABCD••••••xyz`).

**Tips agar nomor tidak diblokir WhatsApp:** mulai dari batch 10, beri jeda acak 5–8 detik,
dan jangan mengirim tautan yang sama ke ratusan orang dalam satu jam.

---

## Bagian E — Cetak struk & kwitansi

Ada dua keluaran berbeda:

| | Kwitansi PDF | Struk thermal |
|---|---|---|
| Untuk | dikirim ke pelanggan, arsip | dicetak di tempat |
| Ukuran | A4 | 58 mm / 80 mm |
| Dibuat di | Google Drive | langsung di HP Anda |

**Struk thermal** bisa dicetak tiga cara — aplikasi otomatis mencoba berurutan:

1. **Bluetooth langsung** — Chrome di Android. Paling praktis.
2. **RawBT** — pasang aplikasi RawBT gratis di Play Store, pasangkan printer sekali.
   Dipakai bila Bluetooth langsung bermasalah.
3. **Dialog cetak peramban** — untuk printer USB/LAN. Atur ukuran kertas 58/80 mm dan margin **None**.

> iPhone tidak mendukung Bluetooth langsung dari peramban. Pakai dialog cetak (AirPrint),
> atau unduh PNG dan kirim lewat WhatsApp.

Tata letak struk bisa Anda ubah sendiri tanpa bantuan siapa pun:
**Lainnya → Model Struk** → ubah teks → pratinjau langsung muncul di sebelahnya → **Simpan**.
Ada riwayat 10 versi dan tombol **Kembalikan ke bawaan** kalau terlanjur berantakan.

---

## Bagian F — Menyesuaikan aplikasi dengan identitas Anda

Semuanya ada di **Lainnya → Pengaturan**. Tidak perlu menyentuh kode sama sekali.

### Logo, nama, dan favicon

Unggah **logo** (tampil di bar atas, side-rail, dan layar masuk) dan **favicon**
(ikon kecil di tab peramban). Keduanya opsional — kalau dikosongkan, aplikasi menggambar
sendiri ikon dari huruf pertama nama dan warna aksen Anda.

Nama dan subjudul di bar atas juga bisa diganti di sini.

### Warna

Ada beberapa preset siap pakai, atau pilih sendiri tiga warna:

| Warna | Dipakai untuk |
|---|---|
| Aksi utama | tombol utama, menu aktif, FAB, sorotan |
| Panel & grafik | kartu sapaan, batang grafik, aksen sekunder |
| Teks & kontras | warna tulisan dan elemen gelap |

Perubahannya langsung terlihat tanpa menyimpan dulu.

> Aplikasi otomatis menjaga keterbacaan. Kalau Anda memilih aksen gelap, tulisan di
> atasnya otomatis berubah jadi putih, dan aksen yang dipakai sebagai teks otomatis
> diterangkan secukupnya. Jadi tidak ada kombinasi warna yang membuat teks hilang.

### Font

Pilih dari daftar yang tersedia. Hanya Poppins yang dipaketkan bersama aplikasi;
pilihan lain memakai font bawaan perangkat, jadi tetap cepat dan tidak perlu internet.

### Daftar perlengkapan sewa

Atur sendiri daftar barang yang ikut disewakan (Helm SNI, Jas Hujan, Jas Sepatu, dan
seterusnya) beserta jumlah bawaannya. Saat membuat order, Anda tinggal mencentang
dan mengatur jumlahnya — dan perlengkapan itu **otomatis muncul di kwitansi PDF,
struk thermal, dan draft pesan WhatsApp**.

### Metode pembayaran

**Pengaturan → Metode Pembayaran.** Tambah, ubah urutan, atau hapus pilihan yang muncul
sebagai tombol di form order dan di form catat transaksi — misalnya `Tunai`,
`Transfer BCA`, `QRIS`, `Transfer Mandiri`. Urutan di daftar ini sama dengan urutan
tombolnya di layar, jadi taruh yang paling sering dipakai di atas.

Pilihan **Lainnya** selalu tersedia di form order dan tidak perlu Anda tambahkan.

### Template kwitansi

Atur blok mana yang tampil di kwitansi (kop, data penyewa, rincian biaya, perlengkapan,
QR verifikasi, catatan kaki), judul dokumen, dan ukuran kertas. Ada pratinjau langsung.

Selain memilih blok, Anda juga bisa **menyunting teksnya sendiri**:

| Isian | Dipakai di mana |
|---|---|
| **Judul dokumen** | Baris paling atas kwitansi. Kosongkan untuk memakai `KWITANSI SEWA KENDARAAN`. |
| **Kalimat pembuka** | Satu paragraf miring di bawah kop, misalnya ucapan terima kasih. |
| **Syarat & ketentuan** | Satu baris = satu poin. Otomatis diberi nomor di kwitansi. |
| **Catatan kaki** | Baris penutup di bawah QR. |

### Draft pesan WhatsApp

Ubah isi tiap jenis pesan — konfirmasi booking, pengingat kembali, ucapan terima kasih,
penagihan denda. Daftar variabel yang bisa dipakai (`{nama}`, `{motor}`, `{tanggal}`,
`{total}`, dan lainnya) tampil di samping kotak isian, lengkap dengan tombol
**Kembalikan ke bawaan** kalau hasil suntingan terlanjur berantakan.

---

## Bagian G — Mengingatkan penyewa lewat WhatsApp

Tombol **Ingatkan** pada kartu order membuka daftar pesan siap pakai. Daftarnya
**menyesuaikan keadaan order itu**, jadi Anda tidak perlu memilah sendiri:

| Pilihan | Muncul saat |
|---|---|
| Konfirmasi booking | Status **Booking** |
| Unit siap diambil | Booking, **tanpa** layanan antar-jemput |
| Saya OTW mengantar unit | Booking, **dengan** layanan antar-jemput |
| Tagih sisa pembayaran | Masih ada sisa bayar |
| Ingatkan pengembalian | Sewa sedang **Berjalan** |
| Tawarkan perpanjangan | Sewa sedang berjalan (sebelum kena denda) |
| Saya OTW menjemput unit | Sewa berjalan, dengan antar-jemput |
| Tagih denda keterlambatan | Status **Terlambat** |
| Ucapan terima kasih | Status **Selesai** |
| Tulis pesan sendiri | Selalu |

Pilihan yang tidak masuk akal sengaja disembunyikan — menawarkan "tagih sisa" pada
order yang sudah lunas, atau "OTW antar" pada order yang diambil sendiri, hanya
membuat salah kirim.

Setelah dipilih, isinya tampil dalam kotak yang **masih bisa Anda sunting** sebelum
WhatsApp dibuka. Suntingan di situ berlaku untuk pengiriman itu saja; untuk mengubah
template tetapnya, buka **Pengaturan → Notifikasi**.

---

## Bagian H — Foto serah terima & tautan kwitansi

> **Arahnya satu: dari Anda ke penyewa.** Foto ini diambil **saat motor diserahkan
> di awal sewa**, bukan saat unit sudah dikembalikan. Foto untuk kondisi
> pengembalian adalah fitur terpisah dan mati secara bawaan (lihat di bawah).

### Mengapa harus ada fotonya

Saat motor diserahkan, aplikasi **mewajibkan satu foto penyewa bersama unitnya**.
Foto itu jadi bukti siapa yang membawa motor dan dalam kondisi apa unit diserahkan —
berguna kalau nanti ada selisih klaim soal lecet, bensin, atau jarak tempuh.

### Alurnya

1. Buat order seperti biasa. Statusnya **Booking**.
2. Saat motor benar-benar diserahkan, buka order itu lalu tekan
   **Serah Terima & Mulai Sewa**.
3. Muncul form dengan enam kotak foto:

   | Kotak | Wajib? |
   |---|---|
   | Penyewa + unit | **Ya** |
   | Tampak depan, belakang, sisi kiri, sisi kanan, odometer | Tidak |

4. Di HP, mengetuk kotak langsung membuka **kamera belakang**. Di komputer, membuka
   pemilih berkas.
5. Isi **odometer** dan **sisa BBM** (odometer sudah terisi otomatis dari data unit —
   tinggal dikoreksi), lalu **Simpan & Mulai Sewa**.
6. Status order berubah jadi **Berjalan**, unit jadi **Disewa**, dan odometer unit ikut
   diperbarui.

Foto dikecilkan dulu di HP Anda (sisi terpanjang 1280 px) sebelum diunggah, jadi tidak
boros kuota dan tidak membuat Drive cepat penuh.

> Form ini **menolak disimpan tanpa foto penyewa**. Kalau sedang buru-buru, foto sudut
> unit boleh dilewati dan dilengkapi belakangan — buka ordernya lagi dan ulangi langkah
> yang sama; foto lama tidak akan hilang atau tergandakan.

### Mengatur sendiri kotak fotonya

**Pengaturan → Foto Serah Terima.** Semua kotak foto bisa Anda atur sendiri:

* **Ganti namanya** — misal "Penyewa + unit" jadi "Penyewa pegang STNK".
* **Centang Wajib** — serah terima tidak bisa disimpan sebelum foto itu diambil.
  Bawaannya hanya foto penyewa yang wajib.
* **Tambah kotak** sampai 10 buah — misal "KTP penyewa" atau "Tangki bensin".
* **Hapus kotak** yang tidak Anda perlukan (minimal satu harus tersisa).

Jadi kalau Anda merasa enam kotak terlalu banyak, sisakan satu saja: foto penyewa.

### Foto saat motor kembali

Fitur ini **mati secara bawaan** — nyalakan lewat saklar
**Foto saat unit dikembalikan** di Pengaturan → Foto Serah Terima bila Anda
memerlukannya. Setelah menyala, pada order yang sedang berjalan muncul tombol
**Foto Kondisi Saat Kembali**. Isinya sama
persis, dan dipakai untuk mencatat kondisi unit saat diterima lagi. Tombol ini **tidak**
mengubah status order — menyelesaikan sewa tetap lewat **Selesaikan Sewa**.

Semua foto yang sudah tersimpan tampil sebagai galeri kecil di dalam detail order.
Ketuk salah satunya untuk membuka ukuran penuh.

### Tautan kwitansi untuk penyewa

Setiap order punya **satu tautan publik** yang bisa dibuka penyewa **tanpa login**.
Halaman itu menampilkan:

* status keaslian kwitansi (SAH / DIBATALKAN),
* nomor order, unit, periode, dan total,
* **linimasa perjalanan sewa**: pesanan dibuat → unit diserahkan → unit dikembalikan →
  sewa selesai, lengkap dengan foto serah terima dan pengembaliannya,
* rincian biaya dan daftar perlengkapan yang dibawa.

Nama penyewa sengaja **disamarkan** (`Dimas Aditya` → `D•••s A••••a`) dan nomor WA-nya
tidak pernah ditampilkan, supaya tautan yang terlanjur tersebar tidak membocorkan data
pelanggan.

**Cara mengirimkannya:**

* Buka order → **Salin Tautan Kwitansi** → tempel di chat mana pun; atau
* biarkan otomatis: di template pesan WhatsApp, penanda `{kwitansi}` akan berubah
  sendiri menjadi tautan kwitansi order tersebut. Penanda ini sudah dipasang di pesan
  **konfirmasi order baru**, **pengingat pengembalian**, dan **ucapan terima kasih**.

> **Wajib diisi sekali:** buka **Pengaturan → Alamat aplikasi (GitHub Pages)** dan isi dengan
> alamat GitHub Pages Anda (contoh `https://namaanda.github.io/zan-rental-dashboard`).
> Selama kolom ini kosong, penanda `{kwitansi}` akan hilang sendiri dari pesan — pesan
> tetap terkirim rapi tanpa baris menggantung, tapi penyewa tidak dapat tautannya.

---

## Bagian I — Menghapus banyak data sekaligus

Di menu **Order**, **Armada**, dan **Pelanggan** ada tombol **Pilih**. Setelah ditekan,
setiap kartu mendapat kotak centang dan muncul bar aksi di bawah.

Aplikasi menolak penghapusan yang akan merusak riwayat:

* **Unit** yang sedang disewa tidak bisa dihapus.
* **Pelanggan** yang punya riwayat order tidak bisa dihapus.
* **Order** yang dihapus ikut membuang baris keuangan yang terkait, supaya laporan tetap cocok.

Yang dilewati akan disebutkan jumlah dan alasannya setelah proses selesai.

Daftarnya langsung berkurang begitu server menjawab — aplikasi tidak lagi menarik
ulang seluruh data dari Sheets sesudah menghapus, jadi prosesnya jauh lebih singkat.
Kalau sempat muncul **"Server sibuk, mencoba lagi"**, biarkan saja: aplikasi
mengulang sendiri sampai dua kali dengan jeda yang makin panjang. Menekan tombol
hapus dua kali untuk ID yang sama juga aman — tidak dianggap error.

---

## Cara memperbarui aplikasi nanti

Kalau ada perbaikan berkas frontend, dari folder kerja jalankan tiga perintah:

```bash
git add .
git commit -m "Perbarui tampilan"
git push
```

GitHub Pages membangun ulang dalam 1–2 menit. Kalau masih tampil versi lama,
itu cache peramban: tekan **Ctrl+Shift+R**, atau buka di jendela Incognito.

Kalau yang berubah berkas `.gs`: tempel ulang di Apps Script → **Ctrl+S** →
**Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.

> Pilih **Edit pada deployment yang sudah ada**, bukan "New deployment".
> Membuat deployment baru menghasilkan URL `/exec` baru, dan `config.js` Anda jadi menunjuk alamat lama.

---

## Pemecahan masalah

| Yang Anda lihat | Artinya | Yang harus dilakukan |
|---|---|---|
| Situs **404 — File not found** | `index.html` tidak di akar repo | Buka repo di GitHub. Kalau di akar terlihat *folder*, bukan `index.html`, lihat *Situs 404* di bawah |
| Halaman tampil polos tanpa warna | berkas CSS/JS tidak ketemu | Di repo harus ada folder `css/` dan `js/`. Kalau berkasnya rata di akar, Anda mengunggah lewat web GitHub — ulangi lewat terminal |
| "Gagal memuat data" / muter terus | `GAS_URL` salah atau deployment belum dibuat | Cek `js/config.js`, pastikan berakhiran `/exec`. Buka URL itu di tab baru — harus muncul JSON |
| "PIN belum disiapkan" | `setupAppEnvironment` belum dijalankan | Ulangi langkah A3 |
| Lupa PIN | — | Apps Script → pilih fungsi `resetPin` → **Run** → PIN baru di log |
| "Terkunci sementara" | 5× PIN salah | Tunggu 15 menit, atau jalankan `resetPin` |
| `fatal: not a git repository` | salah folder | `dir` dulu, pastikan `index.html` terlihat, baru `git init` |
| `remote origin already exists` | sudah pernah disambungkan | Lewati, langsung `git push`. Kalau alamatnya salah: `git remote set-url origin <url>` |
| `Password authentication is not supported` | GitHub menolak password akun | Buat Personal Access Token (B6) |
| `src refspec main does not match any` | belum ada commit | Jalankan `git add .` lalu `git commit -m "..."` dulu |
| `LF will be replaced by CRLF` | perbedaan format baris Windows | **Abaikan.** Ini peringatan biasa, bukan error |
| Pesan WA tidak terkirim otomatis | perangkat Fonnte putus | Notifikasi WA → **Cek Perangkat**. Kalau bukan `connect`, pindai ulang QR di fonnte.com |
| Data di aplikasi beda dengan spreadsheet | tampilan memakai cache | Tekan **↻ Segarkan** di kanan atas |

### Situs 404 padahal semua perintah Git berhasil

Ini terjadi kalau `git init` dijalankan di folder induk, bukan folder yang berisi `index.html`.
Git tidak pernah mengeluhkan hal ini — karena itu gejalanya membingungkan.

Perbaikannya tidak perlu menghapus repository:

```powershell
cd "C:\path\ke\folder\yang\berisi\index.html"
dir
```

Pastikan `index.html` terlihat. Lalu:

```bash
git init
git add .
git commit -m "Perbaiki: push dari folder yang benar"
git branch -M main
git remote add origin https://github.com/USERNAME/zan-rental.git
git push -u origin main --force
```

> `--force` menimpa isi repository dengan versi di komputer Anda. Aman di sini,
> karena isi yang lama memang struktur yang salah.

Tunggu 1–2 menit, buka situs, tekan **Ctrl+Shift+R**.

---

## Yang perlu Anda tahu sejak awal (batasan jujur)

* **Aplikasi ini untuk satu orang: pemilik.** Belum ada akun terpisah untuk karyawan.
* **Pengiriman WA otomatis bergantung Fonnte.** Kalau perangkat di Fonnte putus atau kuota habis,
  pesan tidak terkirim. Mode draft (buka WhatsApp manual) tetap jalan tanpa Fonnte.
* **Balasan WA dari pelanggan tidak tercatat** di aplikasi, kecuali Anda menyiapkan webhook Fonnte.
* **Apps Script punya kuota harian** (waktu trigger ±90 menit/hari untuk akun Gmail biasa).
  Untuk skala satu rental, ini sangat longgar. Kalau mau mematikan proses latar belakang,
  jalankan fungsi `matikanKeepWarm` di editor.
* **Jangan membagikan spreadsheet database** dan jangan menambahkan orang sebagai editor
  proyek Apps Script — editor proyek bisa melihat token dan hash PIN.
* **Kwitansi ber-QR bukan tanda tangan elektronik tersertifikasi.** Cukup untuk bukti sewa
  karena keasliannya bisa dicek, tapi bukan dokumen berkekuatan hukum penuh.
* **Data demo adalah karangan.** Nama, plat, dan nomor WA di dalamnya tidak nyata.
  Foto motor adalah ilustrasi vektor, bukan foto asli — ganti dengan foto motor Anda
  lewat **Armada → Ubah → Unggah Foto**.
