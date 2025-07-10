/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen } from '@testing-library/react';
import { QueryRulesSets } from './query_rules_sets';

jest.mock('../../hooks/use_fetch_query_rules_sets', () => ({
  useFetchQueryRulesSets: () => ({
    data: {
      data: [
        {
          ruleset_id: 'Query Rule Set 1',
          rule_total_count: 2,
        },
        {
          ruleset_id: 'Query Rule Set 2',
          rule_total_count: 3,
        },
      ],
      _meta: { pageIndex: 0, pageSize: 10, totalItemCount: 2 },
    },
    isLoading: false,
    isError: false,
  }),
}));

describe('Search Query Rules Sets list', () => {
  it('should render the list with query rule sets', () => {
    render(<QueryRulesSets />);
    const queryRulesSetTable = screen.getByTestId('queryRulesSetTable');
    expect(queryRulesSetTable).toBeInTheDocument();

    const queryRulesSetItemNames = screen.getAllByTestId('queryRuleSetName');
    expect(queryRulesSetItemNames).toHaveLength(2);
    expect(queryRulesSetItemNames[0].textContent).toBe('Query Rule Set 1');
    expect(queryRulesSetItemNames[1].textContent).toBe('Query Rule Set 2');

    const queryRulesSetItemRuleCounts = screen.getAllByTestId('queryRuleSetItemRuleCount');
    expect(queryRulesSetItemRuleCounts).toHaveLength(2);
    expect(queryRulesSetItemRuleCounts[0].textContent).toBe('2');
    expect(queryRulesSetItemRuleCounts[1].textContent).toBe('3');

    const queryRulesSetItemPageSize = screen.getByTestId('tablePaginationPopoverButton');
    const queryRulesSetPageButton = screen.getByTestId('pagination-button-0');
    expect(queryRulesSetItemPageSize).toBeInTheDocument();
    expect(queryRulesSetPageButton).toBeInTheDocument();
  });
});
