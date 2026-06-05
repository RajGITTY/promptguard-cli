import type { Provider, GenerateRequest, GenerateResult } from '../types.js';

// Deterministic, no-API-key provider for local testing and demos.
// It recognizes a few common prompt shapes (support reply, classification,
// grounded/RAG answer) and returns plausible outputs, so every example suite
// passes end-to-end with no network calls or keys.

const CANNED: { match: RegExp; answer: string }[] = [
  {
    match: /password|reset|login/i,
    answer:
      'To reset your password, open your account Settings, choose Security, and click Reset Password. ' +
      "You'll get a confirmation email within a few minutes. Tell me if you need anything else.",
  },
  {
    match: /refund|cancel|billing|charge/i,
    answer:
      'You can manage your plan under Settings → Billing. To request a refund, open a ticket from that ' +
      'page and our team will review it within two business days.',
  },
];

/** Pull the text after a labeled marker (e.g. "Question:"), else the whole prompt. */
function fieldAfter(prompt: string, label: string): string {
  const m = prompt.match(new RegExp(`${label}\\s*:\\s*([\\s\\S]*)$`, 'i'));
  return (m ? m[1] : prompt).trim();
}

function classify(message: string): string {
  if (/charged|refund|invoice|billing|payment|subscription/i.test(message)) return 'billing';
  if (/crash|error|bug|broken|upload|not working|fail/i.test(message)) return 'technical';
  if (/price|pricing|plan|demo|buy|purchase|sales|quote/i.test(message)) return 'sales';
  return 'other';
}

function groundedAnswer(question: string): string {
  // Matches the demo context in examples/rag-faithfulness.yaml.
  if (/cost|price|how much|\$|seat/i.test(question)) {
    return 'Acme Pro costs $49/month and includes 10 seats.';
  }
  return "I don't know based on the provided information.";
}

function supportReply(prompt: string): string {
  for (const c of CANNED) if (c.match.test(prompt)) return c.answer;
  return 'Thanks for reaching out — please check your account Settings, and let me know if that helps.';
}

export const mockProvider: Provider = {
  name: 'mock',
  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const p = req.prompt;
    let text: string;
    if (/classify/i.test(p)) {
      text = classify(fieldAfter(p, 'Message'));
    } else if (/provided context|only the provided|based on the provided/i.test(p)) {
      text = groundedAnswer(fieldAfter(p, 'Question'));
    } else {
      text = supportReply(p);
    }
    // Rough deterministic token estimate (~4 chars/token) so cost math still runs.
    const inputTokens = Math.ceil(p.length / 4);
    const outputTokens = Math.ceil(text.length / 4);
    return { text, inputTokens, outputTokens, latencyMs: 5 };
  },
};
