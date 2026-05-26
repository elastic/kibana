/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P15b — client hook for the four-KPI summary endpoint.
//
// Bypasses Lens for the headline numbers above the table. The four tiles
// (CPU Usage, Normalized Load, Memory Usage, Disk Usage) used to be four
// independent Lens charts, each issuing one DSL aggregation against the
// 500-host filter; this hook collapses them into one `POST
// /api/metrics/infra/host/kpis` request that returns four scalars + the
// host count.
//
// Scope semantics:
// - We pass `names: string[]` from `useHostsViewContext()` so the KPIs are
//   averaged over the same hosts the table renders (Lens did this implicitly
//   via `buildCombinedAssetFilter`). Empty name list → KPIs are scoped by
//   the unified-search KQL alone.
// - `isReady` gating matches Phase A / count: returns `undefined` while the
//   unified search isn't ready so `useFetcher` skips the initial double-fire
//   (P5.5).

import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useMemo } from 'react';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';
import type {
  GetHostsKpisRequestBodyPayloadClient,
  GetHostsKpisResponsePayload,
  HostsKpis,
} from '../../../../../common/http_api';
import { GetHostsKpisResponsePayloadRT } from '../../../../../common/http_api';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsViewContext } from './use_hosts_view';
import { useHostsPageReady } from './use_hosts_page_ready';
import { PERF_KEYS, perfTracker } from '../utils/perf_tracker';

const KPIS_PATH = '/api/metrics/infra/host/kpis';

const EMPTY_KPIS: HostsKpis = {
  cpuUsage: null,
  normalizedLoad1m: null,
  memoryUsage: null,
  diskUsage: null,
};

export interface UseHostsKpisResult {
  kpis: HostsKpis;
  hostCount: number;
  loading: boolean;
  error: ReturnType<typeof useFetcher>['error'];
}

export const useHostsKpis = (): UseHostsKpisResult => {
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const isReady = useHostsPageReady();
  // Scope to the *full* ranked top-N list Phase A computed — same set the
  // table is paginating across, not just the visible 20-row page.
  // Reading `hostNodes` here instead used to scope KPIs to the visible
  // page (a) producing the wrong "average across 20 hosts" semantic and
  // (b) firing the request twice — once with no `names` (fleet-wide,
  // pre-Phase-A) and once with the 20 visible names (post-Phase-B).
  const { allHostNames } = useHostsViewContext();

  const payload = useMemo<string>(() => {
    const body: GetHostsKpisRequestBodyPayloadClient = {
      from: new Date(parsedDateRange.from).toISOString(),
      to: new Date(parsedDateRange.to).toISOString(),
      query: buildQuery() as GetHostsKpisRequestBodyPayloadClient['query'],
      schema: searchCriteria?.preferredSchema || DEFAULT_SCHEMA,
      limit: searchCriteria.limit,
      ...(allHostNames.length > 0 ? { names: allHostNames } : {}),
    };
    return JSON.stringify(body);
  }, [
    buildQuery,
    parsedDateRange.from,
    parsedDateRange.to,
    searchCriteria?.preferredSchema,
    searchCriteria.limit,
    allHostNames,
  ]);

  const { data, status, error } = useFetcher(
    (callApi) => {
      // Wait for Phase A's ranked name list before firing. Phase A is
      // cheap; the cost of sequencing here is well under the cost of
      // the wasted first call we used to make. Skipping when the list
      // is empty also collapses the request count to exactly one per
      // query change.
      if (!isReady || allHostNames.length === 0) return;
      return (async () => {
        const start = performance.now();
        const response = await callApi(KPIS_PATH, {
          method: 'POST',
          body: payload,
        });
        const duration = performance.now() - start;
        perfTracker.record(PERF_KEYS.kpis, duration, {
          hosts: allHostNames.length,
          limit: searchCriteria.limit,
        });
        return decodeOrThrow(GetHostsKpisResponsePayloadRT)(
          response as GetHostsKpisResponsePayload
        );
      })();
    },
    // `allHostNames.length` and `searchCriteria.limit` are already captured
    // transitively via `payload` (the request body is stringified from them),
    // but they're also read directly inside the callback to label the
    // `perfTracker` sample. Listing them explicitly keeps
    // `react-hooks/exhaustive-deps` happy without changing the refetch cadence
    // — when either value changes, `payload` changes in the same render.
    [isReady, payload, allHostNames.length, searchCriteria.limit]
  );

  return {
    kpis: data?.kpis ?? EMPTY_KPIS,
    hostCount: data?.hostCount ?? 0,
    loading: isPending(status),
    error,
  };
};
