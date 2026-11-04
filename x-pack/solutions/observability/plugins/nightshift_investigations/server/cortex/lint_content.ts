/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cortex pages describe durable structure and behaviour: dependencies, where telemetry lives, query
 * shapes that work or fail, and what to check for a symptom. Anything tied to one occurrence goes
 * stale the moment the incident ends, so it is kept out of page content.
 */
export type CortexLintRule =
  | 'iso_timestamp'
  | 'clock_time'
  | 'uuid'
  | 'long_hex_id'
  | 'relative_time'
  | 'counted_quantity';

export interface CortexLintViolation {
  rule: CortexLintRule;
  /** The offending text, trimmed for display. */
  match: string;
}

const RULES: ReadonlyArray<{ rule: CortexLintRule; pattern: RegExp }> = [
  {
    rule: 'iso_timestamp',
    pattern: /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?)?\b/g,
  },
  { rule: 'clock_time', pattern: /\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:UTC|GMT|Z)\b/gi },
  {
    rule: 'uuid',
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  },
  // Long runs of hex are run, trace, pod-hash or document ids, never reusable knowledge.
  { rule: 'long_hex_id', pattern: /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{16,}\b/gi },
  {
    rule: 'relative_time',
    pattern:
      /\b(?:today|yesterday|tonight|currently|recently|right now|at the moment|last (?:week|month|night|hour)|this (?:morning|afternoon|week|month))\b/gi,
  },
  // A count of things seen in one run ("5,944 errors", "23 restarts"), not a configured limit.
  {
    rule: 'counted_quantity',
    pattern:
      /\b\d[\d,]*\s?(?:errors?|requests?|restarts?|events?|pods?|nodes?|hits|documents|failures|retries|connections)\b/gi,
  },
];

const MAX_MATCH_LENGTH = 60;

/** Returns every place the text carries a single-occurrence detail; an empty list means it is clean. */
export const lintCortexContent = (text: string): CortexLintViolation[] => {
  const violations: CortexLintViolation[] = [];
  for (const { rule, pattern } of RULES) {
    for (const found of text.matchAll(pattern)) {
      violations.push({ rule, match: found[0].trim().slice(0, MAX_MATCH_LENGTH) });
    }
  }
  return violations;
};
