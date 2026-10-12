/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useMemo } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import {
  toFeatureAvailability,
  type FeatureAvailability,
} from '../../../../util/feature_availability';
import type {
  MemoryDetailResult,
  MemoryFilter,
  MemoryListResult,
  MemoryStats,
  MemorySummary,
} from './types';

type MemoryClient = NonNullable<ReturnType<typeof useMemoryClient>>;

interface DeleteMemoryPageVariables {
  id: string;
  version: MemoryDetailResult['version'];
}

const memoryKeys = {
  availability: ['nightshift', 'memory', 'availability'] as const,
  pages: (filter: MemoryFilter, search: string) =>
    ['nightshift', 'memory', 'pages', filter, search] as const,
  treemap: (tags: readonly string[]) => ['nightshift', 'memory', 'keywords', tags] as const,
  page: (id: string) => ['nightshift', 'memory', 'page', id] as const,
};

/** Undefined when `nightshift_investigations` is not installed; queries stay disabled. */
export const useMemoryClient = () => {
  const {
    dependencies: {
      start: { nightshiftInvestigations },
    },
  } = useKibana();

  return nightshiftInvestigations?.investigationsClient;
};

/** The flag defaults to false, so a failed request hides the tab rather than showing it empty. */
export const useMemoryEnabled = (): FeatureAvailability => {
  const client = useMemoryClient();

  return toFeatureAvailability(
    useQuery({
      queryKey: memoryKeys.availability,
      queryFn: ({ signal }) =>
        client!.fetch('GET /internal/nightshift/memory/availability', { signal: signal ?? null }),
      enabled: client !== undefined,
      retry: false,
    })
  );
};

/** Rows the sidebar asks for per request. */
export const MEMORY_PAGE_SIZE = 25;

/** Paging uses the server's opaque `search_after` token, so it is stable across optimizer writes. */
export const useMemoryPages = (filter: MemoryFilter = 'all', search = '') => {
  const client = useMemoryClient();
  const trimmedSearch = search.trim();

  const query = useInfiniteQuery<MemoryListResult, Error>({
    queryKey: memoryKeys.pages(filter, trimmedSearch),
    queryFn: ({ signal, pageParam }) => {
      const cursor = pageParam as string | undefined;
      return client!.fetch('GET /internal/nightshift/memory/pages', {
        signal: signal ?? null,
        params: {
          query: {
            filter,
            size: MEMORY_PAGE_SIZE,
            ...(trimmedSearch ? { search: trimmedSearch } : {}),
            ...(cursor ? { cursor } : {}),
          },
        },
      }) as Promise<MemoryListResult>;
    },
    enabled: client !== undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
  });

  const rows = useMemo(() => query.data?.pages.flatMap((page) => page.pages) ?? [], [query.data]);
  const first = query.data?.pages[0];

  return {
    ...query,
    rows,
    stats: first?.stats,
    total: first?.total ?? 0,
  };
};

export const MEMORY_KEYWORD_SIZE = 200;

/** The keyword query follows at most this many cursor pages, bounding the store it ranks. */
export const MEMORY_KEYWORD_MAX_REQUESTS = 5;

export interface MemoryKeywordResult {
  pages: MemorySummary[];
  stats: MemoryStats | undefined;
  total: number;
  /** A cursor was left unfollowed, so `pages` is a prefix of the matching set. */
  capped: boolean;
}

export const useMemoryKeywordPages = (tags: readonly string[] = []) => {
  const client = useMemoryClient();

  return useQuery({
    queryKey: memoryKeys.treemap(tags),
    queryFn: async ({ signal }): Promise<MemoryKeywordResult> => {
      const pages: MemorySummary[] = [];
      let stats: MemoryStats | undefined;
      let total = 0;
      let cursor: string | undefined;
      for (let request = 0; request < MEMORY_KEYWORD_MAX_REQUESTS; request++) {
        const result = (await client!.fetch('GET /internal/nightshift/memory/pages', {
          signal: signal ?? null,
          params: {
            query: {
              filter: 'active',
              size: MEMORY_KEYWORD_SIZE,
              ...(tags.length > 0 ? { tags: [...tags] } : {}),
              ...(cursor ? { cursor } : {}),
            },
          },
        })) as MemoryListResult;
        pages.push(...result.pages);
        stats = result.stats;
        total = result.total;
        if (!result.cursor) return { pages, stats, total, capped: false };
        cursor = result.cursor;
      }
      return { pages, stats, total, capped: true };
    },
    enabled: client !== undefined,
  });
};

export const useMemoryPage = (id: string | undefined) => {
  const client = useMemoryClient();

  return useQuery<MemoryDetailResult>({
    queryKey: memoryKeys.page(id ?? ''),
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/memory/pages/{id}', {
        signal: signal ?? null,
        params: { path: { id: id! } },
      }),
    enabled: id !== undefined && client !== undefined,
  });
};

/** Refetches every cached list rather than patching: stats are aggregated over the whole set. */
const useMemoryMutation = <TVariables>(
  write: (client: MemoryClient, variables: TVariables) => Promise<unknown>,
  errorTitle: string
) => {
  const client = useMemoryClient();
  const queryClient = useQueryClient();
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['nightshift', 'memory'] });

  return useMutation<void, Error, TVariables>({
    mutationFn: async (variables) => {
      await write(client!, variables);
    },
    onSuccess: refresh,
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: errorTitle });
      return refresh();
    },
  });
};

/** The route takes the state to move to, so the button's own reading of the page travels. */
export const useSetMemoryArchived = () =>
  useMemoryMutation(
    (client, { id, archived }: { id: string; archived: boolean }) =>
      client.fetch('POST /internal/nightshift/memory/pages/{id}/archive', {
        signal: null,
        params: { path: { id }, body: { archived } },
      }),
    i18n.translate('xpack.significantEventsApp.memory.archiveErrorTitle', {
      defaultMessage: 'Could not archive Semantic Memory page',
    })
  );

/** `version` makes the delete conditional on the revision the detail route handed over. */
export const useDeleteMemoryPage = () =>
  useMemoryMutation(
    (client, { id, version }: DeleteMemoryPageVariables) =>
      client.fetch('DELETE /internal/nightshift/memory/pages/{id}', {
        signal: null,
        params: { path: { id }, body: { version } },
      }),
    i18n.translate('xpack.significantEventsApp.memory.deleteErrorTitle', {
      defaultMessage: 'Could not delete Semantic Memory page',
    })
  );
