/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useParams } from 'react-router-dom';
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

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../../rule_management/api/hooks/use_infinite_change_history');

const mockUseParams = useParams as jest.Mock;
const mockUseInfiniteChangeHistory = useInfiniteChangeHistory as jest.Mock;

describe('RuleChangesHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects the first active item of the new rule when ruleId changes', async () => {
    mockUseParams.mockReturnValue({ ruleId: 'rule-1' });
    mockUseInfiniteChangeHistory.mockImplementation(({ ruleId }: { ruleId: string }) =>
      mockUseInfiniteQueryResult([
        ruleId === 'rule-1' ? MOCK_RULE_1_HISTORY_ITEM : MOCK_RULE_2_HISTORY_ITEM,
      ])
    );

    // Passing a header prop ensures memo allows re-render when the useParams mock changes.
    const { rerender } = render(
      <TestProviders>
        <RuleChangesHistory header={<span />} />
      </TestProviders>
    );

    // The timeline auto-selects the first diffable item for rule-1.
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toBeInTheDocument();
    });

    // Navigate to a different rule.
    mockUseParams.mockReturnValue({ ruleId: 'rule-2' });
    rerender(
      <TestProviders>
        <RuleChangesHistory header={<span />} />
      </TestProviders>
    );

    // The timeline auto-selects the first diffable item for rule-2.
    await waitFor(() => {
      expect(screen.getByTestId('ruleChangesHistoryDiff')).toBeInTheDocument();
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

function mockUseInfiniteQueryResult(items: unknown[]) {
  return {
    data: {
      pages: [
        {
          items,
          page: 1,
          perPage: 20,
          total: items.length,
          tracking_started_at: new Date().toISOString(),
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
  };
}
