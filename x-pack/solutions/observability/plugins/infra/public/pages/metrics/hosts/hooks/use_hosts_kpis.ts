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
// table's host-name filter; this hook collapses them into one `POST
// /api/metrics/infra/host/kpis` request that returns four scalars + the
// host count.
//
// Parallel fetch: this hook intentionally does NOT consume
// `useHostsViewContext()`. The endpoint computes its KPIs over the entire
// filter-matched fleet, so the request body only needs `from/to/query`
// — no `names` from the legacy `/host` endpoint, no `limit`. Both the
// host endpoint and the KPI endpoint fire from the same
// `useHostsPageReady` gate, so user-perceived KPI strip latency is
// `max(/host, /kpis)` rather than `/host + /kpis`. At 5000 hosts on the
// deploy bench that saves ~40 s on first paint.

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
  const isReady = useHostsPageReady();

  const payload = useMemo<string>(() => {
    const body: GetHostsKpisRequestBodyPayloadClient = {
      from: new Date(parsedDateRange.from).toISOString(),
      to: new Date(parsedDateRange.to).toISOString(),
      query: buildQuery() as GetHostsKpisRequestBodyPayloadClient['query'],
      schema: searchCriteria?.preferredSchema || DEFAULT_SCHEMA,
    };
    return JSON.stringify(body);
  }, [buildQuery, parsedDateRange.from, parsedDateRange.to, searchCriteria?.preferredSchema]);

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
        });
        return decodeOrThrow(GetHostsKpisResponsePayloadRT)(
          response as GetHostsKpisResponsePayload
        );
      })();
    },
    // `searchCriteria.preferredSchema` is read by `perfTracker.record`
    // only; the request itself is keyed off `payload`, which already
    // encodes it. Intentionally omitted from deps so the hook doesn't
    // refire when only a logging tag changes.
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
