import { NextRequest } from 'next/server';
import { runAgentStream } from '@/agent';
import { mockAdapter } from '@/adapters/mock';

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
        await runAgentStream(
          { origin, destination, date, cabin, adults: adults ?? 1, pointsBalances: {} },
          send,
          mockAdapter
        );
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
