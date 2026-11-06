/* ================================================================
 *  ZAN RENTAL OPERASIONAL — Konfigurasi Frontend
 *  ----------------------------------------------------------------
 *  SATU-SATUNYA berkas yang perlu Anda ubah sebelum deploy.
 *
 *  Ganti GAS_URL dengan URL Web App Apps Script Anda (yang diakhiri
 *  /exec). Cara mendapatkannya ada di PANDUAN-INSTALASI.md.
 *
 *  Catatan keamanan: URL /exec BUKAN rahasia. Semua token, PIN, dan
 *  kunci API tersimpan di Script Properties pada sisi server.
 * ================================================================ */

window.ZAN_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxiUX9ZkJDEj0k3lr508DuQgD1YwZYk5dbKqquuPEkvgJfTpUASgDuXZWk781ffEAD7/exec',

  // Nama yang tampil di judul aplikasi (boleh diubah)
  APP_NAMA: 'ZAN Rental',
  VERSI: '1.0.0',

  // Berapa detik data lokal dianggap masih segar sebelum diambil ulang
  SEGAR_DETIK: 45
};
