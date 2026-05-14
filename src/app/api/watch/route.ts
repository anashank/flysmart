import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, origin, destination, date, cabin } = body as {
      email: string;
      origin: string;
      destination: string;
      date: string;
      cabin: string;
    };

    if (!email || !origin || !destination || !date || !cabin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const route = await prisma.watchedRoute.create({
      data: {
        email,
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        travelDate: new Date(date),
        cabin,
      },
    });

    return NextResponse.json({
      id: route.id,
      message: `Alert set! We'll email ${email} when availability changes on ${origin.toUpperCase()} → ${destination.toUpperCase()}.`,
    });
  } catch (err) {
    console.error('[watch route]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
