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
//   averaged over the same hosts the table renders (Lens did this
//   implicitly via `buildCombinedAssetFilter`). Empty name list → KPIs are
//   scoped by the unified-search KQL alone.
// - `isReady` gating matches the host count hook: `useFetcher` skips the
//   request until the unified search has resolved so we don't double-fire
//   on first paint.

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
import { PERF_KEYS, perfTracker } from '../utils/perf_tracker';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsViewContext } from './use_hosts_view';
import { useHostsPageReady } from './use_hosts_page_ready';

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
  const { hostNodes } = useHostsViewContext();
  const isReady = useHostsPageReady();

  // Match the table's host set exactly. Lens did this implicitly with
  // `buildCombinedAssetFilter`; here the contract is explicit (the names
  // travel in the request body) which also makes the KPI 1:1 reproducible
  // for a given host-list response.
  const names = useMemo(() => hostNodes.map((node) => node.name), [hostNodes]);

  const payload = useMemo<string>(() => {
    const body: GetHostsKpisRequestBodyPayloadClient = {
      from: new Date(parsedDateRange.from).toISOString(),
      to: new Date(parsedDateRange.to).toISOString(),
      query: buildQuery() as GetHostsKpisRequestBodyPayloadClient['query'],
      schema: searchCriteria?.preferredSchema || DEFAULT_SCHEMA,
      limit: searchCriteria.limit,
      ...(names.length > 0 ? { names } : {}),
    };
    return JSON.stringify(body);
  }, [
    buildQuery,
    parsedDateRange.from,
    parsedDateRange.to,
    searchCriteria?.preferredSchema,
    searchCriteria.limit,
    names,
  ]);

  const { data, status, error } = useFetcher(
    (callApi) => {
      if (!isReady) return;
      return (async () => {
        // PoC instrumentation — wall time around the `_query`-equivalent
        // network round trip. `perfTracker` keeps the last
        // `MAX_ENTRIES_PER_KEY` samples per key, so the gear-popover
        // overlay shows the rolling distribution for benchmark A/B/C
        // comparison against the Lens DSL and Lens ES|QL paths.
        const startedAt = performance.now();
        const response = await callApi(KPIS_PATH, {
          method: 'POST',
          body: payload,
        });
        perfTracker.record(PERF_KEYS.esqlEndpointKpi, performance.now() - startedAt, {
          schema: searchCriteria?.preferredSchema ?? DEFAULT_SCHEMA,
          hosts: names.length,
        });
        return decodeOrThrow(GetHostsKpisResponsePayloadRT)(
          response as GetHostsKpisResponsePayload
        );
      })();
    },
    // `searchCriteria.preferredSchema` and `names.length` are read by
    // `perfTracker.record` only; the request itself is keyed off `payload`,
    // which already encodes them. Intentionally omitted from deps so the
    // hook doesn't refire when only a logging tag changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReady, payload]
  );

  return {
    kpis: data?.kpis ?? EMPTY_KPIS,
    hostCount: data?.hostCount ?? 0,
    loading: isPending(status),
    error,
  };
};
