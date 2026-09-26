# Smart Camera AI Surveillance Web Application 🎥🤖

A full-featured, browser-based smart surveillance web application featuring real-time AI human detection, automatic 4-photo burst capture, **3-second rolling pre-roll video recording**, IndexedDB local storage, activity logs, and gallery management.

---

## 🚀 Deployment Guide (100% Free Hosting)

This is a client-side React + Vite web application with zero backend requirements. It can be deployed in under 2 minutes on Vercel, Netlify, GitHub Pages, or Render.

### Option 1: Vercel (Recommended - 1 Click)
1. Push this project code to GitHub.
2. Go to [Vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository. Vercel will auto-detect Vite settings (`vercel.json`).
4. Click **Deploy**. Your site will be live on an `https://...vercel.app` URL!

---

### Option 2: Netlify (1 Click or Drag & Drop)
1. Go to [Netlify.com](https://netlify.com).
2. **GitHub Connect**: Import your repository (Netlify auto-detects `netlify.toml`).
3. **Or Drag & Drop**: Run `npm run build` locally, then drag the `dist` folder into Netlify's web console.

---

### Option 3: GitHub Pages (Automatic Workflow)
1. Push this code to a GitHub repository.
2. In GitHub, go to **Settings** → **Pages**.
3. Under **Source**, select **GitHub Actions**.
4. Push any commit to `main` — the workflow in `.github/workflows/deploy.yml` will build and publish your surveillance web application automatically!

---

## 🛠️ Local Development

### Run with Vite Dev Server:
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in Google Chrome, Edge, Safari, or Firefox.

### Direct Browser Standalone Mode:
Double-click `index.html` or open it with any static web server (e.g. VS Code Live Server).

---

## 📁 Project Structure

```
├── index.html                  # Main HTML entry & CDN fallbacks
├── vercel.json                 # Vercel deployment config
├── netlify.toml                # Netlify deployment config
├── .github/workflows/deploy.yml# GitHub Pages automated workflow
├── package.json                # Project dependencies (React, TF.js, Lucide)
├── vite.config.js              # Vite server & build config
├── src/
│   ├── App.jsx                 # Surveillance dashboard & detector loop
│   ├── components/             # UI Components (CameraFeed, ControlPanel, ActivityLog, Gallery)
│   └── services/               # Services (detectorService, recorderService, storageService)
```
