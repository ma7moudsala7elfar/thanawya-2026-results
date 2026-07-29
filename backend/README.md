# Thanawya Backend - Railway Deployment

## What this backend does
- Serves search, student details, top students, and stats from SQLite DB
- Uses **Puppeteer Headless Chrome** to scrape REAL subject grades from https://natega.gomhuriaonline.com for every student on-demand
- Caches scraped results in memory per seating number to avoid repeated scraping

## How to deploy on Railway

1. Go to https://railway.app and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repository
4. Set the **Root Directory** to: `backend`
5. Railway will automatically detect Node.js and run `npm start`

## Environment Variables (set in Railway dashboard)
None required — runs out of the box.

## Database
The backend expects the SQLite DB at:
- `../db/thanawya.db` (local) OR
- `../db/thanawya.db.gz` (Railway — auto-decompressed to /tmp on first run)

## After deployment
Copy the Railway URL (e.g. `https://thanawya-backend.up.railway.app`)
and set it as `VITE_API_URL` in Vercel environment variables for the frontend.
