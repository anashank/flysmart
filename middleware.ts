import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('beta_token')?.value
             ?? req.nextUrl.searchParams.get('token');

  if (token === process.env.BETA_TOKEN) {
    const res = NextResponse.next();
    // Set cookie so friends only need the link once
    res.cookies.set('beta_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  return new NextResponse('Access denied. Ask for the beta link.', { status: 401 });
}

export const config = {
  matcher: ['/', '/api/agent'],
};
