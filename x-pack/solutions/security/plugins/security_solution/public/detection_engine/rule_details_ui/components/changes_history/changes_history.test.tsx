/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RuleChangesHistory } from './changes_history';
import { useInfiniteChangeHistory } from '../../../rule_management/api/hooks/use_infinite_change_history';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { TestProviders } from '../../../../common/mock';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';

// IntersectionObserver is used by the rule changes history timeline's scroll-to-load-more sentinel but is absent in jsdom.
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

jest.mock('../../../rule_management/api/hooks/use_infinite_change_history');

const mockUseInfiniteChangeHistory = useInfiniteChangeHistory as jest.Mock;

describe('RuleChangesHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects the first active item of the new rule when ruleId changes', async () => {
    mockUseInfiniteChangeHistory.mockImplementation(({ ruleId }: { ruleId: string }) =>
      mockUseInfiniteQueryResult([
        ruleId === 'rule-1' ? MOCK_RULE_1_HISTORY_ITEM : MOCK_RULE_2_HISTORY_ITEM,
      ])
    );

    const { rerender } = render(
      <TestProviders>
        <RuleChangesHistory ruleId="rule-1" header={<span />} />
      </TestProviders>
    );

    // The timeline auto-selects the first diffable item for rule-1.
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toBeInTheDocument();
    });

    // Navigate to a different rule.
    rerender(
      <TestProviders>
        <RuleChangesHistory ruleId="rule-2" header={<span />} />
      </TestProviders>
    );

    // The timeline auto-selects the first diffable item for rule-2.
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toBeInTheDocument();
    });
  });

  it('advances the selection to a newly recorded change appearing at the top', async () => {
    const createItem = createHistoryItem({
      id: 'create-1',
      action: 'rule_create',
      rule: { name: 'AlphaRule' } as RuleResponse,
    });
    mockUseInfiniteChangeHistory.mockReturnValue(mockUseInfiniteQueryResult([createItem]));

    const { rerender } = render(
      <TestProviders>
        <RuleChangesHistory ruleId="rule-1" header={<span />} />
      </TestProviders>
    );

    // The only item is auto-selected on mount.
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('AlphaRule');
    });

    // A new change is recorded and becomes the newest item.
    const updateItem = createHistoryItem({
      id: 'update-1',
      action: 'rule_update',
      rule: { name: 'BetaRule', revision: 1, rule_source: { type: 'internal' } } as RuleResponse,
      old_values: { name: 'AlphaRule' },
    });
    mockUseInfiniteChangeHistory.mockReturnValue(
      mockUseInfiniteQueryResult([updateItem, createItem])
    );
    rerender(
      <TestProviders>
        <RuleChangesHistory ruleId="rule-1" header={<span />} />
      </TestProviders>
    );

    // The selection advances to the new top item rather than staying on the old one.
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('BetaRule');
    });
  });

  it('preserves a manually selected item when a new change appears', async () => {
    const oldItem = createHistoryItem({
      id: 'create-old',
      action: 'rule_create',
      rule: { name: 'OldRule' } as RuleResponse,
    });
    const newestItem = createHistoryItem({
      id: 'update-newest',
      action: 'rule_update',
      rule: { name: 'NewestRule', revision: 1, rule_source: { type: 'internal' } } as RuleResponse,
      old_values: { name: 'OldRule' },
    });
    mockUseInfiniteChangeHistory.mockReturnValue(mockUseInfiniteQueryResult([newestItem, oldItem]));

    const { rerender } = render(
      <TestProviders>
        <RuleChangesHistory ruleId="rule-1" header={<span />} />
      </TestProviders>
    );

    // The newest item is auto-selected on mount.
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('NewestRule');
    });

    // The user manually selects the older item.
    fireEvent.click(screen.getByTestId(`ruleChangeHistoryItem-${oldItem.id}`));
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('OldRule');
    });

    // A new change is recorded at the top.
    const brandNewItem = createHistoryItem({
      id: 'update-brandnew',
      action: 'rule_update',
      rule: {
        name: 'BrandNewRule',
        revision: 2,
        rule_source: { type: 'internal' },
      } as RuleResponse,
      old_values: { name: 'NewestRule' },
    });
    mockUseInfiniteChangeHistory.mockReturnValue(
      mockUseInfiniteQueryResult([brandNewItem, newestItem, oldItem])
    );
    rerender(
      <TestProviders>
        <RuleChangesHistory ruleId="rule-1" header={<span />} />
      </TestProviders>
    );

    // The manual selection is kept; the diff keeps showing the older item.
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('OldRule');
    });
    expect(screen.getByTestId('ruleChangesHistoryDiff')).not.toHaveTextContent('BrandNewRule');
  });

  it('keeps loading pages until the first active item is found', async () => {
    const fetchNextPage = jest.fn();
    const disableItem = createHistoryItem({ id: 'disable-1', action: 'rule_disable' });
    const enableItem = createHistoryItem({ id: 'enable-1', action: 'rule_enable' });
    mockUseInfiniteChangeHistory.mockReturnValue(
      mockUseInfiniteQueryResult([disableItem, enableItem], { hasNextPage: true, fetchNextPage })
    );

    const { rerender } = render(
      <TestProviders>
        <RuleChangesHistory ruleId="rule-1" header={<span />} />
      </TestProviders>
    );

    // The first page holds non active change history items, so the next page is requested automatically
    // and nothing is selected yet.
    await waitFor(() => {
      expect(fetchNextPage).toHaveBeenCalled();
    });
    expect(screen.getByTestId('ruleChangesHistoryNothingSelected')).toBeInTheDocument();

    // The next page brings an active change history item.
    const createItem = createHistoryItem({
      id: 'create-1',
      action: 'rule_create',
      rule: { name: 'PageTwoRule' } as RuleResponse,
    });
    mockUseInfiniteChangeHistory.mockReturnValue(
      mockUseInfiniteQueryResult([disableItem, enableItem, createItem], { hasNextPage: false })
    );
    rerender(
      <TestProviders>
        <RuleChangesHistory ruleId="rule-1" header={<span />} />
      </TestProviders>
    );

    // The diffable item from the later page gets auto-selected.
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('PageTwoRule');
    });
  });
});

// 'rule_create' is in DIFFABLE_CHANGE_ACTIONS so the timeline auto-selects it on mount.
const MOCK_RULE_1_HISTORY_ITEM: RuleHistoryItem = {
  id: 'item-rule-1',
  timestamp: new Date().toISOString(),
  action: 'rule_create',
  rule: {} as RuleResponse,
  old_values: null,
};

const MOCK_RULE_2_HISTORY_ITEM: RuleHistoryItem = {
  id: 'item-rule-2',
  timestamp: new Date().toISOString(),
  action: 'rule_create',
  rule: {} as RuleResponse,
  old_values: null,
};

function createHistoryItem(
  overrides: Partial<RuleHistoryItem> & Pick<RuleHistoryItem, 'id'>
): RuleHistoryItem {
  return {
    timestamp: new Date().toISOString(),
    action: 'rule_create',
    rule: {} as RuleResponse,
    old_values: null,
    ...overrides,
  };
}

interface MockUseInfiniteQueryResultOptions {
  hasNextPage?: boolean;
  fetchNextPage?: jest.Mock;
}

function mockUseInfiniteQueryResult(
  items: RuleHistoryItem[],
  { hasNextPage = false, fetchNextPage = jest.fn() }: MockUseInfiniteQueryResultOptions = {}
) {
  return {
    data: {
      pages: [
        {
          items,
          page: 1,
          per_page: 20,
          total: hasNextPage ? items.length + 1 : items.length,
          tracking_started_at: new Date().toISOString(),
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    fetchNextPage,
    hasNextPage,
  };
}
