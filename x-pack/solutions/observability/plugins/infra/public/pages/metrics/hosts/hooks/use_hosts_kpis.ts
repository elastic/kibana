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
  const { buildQuery, isReady, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const { hostNodes } = useHostsViewContext();

  // Match the table's host set exactly. Lens did this implicitly with
  // `buildCombinedAssetFilter`; here the contract is explicit (the names
  // travel in the request body) which also makes the KPI 1:1 reproducible
  // for a given Phase A response.
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
        const response = await callApi(KPIS_PATH, {
          method: 'POST',
          body: payload,
        });
        return decodeOrThrow(GetHostsKpisResponsePayloadRT)(
          response as GetHostsKpisResponsePayload
        );
      })();
    },
    [isReady, payload]
  );

  return {
    kpis: data?.kpis ?? EMPTY_KPIS,
    hostCount: data?.hostCount ?? 0,
    loading: isPending(status),
    error,
  };
};
