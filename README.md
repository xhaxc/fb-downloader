# FB Video Downloader 🎬

Website untuk download video Facebook dengan kualitas HD atau SD. Dibangun dengan **Next.js** dan siap deploy ke **Vercel**.

## Demo

Website ini memungkinkan pengguna untuk:
- Paste URL video Facebook (publik)
- Memilih kualitas HD atau SD
- Download langsung di browser

---

## 🚀 Deploy ke Vercel via GitHub

### Langkah 1 — Upload ke GitHub

1. Buat repository baru di [github.com](https://github.com/new)
   - Nama repo: `fb-video-downloader` (atau sesuai keinginan)
   - Visibility: **Public** atau Private
   - Klik **Create repository**

2. Upload semua file project ini ke repo tersebut:
   ```bash
   # Jika pakai Git di terminal
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/fb-video-downloader.git
   git push -u origin main
   ```

   Atau langsung drag & drop file lewat GitHub web interface.

### Langkah 2 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) dan **Sign Up / Login** (bisa pakai akun GitHub)
2. Klik tombol **"Add New Project"**
3. Pilih repository **`fb-video-downloader`** dari GitHub
4. Vercel akan otomatis mendeteksi ini adalah project **Next.js**
5. Klik **"Deploy"** — tunggu sekitar 1-2 menit
6. Selesai! Website Anda live di `https://fb-video-downloader.vercel.app` 🎉

### Update Otomatis

Setiap kali Anda push ke branch `main`, Vercel akan otomatis rebuild dan deploy ulang.

---

## 💻 Jalankan Secara Lokal

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 📁 Struktur Project

```
fb-video-downloader/
├── pages/
│   ├── _app.js          # Global app wrapper
│   ├── index.js         # Halaman utama (UI)
│   └── api/
│       └── get-video.js # API route — ekstrak URL video
├── styles/
│   └── globals.css      # Global styles + Tailwind
├── public/              # Static assets
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## ⚠️ Disclaimer

Tool ini hanya untuk mendownload video yang **Anda miliki** atau yang Anda punya **izin** untuk mendownloadnya. Harap hormati hak cipta konten kreator. Tool ini tidak berafiliasi dengan Meta atau Facebook.

---

## 🛠 Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS + Custom CSS
- **Hosting**: Vercel
- **Font**: Syne + DM Sans (Google Fonts)
