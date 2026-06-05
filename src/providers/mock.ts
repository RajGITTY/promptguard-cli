import type { Provider, GenerateRequest, GenerateResult } from '../types.js';

// Deterministic, no-API-key provider for local testing and demos.
// It returns plausible support answers so the example suite passes end-to-end
// without any network calls or keys.
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

function answerFor(prompt: string): string {
  for (const c of CANNED) if (c.match.test(prompt)) return c.answer;
  return 'Thanks for reaching out — please check your account Settings, and let me know if that helps.';
}

export const mockProvider: Provider = {
  name: 'mock',
  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const text = answerFor(req.prompt);
    // Rough deterministic token estimate (~4 chars/token) so cost math still runs.
    const inputTokens = Math.ceil(req.prompt.length / 4);
    const outputTokens = Math.ceil(text.length / 4);
    return { text, inputTokens, outputTokens, latencyMs: 5 };
  },
};
