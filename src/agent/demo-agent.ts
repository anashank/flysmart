import Groq from 'groq-sdk';
import { TOOLS, handleToolCall } from './tools';
import { mockAdapter } from '@/adapters/mock';
import type { FlightOffer } from '@/adapters/types';
import type { AgentEvent, AgentInput } from './index';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are FlySmart, an expert AI travel agent specialising in award flights and points/miles optimisation.

You have these tools — use them autonomously to build the best recommendation:

- search_flights: award availability for a specific route and date
- search_nearby_dates: check ±N days when the exact date has no availability
- search_nearby_airports: try alternate airports when the primary route is sold out
- get_cash_price: fetch the estimated cash fare so you can calculate CPP
- check_seat_count: verify how many award seats remain
- get_transfer_partners: bookable/transfer partners for any program in the user's wallet
- get_program_rules: fuel surcharge policy and booking tips for any program

How to operate:
1. Always call search_flights first.
2. If no availability on the target date, try nearby dates. If still nothing, try nearby airports.
3. Get the cash price to calculate CPP for every viable option.
4. If the user has points balances, call get_transfer_partners and get_program_rules. If not, skip those tools.
5. Pick the top 1-2 options by CPP.
6. Verify seat count before writing the final recommendation.

Always respond in exactly this format:

## BEST OPTION
One sentence: program → partner (if applicable), points required, CPP value.

## HOW TO BOOK
1. Step one
2. Step two
(max 5 steps)

## ANALYSIS
2-3 sentences: why this beats alternatives, any caveats, fallback option. Bold key figures: **88,000 miles**, **2.3 cents/point**.

Today's date: ${new Date().toISOString().split('T')[0]}`;

// Convert Anthropic tool format → OpenAI/Groq format
const groqTools: Groq.Chat.ChatCompletionTool[] = TOOLS.map((t) => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

const TOOL_STATUS: Record<string, string> = {
  search_flights:         'Searching award availability...',
  search_nearby_dates:    'Checking nearby dates for better availability...',
  search_nearby_airports: 'Trying alternate airports...',
  get_cash_price:         'Fetching cash price for CPP calculation...',
  check_seat_count:       'Verifying seat availability...',
  get_transfer_partners:  'Looking up transfer partners...',
  get_program_rules:      'Checking program rules and surcharges...',
};

export async function runDemoAgentStream(
  input: AgentInput,
  onEvent: (event: AgentEvent) => void
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

Please always call search_flights first, then give me your top recommendation.`;

  type Message = Groq.Chat.ChatCompletionMessageParam;
  const messages: Message[] = [{ role: 'user', content: userMessage }];

  for (let turn = 0; turn < 10; turn++) {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      tools: groqTools,
      tool_choice: 'auto',
    });

    const msg = response.choices[0].message;
    messages.push(msg);

    if (msg.tool_calls?.length) {
      for (const call of msg.tool_calls) {
        onEvent({ type: 'status', message: TOOL_STATUS[call.function.name] ?? `Running ${call.function.name}...` });

        const toolInput = JSON.parse(call.function.arguments) as Record<string, unknown>;
        const { result, flights } = await handleToolCall(
          call.function.name,
          toolInput,
          flightCache,
          input.pointsBalances,
          mockAdapter
        );

        if (flights) {
          allFlights.push(...flights);
          onEvent({ type: 'flights', flights });
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }
      continue;
    }

    // End turn — stream the text
    const fullText = msg.content ?? '';
    onEvent({ type: 'status', message: 'Writing recommendation...' });

    const words = fullText.split(/(\s+)/);
    for (const word of words) {
      onEvent({ type: 'token', text: word });
      await new Promise((r) => setTimeout(r, 12));
    }

    onEvent({ type: 'done', recommendation: fullText });
    return;
  }

  onEvent({ type: 'done', recommendation: 'Unable to complete analysis. Please try again.' });
}
