/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getNoReadableShardsWarning,
  hasZeroShards,
  reportMissingAggregations,
} from './no_readable_shards';

const zeroShardsResult = { _shards: { total: 0 } };
const someShardsResult = { _shards: { total: 5 } };

describe('hasZeroShards', () => {
  it('returns true when the search resolved to no shards', () => {
    expect(hasZeroShards(zeroShardsResult)).toBe(true);
  });

  it('returns false when the search resolved to at least one shard', () => {
    expect(hasZeroShards(someShardsResult)).toBe(false);
  });
});

describe('getNoReadableShardsWarning', () => {
  it('names the index patterns and the read privilege without CPS', () => {
    const warning = getNoReadableShardsWarning({ inputIndex: ['logs-a-*', 'logs-b-*'] });

    expect(warning).toContain('index pattern(s) "logs-a-*", "logs-b-*"');
    expect(warning).toContain('"read" index privilege');
  });
});

describe('reportMissingAggregations', () => {
  const inputIndex = ['logs-a-*'];

  it('marks the result as failed with a user error when the search reported shard failures', () => {
    const result = { success: true, warningMessages: [] as string[] };

    reportMissingAggregations({
      searchResult: someShardsResult,
      searchErrors: ['index: "logs-a-000001" type: "security_exception"'],
      searchWarnings: [],
      result,
      inputIndex,
      unexpectedErrorMessage: 'unexpected',
    });

    expect(result).toEqual({ success: false, userError: true, warningMessages: [] });
  });

  it('marks the result as failed without a user error when a shard failure is not a user error', () => {
    const result = { success: true, warningMessages: [] as string[] };

    reportMissingAggregations({
      searchResult: someShardsResult,
      searchErrors: ['index: "logs-a-000001" type: "circuit_breaking_exception"'],
      searchWarnings: [],
      result,
      inputIndex,
      unexpectedErrorMessage: 'unexpected',
    });

    expect(result).toEqual({ success: false, userError: false, warningMessages: [] });
  });

  it('adds a warning and keeps the result successful when the search resolved to no shards', () => {
    const result = { success: true, warningMessages: [] as string[] };

    reportMissingAggregations({
      searchResult: zeroShardsResult,
      searchErrors: [],
      searchWarnings: [],
      result,
      inputIndex,
      unexpectedErrorMessage: 'unexpected',
    });

    expect(result.success).toBe(true);
    expect(result.warningMessages).toEqual([getNoReadableShardsWarning({ inputIndex })]);
  });

  it('does not duplicate the warning when reported twice', () => {
    const result = { success: true, warningMessages: [] as string[] };
    const params = {
      searchResult: zeroShardsResult,
      searchErrors: [],
      searchWarnings: [],
      result,
      inputIndex,
      unexpectedErrorMessage: 'unexpected',
    };

    reportMissingAggregations(params);
    reportMissingAggregations(params);

    expect(result.warningMessages).toHaveLength(1);
  });

  it('keeps the result successful without extra warnings when a cluster was skipped', () => {
    const result = { success: true, warningMessages: [] as string[] };

    reportMissingAggregations({
      searchResult: someShardsResult,
      searchErrors: [],
      searchWarnings: ['Cluster "kayak" is "skipped" and its data is missing from this rule run.'],
      result,
      inputIndex,
      unexpectedErrorMessage: 'unexpected',
    });

    expect(result).toEqual({ success: true, warningMessages: [] });
  });

  it('throws the unexpected error when shards were searched but aggregations are missing', () => {
    const result = { success: true, warningMessages: [] as string[] };

    expect(() =>
      reportMissingAggregations({
        searchResult: someShardsResult,
        searchErrors: [],
        searchWarnings: [],
        result,
        inputIndex,
        unexpectedErrorMessage: 'expected to find aggregations on search result',
      })
    ).toThrow('expected to find aggregations on search result');
  });
});
