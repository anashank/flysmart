import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return Response.json({ ok: false, error: 'ANTHROPIC_API_KEY is not set' });
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Say "ok"' }],
    });
    const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
    return Response.json({ ok: true, response: text, keyPrefix: key.slice(0, 16) + '...' });
  } catch (err) {
    return Response.json({
      ok: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      keyPrefix: key.slice(0, 16) + '...',
    });
  }
}
