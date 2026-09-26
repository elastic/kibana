/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toTermsFilter } from './entity_analytics_new_home_page';

describe('toTermsFilter', () => {
  it('returns null for an empty array', () => {
    expect(toTermsFilter([])).toBeNull();
  });

  it('returns a terms filter for a non-empty array', () => {
    const result = toTermsFilter(['host:web01', 'user:alice@okta']);
    expect(result).toEqual({ terms: { 'entity.id': ['host:web01', 'user:alice@okta'] } });
  });

  it('passes through arrays with 500 or fewer IDs unchanged', () => {
    const ids = Array.from({ length: 500 }, (_, i) => `host:web${i}`);
    const result = toTermsFilter(ids);
    expect((result as { terms: { 'entity.id': string[] } }).terms['entity.id']).toHaveLength(500);
  });

  it('caps at 500 IDs when more than 500 are provided', () => {
    const ids = Array.from({ length: 600 }, (_, i) => `host:web${i}`);
    const result = toTermsFilter(ids);
    const capped = (result as { terms: { 'entity.id': string[] } }).terms['entity.id'];
    expect(capped).toHaveLength(500);
    expect(capped[0]).toBe('host:web0');
    expect(capped[499]).toBe('host:web499');
  });

  it('preserves order when capping — first 500 are kept, not sampled', () => {
    const ids = Array.from({ length: 501 }, (_, i) => `entity:${i}`);
    const result = toTermsFilter(ids);
    const kept = (result as { terms: { 'entity.id': string[] } }).terms['entity.id'];
    expect(kept).not.toContain('entity:500');
    expect(kept).toContain('entity:499');
  });
});
