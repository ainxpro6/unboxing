# Backend Unboxing Retur — Hono + Drizzle + Better Auth + Supabase

Backend API untuk aplikasi dokumentasi unboxing retur e-commerce. Frontend Next.js sudah tersedia dengan mock data (localStorage), backend ini akan menggantikan penyimpanan mock menjadi PostgreSQL via Supabase dan menambahkan autentikasi dengan Better Auth.

## User Review Required

> [!IMPORTANT]
> **Supabase Project**: Kamu perlu menyiapkan project Supabase terlebih dahulu dan menyediakan `DATABASE_URL` (connection string dari Supabase Dashboard → Settings → Database). Saya akan menggunakan format Transaction Pooler (port `6543`).

> [!IMPORTANT]
> **Arsitektur Terpisah**: Backend akan berjalan sebagai server Hono terpisah (port `3001`) dari frontend Next.js (port `3000`). Frontend akan berkomunikasi via REST API dengan CORS. Apakah pendekatan ini cocok, atau kamu lebih ingin backend terintegrasi di dalam Next.js API routes?

## Open Questions

1. **Supabase Project**: Sudah punya project Supabase yang aktif? Jika belum, saya bisa membantu membuatnya via Supabase MCP.
2. **Auth Providers**: Selain email/password, apakah perlu social login (Google, GitHub, dll)?
3. **Cloud Storage**: Untuk upload video/foto, apakah ingin menggunakan Supabase Storage atau tetap manual (Google Drive/S3)?

## Proposed Changes

### Backend Project Structure

```
backend/
├── src/
│   ├── index.ts              # Hono app entry point
│   ├── db/
│   │   ├── index.ts           # Drizzle client (postgres-js + Supabase)
│   │   └── schema.ts          # Drizzle schema (semua tabel)
│   ├── auth/
│   │   └── index.ts           # Better Auth config + Drizzle adapter
│   ├── routes/
│   │   ├── returns.ts         # CRUD /api/returns
│   │   ├── settings.ts        # CRUD /api/settings
│   │   └── media.ts           # /api/media (upload status, metadata)
│   └── middleware/
│       └── auth.ts            # Session middleware (protect routes)
├── drizzle/                   # Migration output
├── drizzle.config.ts          # Drizzle Kit config
├── package.json
├── tsconfig.json
└── .env                       # DATABASE_URL, BETTER_AUTH_SECRET, etc.
```

---

### Database Layer (Drizzle ORM)

#### [NEW] [schema.ts](file:///c:/Users/user/Documents/Coding/unboxing/backend/src/db/schema.ts)

Definisi semua tabel menggunakan Drizzle ORM yang mengikuti ERD dari PRD:

| Tabel | Kolom Utama | Keterangan |
|-------|-------------|------------|
| `users` | id, name, email, password, role, createdAt | Dikelola oleh Better Auth + custom fields |
| `sessions` | id, userId, token, expiresAt | Dikelola oleh Better Auth |
| `accounts` | id, userId, provider, accountId | Dikelola oleh Better Auth |
| `verifications` | id, identifier, value, expiresAt | Dikelola oleh Better Auth |
| `returns` | id, userId, receiptNumber, courierName, statusBarang, scannedAt | Data retur unboxing |
| `media` | id, returnId, photoLocalPath, photoCloudUrl, videoLocalPath, videoCloudUrl, uploadStatus, uploadedAt, videoDuration | Metadata file media |
| `settings` | id, userId, videoResolution, videoFps, maxDurationSeconds, cloudProvider, autoUpload | Preferensi user |

#### [NEW] [index.ts](file:///c:/Users/user/Documents/Coding/unboxing/backend/src/db/index.ts)

Drizzle client menggunakan `postgres` driver dengan `prepare: false` (diperlukan untuk Supabase pooler).

---

### Authentication (Better Auth)

#### [NEW] [auth/index.ts](file:///c:/Users/user/Documents/Coding/unboxing/backend/src/auth/index.ts)

- Inisialisasi `betterAuth` dengan `drizzleAdapter` (provider: `pg`)
- Enable `emailAndPassword`
- Custom user fields: `role` (admin/staff)
- Mount handler di `/api/auth/*`

#### [NEW] [middleware/auth.ts](file:///c:/Users/user/Documents/Coding/unboxing/backend/src/middleware/auth.ts)

- Middleware yang membaca session dari request headers
- Set `user` dan `session` ke Hono context variables
- Dipakai untuk melindungi semua route `/api/*` (kecuali `/api/auth/*`)

---

### API Routes (Hono)

#### [NEW] [routes/returns.ts](file:///c:/Users/user/Documents/Coding/unboxing/backend/src/routes/returns.ts)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/returns` | List semua retur milik user (dengan pagination) |
| `GET` | `/api/returns/:id` | Detail satu retur (include media) |
| `POST` | `/api/returns` | Tambah retur baru (setelah scan) |
| `DELETE` | `/api/returns/:id` | Hapus retur |
| `GET` | `/api/returns/stats` | Statistik: today count, pending upload, success rate, weekly |

#### [NEW] [routes/settings.ts](file:///c:/Users/user/Documents/Coding/unboxing/backend/src/routes/settings.ts)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/settings` | Ambil settings user |
| `PUT` | `/api/settings` | Update settings user |
| `POST` | `/api/settings/reset` | Reset ke default |

#### [NEW] [routes/media.ts](file:///c:/Users/user/Documents/Coding/unboxing/backend/src/routes/media.ts)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `PUT` | `/api/media/:id/status` | Update upload status (pending → uploading → uploaded/failed) |
| `GET` | `/api/media/queue` | List antrian upload yang pending/failed |

---

### App Entry Point

#### [NEW] [index.ts](file:///c:/Users/user/Documents/Coding/unboxing/backend/src/index.ts)

- Inisialisasi Hono app
- CORS middleware (origin: `http://localhost:3000`)
- Mount auth handler: `/api/auth/*`
- Mount session middleware
- Mount semua route groups
- Serve di port `3001`

---

### Configuration Files

#### [NEW] [package.json](file:///c:/Users/user/Documents/Coding/unboxing/backend/package.json)

Dependencies:
- **Runtime**: `hono`, `@hono/node-server`, `drizzle-orm`, `postgres`, `better-auth`, `dotenv`
- **Dev**: `drizzle-kit`, `tsx`, `typescript`, `@types/node`

Scripts:
- `dev`: `tsx watch src/index.ts`
- `db:generate`: `drizzle-kit generate`
- `db:migrate`: `drizzle-kit migrate`
- `db:push`: `drizzle-kit push`
- `db:studio`: `drizzle-kit studio`

#### [NEW] [drizzle.config.ts](file:///c:/Users/user/Documents/Coding/unboxing/backend/drizzle.config.ts)

Drizzle Kit config pointing ke schema dan DATABASE_URL.

#### [NEW] [tsconfig.json](file:///c:/Users/user/Documents/Coding/unboxing/backend/tsconfig.json)

TypeScript config dengan path aliases.

#### [NEW] [.env.example](file:///c:/Users/user/Documents/Coding/unboxing/backend/.env.example)

```env
DATABASE_URL=postgres://postgres:[PASSWORD]@[HOST]:6543/postgres
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

---

### Frontend Integration (Modifikasi Minimal)

#### [NEW] [auth-client.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/auth-client.ts)

Setup `createAuthClient` dari `better-auth/react` yang mengarah ke backend `http://localhost:3001`.

#### [MODIFY] [useReturnStore.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/store/useReturnStore.ts)

- Ganti localStorage calls dengan `fetch()` ke backend API
- `loadReturns()` → `GET /api/returns`
- `addReturn()` → `POST /api/returns`
- `deleteReturn()` → `DELETE /api/returns/:id`
- Stats methods → `GET /api/returns/stats`

#### [MODIFY] [useSettingsStore.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/store/useSettingsStore.ts)

- Ganti localStorage calls dengan `fetch()` ke backend API
- `loadSettings()` → `GET /api/settings`
- `updateSettings()` → `PUT /api/settings`

---

## Verification Plan

### Automated Tests

```bash
# 1. Push schema ke Supabase
cd backend && npm run db:push

# 2. Start backend server
npm run dev

# 3. Test auth flow
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test User"}'

# 4. Test protected endpoints
curl http://localhost:3001/api/returns -H "Cookie: ..."
```

### Manual Verification

1. Jalankan `npm run db:studio` untuk membuka Drizzle Studio dan verifikasi tabel sudah terbuat
2. Test sign-up dan sign-in dari frontend
3. Test scan → simpan retur → cek data masuk ke PostgreSQL
4. Test settings CRUD via frontend
