import type { Provider, ProviderName, Config } from '../types.js';
import { mockProvider } from './mock.js';
import { anthropicProvider } from './anthropic.js';
import { openaiProvider } from './openai.js';
import { geminiProvider } from './gemini.js';
import { customProvider } from './custom.js';

/** Resolve a provider by name. `cfg` supplies provider-specific settings (e.g. custom.baseUrl). */
export function createProvider(name: ProviderName, cfg: Config): Provider {
  switch (name) {
    case 'mock':
      return mockProvider;
    case 'anthropic':
      return anthropicProvider();
    case 'openai':
      return openaiProvider();
    case 'gemini':
      return geminiProvider();
    case 'custom':
      return customProvider(cfg.custom);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
