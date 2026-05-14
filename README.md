# FlySmart — Agentic Award Flight Intelligence

FlySmart uses Claude as an AI travel agent to find the best strategy for booking flights with your points and miles. You enter your route, dates, and points balances — Claude searches for real flights, evaluates every transfer partner and redemption option, and returns a plain-English recommendation with step-by-step booking instructions.

## How it works

1. You submit a search (route, dates, cabin class, points balances)
2. Claude uses tool calling to:
   - `search_flights` → fetches real flights from the Amadeus API
   - `get_transfer_partners` → looks up which airlines your points can transfer to
   - `evaluate_redemption` → scores each option in cents-per-point
3. Claude returns a recommendation: the best 1–2 strategies with booking steps
4. Optionally, save a "Watch" on the route — the app emails you when availability changes

## Setup

### 1. Get API credentials

**Amadeus (flight data)**
- Sign up at [developers.amadeus.com](https://developers.amadeus.com)
- Create a new app under "My Self-Service Workspace"
- Copy the **Client ID** and **Client Secret** (sandbox credentials)
- Sandbox gives you free access to test flight data

**Anthropic (Claude)**
- Get your API key at [console.anthropic.com](https://console.anthropic.com)

**Resend (email alerts — optional)**
- Sign up at [resend.com](https://resend.com) — free tier: 3,000 emails/month
- Create an API key in the dashboard

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your credentials:

```
AMADEUS_CLIENT_ID=your_client_id
AMADEUS_CLIENT_SECRET=your_client_secret
ANTHROPIC_API_KEY=your_anthropic_key
RESEND_API_KEY=your_resend_key
DATABASE_URL="file:./dev.db"
```

### 3. Install and run

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Verify the database

```bash
npx prisma studio
```

Opens a visual database browser at `http://localhost:5555`.

## Project structure

```
src/
├── agent/
│   ├── index.ts        # Agentic loop — drives Claude + tool calls
│   ├── tools.ts        # Tool definitions and handlers
│   └── strategy.ts     # Points valuation, CPP scoring
├── adapters/
│   ├── types.ts        # Shared interfaces (FlightOffer, SearchParams, FlightAdapter)
│   ├── amadeus.ts      # Amadeus API adapter (Phase 1)
│   └── seats-aero.ts   # Stub for Phase 2
├── data/
│   └── programs.ts     # Transfer partner mappings + sweet spots
├── components/
│   ├── SearchForm.tsx
│   ├── FlightCard.tsx
│   ├── ResultsPanel.tsx
│   └── WatchButton.tsx
└── app/
    ├── page.tsx
    ├── layout.tsx
    └── api/
        ├── agent/route.ts   # POST — runs the agent
        ├── watch/route.ts   # POST — saves a route watch
        └── cron/route.ts    # GET  — polls watched routes, sends alerts
```

## Swapping to Seats.aero (Phase 2)

The adapter interface (`src/adapters/types.ts`) is the only contract. To swap:

1. Implement `SeatsAeroAdapter` in `src/adapters/seats-aero.ts`
2. In `src/agent/tools.ts`, change one import:
   ```ts
   // from:
   import { amadeusAdapter } from '@/adapters/amadeus';
   // to:
   import { seatsAeroAdapter as amadeusAdapter } from '@/adapters/seats-aero';
   ```

That's the only change needed.

## Running the cron job

The `/api/cron` endpoint polls all watched routes. Trigger it manually:

```bash
curl http://localhost:3000/api/cron
```

In production, wire it to a cron job (Vercel Cron, GitHub Actions, etc.) to run every few hours.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) with tool use |
| Flight data | Amadeus Self-Service API (sandbox) |
| Database | SQLite + Prisma 7 |
| Email | Resend |
| Hosting | Vercel (recommended) |
