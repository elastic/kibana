/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P16 — client hook for the Metrics-tab time-series endpoint.
//
// Replaces the eleven Lens-driven xy charts with a single
// `POST /api/metrics/infra/host/metrics_timeseries` request that returns
// every metric × host × bucket the visible table page is showing. The hook
// returns a `seriesByMetric` map so individual chart components can pull
// their slice with a single map lookup instead of filtering an 11-item
// array.
//
// Scope semantics:
// - We pass `names` from `currentPage` (the EuiBasicTable's visible page),
//   matching how Lens's `buildCombinedAssetFilter` was scoping the legacy
//   charts. When the page is empty (no hosts selected) the hook returns
//   `EMPTY` rather than firing — same behaviour as the legacy
//   `shouldUseSearchCriteria` branch in `chart.tsx`.
// - `isReady` gating matches Phase A / B / KPIs so the initial double-fire
//   (P5.5) is avoided.

import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useMemo } from 'react';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';
import type {
  GetHostsMetricsTimeseriesRequestBodyPayloadClient,
  GetHostsMetricsTimeseriesResponsePayload,
  HostsTimeseriesMetric,
  HostsTimeseriesSeries,
} from '../../../../../common/http_api';
import { GetHostsMetricsTimeseriesResponsePayloadRT } from '../../../../../common/http_api';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsTableContext } from './use_hosts_table';
import { useHostsPageReady } from './use_hosts_page_ready';
import { PERF_KEYS, perfTracker } from '../utils/perf_tracker';

const TIMESERIES_PATH = '/api/metrics/infra/host/metrics_timeseries';

const EMPTY_SERIES: HostsTimeseriesSeries[] = [];

export interface UseHostsMetricsTimeseriesResult {
  series: HostsTimeseriesSeries[];
  // Pre-grouped by metric. A `Map` rather than a plain object so iteration
  // order matches the order metrics were requested in (chart grid renders in
  // that order). Empty `Map` is the steady-state when no hosts are on the
  // page, so consumers can iterate without a null check.
  seriesByMetric: Map<HostsTimeseriesMetric, HostsTimeseriesSeries[]>;
  bucketSpan: string;
  loading: boolean;
  error: ReturnType<typeof useFetcher>['error'];
}

export const useHostsMetricsTimeseries = (): UseHostsMetricsTimeseriesResult => {
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const isReady = useHostsPageReady();
  const { currentPage } = useHostsTableContext();

  // `currentPage` items have a `name` field but we don't want the hook's
  // identity to thrash on every chart-tooltip-induced re-render of the
  // table. Project to the names once and memo on that projection.
  const names = useMemo(() => currentPage.map((row) => row.name), [currentPage]);

  const payload = useMemo<string | null>(() => {
    if (names.length === 0) return null;
    const body: GetHostsMetricsTimeseriesRequestBodyPayloadClient = {
      from: new Date(parsedDateRange.from).toISOString(),
      to: new Date(parsedDateRange.to).toISOString(),
      query: buildQuery() as GetHostsMetricsTimeseriesRequestBodyPayloadClient['query'],
      schema: searchCriteria?.preferredSchema || DEFAULT_SCHEMA,
      names,
    };
    return JSON.stringify(body);
  }, [
    buildQuery,
    parsedDateRange.from,
    parsedDateRange.to,
    searchCriteria?.preferredSchema,
    names,
  ]);

  const { data, status, error } = useFetcher(
    (callApi) => {
      if (!isReady || !payload) return;
      return (async () => {
        const start = performance.now();
        const response = await callApi(TIMESERIES_PATH, {
          method: 'POST',
          body: payload,
        });
        const duration = performance.now() - start;
        perfTracker.record(PERF_KEYS.metricsTimeseries, duration, { hosts: names.length });
        return decodeOrThrow(GetHostsMetricsTimeseriesResponsePayloadRT)(
          response as GetHostsMetricsTimeseriesResponsePayload
        );
      })();
    },
    // `names.length` is read directly inside the callback to label the
    // `perfTracker` sample. The value is already captured transitively via
    // `payload` (the request body is stringified from `names`), so listing
    // it here keeps `react-hooks/exhaustive-deps` happy without changing the
    // refetch cadence.
    [isReady, payload, names.length]
  );

  const series = data?.series ?? EMPTY_SERIES;

  // The server already groups rows by `(host, metric)` and emits one series
  // per pair. Re-bucketing by metric here saves each chart component the
  // O(series_count) filter it would otherwise do on every render.
  const seriesByMetric = useMemo(() => {
    const map = new Map<HostsTimeseriesMetric, HostsTimeseriesSeries[]>();
    for (const entry of series) {
      const list = map.get(entry.metric) ?? [];
      list.push(entry);
      map.set(entry.metric, list);
    }
    return map;
  }, [series]);

  return {
    series,
    seriesByMetric,
    bucketSpan: data?.bucketSpan ?? '',
    loading: isPending(status),
    error,
  };
};
