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

  it('passes all IDs through regardless of count', () => {
    const ids = Array.from({ length: 600 }, (_, i) => `host:web${i}`);
    expect(toTermsFilter(ids)).toEqual({ terms: { 'entity.id': ids } });
  });

  it('preserves order of IDs', () => {
    const ids = ['entity:2', 'entity:0', 'entity:1'];
    expect(toTermsFilter(ids)).toEqual({ terms: { 'entity.id': ids } });
  });
});
