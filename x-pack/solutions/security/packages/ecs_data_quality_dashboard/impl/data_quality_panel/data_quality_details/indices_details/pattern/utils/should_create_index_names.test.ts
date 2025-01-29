/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockIlmExplain } from '../../../../mock/ilm_explain/mock_ilm_explain';
import { shouldCreateIndexNames } from './should_create_index_names';
import { mockStats } from '../../../../mock/stats/mock_stats';

describe('shouldCreateIndexNames', () => {
  const indexNames = [
    '.ds-packetbeat-8.6.1-2023.02.04-000001',
    '.ds-packetbeat-8.5.3-2023.02.04-000001',
    'auditbeat-custom-index-1',
  ];
  const isILMAvailable = true;

  test('returns true when `indexNames` does NOT exist, and the required `stats` and `ilmExplain` are available', () => {
    expect(
      shouldCreateIndexNames({
        ilmExplain: mockIlmExplain,
        indexNames: undefined,
        isILMAvailable,
        newIndexNames: [],
        stats: mockStats,
      })
    ).toBe(true);
  });

  test('returns true when `isILMAvailable` is false, and the required `stats` is available,  and `ilmExplain` is not available', () => {
    expect(
      shouldCreateIndexNames({
        ilmExplain: null,
        indexNames: undefined,
        isILMAvailable: false,
        newIndexNames: [],
        stats: mockStats,
      })
    ).toBe(true);
  });

  test('returns false when `indexNames` exists, and the required `stats` and `ilmExplain` are available', () => {
    expect(
      shouldCreateIndexNames({
        ilmExplain: mockIlmExplain,
        indexNames,
        isILMAvailable,
        newIndexNames: indexNames,
        stats: mockStats,
      })
    ).toBe(false);
  });

  test('returns false when `indexNames` does NOT exist, `stats` is NOT available, and `ilmExplain` is available', () => {
    expect(
      shouldCreateIndexNames({
        ilmExplain: mockIlmExplain,
        indexNames: undefined,
        isILMAvailable,
        newIndexNames: [],
        stats: null,
      })
    ).toBe(false);
  });

  test('returns false when `indexNames` does NOT exist, `stats` is available, and `ilmExplain` is NOT available', () => {
    expect(
      shouldCreateIndexNames({
        ilmExplain: null,
        indexNames: undefined,
        isILMAvailable,
        newIndexNames: [],
        stats: mockStats,
      })
    ).toBe(false);
  });

  test('returns false when `indexNames` does NOT exist, `stats` is NOT available, and `ilmExplain` is NOT available', () => {
    expect(
      shouldCreateIndexNames({
        ilmExplain: null,
        indexNames: undefined,
        isILMAvailable,
        newIndexNames: [],
        stats: null,
      })
    ).toBe(false);
  });

  test('returns false when `indexNames` exists, `stats` is NOT available, and `ilmExplain` is NOT available', () => {
    expect(
      shouldCreateIndexNames({
        ilmExplain: null,
        indexNames,
        isILMAvailable,
        newIndexNames: [],
        stats: null,
      })
    ).toBe(false);
  });
});
