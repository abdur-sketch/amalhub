# AmalHub

Platform donasi untuk donatur dan admin yayasan dengan database terpusat, dashboard berbasis peran, pelacakan transaksi, laporan penyaluran, kuitansi, dan integrasi Xendit yang dapat diaktifkan melalui variabel lingkungan.

## Menjalankan

```bash
npm install
npm run dev
```

Salin `.env.example` menjadi `.env.local` untuk mengaktifkan pembayaran Xendit dan menentukan email admin. Tanpa kredensial Xendit, transaksi berjalan dalam mode demo dan dapat diverifikasi dari dashboard.
