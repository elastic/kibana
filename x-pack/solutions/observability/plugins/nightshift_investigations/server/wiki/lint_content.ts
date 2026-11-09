/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wiki pages describe durable structure and behaviour: dependencies, where telemetry lives, query
 * shapes that work or fail, and what to check for a symptom. Anything tied to one occurrence goes
 * stale the moment the incident ends, so it is kept out of page content.
 */
export type WikiLintRule =
  | 'iso_timestamp'
  | 'clock_time'
  | 'uuid'
  | 'long_hex_id'
  | 'relative_time'
  | 'counted_quantity'
  | 'replica_count';

export interface WikiLintViolation {
  rule: WikiLintRule;
  /**
   * A blocking violation describes one occurrence and keeps the edit out. A non-blocking one can go
   * stale when the system changes, but it is still knowledge about the system, so it is only reported.
   */
  blocking: boolean;
  /** The offending text, trimmed for display. */
  match: string;
}

// HTTP status codes name a symptom ("403 errors on registration"), they do not count errors.
const HTTP_ERROR_STATUS = '(?:400|401|403|404|405|408|409|413|422|429|500|502|503|504)';

const RULES: ReadonlyArray<{ rule: WikiLintRule; blocking: boolean; pattern: RegExp }> = [
  {
    rule: 'iso_timestamp',
    blocking: true,
    pattern: /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?)?\b/g,
  },
  { rule: 'clock_time', blocking: true, pattern: /\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:UTC|GMT|Z)\b/gi },
  {
    rule: 'uuid',
    blocking: true,
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  },
  // Long runs of hex are run, trace, pod-hash or document ids, never reusable knowledge.
  {
    rule: 'long_hex_id',
    blocking: true,
    pattern: /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{16,}\b/gi,
  },
  // "currently" and "last hour" also appear in durable guidance and quoted error text ("check the
  // last hour before onset"), and a regex cannot tell them apart, so this is reported, not blocking.
  {
    rule: 'relative_time',
    blocking: false,
    pattern:
      /\b(?:today|yesterday|tonight|currently|recently|right now|at the moment|last (?:week|month|night|hour)|this (?:morning|afternoon|week|month))\b/gi,
  },
  // A count of things seen in one run ("5,944 errors") looks the same as a configured limit ("gives
  // up after 3 retries", "1000 documents per batch"), so it is reported, not blocking.
  {
    rule: 'counted_quantity',
    blocking: false,
    pattern: new RegExp(
      `\\b(?!${HTTP_ERROR_STATUS}\\s?errors?\\b)\\d[\\d,]*\\s?(?:errors?|requests?|restarts?|events?|hits|documents|failures|retries)\\b`,
      'gi'
    ),
  },
  // How many instances a service runs is a fact about the system, but it changes when it is rescaled.
  {
    rule: 'replica_count',
    blocking: false,
    pattern: /\b\d[\d,]*\s?(?:pods?|nodes?|replicas?|instances?|connections)\b/gi,
  },
];

const MAX_MATCH_LENGTH = 60;

/** Returns every place the text carries a single-occurrence detail; an empty list means it is clean. */
export const lintWikiContent = (text: string): WikiLintViolation[] => {
  const violations: WikiLintViolation[] = [];
  for (const { rule, blocking, pattern } of RULES) {
    for (const found of text.matchAll(pattern)) {
      violations.push({ rule, blocking, match: found[0].trim().slice(0, MAX_MATCH_LENGTH) });
    }
  }
  return violations;
};
