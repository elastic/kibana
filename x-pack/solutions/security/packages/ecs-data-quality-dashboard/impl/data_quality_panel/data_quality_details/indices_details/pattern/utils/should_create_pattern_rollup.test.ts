/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockStats } from '../../../../mock/stats/mock_stats';
import { shouldCreatePatternRollup } from './should_create_pattern_rollup';
import { mockIlmExplain } from '../../../../mock/ilm_explain/mock_ilm_explain';
import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { getIndexNames, getPatternDocsCount } from './stats';

describe('shouldCreatePatternRollup', () => {
  const isILMAvailable = true;
  const newIndexNames = getIndexNames({
    stats: mockStats,
    ilmExplain: mockIlmExplain,
    ilmPhases: ['hot', 'unmanaged'],
    isILMAvailable,
  });
  const newDocsCount = getPatternDocsCount({ indexNames: newIndexNames, stats: mockStats });
  test('it returns false when the `patternRollup.docsCount` equals newDocsCount', () => {
    expect(
      shouldCreatePatternRollup({
        error: null,
        ilmExplain: mockIlmExplain,
        isILMAvailable,
        newDocsCount: auditbeatWithAllResults.docsCount as number,
        patternRollup: auditbeatWithAllResults,
        stats: mockStats,
      })
    ).toBe(false);
  });

  test('it returns true when all data and ILMExplain were loaded', () => {
    expect(
      shouldCreatePatternRollup({
        error: null,
        ilmExplain: mockIlmExplain,
        isILMAvailable,
        newDocsCount,
        patternRollup: undefined,
        stats: mockStats,
      })
    ).toBe(true);
  });

  test('it returns true when all data was loaded and ILM is not available', () => {
    expect(
      shouldCreatePatternRollup({
        error: null,
        ilmExplain: null,
        isILMAvailable: false,
        newDocsCount,
        patternRollup: undefined,
        stats: mockStats,
      })
    ).toBe(true);
  });

  test('it returns false when `stats`, but NOT `ilmExplain` was loaded', () => {
    expect(
      shouldCreatePatternRollup({
        error: null,
        ilmExplain: null,
        isILMAvailable,
        newDocsCount,
        patternRollup: undefined,
        stats: mockStats,
      })
    ).toBe(false);
  });

  test('it returns false when `stats` was NOT loaded, and `ilmExplain` was loaded', () => {
    expect(
      shouldCreatePatternRollup({
        error: null,
        ilmExplain: mockIlmExplain,
        isILMAvailable,
        newDocsCount,
        patternRollup: undefined,
        stats: null,
      })
    ).toBe(false);
  });

  test('it returns true if an error occurred, and NO data was loaded', () => {
    expect(
      shouldCreatePatternRollup({
        error: 'whoops',
        ilmExplain: null,
        isILMAvailable,
        newDocsCount,
        patternRollup: undefined,
        stats: null,
      })
    ).toBe(true);
  });

  test('it returns true if an error occurred, and just `stats` was loaded', () => {
    expect(
      shouldCreatePatternRollup({
        error: 'something went',
        ilmExplain: null,
        isILMAvailable,
        newDocsCount,
        patternRollup: undefined,
        stats: mockStats,
      })
    ).toBe(true);
  });

  test('it returns true if an error occurred, and just `ilmExplain` was loaded', () => {
    expect(
      shouldCreatePatternRollup({
        error: 'horribly wrong',
        ilmExplain: mockIlmExplain,
        isILMAvailable,
        newDocsCount,
        patternRollup: undefined,
        stats: null,
      })
    ).toBe(true);
  });

  test('it returns true if an error occurred, and all data was loaded', () => {
    expect(
      shouldCreatePatternRollup({
        error: 'over here',
        ilmExplain: mockIlmExplain,
        isILMAvailable,
        newDocsCount,
        patternRollup: undefined,
        stats: mockStats,
      })
    ).toBe(true);
  });
});
