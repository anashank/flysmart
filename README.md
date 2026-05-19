# FlySmart — Agentic Award Flight Intelligence

FlySmart uses Claude as an AI travel agent to find the best strategy for booking flights with your points and miles. You enter your route, dates, and points balances — Claude searches real award availability, evaluates every transfer partner and redemption option, and returns a plain-English recommendation with step-by-step booking instructions.

🔗 **[Live Demo](https://flysmart-three.vercel.app/demo)**

## How it works

1. You submit a search (route, dates, cabin class, points balances)
2. Claude uses tool calling to:
   - `search_flights` → fetches real award availability from the [Seats.aero](https://seats.aero) Partner API across 15+ airline programs in parallel
   - `get_transfer_partners` → looks up which airlines your points can transfer to
   - `evaluate_redemption` → scores each option in cents-per-point (CPP)
3. Claude returns a recommendation: the best 1–2 strategies with booking steps
4. Optionally, save a "Watch" on the route — the app emails you when availability changes

## Setup

### 1. Get API credentials

**Seats.aero (award flight data)**
- Sign up at [seats.aero](https://seats.aero) and request Partner API access
- Copy your **Partner API Key**

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
SEATS_AERO_API_KEY=your_seats_aero_key
ANTHROPIC_API_KEY=your_anthropic_key
RESEND_API_KEY=your_resend_key        # optional — needed for route watches
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
│   ├── tools.ts        # Tool definitions, Seats.aero source mapping
│   └── strategy.ts     # Points valuation, CPP scoring
├── adapters/
│   ├── types.ts        # Shared interfaces (FlightOffer, SearchParams, FlightAdapter)
│   └── seats-aero.ts   # Seats.aero Partner API adapter (searches 15+ programs in parallel)
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
        ├── agent/route.ts   # POST — runs the agentic search
        ├── watch/route.ts   # POST — saves a route watch
        └── cron/route.ts    # GET  — polls watched routes, sends email alerts
```

## Running the cron job

The `/api/cron` endpoint polls all watched routes. Trigger it manually:

```bash
curl http://localhost:3000/api/cron
```

In production, wire it to a cron job (Vercel Cron, GitHub Actions, etc.) to run every few hours.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| AI | Anthropic Claude with tool use |
| Flight data | Seats.aero Partner API |
| Database | SQLite + Prisma |
| Email | Resend |
| Hosting | Vercel |
