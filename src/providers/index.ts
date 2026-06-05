import type { Provider, ProviderName } from '../types.js';
import { mockProvider } from './mock.js';
import { anthropicProvider } from './anthropic.js';
import { openaiProvider } from './openai.js';

export function createProvider(name: ProviderName): Provider {
  switch (name) {
    case 'mock':
      return mockProvider;
    case 'anthropic':
      return anthropicProvider();
    case 'openai':
      return openaiProvider();
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
