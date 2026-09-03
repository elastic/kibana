/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { ExtractDiamondExample, ExtractDiamondResponse } from '../types';

const VERTICES = ['adversary', 'capability', 'infrastructure', 'victim'] as const;

/**
 * CODE evaluator: at least `min_signal_count` of the four vertices came back
 * non-NONE. Guards against a model that collapses to an all-NONE Diamond on a
 * report the pipeline considered extraction-worthy.
 */
export const createSignalCountEvaluator = (): Evaluator<
  ExtractDiamondExample,
  ExtractDiamondResponse
> => ({
  name: 'DiamondSignalCount',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const min = expected?.min_signal_count ?? 0;
    const count = typeof output?.signal_count === 'number' ? output.signal_count : 0;
    return {
      score: count >= min ? 1 : 0,
      label: `signal_count_${count}`,
    };
  },
});

// Literal IOC patterns the Diamond summaries must not contain: the prompt
// requires infrastructure/victim characterisations by pattern, not by naming
// specific IPs, URLs, or organisation-identifying emails/domains.
const IPV4 = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
const DEFANGED_IPV4 = /\b\d{1,3}\[\.\]\d{1,3}\[\.\]\d{1,3}\[\.\]\d{1,3}\b/;
const URL = /https?:\/\/\S+/i;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

const leaksIoc = (summary: string): boolean =>
  IPV4.test(summary) || DEFANGED_IPV4.test(summary) || URL.test(summary) || EMAIL.test(summary);

/**
 * CODE evaluator: no vertex summary leaks a literal IOC (IP, URL, or email).
 * This is the security-relevant Diamond constraint — the summaries are stored
 * as `semantic_text` for clustering and must characterise infrastructure by
 * behaviour, not reproduce the indicator list.
 */
export const createDiamondNoIocLeakEvaluator = (): Evaluator<
  ExtractDiamondExample,
  ExtractDiamondResponse
> => ({
  name: 'DiamondNoIocLeak',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    if (!output) {
      return { score: 0, label: 'missing_output' };
    }
    const leaking = VERTICES.filter((vertex) => leaksIoc(output[vertex]?.summary ?? ''));
    return {
      score: leaking.length === 0 ? 1 : 0,
      label: leaking.length === 0 ? 'clean' : `leak_${leaking.join('_')}`,
    };
  },
});
