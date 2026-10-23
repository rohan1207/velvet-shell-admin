# Velvet Shell Admin

Separate Next.js admin console for house operations. Deploy independently (e.g. `admin.velvetshell.com`).

## Local

From repo root:

```bash
npm run admin:seed
npm run admin:dev
```

Or inside `admin/`:

```bash
cp .env.example .env.local   # edit credentials
npm run seed                 # refresh demo data from storefront catalog
npm run dev                  # http://localhost:3001
```

Default local login (from `.env.local`):

- Email: `owner@velvetshell.com`
- Password: `velvetadmin123`

Product/testimonial thumbnails use relative paths from the storefront `public/` tree. Run the shop on `:3000` (or set `STOREFRONT_ORIGIN`) so media rewrites resolve.

## Deploy (Vercel)

1. New project → root directory = `admin`
2. Set env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
3. Domain: `admin.velvetshell.com`

## Data

v1 uses seeded JSON + browser `localStorage` via `lib/repository.js`.  
Swap that module to Supabase later without changing the UI.
