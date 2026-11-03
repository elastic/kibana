/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupUrlPath, looksLikeId, parseGroupingRules, parseIgnoreUrls } from './url_grouping';

describe('looksLikeId', () => {
  it('detects uuids and long numbers', () => {
    expect(looksLikeId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(looksLikeId('12345')).toBe(true);
    expect(looksLikeId('cart')).toBe(false);
  });
});

describe('groupUrlPath', () => {
  it('replaces id segments and truncates at depth', () => {
    expect(groupUrlPath('/user/550e8400-e29b-41d4-a716-446655440000/orders', { depth: 8 })).toBe(
      '/user/:id/orders'
    );
    expect(groupUrlPath('/a/b/c/d/e', { depth: 3 })).toBe('/a/b/c/*');
  });

  it('applies glob rules first', () => {
    expect(groupUrlPath('/user/99/settings', { rules: ['/user/*'] })).toBe('/user/*/settings');
  });
});

describe('parse helpers', () => {
  it('splits ignore URLs and grouping rules', () => {
    expect(parseIgnoreUrls('/health\n/metrics, /ready')).toEqual(['/health', '/metrics', '/ready']);
    expect(parseGroupingRules('/user/*\n\n/order/*')).toEqual(['/user/*', '/order/*']);
  });
});
