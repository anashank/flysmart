import { NextRequest } from 'next/server';
import { runDemoAgentStream } from '@/agent/demo-agent';
import { mockAdapter } from '@/adapters/mock';
import type { PointsCurrency } from '@/data/programs';
import type { CabinClass } from '@/adapters/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SCRIPTED_RECOMMENDATION = `## BEST OPTION
Flying Blue (Air France/KLM) → Air France AF006, **50,000 miles** + $85 taxes, **2.4 cents/point**.

## HOW TO BOOK
1. Log in to flyingblue.com and go to "Spend Miles → Book Award Flight"
2. Search your route in Business class on the target date
3. Select the AF006 itinerary and confirm miles deduction
4. Pay the $85 carrier taxes with any credit card
5. Check in online 24 hours before departure

## ANALYSIS
Flying Blue offers the best value at **2.4 cpp**, beating United (**1.8 cpp**) and Aeroplan (**2.1 cpp**) on this route. Aeroplan is a solid fallback at **65,000 miles** with no fuel surcharges if Flying Blue space disappears. Avoid British Avios on this transatlantic routing — BA imposes **$560+ fuel surcharges** that eliminate the value entirely.`;

async function runScriptedDemo(
  origin: string, destination: string, date: string, cabin: string, adults: number,
  send: (data: object) => void
) {
  send({ type: 'status', message: 'Searching award availability...' });
  await delay(900);

  const flights = await mockAdapter.searchFlights({
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    date,
    cabin: cabin as CabinClass,
    adults,
  });
  send({ type: 'flights', flights });

  await delay(600);
  send({ type: 'status', message: 'Fetching cash price for CPP calculation...' });
  await delay(700);
  send({ type: 'status', message: 'Checking program rules and surcharges...' });
  await delay(800);
  send({ type: 'status', message: 'Verifying seat availability...' });
  await delay(500);
  send({ type: 'status', message: 'Writing recommendation...' });
  await delay(300);

  for (const word of SCRIPTED_RECOMMENDATION.split(/(\s+)/)) {
    send({ type: 'token', text: word });
    await delay(12);
  }
  send({ type: 'done', recommendation: SCRIPTED_RECOMMENDATION });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { origin, destination, date, cabin, adults } = body as {
    origin: string; destination: string; date: string; cabin: string; adults: number;
  };

  const missing = ['origin', 'destination', 'date', 'cabin'].filter((f) => !body[f]);
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: `Missing fields: ${missing.join(', ')}` }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      try {
        if (process.env.GROQ_API_KEY) {
          await runDemoAgentStream(
            { origin, destination, date, cabin, adults: adults ?? 1, pointsBalances: {} as Partial<Record<PointsCurrency, number>> },
            send
          );
        } else {
          // No API key — run scripted demo so the UI still works
          await runScriptedDemo(origin, destination, date, cabin, adults ?? 1, send);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ type: 'error', message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
