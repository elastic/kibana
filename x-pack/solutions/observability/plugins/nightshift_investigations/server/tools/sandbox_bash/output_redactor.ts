/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const REDACTED_PLACEHOLDER = '[REDACTED]';

/** Minimum length for a secret value to be redacted from sandbox output. */
export const MIN_REDACTABLE_SECRET_LENGTH = 6;

export interface OutputRedactor {
  redact: (text: string) => string;
}

/** Creates a redactor that replaces every plain-text occurrence of a secret value. */
export const createOutputRedactor = (secretValues: Iterable<string>): OutputRedactor => {
  const values = [...new Set(secretValues)].filter(
    (value) => value.length >= MIN_REDACTABLE_SECRET_LENGTH
  );

  return {
    // Finds every occurrence first and builds the result once, instead of rebuilding the whole
    // text for every secret it contains (tool results can be megabytes, with up to 100 secrets).
    // The search itself stays on native `indexOf`, which is linear-time and outperformed
    // single-pass regex/JS scanners in benchmarks. Overlapping matches are merged, so a secret
    // containing or overlapping another one is redacted as a whole.
    redact: (text) => {
      const matches: Array<[start: number, end: number]> = [];
      for (const value of values) {
        for (let i = text.indexOf(value); i !== -1; i = text.indexOf(value, i + value.length)) {
          matches.push([i, i + value.length]);
        }
      }
      if (matches.length === 0) {
        return text;
      }
      matches.sort(([a], [b]) => a - b);

      let result = '';
      let copiedUpTo = 0;
      let [start, end] = matches[0];
      for (const [nextStart, nextEnd] of matches.slice(1)) {
        if (nextStart < end) {
          end = Math.max(end, nextEnd);
          continue;
        }
        result += text.slice(copiedUpTo, start) + REDACTED_PLACEHOLDER;
        copiedUpTo = end;
        [start, end] = [nextStart, nextEnd];
      }
      return result + text.slice(copiedUpTo, start) + REDACTED_PLACEHOLDER + text.slice(end);
    },
  };
};

/** Returns a copy of `value` with every string inside it redacted. */
export const redactDeep = <T>(value: T, redactor: OutputRedactor): T => {
  if (typeof value === 'string') {
    return redactor.redact(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item, redactor)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactDeep(item, redactor)])
    ) as T;
  }
  return value;
};
