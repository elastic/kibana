/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toReadableHash } from './readable_hash';

describe('toReadableHash', () => {
  it('is stable for the same value', () => {
    expect(toReadableHash('symptom:acme-checkout')).toBe(toReadableHash('symptom:acme-checkout'));
  });

  it('differs between values', () => {
    expect(toReadableHash('symptom:a')).not.toBe(toReadableHash('symptom:b'));
  });

  it('is a four-word phrase that does not contain the input', () => {
    const hash = toReadableHash('symptom:acme-checkout');

    expect(hash).toMatch(/^[a-z]+(-[a-z]+){3}$/);
    expect(hash).not.toContain('acme');
  });
});
