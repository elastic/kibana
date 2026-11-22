/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The size of each model call, and how much of the budget the fixed cost of a call takes.
 *
 * The planner (`allocate_budget.ts`) gives every served rule its own batch, and every batch costs a fixed
 * overhead on top of one unit per alert. Small batches pay that overhead for few alerts. This section says how
 * the calls of a run are spread by size and which share of the cost units went to overhead. It is the baseline
 * for the change that holds back small batches.
 *
 * The token fit splits the input tokens of a call into a fixed part (system prompt, rule enrichment) and a part
 * per alert, by least squares over the calls. The budget unit is accounting; the fixed tokens are the real money
 * that fuller batches save. On a fake run the tokens are settings of the fake, so the fit is an estimate.
 */

import { TRIAGE_ALERT_COST, TRIAGE_BATCH_OVERHEAD_COST } from '@kbn/alertzero-common';
import { parseAlertIds } from './fake_llm';

export interface BatchCall {
  status: string;
  prompt: string;
  inputTokens?: number;
}

export const SIZE_BUCKETS = [
  { name: '1-5', min: 1, max: 5 },
  { name: '6-10', min: 6, max: 10 },
  { name: '11-20', min: 11, max: 20 },
  { name: '21-50', min: 21, max: 50 },
  { name: '51-100', min: 51, max: 100 },
] as const;

export interface SizeBucket {
  calls: number;
  alerts: number;
  costUnits: number;
  /** Cost units of the bucket divided by all cost units of the run. */
  shareOfCost: number | null;
}

export interface TokenFit {
  /** Calls with a token count that the fit used. */
  calls: number;
  fixedPerCall: number;
  perAlert: number;
  /** Fixed tokens of all fitted calls divided by their input tokens. */
  fixedShareOfInput: number;
  /** Share of the variance that the line explains (0 to 1). */
  r2: number;
}

export interface BatchSection {
  /** Completed calls with at least one alert. */
  calls: number;
  alerts: number;
  size: {
    p10: number | null;
    p50: number | null;
    p90: number | null;
    mean: number | null;
    max: number | null;
  };
  bySize: Record<string, SizeBucket>;
  costUnits: number;
  overheadUnits: number;
  /** Overhead units divided by all cost units: the part of the spent budget that bought no alert. */
  overheadShare: number | null;
  /** Null when fewer than 3 calls have tokens, or all calls have the same size. */
  tokenFit: TokenFit | null;
}

const round = (value: number, digits: number = 4): number => Number(value.toFixed(digits));

const nearestRank = (sorted: readonly number[], q: number): number | null =>
  sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]
    : null;

export const costOf = (alerts: number): number =>
  TRIAGE_BATCH_OVERHEAD_COST + alerts * TRIAGE_ALERT_COST;

/** Least squares of input tokens on the number of alerts. */
export const fitTokens = (
  points: ReadonlyArray<{ alerts: number; tokens: number }>
): TokenFit | null => {
  const n = points.length;
  if (n < 3) return null;
  const meanX = points.reduce((sum, p) => sum + p.alerts, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.tokens, 0) / n;
  const sxx = points.reduce((sum, p) => sum + (p.alerts - meanX) ** 2, 0);
  if (sxx === 0) return null;
  const sxy = points.reduce((sum, p) => sum + (p.alerts - meanX) * (p.tokens - meanY), 0);
  const perAlert = sxy / sxx;
  const fixedPerCall = meanY - perAlert * meanX;
  const syy = points.reduce((sum, p) => sum + (p.tokens - meanY) ** 2, 0);
  const residual = points.reduce(
    (sum, p) => sum + (p.tokens - (fixedPerCall + perAlert * p.alerts)) ** 2,
    0
  );
  const totalTokens = meanY * n;
  return {
    calls: n,
    fixedPerCall: round(fixedPerCall, 1),
    perAlert: round(perAlert, 1),
    fixedShareOfInput: round((fixedPerCall * n) / totalTokens),
    r2: syy === 0 ? 1 : round(1 - residual / syy),
  };
};

export const buildBatchSection = (calls: readonly BatchCall[]): BatchSection => {
  const done = calls
    .filter((call) => call.status === 'completed')
    .map((call) => ({ alerts: parseAlertIds(call.prompt).length, tokens: call.inputTokens }))
    .filter((call) => call.alerts > 0);

  const sizes = done.map((call) => call.alerts).sort((a, b) => a - b);
  const alerts = sizes.reduce((sum, size) => sum + size, 0);
  const costUnits = sizes.reduce((sum, size) => sum + costOf(size), 0);
  const overheadUnits = sizes.length * TRIAGE_BATCH_OVERHEAD_COST;

  const bySize = Object.fromEntries(
    SIZE_BUCKETS.map(({ name, min, max }) => {
      const inBucket = sizes.filter((size) => size >= min && size <= max);
      const bucketCost = inBucket.reduce((sum, size) => sum + costOf(size), 0);
      return [
        name,
        {
          calls: inBucket.length,
          alerts: inBucket.reduce((sum, size) => sum + size, 0),
          costUnits: bucketCost,
          shareOfCost: costUnits ? round(bucketCost / costUnits) : null,
        },
      ];
    })
  );

  const withTokens = done
    .filter((call): call is { alerts: number; tokens: number } => (call.tokens ?? 0) > 0)
    .map(({ alerts: n, tokens }) => ({ alerts: n, tokens }));

  return {
    calls: sizes.length,
    alerts,
    size: {
      p10: nearestRank(sizes, 0.1),
      p50: nearestRank(sizes, 0.5),
      p90: nearestRank(sizes, 0.9),
      mean: sizes.length ? round(alerts / sizes.length, 1) : null,
      max: sizes.length ? sizes[sizes.length - 1] : null,
    },
    bySize,
    costUnits,
    overheadUnits,
    overheadShare: costUnits ? round(overheadUnits / costUnits) : null,
    tokenFit: fitTokens(withTokens),
  };
};

/** One sentence for the ledger note. */
export const batchNote = (section: BatchSection): string => {
  const { costUnits, overheadUnits, bySize, calls, size } = section;
  // From the unit counts, not from the rounded shares, so that the sentence does not round twice.
  const share = (units: number) =>
    costUnits ? `${((units / costUnits) * 100).toFixed(1)}%` : 'n/a';
  return `Batches: ${calls} calls, median ${size.p50 ?? 'n/a'} alerts, overhead ${share(
    overheadUnits
  )} of the cost units, calls of 1 to 5 alerts ${share(
    bySize['1-5'].costUnits
  )} of the cost units.`;
};
