import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlock } from '@anthropic-ai/sdk/resources/messages';
import { TOOLS, handleToolCall } from './tools';
import type { FlightOffer, FlightAdapter } from '@/adapters/types';
import type { PointsCurrency } from '@/data/programs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are FlySmart, an expert AI travel agent specialising in award flights and points/miles optimisation.

You have these tools — use them autonomously to build the best recommendation:

- search_flights: award availability for a specific route and date
- search_nearby_dates: check ±N days when the exact date has no availability or you want the cheapest window
- search_nearby_airports: try alternate airports when the primary route is sold out
- get_cash_price: fetch the estimated cash fare so you can calculate CPP for every option
- check_seat_count: verify how many award seats remain before finalising a recommendation
- get_transfer_partners: bookable/transfer partners and sweet spots for any program in the user's wallet
- get_program_rules: fuel surcharge policy, stopover rules, and booking tips for any program

How to operate:
1. Search for flights first.
2. If no availability on the target date, automatically try nearby dates. If still nothing, try nearby airports.
3. Get the cash price so you can calculate CPP for every viable option.
4. If the user has points balances, call get_transfer_partners and get_program_rules for each program — fuel surcharges can destroy value (e.g. British Avios on BA transatlantic). If no balances are provided, skip get_transfer_partners and get_program_rules, and simply present the best available award options.
5. Reason about every option using your own expertise: transfer chains, pooling, transfer ratios (e.g. Amex to ANA is 2:1), availability confirmation.
6. Pick the top 1-2 options by CPP, weighted by what the user can actually afford.
7. Always verify seat count before writing the final recommendation.

Always respond in exactly this format — no deviations, no extra headers:

## BEST OPTION
One sentence: program → partner (if applicable), points required, CPP value.

## HOW TO BOOK
1. Step one
2. Step two
(max 5 steps)

## ANALYSIS
2-3 sentences: why this beats alternatives, any pooling opportunity or caveat, fallback option. Bold key figures: **88,000 miles**, **2.3 cents/point**.

Today's date: ${new Date().toISOString().split('T')[0]}`;

export interface AgentInput {
  origin: string;
  destination: string;
  date: string;
  cabin: string;
  adults: number;
  pointsBalances: Partial<Record<PointsCurrency, number>>;
}

export type AgentEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; text: string }
  | { type: 'flights'; flights: FlightOffer[] }
  | { type: 'done'; recommendation: string };

const TOOL_STATUS: Record<string, string> = {
  search_flights:          'Searching award availability...',
  search_nearby_dates:     'Checking nearby dates for better availability...',
  search_nearby_airports:  'Trying alternate airports...',
  get_cash_price:          'Fetching cash price for CPP calculation...',
  check_seat_count:        'Verifying seat availability...',
  get_transfer_partners:   'Looking up transfer partners...',
  get_program_rules:       'Checking program rules and surcharges...',
};

export async function runAgentStream(
  input: AgentInput,
  onEvent: (event: AgentEvent) => void,
  adapter?: FlightAdapter
): Promise<void> {
  const flightCache = new Map<string, FlightOffer[]>();
  const allFlights: FlightOffer[] = [];

  const userMessage = `Find me the best award flight strategy for this trip:
- From: ${input.origin.toUpperCase()}
- To: ${input.destination.toUpperCase()}
- Date: ${input.date}
- Cabin: ${input.cabin}
- Passengers: ${input.adults} adult(s)

My points balances:
${Object.entries(input.pointsBalances)
  .filter(([, v]) => v && v > 0)
  .map(([k, v]) => `- ${k}: ${v?.toLocaleString()} points`)
  .join('\n') || '- None provided'}

Please always call search_flights first to find available award space, then give me your top recommendation based on whatever options are available.`;

  const messages: MessageParam[] = [{ role: 'user', content: userMessage }];

  for (let turn = 0; turn < 10; turn++) {
    // Tool-call turns: use regular (non-streaming) create — fast, no UX benefit to streaming
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        onEvent({ type: 'status', message: TOOL_STATUS[block.name] ?? `Running ${block.name}...` });

        const { result, flights } = await handleToolCall(
          block.name,
          block.input as Record<string, unknown>,
          flightCache,
          input.pointsBalances,
          adapter
        );

        if (flights) {
          allFlights.push(...flights);
          onEvent({ type: 'flights', flights });
        }

        toolResults.push({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    if (response.stop_reason === 'end_turn') {
      // We already have the full text — emit it in small chunks to drive the streaming UI
      const fullText = response.content
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n');

      onEvent({ type: 'status', message: 'Writing recommendation...' });

      // Emit word-by-word so the UI animates naturally
      const words = fullText.split(/(\s+)/);
      for (const word of words) {
        onEvent({ type: 'token', text: word });
        await new Promise((r) => setTimeout(r, 12));
      }

      onEvent({ type: 'done', recommendation: fullText });
      return;
    }

    break;
  }

  onEvent({ type: 'done', recommendation: 'Unable to complete analysis. Please try again.' });
}
