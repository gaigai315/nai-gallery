# NAI Private Gallery

Lightweight private NAI gallery with Discord login, per-batch passwords, D1 audit logs, and private R2 storage.

## Local setup

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

## Creating a batch

Prepare a manifest like `examples/batch-manifest.example.json`. Upload originals, previews, and TXT files to the matching private R2 keys, then generate SQL:

```powershell
npm run batch:create -- --id=2026-05-16 --name="May 16" --manifest=examples/batch-manifest.example.json --out=batch-2026-05-16.sql
```

The script prints the private batch password. Share that password only with intended users. Do not commit generated batch SQL if it contains real object keys you consider private.

Apply the SQL:

```powershell
npx wrangler d1 execute nai-gallery --file batch-2026-05-16.sql
```

## Security notes

- The app records normal unlock, download, and favorite behavior. It cannot prevent screenshots, screen recordings, reposts, or shared temporary URLs.
- Session cookies are HttpOnly, Secure, and SameSite=Lax.
- Batch passwords are stored as PBKDF2-SHA256 hashes in D1.
- IP addresses are stored only as salted hashes when `IP_HASH_SECRET` is configured.
- Original files should never be committed to Git. Keep them in private R2 only.
