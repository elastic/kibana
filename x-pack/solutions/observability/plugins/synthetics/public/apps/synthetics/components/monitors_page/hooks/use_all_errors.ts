/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useTimeZone } from '@kbn/observability-shared-plugin/public';
import { useMemo } from 'react';
import type { Ping, PingState } from '../../../../../../common/runtime_types';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
  getQueryFilters,
} from '../../../../../../common/constants/client_defaults';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';

function buildTermsFilter(field: string, values?: string | string[]) {
  if (!values || (Array.isArray(values) && values.length === 0)) return [];
  const arr = Array.isArray(values) ? values : [values];
  return [{ terms: { [field]: arr } }];
}

function buildStatusCodesFilter(values?: string | string[]) {
  if (!values || (Array.isArray(values) && values.length === 0)) return [];
  const arr = Array.isArray(values) ? values : [values];
  // `http.response.status_code` is mapped as a numeric field, so coerce
  // any URL-string codes to numbers before sending the `terms` query.
  const numeric = arr.map((s) => Number(s)).filter((n) => Number.isFinite(n));
  if (!numeric.length) return [];
  return [{ terms: { 'http.response.status_code': numeric } }];
}

export function useAllMonitorErrors() {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const {
    dateRangeStart,
    dateRangeEnd,
    query,
    monitorTypes,
    locations,
    tags,
    projects,
    statusCodes,
  } = useGetUrlParams();

  const timeZone = useTimeZone();

  const filters = [
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
    ...buildTermsFilter('monitor.type', monitorTypes),
    ...buildTermsFilter('observer.geo.name', locations),
    ...buildTermsFilter('tags', tags),
    ...buildTermsFilter('monitor.project.id', projects),
    ...buildStatusCodesFilter(statusCodes),
  ];

  const must = query ? [getQueryFilters(query)] : [];

  const { data, loading } = useReduxEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: filters,
          must,
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
                _source: [
                  'error',
                  'state',
                  'monitor',
                  '@timestamp',
                  'config_id',
                  'observer',
                  'http.response.status_code',
                ],
                sort: [{ '@timestamp': 'desc' }],
              },
            },
          },
        },
        latest: {
          top_hits: {
            size: 1,
            _source: ['monitor.status'],
            sort: [{ '@timestamp': 'desc' }],
          },
        },
      },
    },
    [
      lastRefresh,
      dateRangeStart,
      dateRangeEnd,
      query,
      monitorTypes,
      locations,
      tags,
      projects,
      statusCodes,
    ],
    {
      name: `getAllMonitorErrors/${dateRangeStart}/${dateRangeEnd}`,
      isRequestReady: true,
    }
  );

  return useMemo(() => {
    const defaultValues = { upStates: [], errorStates: [] };
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

    const hits = data?.aggregations?.latest?.hits?.hits ?? [];

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
