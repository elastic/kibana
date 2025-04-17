/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQueryRulesSetsTableData } from './use_query_rules_sets_table_data';

const queryRulesSets = [
  {
    ruleset_id: 'ruleset-01',
    rule_total_count: 1,
    rule_criteria_types_counts: { exact: 1, fuzzy: 0 },
    rule_type_counts: { pinned: 2, excluded: 1 },
  },
  {
    ruleset_id: 'ruleset-02',
    rule_total_count: 2,
    rule_criteria_types_counts: { exact: 1, fuzzy: 1 },
    rule_type_counts: { pinned: 2, excluded: 1 },
  },
  {
    ruleset_id: 'ruleset-03',
    rule_total_count: 3,
    rule_criteria_types_counts: { exact: 1, fuzzy: 2 },
    rule_type_counts: { pinned: 2, excluded: 1 },
  },
];

describe('useQueryRulesSetsTableData', () => {
  it('should return correct pagination', () => {
    // Given a specific pageIndex and pageSize
    const pageIndex = 1;
    const pageSize = 3;

    // When the hook is called
    const { result } = renderHook(() =>
      useQueryRulesSetsTableData(queryRulesSets, '', pageIndex, pageSize)
    );

    // Then the pagination object should reflect the input params and data length
    expect(result.current.pagination).toEqual({
      pageIndex,
      pageSize,
      totalItemCount: queryRulesSets.length,
      pageSizeOptions: [10, 25, 50],
    });
  });

  it('should filter data based on searchKey', () => {
    // Given a search term that matches one ruleset
    const searchKey = 'ruleset-02';

    // When the hook is called with that search term
    const { result } = renderHook(() =>
      useQueryRulesSetsTableData(queryRulesSets, searchKey, 0, 10)
    );

    // Then only the matching ruleset should be returned
    expect(result.current.queryRulesSetsFilteredData).toHaveLength(1);
    expect(result.current.queryRulesSetsFilteredData[0].ruleset_id).toBe('ruleset-02');

    // And the pagination should reflect the filtered count
    expect(result.current.pagination.totalItemCount).toBe(1);
  });

  it('should return all data when searchKey is empty', () => {
    // Given an empty search term
    const searchKey = '';

    // When the hook is called
    const { result } = renderHook(() =>
      useQueryRulesSetsTableData(queryRulesSets, searchKey, 0, 10)
    );

    // Then all rulesets should be returned
    expect(result.current.queryRulesSetsFilteredData).toEqual(queryRulesSets);
    expect(result.current.queryRulesSetsFilteredData).toHaveLength(queryRulesSets.length);

    // And the pagination should reflect the total count
    expect(result.current.pagination.totalItemCount).toBe(queryRulesSets.length);
  });

  it('should handle pagination correctly', () => {
    // Given specific pagination parameters
    const pageIndex = 2;
    const pageSize = 5;

    // When the hook is called
    const { result } = renderHook(() =>
      useQueryRulesSetsTableData(queryRulesSets, '', pageIndex, pageSize)
    );

    // Then the filtered data should contain all items
    expect(result.current.queryRulesSetsFilteredData).toEqual(queryRulesSets);

    // And the pagination should correctly reflect the input parameters
    expect(result.current.pagination).toEqual({
      pageIndex,
      pageSize,
      totalItemCount: queryRulesSets.length,
      pageSizeOptions: [10, 25, 50],
    });
  });
});
