/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { InfiniteData, QueryFilters } from '@kbn/react-query';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { InvestigationsPageResponse } from '../../../../common/investigations/queue';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { queryKeys } from '../../../query_keys';
import { useOpenInvestigationsByCategory } from '../../../hooks/use_investigation_queue_api';
import { useDropDecidedProposal } from './use_drop_decided_proposal';

jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const row = (id: string, pendingProposalCount = 1) =>
  ({
    id: `conv-${id}`,
    leadProposal: { id },
    pendingProposalCount,
  } as InvestigationsPageResponse['investigations'][number]);

const pagesOf = (...ids: string[]): InfiniteData<InvestigationsPageResponse> => ({
  pages: [{ investigations: ids.map((id) => row(id)), total: ids.length }],
  pageParams: [undefined],
});

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => null, warn: () => null, error: () => null },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  const { result } = renderHook(() => useDropDecidedProposal(), { wrapper: Wrapper });
  return { queryClient, drop: result.current };
};

const itemsIn = (queryClient: QueryClient, category: string) =>
  queryClient
    .getQueryData<InfiniteData<InvestigationsPageResponse>>(
      queryKeys.proposals.byCategory(category)
    )
    ?.pages.flatMap(({ investigations }) => investigations);

const leadIdsIn = (queryClient: QueryClient, category: string) =>
  itemsIn(queryClient, category)?.map(({ leadProposal }) => leadProposal?.id);

describe('useDropDecidedProposal', () => {
  it('keeps the investigation in its queue but stops offering the decided proposal', async () => {
    const { queryClient, drop } = setup();
    queryClient.setQueryData(queryKeys.proposals.byCategory('respond'), pagesOf('a', 'b', 'c'));

    await act(() => drop('b'));

    expect(itemsIn(queryClient, 'respond')?.map(({ id }) => id)).toEqual([
      'conv-a',
      'conv-b',
      'conv-c',
    ]);
    expect(leadIdsIn(queryClient, 'respond')).toEqual(['a', undefined, 'c']);
    expect(itemsIn(queryClient, 'respond')?.[1].pendingProposalCount).toBe(0);
  });

  it('counts the other pending proposals down by one', async () => {
    const { queryClient, drop } = setup();
    queryClient.setQueryData(queryKeys.proposals.byCategory('respond'), {
      pages: [{ investigations: [row('a'), row('b', 3)], total: 2 }],
      pageParams: [undefined],
    });

    await act(() => drop('b'));

    expect(itemsIn(queryClient, 'respond')?.[1].pendingProposalCount).toBe(2);
  });

  it('leaves the totals alone, since no investigation leaves a queue', async () => {
    const { queryClient, drop } = setup();
    queryClient.setQueryData(queryKeys.proposals.byCategory('respond'), pagesOf('a', 'b'));
    queryClient.setQueryData(queryKeys.proposals.byCategoryCount('respond'), {
      investigations: [],
      total: 12,
    });

    await act(() => drop('b'));

    expect(
      queryClient.getQueryData<InvestigationsPageResponse>(
        queryKeys.proposals.byCategoryCount('respond')
      )?.total
    ).toBe(12);
    expect(
      queryClient.getQueryData<InfiniteData<InvestigationsPageResponse>>(
        queryKeys.proposals.byCategory('respond')
      )?.pages[0].total
    ).toBe(2);
  });

  it('leaves the buckets it was not in alone', async () => {
    const { queryClient, drop } = setup();
    queryClient.setQueryData(queryKeys.proposals.byCategory('respond'), pagesOf('a'));
    queryClient.setQueryData(queryKeys.proposals.byCategory('investigate'), pagesOf('b'));

    await act(() => drop('a'));

    expect(leadIdsIn(queryClient, 'investigate')).toEqual(['b']);
  });

  it('survives the refetch the decision itself kicked off', async () => {
    // Mounts the real query on purpose: an invalidation with no observer never
    // refetches, and would pass whether or not the refetch is cancelled.
    const http = {
      get: jest.fn().mockResolvedValue({ investigations: [row('a'), row('b')], total: 2 }),
    };
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => null, warn: () => null, error: () => null },
    });
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(
      () => ({
        query: useOpenInvestigationsByCategory('respond', {
          firstPageSize: 10,
          step: 10,
          enabled: true,
        }),
        drop: useDropDecidedProposal(),
      }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      void queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
      await result.current.drop('b');
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(leadIdsIn(queryClient, 'respond')).toEqual(['a', undefined]);
  });

  it('cancels only its own bucket, since the decision refreshes the others too', async () => {
    // Cancelling the whole proposals root aborted Closed, the counts and the header
    // along with the bucket being settled, so none of them updated until the next poll.
    const { queryClient, drop } = setup();
    queryClient.setQueryData(queryKeys.proposals.byCategory('respond'), pagesOf('a', 'b'));
    const cancelQueries = jest.spyOn(queryClient, 'cancelQueries');

    await act(() => drop('b'));

    // Annotated: `cancelQueries` is overloaded, and the spy resolves to the
    // bare-`QueryKey` signature rather than the filters object we pass.
    const calls = cancelQueries.mock.calls as Array<[QueryFilters | undefined]>;

    expect(calls.map(([filters]) => filters?.queryKey)).toEqual([
      queryKeys.proposals.byCategory('respond'),
    ]);
  });
});
