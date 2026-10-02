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

/** Returns the smallest period of `value` (its length when it has none), via the KMP failure function. */
const getSmallestPeriod = (value: string): number => {
  const border = new Array<number>(value.length).fill(0);
  for (let i = 1, k = 0; i < value.length; i++) {
    while (k > 0 && value[i] !== value[k]) {
      k = border[k - 1];
    }
    if (value[i] === value[k]) {
      k++;
    }
    border[i] = k;
  }
  return value.length - border[value.length - 1];
};

interface RedactableSecret {
  value: string;
  /** Characters to check to extend a match by one repetition of the value's period. */
  periodTail?: string;
}

/**
 * Appends the span of every occurrence of `value` in `text` to `matches`, overlapping ones
 * included (e.g. `aaaaaaaa` in 15 `a`s), in time linear in the text length.
 */
const collectMatches = (
  text: string,
  { value, periodTail }: RedactableSecret,
  matches: Array<[start: number, end: number]>
): void => {
  for (let i = text.indexOf(value); i !== -1;) {
    const start = i;
    let end = i + value.length;
    // An occurrence one period later overlaps this one, so only its last `period` characters are
    // new: extend by checking just those instead of re-searching the whole value each time.
    if (periodTail) {
      while (text.startsWith(periodTail, end)) {
        end += periodTail.length;
      }
    }
    matches.push([start, end]);
    // Any other overlapping occurrence starts at least half the value's length after the last
    // one (by the Fine–Wilf theorem), so resuming the native search right after it stays linear.
    i = text.indexOf(value, end - value.length + 1);
  }
};

/** Creates a redactor that replaces every plain-text occurrence of a secret value. */
export const createOutputRedactor = (secretValues: Iterable<string>): OutputRedactor => {
  const secrets = [...new Set(secretValues)]
    .filter((value) => value.length >= MIN_REDACTABLE_SECRET_LENGTH)
    .map((value): RedactableSecret => {
      const period = getSmallestPeriod(value);
      return period < value.length ? { value, periodTail: value.slice(-period) } : { value };
    });

  return {
    // Finds every occurrence first and builds the result once, instead of rebuilding the whole
    // text for every secret it contains (tool results can be megabytes, with up to 100 secrets).
    // The search itself stays on native `indexOf`, which is linear-time and outperformed
    // single-pass regex/JS scanners in benchmarks. Overlapping matches are merged, so a secret
    // containing, overlapping or repeating into another occurrence is redacted as a whole.
    redact: (text) => {
      const matches: Array<[start: number, end: number]> = [];
      for (const secret of secrets) {
        collectMatches(text, secret, matches);
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
