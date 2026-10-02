/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { MAX_SOURCES_PER_PAGE, type NightshiftSource } from '@kbn/nightshift-shared';
import { useKibana } from './use_kibana';

export const SOURCES_QUERY_KEY = ['nightshift.sources'] as const;

/** Every source of the current space in one cache entry. */
export const useFetchSources = <T = NightshiftSource[]>({
  select,
}: { select?: (sources: NightshiftSource[]) => T } = {}) => {
  const { nightshiftSources } = useKibana().services;

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
    select,
  });
};
