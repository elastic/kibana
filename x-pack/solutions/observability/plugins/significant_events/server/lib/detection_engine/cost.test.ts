/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import type { PriceResult } from '../cost/price_service';
import { addToLedger, emptyLedger, priceUsage, resolveModelKey } from './cost';

const SONNET = { input: 4.5, output: 21, cacheRead: 0.45, tierThreshold: null };

const PRICES: PriceResult = {
  prices: new Map([['anthropic-claude-4.6-sonnet', SONNET]]),
  fetchedAt: '2026-10-15T00:00:00.000Z',
  stale: false,
};

describe('priceUsage', () => {
  it('prices input and output per million tokens', () => {
    expect(
      priceUsage({ usage: { prompt: 1_000_000, cached: 0, completion: 100_000 }, price: SONNET })
    ).toBeCloseTo(4.5 + 2.1, 10);
  });

  it('prices cached prompt tokens at the cache-read price', () => {
    expect(
      priceUsage({ usage: { prompt: 1_000_000, cached: 1_000_000, completion: 0 }, price: SONNET })
    ).toBeCloseTo(0.45, 10);
  });

  it('falls back to the input price when there is no cache-read price', () => {
    expect(
      priceUsage({
        usage: { prompt: 1_000_000, cached: 1_000_000, completion: 0 },
        price: { ...SONNET, cacheRead: null },
      })
    ).toBeCloseTo(4.5, 10);
  });
});

describe('addToLedger', () => {
  it('adds a priced run to the totals, the day and the model', () => {
    const { ledger, costUsd } = addToLedger({
      ledger: emptyLedger('2026-10-15T08:00:00.000Z'),
      usage: { prompt: 15_000, cached: 0, completion: 1_800 },
      calls: 4,
      model: 'anthropic-claude-4.6-sonnet',
      prices: PRICES,
      now: '2026-10-15T12:00:00.000Z',
    });

    expect(costUsd).toBeCloseTo(0.0675 + 0.0378, 10);
    expect(ledger.total_usd).toBeCloseTo(0.1053, 10);
    expect(ledger.calls).toBe(4);
    expect(ledger.by_day['2026-10-15']).toEqual({ usd: costUsd, tokens: 16_800, calls: 4 });
    expect(ledger.by_model['anthropic-claude-4.6-sonnet'].tokens).toBe(16_800);
    expect(ledger.unpriced_tokens).toBe(0);
  });

  it('counts tokens of a model with no price without adding to the cost', () => {
    const { ledger, costUsd } = addToLedger({
      ledger: emptyLedger('2026-10-15T08:00:00.000Z'),
      usage: { prompt: 1_000, cached: 0, completion: 100 },
      calls: 1,
      model: 'some-private-model',
      prices: PRICES,
      now: '2026-10-15T12:00:00.000Z',
    });

    expect(costUsd).toBeNull();
    expect(ledger.total_usd).toBe(0);
    expect(ledger.unpriced_tokens).toBe(1_100);
  });
});

describe('resolveModelKey', () => {
  function clientWith(config: Record<string, unknown>): InferenceClient {
    return {
      getConnectorById: jest.fn().mockResolvedValue({ config }),
    } as unknown as InferenceClient;
  }

  it('reads the model id of an Elastic Inference Service connector', async () => {
    expect(
      await resolveModelKey({
        inferenceClient: clientWith({
          providerConfig: { model_id: 'anthropic-claude-4.6-sonnet' },
        }),
        connectorId: 'Anthropic-Claude-Sonnet-4-6',
      })
    ).toBe('anthropic-claude-4.6-sonnet');
  });

  it('derives the model from the inference endpoint id when there is no model id', async () => {
    expect(
      await resolveModelKey({
        inferenceClient: clientWith({ inferenceId: '.anthropic-claude-4.5-haiku-chat_completion' }),
        connectorId: 'haiku',
      })
    ).toBe('anthropic-claude-4.5-haiku');
  });
});
