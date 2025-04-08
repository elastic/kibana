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
    description: 'First ruleset',
    rule_total_count: 10,
    rule_criteria_types_counts: { typeA: 5, typeB: 5 },
    rule_type_counts: { type1: 6, type2: 4 },
  },
  {
    ruleset_id: 'ruleset-02',
    description: 'Second ruleset',
    rule_total_count: 8,
    rule_criteria_types_counts: { typeA: 4, typeB: 4 },
    rule_type_counts: { type1: 5, type2: 3 },
  },
  {
    ruleset_id: 'ruleset-03',
    description: 'Third ruleset',
    rule_total_count: 12,
    rule_criteria_types_counts: { typeA: 6, typeB: 6 },
    rule_type_counts: { type1: 7, type2: 5 },
  },
];

describe('useQueryRulesSetsTableData', () => {
  it('should return correct pagination', () => {
    const { result } = renderHook(() => useQueryRulesSetsTableData(queryRulesSets, '', 0, 2));

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: 2,
      totalItemCount: 3,
      pageSizeOptions: [10, 25, 50],
    });
  });

  it('should filter data based on searchKey', () => {
    const searchKey = 'ruleset-02';
    const { result } = renderHook(() =>
      useQueryRulesSetsTableData(queryRulesSets, searchKey, 0, 10)
    );

    expect(result.current.queryRulesSetsFilteredData).toEqual([
      { ruleset_id: 'ruleset-02', description: 'Second ruleset' },
    ]);
  });

  it('should return all data when searchKey is empty', () => {
    const { result } = renderHook(() => useQueryRulesSetsTableData(queryRulesSets, '', 0, 10));

    expect(result.current.queryRulesSetsFilteredData).toEqual(queryRulesSets);
  });
});
