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
import type { ProposalsPageResponse } from '../../../../common/proposals/list';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { queryKeys } from '../../../query_keys';
import { useProposalsByCategory } from '../../../hooks/use_proposals_api';
import { useDropDecidedProposal } from './use_drop_decided_proposal';

jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const row = (id: string) => ({ id } as ProposalsPageResponse['proposals'][number]);

const pagesOf = (...ids: string[]): InfiniteData<ProposalsPageResponse> => ({
  pages: [{ proposals: ids.map(row), total: ids.length }],
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

const rowsIn = (queryClient: QueryClient, category: string) =>
  queryClient
    .getQueryData<InfiniteData<ProposalsPageResponse>>(queryKeys.proposals.byCategory(category))
    ?.pages.flatMap(({ proposals }) => proposals.map(({ id }) => id));

const countIn = (queryClient: QueryClient, category: string) =>
  queryClient.getQueryData<ProposalsPageResponse>(queryKeys.proposals.byCategoryCount(category))
    ?.total;

describe('useDropDecidedProposal', () => {
  it('takes the decided row out of the queue it was in', async () => {
    const { queryClient, drop } = setup();
    queryClient.setQueryData(queryKeys.proposals.byCategory('respond'), pagesOf('a', 'b', 'c'));
    queryClient.setQueryData(queryKeys.proposals.byCategoryCount('respond'), {
      proposals: [],
      total: 12,
    });

    await act(() => drop('b'));

    expect(rowsIn(queryClient, 'respond')).toEqual(['a', 'c']);
    expect(countIn(queryClient, 'respond')).toBe(11);
  });

  it('leaves the buckets it was not in alone', async () => {
    const { queryClient, drop } = setup();
    queryClient.setQueryData(queryKeys.proposals.byCategory('respond'), pagesOf('a'));
    queryClient.setQueryData(queryKeys.proposals.byCategory('investigate'), pagesOf('b'));
    queryClient.setQueryData(queryKeys.proposals.byCategoryCount('investigate'), {
      proposals: [],
      total: 7,
    });

    await act(() => drop('a'));

    expect(rowsIn(queryClient, 'investigate')).toEqual(['b']);
    expect(countIn(queryClient, 'investigate')).toBe(7);
  });

  it('survives the refetch the decision itself kicked off', async () => {
    // Mounts the real query on purpose: an invalidation with no observer never
    // refetches, and would pass whether or not the refetch is cancelled.
    const http = {
      get: jest.fn().mockResolvedValue({ proposals: [row('a'), row('b')], total: 2 }),
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
        query: useProposalsByCategory('respond', {
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

    expect(rowsIn(queryClient, 'respond')).toEqual(['a']);
  });

  it('cancels only its own bucket, since the decision refreshes the others too', async () => {
    // Cancelling the whole proposals root aborted Closed, the other counts and the
    // header along with the bucket being dropped from, so none of them updated until
    // the next poll.
    const { queryClient, drop } = setup();
    queryClient.setQueryData(queryKeys.proposals.byCategory('respond'), pagesOf('a', 'b'));
    const cancelQueries = jest.spyOn(queryClient, 'cancelQueries');

    await act(() => drop('b'));

    // Annotated: `cancelQueries` is overloaded, and the spy resolves to the
    // bare-`QueryKey` signature rather than the filters object we pass.
    const calls = cancelQueries.mock.calls as Array<[QueryFilters | undefined]>;

    expect(calls.map(([filters]) => filters?.queryKey)).toEqual([
      queryKeys.proposals.byCategory('respond'),
      queryKeys.proposals.byCategoryCount('respond'),
    ]);
  });
});
