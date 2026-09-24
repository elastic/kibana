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
  // Longest first, so a secret containing another one is redacted as a whole.
  const values = [...new Set(secretValues)]
    .filter((value) => value.length >= MIN_REDACTABLE_SECRET_LENGTH)
    .sort((a, b) => b.length - a.length);

  return {
    redact: (text) =>
      values.reduce((acc, value) => acc.split(value).join(REDACTED_PLACEHOLDER), text),
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
