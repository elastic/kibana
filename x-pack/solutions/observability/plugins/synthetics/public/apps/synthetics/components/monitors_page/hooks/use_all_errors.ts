/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useTimeZone } from '@kbn/observability-shared-plugin/public';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import type { Ping, PingState } from '../../../../../../common/runtime_types';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../../../common/constants/client_defaults';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';

export function useAllMonitorErrors() {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const timeZone = useTimeZone();

  const { data, loading } = useReduxEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [
            SUMMARY_FILTER,
            EXCLUDE_RUN_ONCE_FILTER,
            {
              range: {
                '@timestamp': {
                  gte: dateRangeStart,
                  lte: dateRangeEnd,
                  time_zone: timeZone,
                },
              },
            },
          ],
        },
      },
      sort: [{ 'state.started_at': 'desc' }],
      aggs: {
        states: {
          terms: {
            field: 'state.id',
            size: 10000,
          },
          aggs: {
            summary: {
              top_hits: {
                size: 1,
                _source: ['error', 'state', 'monitor', '@timestamp', 'config_id', 'observer'],
                sort: [{ '@timestamp': 'desc' }],
              },
            },
          },
        },
        latest: {
          top_metrics: {
            size: 1,
            metrics: { field: 'monitor.status' },
            sort: [{ '@timestamp': 'desc' }],
          },
        },
      },
    },
    [lastRefresh, monitorId, dateRangeStart, dateRangeEnd],
    {
      name: `getMonitorErrors/${dateRangeStart}/${dateRangeEnd}`,
      isRequestReady: true,
    }
  );

  return useMemo(() => {
    const defaultValues = { upStates: [], errorStates: [] };
    // re-bucket states into error/up
    // including the `up` states is useful for determining error duration
    const { errorStates, upStates } =
      data?.aggregations?.states.buckets.reduce<{
        upStates: PingState[];
        errorStates: PingState[];
      }>((prev, cur) => {
        const source = cur.summary.hits.hits?.[0]._source as PingState | undefined;
        if (source?.state.up === 0) {
          prev.errorStates.push(source as PingState);
        } else if (!!source?.state.up && source.state.up >= 1) {
          prev.upStates.push(source as PingState);
        }
        return prev;
      }, defaultValues) ?? defaultValues;

    const hits = data?.aggregations?.latest?.top_metrics?.[0]?.metrics?.['monitor.status'];

    const hasActiveError: boolean =
      hits.length === 1 &&
      (hits[0]?._source as Ping).monitor?.status === 'down' &&
      !!errorStates?.length;

    const upStatesSortedAsc = upStates.sort(
      (a, b) => Number(new Date(a.state.started_at)) - Number(new Date(b.state.started_at))
    );

    const ids = new Set(errorStates.map((state) => state.monitor.id));

    return {
      errorStates,
      upStates: upStatesSortedAsc,
      loading,
      data,
      hasActiveError,
      monitorIds: Array.from(ids),
    };
  }, [data, loading]);
}
