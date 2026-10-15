/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import type {
  EngineCostLedger,
  ModelPricePerMillion,
} from '../../../common/detection_engine/types';
import type { ModelPrice, PriceResult } from '../cost/price_service';
import type { AgentUsage } from './agent/types';

const TOKENS_PER_PRICE_UNIT = 1_000_000;

/** A fresh ledger, started now. */
export function emptyLedger(now: string): EngineCostLedger {
  return {
    since: now,
    total_usd: 0,
    calls: 0,
    prompt_tokens: 0,
    cached_tokens: 0,
    completion_tokens: 0,
    unpriced_tokens: 0,
    by_day: {},
    by_model: {},
  };
}

/**
 * Price key of a connector's model, as the Elastic Inference Service price catalog names it
 * (`anthropic-claude-4.6-sonnet`). Read from the connector, so it follows whatever model the
 * admin picked.
 */
export async function resolveModelKey({
  inferenceClient,
  connectorId,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
}): Promise<string> {
  try {
    const connector = await inferenceClient.getConnectorById(connectorId);
    const config = (connector.config ?? {}) as {
      providerConfig?: { model_id?: unknown };
      inferenceId?: unknown;
    };
    const modelId = config.providerConfig?.model_id;
    if (typeof modelId === 'string' && modelId.length > 0) {
      return modelId.toLowerCase();
    }
    const inferenceId = config.inferenceId;
    if (typeof inferenceId === 'string') {
      // `.anthropic-claude-4.6-sonnet-chat_completion` -> `anthropic-claude-4.6-sonnet`
      return inferenceId
        .replace(/^\./, '')
        .replace(/-chat_completion$/, '')
        .toLowerCase();
    }
  } catch {
    // An unknown connector simply has no price.
  }
  return connectorId.toLowerCase();
}

/** List price per million tokens, in the shape the page shows. */
export function toPricePerMillion(model: string, price: ModelPrice): ModelPricePerMillion {
  return { model, input: price.input, output: price.output, cache_read: price.cacheRead };
}

/**
 * Cost of the tokens at list price. Cached prompt tokens use the cache-read price when the
 * catalog has one. Prompts above a tier threshold are priced at the lower tier, so the result is
 * a floor in that case; the engine's prompts stay far below current thresholds.
 */
export function priceUsage({ usage, price }: { usage: AgentUsage; price: ModelPrice }): number {
  const cached = Math.min(usage.cached, usage.prompt);
  const uncached = usage.prompt - cached;
  const cacheReadPrice = price.cacheRead ?? price.input;
  return (
    (uncached * price.input + cached * cacheReadPrice + usage.completion * price.output) /
    TOKENS_PER_PRICE_UNIT
  );
}

/** Adds one run's model usage to the ledger. Returns the new ledger and the run's cost. */
export function addToLedger({
  ledger,
  usage,
  calls,
  model,
  prices,
  now,
}: {
  ledger: EngineCostLedger;
  usage: AgentUsage;
  calls: number;
  model: string;
  prices: PriceResult | null;
  now: string;
}): { ledger: EngineCostLedger; costUsd: number | null } {
  const tokens = usage.prompt + usage.completion;
  const price = prices?.prices.get(model);
  const costUsd = price ? priceUsage({ usage, price }) : null;
  const day = now.slice(0, 10);
  const dayTotals = ledger.by_day[day] ?? { usd: 0, tokens: 0, calls: 0 };
  const modelTotals = ledger.by_model[model] ?? { usd: 0, tokens: 0, calls: 0 };

  return {
    costUsd,
    ledger: {
      ...ledger,
      total_usd: ledger.total_usd + (costUsd ?? 0),
      calls: ledger.calls + calls,
      prompt_tokens: ledger.prompt_tokens + usage.prompt,
      cached_tokens: ledger.cached_tokens + usage.cached,
      completion_tokens: ledger.completion_tokens + usage.completion,
      unpriced_tokens: ledger.unpriced_tokens + (costUsd === null ? tokens : 0),
      by_day: {
        ...ledger.by_day,
        [day]: {
          usd: dayTotals.usd + (costUsd ?? 0),
          tokens: dayTotals.tokens + tokens,
          calls: dayTotals.calls + calls,
        },
      },
      by_model: {
        ...ledger.by_model,
        [model]: {
          usd: modelTotals.usd + (costUsd ?? 0),
          tokens: modelTotals.tokens + tokens,
          calls: modelTotals.calls + calls,
        },
      },
    },
  };
}
