import { Resend } from 'resend';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

export async function sendAlertEmail(
  to: string,
  route: { origin: string; destination: string; travelDate: Date; cabin: string },
  message: string
) {
  const resend = getResend();
  await resend.emails.send({
    from: 'FlySmart <alerts@flysmart.app>',
    to,
    subject: `FlySmart Alert: ${route.origin} → ${route.destination}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00d4ff;">FlySmart Route Alert</h2>
        <p><strong>Route:</strong> ${route.origin} → ${route.destination}</p>
        <p><strong>Date:</strong> ${route.travelDate.toLocaleDateString()}</p>
        <p><strong>Cabin:</strong> ${route.cabin}</p>
        <hr />
        <p>${message}</p>
        <p style="color: #888; font-size: 12px;">You're receiving this because you set up a route watch on FlySmart.</p>
      </div>
    `,
  });
}
