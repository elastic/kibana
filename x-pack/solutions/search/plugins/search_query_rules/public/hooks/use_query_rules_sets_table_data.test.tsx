/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQueryRulesSetsTableData } from './use_query_rules_sets_table_data';
import { QueryRulesListRulesetsQueryRulesetListItem } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_PAGE_VALUE, Paginate } from '../../common/pagination';

const generateMockRulesetData = (
  totalCount: number
): Paginate<QueryRulesListRulesetsQueryRulesetListItem> => {
  const mockMeta = {
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_VALUE.size,
    totalItemCount: totalCount,
  };

  const emptyArray = new Array(totalCount);
  const mockData = emptyArray.fill(0).map((_, index) => {
    return {
      ruleset_id: `ruleset-${String(index + 1)}`,
      rule_total_count: index + 1,
      rule_criteria_types_counts: {
        exact: Math.floor(Math.random() * 3),
        fuzzy: Math.floor(Math.random() * 3),
      },
      rule_type_counts: {
        pinned: Math.floor(Math.random() * 3),
        excluded: Math.floor(Math.random() * 3),
      },
    };
  });

  return {
    _meta: mockMeta,
    data: mockData,
  };
};

describe('useQueryRulesSetsTableData', () => {
  it('should return correct pagination', () => {
    // Given a specific pageIndex and pageSize
    const pageIndex = 1;
    const pageSize = 3;
    const queryRulesSets = generateMockRulesetData(60);

    // When the hook is called
    const { result } = renderHook(() =>
      useQueryRulesSetsTableData(queryRulesSets, '', pageIndex, pageSize)
    );

    // Then the pagination object should reflect the input params and data length
    expect(result.current.pagination).toEqual({
      pageIndex,
      pageSize,
      totalItemCount: queryRulesSets._meta.totalItemCount,
      pageSizeOptions: [10, 25, 50],
    });
  });

  it('should filter data based on searchKey', () => {
    const queryRulesSets = generateMockRulesetData(5);
    // Given a search term that matches one ruleset
    const searchKey = 'ruleset-2';

    // When the hook is called with that search term
    const { result } = renderHook(() =>
      useQueryRulesSetsTableData(queryRulesSets, searchKey, 0, 10)
    );

    // Then only the matching ruleset should be returned
    expect(result.current.queryRulesSetsFilteredData).toHaveLength(1);
    expect(result.current.queryRulesSetsFilteredData[0].ruleset_id).toBe(searchKey);
  });

  it('should return all data when searchKey is empty', () => {
    const queryRulesSets = generateMockRulesetData(5);
    // Given an empty search term
    const searchKey = '';

    // When the hook is called
    const { result } = renderHook(() =>
      useQueryRulesSetsTableData(queryRulesSets, searchKey, 0, 10)
    );

    // Then all rulesets should be returned
    expect(result.current.queryRulesSetsFilteredData).toEqual(queryRulesSets.data);
    expect(result.current.queryRulesSetsFilteredData).toHaveLength(
      queryRulesSets._meta.totalItemCount
    );

    // And the pagination should reflect the total count
    expect(result.current.pagination.totalItemCount).toBe(queryRulesSets._meta.totalItemCount);
  });

  it('should handle pagination correctly', () => {
    // Given specific pagination parameters
    const pageIndex = 2;
    const pageSize = 5;
    const queryRulesSets = generateMockRulesetData(20);

    // When the hook is called
    const { result } = renderHook(() =>
      useQueryRulesSetsTableData(queryRulesSets, '', pageIndex, pageSize)
    );

    // Then the filtered data should contain all items
    expect(result.current.queryRulesSetsFilteredData).toEqual(queryRulesSets.data);

    // And the pagination should correctly reflect the input parameters
    expect(result.current.pagination).toEqual({
      pageIndex,
      pageSize,
      totalItemCount: queryRulesSets._meta.totalItemCount,
      pageSizeOptions: [10, 25, 50],
    });
  });
});
