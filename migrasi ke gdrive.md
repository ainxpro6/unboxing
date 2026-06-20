# Migrasi Storage: Supabase Storage → Google Drive

Mengganti seluruh sistem penyimpanan file media (foto resi & video unboxing) dari Supabase Storage bucket `unboxing-media` ke Google Drive, menggunakan OAuth token per-user yang sudah tersimpan di tabel `account`.

---

## User Review Required

> [!IMPORTANT]
> **Google OAuth Scope**: Saat ini konfigurasi Better Auth di [auth.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/auth.ts) tidak menyertakan scope Google Drive. Kita perlu menambahkan scope `https://www.googleapis.com/auth/drive.file` agar user yang login via Google bisa upload file ke Drive mereka. **User yang sudah login sebelumnya perlu re-authorize** untuk mendapatkan scope baru ini.

> [!WARNING]
> **Token Refresh**: Better Auth menyimpan `accessToken` dan `refreshToken` di tabel `account`. Kita akan membuat mekanisme auto-refresh token di Google Drive service. Jika refresh token sudah expired/revoked, upload akan gagal dengan status `failed` dan error di-log — user tidak diminta login ulang secara paksa di tengah flow.

> [!IMPORTANT]
> **Folder Structure**: Plan ini menggunakan struktur folder per-user: `Unboxing / {User Name}`. Setiap user akan punya 1 folder di Google Drive yang dibuat otomatis saat upload pertama. Jika kamu prefer struktur by date (`Unboxing/2026/06`), beri tahu.

---

## Open Questions

> [!IMPORTANT]
> **1. `@supabase/supabase-js` dependency**: Setelah migrasi, Supabase JS client hanya digunakan untuk **TIDAK ADA** (auth sudah pakai Better Auth, DB pakai Drizzle langsung). Apakah mau sekalian hapus package `@supabase/supabase-js` dan file [supabaseClient.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/supabaseClient.ts)?

> [!IMPORTANT]
> **2. Existing Data Migration**: Ada data media yang sudah tersimpan di Supabase Storage. Apakah perlu script migrasi untuk download dari Supabase dan re-upload ke Google Drive? Atau cukup mulai fresh (data lama tetap accessible via URL Supabase yang tersimpan di DB)?

> [!IMPORTANT]
> **3. Google Drive Quota Display**: Saat ini [storage stats API](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/api/storage/stats/route.ts) menampilkan usage dari Supabase bucket (1GB free tier). Setelah migrasi, mau tampilkan quota Google Drive user (15GB) via Drive API, atau hardcode/skip fitur storage stats?

---

## Proposed Changes

### Phase 1 — Install Dependency & Environment

#### [MODIFY] [package.json](file:///c:/Users/user/Documents/Coding/unboxing/frontend/package.json)
- Tambah dependency `googleapis` 
- (Opsional) Hapus `@supabase/supabase-js` jika disetujui

#### [MODIFY] `.env.local`
- Pastikan sudah ada `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` (sudah digunakan di auth.ts)
- Tidak perlu env var baru — token diambil dari DB

---

### Phase 2 — Database Schema Changes

#### [MODIFY] [schema.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/db/schema.ts)

Tambah kolom pada tabel `media`:

```diff
 export const media = pgTable("media", {
   id: serial("id").primaryKey(),
   returnId: integer("return_id")
     .notNull()
     .references(() => returns.id, { onDelete: "cascade" }),
   photoLocalPath: text("photo_local_path"),
   photoCloudUrl: text("photo_cloud_url"),
+  photoDriveFileId: text("photo_drive_file_id"),
   videoLocalPath: text("video_local_path"),
   videoCloudUrl: text("video_cloud_url"),
+  videoDriveFileId: text("video_drive_file_id"),
+  driveFolderId: text("drive_folder_id"),
   uploadStatus: text("upload_status").notNull().default("pending"),
   uploadedAt: timestamp("uploaded_at"),
   videoDuration: integer("video_duration").notNull().default(0),
 });
```

#### Drizzle Migration
- Jalankan `npm run db:generate` lalu `npm run db:push` untuk apply schema change

---

### Phase 3 — Google Drive Service

#### [NEW] [google-drive.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/google-drive.ts)

Service utama yang menangani semua interaksi dengan Google Drive API:

```
GoogleDriveService class:
├── constructor(userId: string)
│   └── Ambil account.accessToken & account.refreshToken dari DB
│
├── refreshAccessToken()
│   ├── POST ke https://oauth2.googleapis.com/token
│   ├── Simpan token baru ke DB (update account table)
│   └── Retry original request
│
├── getOrCreateFolder(folderName: string, parentId?: string): string
│   ├── Search folder by name di parentId
│   ├── Jika tidak ada, create folder baru
│   └── Return folder ID
│
├── ensureUserFolder(userName: string): string
│   ├── getOrCreateFolder("Unboxing") → rootFolderId
│   └── getOrCreateFolder(userName, rootFolderId) → userFolderId
│
├── uploadFile(params): { fileId, webViewLink }
│   ├── Multipart upload ke Google Drive API
│   ├── Set file metadata (name, parents)
│   ├── Set permission: anyone with link can view
│   └── Return file ID + public view URL
│
├── deleteFile(fileId: string): void
│   └── DELETE file dari Drive
│
├── getFileMetadata(fileId: string): DriveFile
│   └── GET file metadata
│
└── Error Handling:
    ├── 401 → auto refresh token, retry
    ├── 403 (quota) → throw QuotaExceededError
    ├── 404 (folder not found) → recreate folder
    └── Log full response body dari Google API
```

**Key design decisions:**
- Tidak menggunakan `googleapis` npm package secara langsung untuk OAuth client karena token sudah dikelola Better Auth. Sebagai gantinya, kita menggunakan `googleapis` untuk Drive API calls dengan token yang di-inject manual via `OAuth2Client.setCredentials()`.
- Token refresh dilakukan manual karena lifecycle token dikelola oleh Better Auth di DB, bukan di memory.

---

### Phase 4 — Auth Configuration Update

#### [MODIFY] [auth.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/auth.ts)

Tambah scope Google Drive pada social provider config:

```diff
 socialProviders: {
   google: {
     clientId: process.env.GOOGLE_CLIENT_ID || "",
     clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
+    scope: [
+      "openid",
+      "email",
+      "profile",
+      "https://www.googleapis.com/auth/drive.file",
+    ],
   },
```

> `drive.file` scope memberi akses hanya ke file yang dibuat oleh aplikasi ini — tidak bisa mengakses file lain di Drive user.

---

### Phase 5 — Rewrite Upload API Route

#### [MODIFY] [route.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/api/media/upload/route.ts)

**Before**: Upload ke Supabase Storage, simpan Supabase URL ke DB  
**After**: Upload ke Google Drive via `GoogleDriveService`, simpan Drive file ID + URL ke DB

Perubahan utama:
1. Hapus import `supabaseAdmin`
2. Import `GoogleDriveService` 
3. Ambil session user untuk mendapat userId
4. Instansiasi `GoogleDriveService` dengan userId
5. Ensure user folder exists di Drive
6. Upload photo → simpan `photoDriveFileId` + `photoCloudUrl`
7. Upload video → simpan `videoDriveFileId` + `videoCloudUrl`
8. Update status: `pending` → `uploading` → `uploaded` / `failed`
9. URL format: `https://drive.google.com/file/d/{FILE_ID}/view`

Flow baru:

```
POST /api/media/upload (FormData: id, receiptNumber, photo?, video?)
  │
  ├── Auth check (get session)
  ├── Update media.uploadStatus → "uploading"
  │
  ├── GoogleDriveService.ensureUserFolder(user.name)
  │
  ├── if photo:
  │   ├── GoogleDriveService.uploadFile({
  │   │     name: "SPX123456_resi.jpg",
  │   │     mimeType: "image/jpeg",
  │   │     body: buffer,
  │   │     folderId: userFolderId
  │   │   })
  │   └── Save photoDriveFileId + photoCloudUrl to DB
  │
  ├── if video:
  │   ├── GoogleDriveService.uploadFile({
  │   │     name: "SPX123456_unboxing.webm",
  │   │     mimeType: "video/webm",
  │   │     body: buffer,
  │   │     folderId: userFolderId
  │   │   })
  │   └── Save videoDriveFileId + videoCloudUrl to DB
  │
  ├── Update media.uploadStatus → "uploaded"
  └── Return { success: true }
```

---

### Phase 6 — Rewrite Storage Stats API & Frontend References

#### [MODIFY] [route.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/api/storage/stats/route.ts)

- Hapus import `supabaseAdmin`
- Hapus Supabase Storage `.list()` call
- Ganti dengan: query database untuk menghitung jumlah file yang sudah uploaded
- Opsional: panggil Google Drive API `about.get` untuk mendapatkan storage quota user
- Response format tetap sama agar frontend tidak perlu berubah banyak

#### [MODIFY] [history/page.tsx](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/(dashboard)/history/page.tsx)

Bagian download ZIP (line 145, 161): Ganti URL construction dari Supabase pattern ke `photoCloudUrl` / `videoCloudUrl` yang sudah tersimpan di database.

```diff
-  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unboxing-media/${ret.media.photoLocalPath}`;
+  const url = ret.media.photoCloudUrl;
```

```diff
-  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unboxing-media/${ret.media.videoLocalPath}`;
+  const url = ret.media.videoCloudUrl;
```

> **Note:** Google Drive URL bisa langsung di-download jika permission sudah di-set "anyone with link". Alternatif: gunakan format `https://drive.google.com/uc?export=download&id={FILE_ID}` untuk direct download.

#### [MODIFY] [history/[id]/page.tsx](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/(dashboard)/history/[id]/page.tsx)

Ganti fungsi `getMediaUrl()` (line 51-54):

```diff
-  const getMediaUrl = (path: string | null) => {
-    if (!path) return "";
-    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unboxing-media/${path}`;
-  };
+  const getMediaUrl = (cloudUrl: string | null, localPath: string | null) => {
+    if (cloudUrl) return cloudUrl;
+    if (!localPath) return "";
+    return ""; // No fallback — file belum di-upload
+  };
```

Update semua penggunaan `getMediaUrl` di halaman detail:
- Photo: gunakan `returnItem.media.photoCloudUrl`
- Video: gunakan `returnItem.media.videoCloudUrl`

#### [MODIFY] [types/index.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/types/index.ts)

Tambah field baru di `MediaItem`:

```diff
 export interface MediaItem {
   id: string;
   returnId: string;
   photoLocalPath: string | null;
   photoCloudUrl: string | null;
+  photoDriveFileId: string | null;
   videoLocalPath: string | null;
   videoCloudUrl: string | null;
+  videoDriveFileId: string | null;
+  driveFolderId: string | null;
   uploadStatus: "pending" | "uploading" | "uploaded" | "failed";
   uploadedAt: string | null;
   videoDuration: number;
 }
```

---

### Phase 7 — Cleanup

#### [MODIFY atau DELETE] [supabaseClient.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/supabaseClient.ts)

- Jika `@supabase/supabase-js` masih diperlukan untuk hal lain → hapus hanya export `supabaseAdmin` yang dipakai untuk storage
- Jika tidak dipakai sama sekali → **DELETE** file ini

#### Cleanup Checklist
| File | Perubahan |
|------|-----------|
| [upload/route.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/api/media/upload/route.ts) | Hapus import `supabaseAdmin`, hapus `uploadToSupabase()`, hapus referensi `unboxing-media` |
| [stats/route.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/api/storage/stats/route.ts) | Hapus import `supabaseAdmin`, hapus `.storage.from().list()` |
| [history/page.tsx](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/(dashboard)/history/page.tsx) | Hapus URL construction pakai `NEXT_PUBLIC_SUPABASE_URL` |
| [history/[id]/page.tsx](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/(dashboard)/history/[id]/page.tsx) | Hapus fungsi `getMediaUrl()` yang construct Supabase URL |
| [supabaseClient.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/supabaseClient.ts) | Delete atau strip storage-only usage |
| [package.json](file:///c:/Users/user/Documents/Coding/unboxing/frontend/package.json) | Opsional: hapus `@supabase/supabase-js` |

---

## Summary of All Modified Files

| # | File | Action | Phase |
|---|------|--------|-------|
| 1 | [package.json](file:///c:/Users/user/Documents/Coding/unboxing/frontend/package.json) | MODIFY — add `googleapis` | 1 |
| 2 | [schema.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/db/schema.ts) | MODIFY — add 3 columns to `media` | 2 |
| 3 | [google-drive.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/google-drive.ts) | **NEW** — Google Drive service | 3 |
| 4 | [auth.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/auth.ts) | MODIFY — add Drive scope | 4 |
| 5 | [media/upload/route.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/api/media/upload/route.ts) | MODIFY — rewrite to use Google Drive | 5 |
| 6 | [storage/stats/route.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/api/storage/stats/route.ts) | MODIFY — remove Supabase storage | 6 |
| 7 | [history/page.tsx](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/(dashboard)/history/page.tsx) | MODIFY — use DB URLs | 6 |
| 8 | [history/[id]/page.tsx](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/app/(dashboard)/history/[id]/page.tsx) | MODIFY — use DB URLs | 6 |
| 9 | [types/index.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/types/index.ts) | MODIFY — add Drive fields | 6 |
| 10 | [supabaseClient.ts](file:///c:/Users/user/Documents/Coding/unboxing/frontend/src/lib/supabaseClient.ts) | DELETE or MODIFY | 7 |

---

## Verification Plan

### Automated Tests
```bash
# Build check — pastikan tidak ada TypeScript error
cd frontend && npm run build

# Generate migration
npm run db:generate
```

### Manual Verification
1. **Login via Google** — pastikan consent screen menampilkan Drive scope
2. **Scan resi baru** — foto & video harus terupload ke Google Drive
3. **Cek Google Drive** — folder `Unboxing/{User Name}` harus terbuat, file foto & video ada di dalamnya
4. **History page** — foto & video bisa ditampilkan dari Google Drive URL
5. **Detail page** — media preview berfungsi normal
6. **Download ZIP** — foto & video bisa didownload dari Google Drive URL
7. **Storage stats** — halaman cloud storage menampilkan info yang benar
8. **Token expired scenario** — simulasi token expired, pastikan auto-refresh bekerja
9. **Grep final** — `grep -r "unboxing-media" src/` harus menghasilkan 0 hasil
