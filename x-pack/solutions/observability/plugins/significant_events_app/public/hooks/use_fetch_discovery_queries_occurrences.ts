/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { QueriesOccurrencesGetResponse } from '@kbn/significant-events-schema';
import { getQueryBucketParams } from '../util/get_query_bucket_params';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';
import { useFetchErrorToast } from './use_fetch_error_toast';

export interface DiscoveryQueriesOccurrencesFetchResult {
  occurrences_histogram: Array<{ x: number; y: number }>;
  total_occurrences: number;
}

export const DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY = ['discoveryQueriesOccurrences'] as const;

export const useFetchDiscoveryQueriesOccurrences = (
  options: { name?: string; query?: string } | undefined = {},
  deps: unknown[] = []
) => {
  const { name, query } = options ?? {};
  const {
    dependencies: {
      start: {
        significantEvents: { significantEventsRepositoryClient },
        data,
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const { timeState } = useTimefilter();

  const fetchDiscoveryQueriesOccurrences = async ({
    signal,
  }: QueryFunctionContext): Promise<DiscoveryQueriesOccurrencesFetchResult | undefined> => {
    const bucketParams = getQueryBucketParams(data.query.timefilter.timefilter, timeState);
    if (!bucketParams) {
      return undefined;
    }

    const response: QueriesOccurrencesGetResponse = await significantEventsRepositoryClient.fetch(
      'GET /internal/streams/_queries/_occurrences',
      {
        params: {
          query: {
            from: bucketParams.from,
            to: bucketParams.to,
            bucketSize: bucketParams.bucketSize,
            query: query?.trim() ?? '',
            streamNames: name ? [name] : undefined,
          },
        },
        signal: signal ?? null,
      }
    );

    return {
      occurrences_histogram: response.occurrences_histogram.map(
        (bucket: { x: string; y: number }) => ({
          x: new Date(bucket.x).getTime(),
          y: bucket.y,
        })
      ),
      total_occurrences: response.total_occurrences,
    };
  };

  return useQuery<DiscoveryQueriesOccurrencesFetchResult | undefined, Error>({
    queryKey: [
      ...DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY,
      name,
      timeState.start,
      timeState.end,
      query,
      ...deps,
    ],
    queryFn: fetchDiscoveryQueriesOccurrences,
    onError: showFetchErrorToast,
    keepPreviousData: true,
  });
};
