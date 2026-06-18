# Unboxing Retur — Sistem Dokumentasi & Verifikasi Retur E-commerce

Aplikasi ini dirancang untuk mempermudah seller e-commerce dalam mendokumentasikan proses unboxing barang retur (kembali) dari pembeli secara cepat dan otomatis. Aplikasi ini membantu mencegah fraud klaim retur dengan menyediakan bukti fisik yang valid secara real-time.

---

## 🚀 Fitur Utama

1. **Smart Scanner (1D/QR)**: Kamera pemindai instan untuk membaca barcode/QR Code resi pengiriman kurir.
2. **Auto-Capture & Record**: Transisi otomatis dari pemindaian resi -> pengambilan foto resi -> memulai perekaman video unboxing tanpa jeda.
3. **Auto-Naming Engine**: Penamaan file multimedia secara otomatis berdasarkan nomor resi yang dipindai (contoh: `RESI123456_resi.jpg` dan `RESI123456_unboxing.mp4`).
4. **Video Configurator**: Halaman pengaturan preferensi video (resolusi, frame rate/FPS, dan batas durasi perekaman).
5. **Storage Manager & Sync**: Pengelolaan penyimpanan lokal (offline-first) dan status sinkronisasi otomatis ke cloud storage (Supabase Storage / Google Drive).

---

## 🛠️ Tech Stack

### Frontend (Next.js App)
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 & Framer Motion (untuk animasi transisi premium)
- **State Management**: Zustand
- **Authentication**: Better Auth
- **Database & ORM (Local/Cloud Sync)**: PostgreSQL, Drizzle ORM, Supabase Client
- **Scanner**: `html5-qrcode`

### Dokumentasi & Desain
- **Product Requirements Document (PRD)**: [unboxing.md](file:///unboxing.md)
- **Backend Architecture Plan**: [backend_plan.md](file:///backend_plan.md)

---

## 📁 Struktur Direktori

```text
unboxing/
├── frontend/             # Aplikasi web Next.js
│   ├── src/
│   │   ├── app/          # Next.js App Router (pages & layouts)
│   │   ├── components/   # Komponen UI modular
│   │   ├── db/           # Skema Drizzle ORM
│   │   ├── lib/          # Helper & client integrations (Supabase, Auth, GDrive)
│   │   ├── store/        # Zustand stores (state management)
│   │   └── types/        # TypeScript type definitions
│   ├── public/           # Aset statis & local storage mock
│   ├── package.json
│   └── tsconfig.json
├── unboxing.md           # Product Requirements Document (PRD)
├── backend_plan.md       # Rencana pengembangan Backend API terpisah
├── .gitignore            # Konfigurasi file yang diabaikan oleh Git
└── README.md             # Dokumentasi proyek (file ini)
```

---

## ⚙️ Memulai (Local Development)

### 1. Prasyarat
Pastikan Anda telah menginstal **Node.js** (versi 18 atau lebih baru) dan **npm** di komputer Anda.

### 2. Instalasi & Setup Frontend
Masuk ke direktori `frontend` dan pasang dependensi:
```bash
cd frontend
npm install
```

### 3. Konfigurasi Environment Variables
Buat file `.env.local` di dalam folder `frontend/` (jika belum ada) dan sesuaikan nilainya:
```env
# Koneksi Database
DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/postgres

# Autentikasi (Better Auth)
BETTER_AUTH_SECRET=your-better-auth-secret-key-32-chars
BETTER_AUTH_URL=http://localhost:3000

# Next.js & Supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Social Login (Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Menjalankan Server Development
Jalankan perintah berikut di folder `frontend/`:
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## ☁️ Panduan Deploy ke Vercel (Prepare Deploy)

Aplikasi ini menggunakan struktur monorepo di mana folder aplikasi Next.js berada di subfolder `frontend/`. Ikuti langkah-langkah berikut untuk melakukan deployment ke Vercel:

### 1. Hubungkan Repositori ke Vercel
1. Masuk ke dashboard [Vercel](https://vercel.com).
2. Klik **New Project** lalu impor repositori GitHub yang baru saja di-push.

### 2. Konfigurasi Proyek di Vercel (PENTING)
Sebelum melakukan deploy, sesuaikan pengaturan proyek berikut:
- **Framework Preset**: Pilih **Next.js**.
- **Root Directory**: Ubah dan arahkan ke **`frontend`** (Vercel akan secara otomatis mendeteksi konfigurasi Next.js di dalam subfolder tersebut).

### 3. Konfigurasi Environment Variables di Vercel
Tambahkan variabel lingkungan (Environment Variables) berikut di Vercel Dashboard agar aplikasi berjalan dengan benar di production:

| Key | Value / Deskripsi |
| :--- | :--- |
| `DATABASE_URL` | String koneksi PostgreSQL Supabase Anda. |
| `BETTER_AUTH_SECRET` | String acak minimal 32 karakter untuk enkripsi Better Auth. |
| `BETTER_AUTH_URL` | URL domain Vercel Anda (contoh: `https://nama-aplikasi.vercel.app`). |
| `NEXT_PUBLIC_APP_URL` | Sama dengan `BETTER_AUTH_URL`. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase project Anda. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase Anda. |
| `GOOGLE_CLIENT_ID` | Client ID Google (opsional jika mengaktifkan login Google). |
| `GOOGLE_CLIENT_SECRET` | Client Secret Google (opsional). |

> 💡 **Tips**: Setelah menambahkan environment variables di atas, Anda bisa langsung menekan tombol **Deploy** dan Vercel akan memproses build aplikasi Next.js Anda secara aman.
