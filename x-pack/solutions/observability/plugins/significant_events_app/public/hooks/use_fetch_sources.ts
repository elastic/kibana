/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { MAX_SOURCES_PER_PAGE, type NightshiftSource } from '@kbn/nightshift-shared';
import { useFetchErrorToast } from './use_fetch_error_toast';
import { useKibana } from './use_kibana';

export const SOURCES_QUERY_KEY = ['nightshiftSources'] as const;

// React Query would call `onError` once per observer. Several components read this query.
let reportedSourcesError: unknown;

/** Every source of the current space, sorted by title, in one cache entry. */
export function useFetchSources<T = NightshiftSource[]>({
  select,
  showErrorToast = true,
}: {
  select?: (sources: NightshiftSource[]) => T;
  /** Set false for a caller that reports the failure itself. The toast still fires only once. */
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

  const result = useQuery<NightshiftSource[], Error, T>({
    queryKey: SOURCES_QUERY_KEY,
    queryFn: fetchSources,
    select,
  });

  useEffect(() => {
    if (!result.error) {
      reportedSourcesError = undefined;
      return;
    }
    if (!showErrorToast || reportedSourcesError === result.error) {
      return;
    }
    reportedSourcesError = result.error;
    showFetchErrorToast(result.error);
  }, [showErrorToast, result.error, showFetchErrorToast]);

  return result;
}
