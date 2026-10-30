/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type {
  QueriesGetResponse,
  QueryWithOccurrences,
  StreamQuery,
} from '@kbn/significant-events-schema';
import type { QueryStatus } from '@kbn/significant-events-plugin/common';
import { getQueryBucketParams, toTimeState } from './get_query_bucket_params';
import { useKibana } from '../../hooks/use_kibana';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../query_keys';

export interface SignificantEventQueryRow {
  query: StreamQuery;
  source_id: string;
  occurrences: Array<{ x: number; y: number }>;
  change_points: QueryWithOccurrences['change_points'];
  rule_backed: boolean;
  rule_enabled?: boolean;
}

export interface QueriesTableFetchResult {
  queries: SignificantEventQueryRow[];
  page: number;
  perPage: number;
  total: number;
}

export const useFetchDiscoveryQueries = (
  options: {
    name?: string;
    query?: string;
    page: number;
    perPage: number;
    status?: QueryStatus[];
    /** Only these query ids. */
    queryIds?: string[];
    /** Only queries linked to these entity slugs, or to no live entity with `unassignedEntities`. */
    entityIds?: string[];
    unassignedEntities?: boolean;
    /** Fixed occurrence window; defaults to the global time filter. */
    timeRange?: TimeRange;
    enabled?: boolean;
  },
  deps: unknown[] = []
) => {
  const {
    name,
    query,
    page,
    perPage,
    status,
    queryIds,
    entityIds,
    unassignedEntities,
    timeRange,
    enabled = true,
  } = options;
  const {
    significantEvents: { significantEventsRepositoryClient },
    data,
  } = useKibana().services;
  const showFetchErrorToast = useFetchErrorToast();

  const { timeState } = useTimefilter();

  const fetchDiscoveryQueries = async ({
    signal,
  }: QueryFunctionContext): Promise<QueriesTableFetchResult | undefined> => {
    const { timefilter } = data.query.timefilter;
    const occurrenceWindow = timeRange ? toTimeState(timefilter, timeRange) : timeState;
    const bucketParams = occurrenceWindow && getQueryBucketParams(timefilter, occurrenceWindow);
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
            sourceIds: name ? [name] : undefined,
            page,
            perPage,
            status,
            queryIds,
            entityIds: entityIds?.length ? entityIds : undefined,
            unassignedEntities: unassignedEntities || undefined,
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
          rule_enabled,
          source_id,
          rule_backed,
          ...rest
        } = series;
        return {
          query: rest,
          source_id,
          change_points,
          occurrences: occurrences.map(
            (occurrence: QueryWithOccurrences['occurrences'][number]) => ({
              x: new Date(occurrence.date).getTime(),
              y: occurrence.count,
            })
          ),
          rule_backed,
          rule_enabled,
        };
      }),
    };
  };

  return useQuery<QueriesTableFetchResult | undefined, Error>({
    queryKey: [
      ...DISCOVERY_QUERIES_QUERY_KEY,
      name,
      ...(timeRange ? [timeRange.from, timeRange.to] : [timeState.start, timeState.end]),
      query,
      page,
      perPage,
      status?.join(','),
      queryIds?.join(','),
      // The array itself, not a joined string: slugs can contain commas.
      entityIds,
      unassignedEntities,
      ...deps,
    ],
    queryFn: fetchDiscoveryQueries,
    onError: showFetchErrorToast,
    keepPreviousData: true,
    enabled,
  });
};
