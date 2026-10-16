/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Elastic Inference Service list price of one model, in USD per million tokens. */
export interface ModelPricePerMillion {
  model: string;
  input: number;
  output: number;
  cache_read: number | null;
}

/** Totals for one day or one model. */
export interface CostTotals {
  usd: number;
  tokens: number;
  calls: number;
}

/** Running total of what the engine's model calls cost. */
export interface EngineCostLedger {
  since: string;
  total_usd: number;
  calls: number;
  prompt_tokens: number;
  cached_tokens: number;
  completion_tokens: number;
  /** Tokens spent on a model with no known price; their cost is not in the total. */
  unpriced_tokens: number;
  /** Per UTC day, keeping the most recent days only. */
  by_day: Record<string, CostTotals>;
  by_model: Record<string, CostTotals>;
}

/** Cost figures the page shows. */
export interface EngineCostSummary {
  ledger: EngineCostLedger;
  today_usd: number;
  today_calls: number;
  /** Price of the model the agent uses now; absent for the heuristic agent. */
  current_price?: ModelPricePerMillion;
  /** False when the price catalog could not be read; costs then stay unpriced. */
  prices_available: boolean;
  prices_fetched_at?: string;
}
