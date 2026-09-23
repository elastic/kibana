/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { getQueryBucketParams } from '../util/get_query_bucket_params';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';
import { useFetchErrorToast } from './use_fetch_error_toast';
import type { SignificantEventQueryRow } from './use_fetch_discovery_queries';

export type StreamQueryStats = SignificantEventQueryRow;

type SignificantEventsStatsFetchResult =
  | undefined
  | {
      aggregated_occurrences: { x: number; y: number }[];
      total_occurrences: number;
    };

export const useFetchQueryOccurrenceStats = (
  options: { name?: string; query?: string } | undefined = {},
  deps: unknown[] = []
) => {
  const { name, query } = options;
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

  const fetchQueryOccurrenceStats = async ({
    signal,
  }: QueryFunctionContext): Promise<SignificantEventsStatsFetchResult> => {
    const bucketParams = getQueryBucketParams(data.query.timefilter.timefilter, timeState);
    if (!bucketParams) {
      return undefined;
    }

    const requestPromise = significantEventsRepositoryClient.fetch(
      'GET /internal/streams/_query_occurrences',
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

    return await requestPromise.then(({ aggregated_occurrences: aggregatedOccurrences }) => {
      return {
        aggregated_occurrences: aggregatedOccurrences.map((occurrence) => ({
          x: new Date(occurrence.date).getTime(),
          y: occurrence.count,
        })),
        total_occurrences: aggregatedOccurrences.reduce(
          (sum, occurrence) => sum + occurrence.count,
          0
        ),
      };
    });
  };

  return useQuery<SignificantEventsStatsFetchResult, Error>({
    queryKey: ['queryOccurrenceStats', name, timeState.start, timeState.end, query, ...deps],
    queryFn: fetchQueryOccurrenceStats,
    onError: showFetchErrorToast,
  });
};
