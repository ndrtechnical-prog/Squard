# PUBG Arena Tournament Booking - Cloudflare Pages Deployment Guide

This project is built with **React**, **TypeScript**, **Tailwind CSS**, and is designed for zero-cold-start edge deployment on **Cloudflare Pages**, with **Cloudflare D1** for relational data and **Cloudflare R2** for private payment proof storage.

---

## 1. Architecture Overview

- **Frontend**: React 19 SPA running on Cloudflare Pages static assets CDN.
- **Backend API**: Cloudflare Pages Functions located in `/functions/api/*`.
- **Relational Database**: Cloudflare D1 (`pubg_tournament_db`) with SQL constraints preventing duplicate transaction references.
- **Private Storage**: Cloudflare R2 bucket (`pubg-tournament-proofs`) for payment screenshots. Never exposed publicly; streamed only to authenticated administrators.
- **Local Dev / Full-Stack Preview**: Express server (`server.ts`) providing identical REST API endpoints with in-memory / SQLite persistence and Vite middleware integration.

---

## 2. Cloudflare CLI Setup & Provisioning

### Step 1: Install Wrangler CLI
```bash
npm install -g wrangler
# Authenticate with your Cloudflare account
npx wrangler login
```

### Step 2: Create Cloudflare D1 Database
```bash
npx wrangler d1 create pubg_tournament_db
```
*Note down the returned `database_id` and update your `wrangler.toml`:*
```toml
[[d1_databases]]
binding = "DB"
database_name = "pubg_tournament_db"
database_id = "<your-d1-database-id>"
```

### Step 3: Run Database Migrations
Execute the migration file `migrations/0001_init.sql`:
```bash
# For local testing:
npx wrangler d1 execute pubg_tournament_db --local --file=./migrations/0001_init.sql

# For production Cloudflare D1:
npx wrangler d1 execute pubg_tournament_db --remote --file=./migrations/0001_init.sql
```

### Step 4: Create Cloudflare R2 Bucket
```bash
npx wrangler r2 bucket create pubg-tournament-proofs
```
Verify the binding in `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "PAYMENT_BUCKET"
bucket_name = "pubg-tournament-proofs"
```

---

## 3. Configuring Secrets in Cloudflare

Configure the private administrator secret and signing key in your Cloudflare Pages project:

```bash
npx wrangler pages secret put ADMIN_SECRET
# Enter strong password (e.g., your admin master key)

npx wrangler pages secret put JWT_SECRET
# Enter random 64-character secret

# Optional: Official PUBG Mobile Partner API Key
npx wrangler pages secret put PUBG_API_KEY
```

---

## 4. Local Development

To run the application locally with full API support and hot reload:
```bash
npm install
npm run dev
```
The app will run at `http://localhost:3000`.
Default Admin Password: `pubgadmin2026`

---

## 5. Deploying to Cloudflare Pages

### Option A: Direct Wrangler Pages Deploy
```bash
# 1. Build the frontend production bundle
npm run build

# 2. Deploy dist folder and functions to Cloudflare Pages
npx wrangler pages deploy dist --project-name=pubg-arena-tournament
```

### Option B: Cloudflare Pages Git Integration (GitHub / GitLab)
1. In Cloudflare Dashboard, navigate to **Compute (Workers) > Pages**.
2. Click **Create Application** > **Connect to Git**.
3. Select your repository.
4. Set Build Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build output directory**: `dist`
5. Go to **Settings > Functions > D1 Database Bindings**:
   - Variable name: `DB`
   - D1 Database: `pubg_tournament_db`
6. Go to **Settings > Functions > R2 Bucket Bindings**:
   - Variable name: `PAYMENT_BUCKET`
   - R2 Bucket: `pubg-tournament-proofs`
7. Save and trigger a new deployment.

---

## 6. Security Features

1. **Duplicate Transaction Reference Prevention**:
   - Database level `UNIQUE(transaction_ref)` constraint in D1.
   - Transactional pre-validation on server prevents race-condition double submission.
2. **Private Payment Proofs**:
   - Stored in Cloudflare R2 with access strictly limited to authenticated admins.
   - Never accessible via public URLs.
3. **Room Credential Secrecy**:
   - Room ID and Room Password are mathematically stripped from public API payloads.
   - Credentials unlock ONLY when:
     1. Player's booking is confirmed as `APPROVED` by administrator.
     2. Server timestamp enters the 15-minute room access window.
