/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery, useQuery, useQueryClient } from '@kbn/react-query';
import { useMemo } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import type { MemoryFilter, MemoryListResult } from './types';

const memoryKeys = {
  availability: ['nightshift', 'memory', 'availability'] as const,
  pages: (filter: MemoryFilter) =>
    ['nightshift', 'memory', 'pages', filter] as unknown as readonly [
      'nightshift',
      'memory',
      'pages',
      MemoryFilter
    ],
  page: (id: string) => ['nightshift', 'memory', 'page', id] as const,
};

/**
 * Typed client for the Semantic Memory routes, or undefined when the
 * nightshift_investigations plugin is not installed. Every query below stays
 * disabled in that case, matching the Cortex and decision-tree hooks.
 */
const useMemoryClient = () => {
  const {
    dependencies: {
      start: { nightshiftInvestigations },
    },
  } = useKibana();

  return nightshiftInvestigations?.investigationsClient;
};

/**
 * Reports whether `xpack.nightshift_investigations.memory.enabled` is on. The
 * flag defaults to false, so a failed request means "off" and the tab is hidden
 * rather than shown empty.
 */
export const useMemoryEnabled = (): boolean => {
  const client = useMemoryClient();

  const { data } = useQuery({
    queryKey: memoryKeys.availability,
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/memory/availability', { signal: signal ?? null }),
    enabled: client !== undefined,
    retry: false,
  });

  return data?.enabled ?? false;
};

/** How many rows the sidebar asks for per request. */
export const MEMORY_PAGE_SIZE = 25;

/**
 * Cursor-paginated memory list.
 *
 * The server returns an opaque `search_after` token, so paging is stable even
 * while the optimizer is writing. `total` and `stats` come from every page, not
 * just the first, so the header numbers do not change as you scroll.
 */
export const useMemoryPages = (filter: MemoryFilter = 'all') => {
  const client = useMemoryClient();

  // Single options object. The key is widened to `string[]` so the compiler
  // cannot narrow onto the `(queryKey, queryFn, options)` overload, which does
  // not accept `initialPageParam`.
  // Two-argument form, matching the house pattern in
  // `kbn-change-history-ui/src/hooks/use_change_history_list.ts`. The page param
  // is the server's opaque `search_after` cursor, not an offset.
  const query = useInfiniteQuery<MemoryListResult, Error>(
    memoryKeys.pages(filter),
    ({ signal, pageParam }) => {
      const cursor = pageParam as string | undefined;
      return client!.fetch('GET /internal/nightshift/memory/pages', {
        signal: signal ?? null,
        params: {
          query: { filter, size: MEMORY_PAGE_SIZE, ...(cursor ? { cursor } : {}) },
        },
      }) as Promise<MemoryListResult>;
    },
    {
      enabled: client !== undefined,
      // The server omits `cursor` when the result set is exhausted.
      getNextPageParam: (lastPage) => lastPage.cursor,
    }
  );

  // Flatten the accumulated pages once, so consumers do not each do it.
  const rows = useMemo(() => query.data?.pages.flatMap((page) => page.pages) ?? [], [query.data]);
  const first = query.data?.pages[0];

  return {
    ...query,
    rows,
    stats: first?.stats,
    total: first?.total ?? 0,
  };
};

export const useMemoryPage = (id: string | undefined) => {
  const client = useMemoryClient();

  return useQuery({
    queryKey: memoryKeys.page(id ?? ''),
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/memory/pages/{id}', {
        signal: signal ?? null,
        params: { path: { id: id! } },
      }),
    enabled: id !== undefined && client !== undefined,
  });
};

/**
 * Archive or restore a memory, then refresh every list so counts and filters
 * stay honest. Invalidate rather than patch: the store aggregates stats over the
 * whole filtered set, so a locally adjusted total would drift from the server.
 */
export const useSetMemoryArchived = () => {
  const client = useMemoryClient();
  const queryClient = useQueryClient();

  return async (id: string, archived: boolean): Promise<void> => {
    await client!.fetch('POST /internal/nightshift/memory/pages/{id}/archive', {
      signal: null,
      params: { path: { id }, body: { archived } },
    });
    await queryClient.invalidateQueries({ queryKey: ['nightshift', 'memory'] });
  };
};

/**
 * Permanently removes a memory. `confirmTitle` must match the page's current
 * title, which the route enforces — the UI passes the title it is showing so a
 * stale dialog cannot delete something that has since changed.
 */
export const useDeleteMemoryPage = () => {
  const client = useMemoryClient();
  const queryClient = useQueryClient();

  return async (id: string, confirmTitle: string): Promise<void> => {
    await client!.fetch('DELETE /internal/nightshift/memory/pages/{id}', {
      signal: null,
      params: { path: { id }, body: { confirm_title: confirmTitle } },
    });
    await queryClient.invalidateQueries({ queryKey: ['nightshift', 'memory'] });
  };
};
