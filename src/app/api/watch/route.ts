import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { message: 'Route watching coming soon! This feature is not yet available in the beta.' },
    { status: 503 }
  );
}
