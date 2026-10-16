/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import type { PriceResult } from '@kbn/significant-events-plugin/server';
import type { EngineCostLedger } from '../../../common';
import type { AgentUsage } from '../agent/types';
import { addToLedger, emptyLedger, resolveModelKey } from './cost';

/** What one run's model calls cost, after it was added to the ledger. */
export interface RunCost {
  ledger: EngineCostLedger;
  tokens: number;
  /** Null when some model had no list price; its tokens are counted as unpriced. */
  costUsd: number | null;
  /** Price key of the model, when the run used one model. */
  model?: string;
}

/**
 * Adds a run's model usage to the space's ledger, priced at Elastic Inference Service list
 * price. Usage is grouped by model, since an admin can change the connector between runs.
 */
export async function recordRunCost({
  usages,
  ledger,
  inferenceClient,
  getPrices,
  defaultConnectorId,
  now,
}: {
  usages: AgentUsage[];
  ledger: EngineCostLedger | undefined;
  inferenceClient: InferenceClient;
  getPrices: () => Promise<PriceResult | null>;
  /** The configured connector, for calls that did not report one. */
  defaultConnectorId?: string;
  now: string;
}): Promise<RunCost | undefined> {
  if (usages.length === 0) {
    return undefined;
  }
  const prices = await getPrices();
  const modelKeys = await Promise.all(
    usages.map(async (usage) => {
      if (usage.model) {
        return usage.model.toLowerCase();
      }
      const connectorId = usage.connector_id ?? defaultConnectorId;
      return connectorId ? resolveModelKey({ inferenceClient, connectorId }) : 'unknown';
    })
  );
  const byModel = usages.reduce((groups, usage, index) => {
    const key = modelKeys[index];
    const group = groups.get(key) ?? { prompt: 0, cached: 0, completion: 0, calls: 0 };
    groups.set(key, {
      prompt: group.prompt + usage.prompt,
      cached: group.cached + usage.cached,
      completion: group.completion + usage.completion,
      calls: group.calls + 1,
    });
    return groups;
  }, new Map<string, { prompt: number; cached: number; completion: number; calls: number }>());

  return [...byModel.entries()].reduce<RunCost>(
    (total, [model, { calls, ...usage }]) => {
      const { ledger: next, costUsd } = addToLedger({
        ledger: total.ledger,
        usage,
        calls,
        model,
        prices,
        now,
      });
      return {
        ledger: next,
        tokens: total.tokens + usage.prompt + usage.completion,
        costUsd: costUsd === null || total.costUsd === null ? null : total.costUsd + costUsd,
        model: byModel.size === 1 ? model : undefined,
      };
    },
    { ledger: ledger ?? emptyLedger(now), tokens: 0, costUsd: 0 }
  );
}
