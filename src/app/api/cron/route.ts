import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { amadeusAdapter } from '@/adapters/amadeus';
import { sendAlertEmail } from '@/lib/resend';

export async function GET() {
  try {
    const routes = await prisma.watchedRoute.findMany();
    const results: { id: string; status: string }[] = [];

    for (const route of routes) {
      try {
        const flights = await amadeusAdapter.searchFlights({
          origin: route.origin,
          destination: route.destination,
          date: route.travelDate.toISOString().split('T')[0],
          cabin: route.cabin as 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST',
          adults: 1,
        });

        const hasFlights = flights.length > 0;
        const cheapest = hasFlights
          ? flights.reduce((min, f) => (f.price < min.price ? f : min), flights[0])
          : null;

        const message = cheapest
          ? `New availability found! Cheapest option: ${cheapest.airline} ${cheapest.flightNumber} at $${cheapest.price} ${cheapest.currency}. Departs ${new Date(cheapest.departure).toLocaleString()}.`
          : `No flights currently available for ${route.origin} → ${route.destination} on ${route.travelDate.toLocaleDateString()}.`;

        if (hasFlights) {
          await sendAlertEmail(route.email, route, message);

          await prisma.alert.create({
            data: { watchedRouteId: route.id, message },
          });
        }

        await prisma.watchedRoute.update({
          where: { id: route.id },
          data: { lastChecked: new Date() },
        });

        results.push({ id: route.id, status: hasFlights ? 'alert_sent' : 'no_change' });
      } catch (err) {
        console.error(`[cron] failed for route ${route.id}:`, err);
        results.push({ id: route.id, status: 'error' });
      }
    }

    return NextResponse.json({ checked: routes.length, results });
  } catch (err) {
    console.error('[cron route]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
