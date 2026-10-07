/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type {
  QueriesGetResponse,
  QueryWithOccurrences,
  StreamQuery,
} from '@kbn/significant-events-schema';
import type { QueryStatus } from '@kbn/significant-events-plugin/common';
import { getQueryBucketParams } from '../util/get_query_bucket_params';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';
import { useFetchErrorToast } from './use_fetch_error_toast';

export interface SignificantEventQueryRow {
  query: StreamQuery;
  stream_name: string;
  occurrences: Array<{ x: number; y: number }>;
  change_points: QueryWithOccurrences['change_points'];
  rule_backed: boolean;
}

export interface QueriesTableFetchResult {
  queries: SignificantEventQueryRow[];
  page: number;
  perPage: number;
  total: number;
}

export const DISCOVERY_QUERIES_QUERY_KEY = ['discoveryQueries'] as const;

export const useFetchDiscoveryQueries = (
  options: {
    name?: string;
    query?: string;
    page: number;
    perPage: number;
    status?: QueryStatus[];
    enabled?: boolean;
  },
  deps: unknown[] = []
) => {
  const { name, query, page, perPage, status, enabled = true } = options;
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

  const fetchDiscoveryQueries = async ({
    signal,
  }: QueryFunctionContext): Promise<QueriesTableFetchResult | undefined> => {
    const bucketParams = getQueryBucketParams(data.query.timefilter.timefilter, timeState);
    if (!bucketParams) {
      return undefined;
    }

    const response: QueriesGetResponse = await significantEventsRepositoryClient.fetch(
      'GET /internal/streams/_queries',
      {
        params: {
          query: {
            from: bucketParams.from,
            to: bucketParams.to,
            bucketSize: bucketParams.bucketSize,
            query: query?.trim() ?? '',
            streamNames: name ? [name] : undefined,
            page,
            perPage,
            status,
          },
        },
        signal: signal ?? null,
      }
    );

    return {
      page: response.page,
      perPage: response.perPage,
      total: response.total,
      queries: response.queries.map((series: QueryWithOccurrences) => {
        const {
          occurrences,
          change_points,
          rule_uuid: _ruleUuid,
          stream_name,
          rule_backed,
          ...rest
        } = series;
        return {
          query: rest,
          stream_name,
          change_points,
          occurrences: occurrences.map(
            (occurrence: QueryWithOccurrences['occurrences'][number]) => ({
              x: new Date(occurrence.date).getTime(),
              y: occurrence.count,
            })
          ),
          rule_backed,
        };
      }),
    };
  };

  return useQuery<QueriesTableFetchResult | undefined, Error>({
    queryKey: [
      ...DISCOVERY_QUERIES_QUERY_KEY,
      name,
      timeState.start,
      timeState.end,
      query,
      page,
      perPage,
      status?.join(','),
      ...deps,
    ],
    queryFn: fetchDiscoveryQueries,
    onError: showFetchErrorToast,
    keepPreviousData: true,
    enabled,
  });
};
