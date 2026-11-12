/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hashTreeId } from './hash_tree_id';

describe('hashTreeId', () => {
  it('is stable for the same value', () => {
    expect(hashTreeId('symptom:acme-checkout')).toBe(hashTreeId('symptom:acme-checkout'));
  });

  it('differs between values', () => {
    expect(hashTreeId('symptom:a')).not.toBe(hashTreeId('symptom:b'));
  });

  it('is a SHA-256 hex digest that does not contain the input', () => {
    const hash = hashTreeId('symptom:acme-checkout');

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('acme');
  });
});
