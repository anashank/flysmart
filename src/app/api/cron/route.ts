import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { message: 'Cron alerts coming soon! This feature is not yet available in the beta.' },
    { status: 503 }
  );
}
