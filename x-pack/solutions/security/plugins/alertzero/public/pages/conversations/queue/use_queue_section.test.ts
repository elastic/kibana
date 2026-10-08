/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  useClosedProposals,
  useClosedProposalsCount,
  useProposalsByCategory,
  useProposalsByCategoryCount,
} from '../../../hooks/use_proposals_api';
import { useCategoryQueueSection } from './use_queue_section';

jest.mock('../../../hooks/use_proposals_api');

const mockPages = useProposalsByCategory as jest.Mock;
const mockCount = useProposalsByCategoryCount as jest.Mock;

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: new QueryClient() }, children);

const proposal = {
  id: 'prop-1',
  conversationId: 'inv-1',
  category: 'respond',
  impact: 'high',
  confidence: 'high',
  status: 'pending',
  createdAt: '2024-01-01T00:00:00Z',
  conversationAssignees: [],
};

/** One page already on screen, which is what makes a later failure easy to miss. */
const pagesQuery = (overrides: Record<string, unknown> = {}) => ({
  data: { pages: [{ proposals: [proposal], total: 30 }], pageParams: [undefined] },
  fetchNextPage: jest.fn().mockResolvedValue({}),
  hasNextPage: true,
  isFetchingNextPage: false,
  isInitialLoading: false,
  error: undefined,
  ...overrides,
});

beforeEach(() => {
  (useClosedProposals as jest.Mock).mockReturnValue(pagesQuery());
  (useClosedProposalsCount as jest.Mock).mockReturnValue({ data: undefined, error: undefined });
  mockCount.mockReturnValue({ data: undefined, error: undefined });
});

describe('useCategoryQueueSection load-more failures', () => {
  it('reports a Show more that failed', async () => {
    mockPages.mockReturnValue(
      pagesQuery({ fetchNextPage: jest.fn().mockRejectedValue(new Error('nope')) })
    );

    const { result } = renderHook(() => useCategoryQueueSection('respond'), { wrapper });
    expect(result.current.hasLoadMoreError).toBe(false);

    await act(async () => result.current.loadMore());

    expect(result.current.hasLoadMoreError).toBe(true);
  });

  it('stays quiet when it was a poll that failed, which nobody asked for', () => {
    // React Query keeps the loaded rows and sets `error` when a background
    // refetch fails, which is indistinguishable from a failed next page.
    mockPages.mockReturnValue(pagesQuery({ error: new Error('poll failed') }));

    const { result } = renderHook(() => useCategoryQueueSection('respond'), { wrapper });

    expect(result.current.hasLoadMoreError).toBe(false);
    // The rows are still readable, so this is not the whole-section failure either.
    expect(result.current.hasLoadError).toBe(false);
  });

  it('clears a stale failure once the section is closed', async () => {
    mockPages.mockReturnValue(
      pagesQuery({ fetchNextPage: jest.fn().mockRejectedValue(new Error('nope')) })
    );

    const { result } = renderHook(() => useCategoryQueueSection('respond'), { wrapper });
    await act(async () => result.current.loadMore());
    expect(result.current.hasLoadMoreError).toBe(true);

    act(() => result.current.onToggle(false));

    expect(result.current.hasLoadMoreError).toBe(false);
  });
});
