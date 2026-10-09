/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FP_TP_EXAMPLES } from '@kbn/evals-suite-attack-discovery-fp-tp/src/scenarios';
import {
  WORKER_CHAIN_EXAMPLES_ENV,
  WORKER_CHAIN_EXAMPLE_COUNT,
  WORKER_CHAIN_MAX_CHAIN_MS,
  WORKER_CHAIN_SUBSETS,
} from './constants';

type Env = Record<string, string | undefined>;

/** Ids of the examples the spec can run: every FP/TP world that is not a `failed` one. */
export const eligibleExampleIds = (): string[] =>
  FP_TP_EXAMPLES.filter(({ expectedOutcome }) => expectedOutcome !== 'failed').map(({ id }) => id);

/**
 * Resolves `WORKER_CHAIN_EXAMPLES` (comma-separated example ids and/or named
 * subsets such as `smoke6`) to example ids. Unset or blank selects every
 * eligible example. An unknown id throws: a typo must never silently run a
 * different set than the one asked for.
 */
export const selectWorkerChainExampleIds = (
  env: Env = process.env,
  eligible: readonly string[] = eligibleExampleIds()
): string[] => {
  const raw = env[WORKER_CHAIN_EXAMPLES_ENV]?.trim();
  if (!raw) return [...eligible];
  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  const selected: string[] = [];
  const unknown: string[] = [];
  for (const token of tokens) {
    const ids = WORKER_CHAIN_SUBSETS[token] ?? [token];
    for (const id of ids) {
      if (!eligible.includes(id)) unknown.push(id);
      else if (!selected.includes(id)) selected.push(id);
    }
  }
  if (unknown.length > 0) {
    throw new Error(
      `${WORKER_CHAIN_EXAMPLES_ENV} names unknown example(s): ${unknown.join(', ')}. ` +
        `Named subsets: ${Object.keys(WORKER_CHAIN_SUBSETS).join(', ')}. ` +
        `Known ids: ${eligible.join(', ')}`
    );
  }
  if (selected.length === 0) {
    throw new Error(`${WORKER_CHAIN_EXAMPLES_ENV}="${raw}" selects no examples`);
  }
  return selected;
};

/** Same precedence kbn-evals applies (create_playwright_eval_config.ts:91) when no config value is passed. */
export const resolveRepetitions = (env: Env = process.env): number =>
  parseInt(env.EVAL_REPETITIONS || '', 10) || 1;

/**
 * Playwright test timeout: selected examples x repetitions x the per-chain
 * bound. The single spec runs every selected example (and each repetition)
 * back to back (concurrency 1), so the bound scales with all three.
 */
export const deriveWorkerChainTimeoutMs = (env: Env = process.env): number => {
  const count = env[WORKER_CHAIN_EXAMPLES_ENV]?.trim()
    ? selectWorkerChainExampleIds(env).length
    : WORKER_CHAIN_EXAMPLE_COUNT;
  return count * resolveRepetitions(env) * WORKER_CHAIN_MAX_CHAIN_MS;
};
