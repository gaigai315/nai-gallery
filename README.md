# NAI Private Gallery

Lightweight private NAI gallery with Discord login, per-batch passwords, D1 audit logs, and private R2 storage.

## Local setup

### Quick dev (Vite HMR with mock API)

```powershell
npm run dev
```

Opens at http://localhost:5173. The dev server includes an in-memory mock API (/api/*) so you can click through the full admin flow without real backend. Click "Dev Mode" on the landing page to mock-login as admin.

### Full local stack (Wrangler + D1 + R2)

1. Install dependencies:

```powershell
npm install
```

2. Copy `.env.example` to `.dev.vars` for Wrangler local development and fill the values.

3. Create the D1 schema:

```powershell
npx wrangler d1 execute nai-gallery --local --file migrations/0001_initial.sql
```

4. Build and run Pages Functions locally:

```powershell
npm run build
npx wrangler pages dev dist --d1=DB --r2=GALLERY_BUCKET
```

## Cloudflare resources

- Pages project: build command `npm run build`, output directory `dist`.
- D1 binding: `DB`.
- R2 binding: `GALLERY_BUCKET`.
- R2 bucket must stay private.
- Required environment variables are listed in `.env.example`.

## Discord OAuth

Create an application in the Discord Developer Portal and add these redirect URIs:

- Local: `http://localhost:8788/api/auth/callback`
- Production: `https://your-domain.example/api/auth/callback`

Use the production callback as `DISCORD_REDIRECT_URI` in Cloudflare Pages settings.

## Creating a batch (Admin UI)

Log in as admin (see below), navigate to `/admin`, and use the three-panel flow:

1. **Batch list** -- view all batches with stats (image/group count, unlock/download counts). Expand a row to see per-user unlock and download activity.
2. **Create** -- fill in batch name, optional slug and expiry. The generated password is shown once -- copy it before leaving this screen.
3. **Upload** -- select the target batch, drop PNG/TXT file pairs. The UI auto-parses NAI metadata, groups by prompt, generates WebP thumbnails, and uploads directly to R2 via presigned URLs.

The upload pipeline lives in `src/lib/upload.js` (metadata parsing + grouping + thumbnail + R2 sign, PUT, complete).

### Admin initialization

After first Discord login, promote your user to admin remotely:

```powershell
npx wrangler d1 execute nai-gallery --remote --command="UPDATE users SET role='admin' WHERE discord_id='YOUR_ID';"
```

In dev (`npm run dev`), click "Dev Mode" on the landing page to mock-login as admin directly.
