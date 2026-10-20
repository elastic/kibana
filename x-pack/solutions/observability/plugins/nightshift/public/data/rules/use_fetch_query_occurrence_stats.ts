/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { getQueryBucketParams, toTimeState } from './get_query_bucket_params';
import { useKibana } from '../../hooks/use_kibana';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import type { SignificantEventQueryRow } from './use_fetch_discovery_queries';

export type StreamQueryStats = SignificantEventQueryRow;

type SignificantEventsStatsFetchResult =
  | undefined
  | {
      aggregated_occurrences: { x: number; y: number }[];
      total_occurrences: number;
    };

export const useFetchQueryOccurrenceStats = (
  options:
    | {
        name?: string;
        query?: string;
        /** Fixed occurrence window; defaults to the global time filter. */
        timeRange?: TimeRange;
      }
    | undefined = {},
  deps: unknown[] = []
) => {
  const { name, query, timeRange } = options;
  const {
    significantEvents: { significantEventsRepositoryClient },
    data,
  } = useKibana().services;
  const showFetchErrorToast = useFetchErrorToast();

  const { timeState } = useTimefilter();

  const fetchQueryOccurrenceStats = async ({
    signal,
  }: QueryFunctionContext): Promise<SignificantEventsStatsFetchResult> => {
    const { timefilter } = data.query.timefilter;
    const occurrenceWindow = timeRange ? toTimeState(timefilter, timeRange) : timeState;
    const bucketParams = occurrenceWindow && getQueryBucketParams(timefilter, occurrenceWindow);
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
            sourceIds: name ? [name] : undefined,
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
    queryKey: [
      'queryOccurrenceStats',
      name,
      ...(timeRange ? [timeRange.from, timeRange.to] : [timeState.start, timeState.end]),
      query,
      ...deps,
    ],
    queryFn: fetchQueryOccurrenceStats,
    onError: showFetchErrorToast,
  });
};
