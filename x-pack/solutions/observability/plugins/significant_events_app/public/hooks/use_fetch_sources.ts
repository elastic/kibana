/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { MAX_SOURCES_PER_PAGE, type NightshiftSource } from '@kbn/nightshift-shared';
import { useFetchErrorToast } from './use_fetch_error_toast';
import { useKibana } from './use_kibana';

export const SOURCES_QUERY_KEY = ['nightshiftSources'] as const;

/** Every source of the current space, sorted by title, in one cache entry. */
export function useFetchSources<T = NightshiftSource[]>({
  select,
  showErrorToast = true,
}: {
  select?: (sources: NightshiftSource[]) => T;
  /** React Query calls `onError` once per observer; read-only lookups opt out to avoid toast stacks. */
  showErrorToast?: boolean;
} = {}) {
  const {
    dependencies: {
      start: { nightshiftSources },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const fetchSources = async ({ signal }: QueryFunctionContext): Promise<NightshiftSource[]> => {
    const client = await nightshiftSources.getClient();
    const sources: NightshiftSource[] = [];
    // Pages are fetched one after the other: each request needs to know whether the last one
    // already reached `total`.
    for (let page = 1; ; page++) {
      const response = await client.fetch('GET /internal/nightshift/sources', {
        params: { query: { page, per_page: MAX_SOURCES_PER_PAGE } },
        signal: signal ?? null,
      });
      sources.push(...response.sources);
      if (response.sources.length < MAX_SOURCES_PER_PAGE || sources.length >= response.total) {
        return sources;
      }
    }
  };

  return useQuery<NightshiftSource[], Error, T>({
    queryKey: SOURCES_QUERY_KEY,
    queryFn: fetchSources,
    onError: showErrorToast ? showFetchErrorToast : undefined,
    select,
  });
}
