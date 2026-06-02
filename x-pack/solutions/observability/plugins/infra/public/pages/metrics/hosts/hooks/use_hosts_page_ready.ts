/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// First-paint double-fire gate for the Hosts page data fetchers
// (`useHostsView`, `useHostCount`, `useHostsKpisEsql`). Returns `true` when
// all upstream prerequisites have settled so the downstream `useFetcher`
// callsites can fire once instead of twice.
//
// This gate is also load-bearing for the KPI strip's parallelism: because
// `useHostsView` (the `/host` table fetch) and `useHostsKpisEsql` (the
// client-side ES|QL KPI query) read from the *same* gate, both requests fire
// in the same animation frame once the gate opens, so user-perceived KPI
// latency is `max(/host, kpis)` rather than `/host + kpis`. Do not
// reintroduce per-hook readiness checks that would re-serialise the fetches.
//
// Two upstream resolutions settle asynchronously on first load. Each one
// would otherwise change the `useFetcher` payload identity and force the
// host endpoints to fire twice (the first response is aborted client-side,
// but ES still pays for the work):
//
//   1. `metricsView?.dataViewReference` — undefined until the saved-object
//      data view resolves; once defined, `buildQuery`'s identity changes,
//      which changes the payload memos in the consumers.
//   2. The `time_range_metadata` fetch — until it settles, `SearchBar` has
//      no signal to flip `searchCriteria.preferredSchema` from `null` to a
//      concrete schema, and that flip also changes the payload.
//
// The schema half of the gate has two terminal states:
//
//   a. `searchCriteria.preferredSchema` is set (typical path: cluster has
//      host data, the `SearchBar` effect flipped the URL state to the
//      detected schema, or the user saved a preference). Gate opens.
//   b. The metadata fetch settled AND we know no schema will ever be set —
//      either `time_range_metadata` reported zero available schemas
//      (genuinely empty cluster) or the fetch itself failed. Gate also
//      opens so the empty state / degraded render can surface; without
//      this branch the fetch would block indefinitely on those clusters.
//
// Gating on the value alone (`preferredSchema != null`) regresses (b);
// gating on `!isPending` alone regresses (a) by firing once before
// `SearchBar` has flipped the URL state.
//
// Why this lives in a separate hook (not inside `useUnifiedSearch`):
// `HostsTimeRangeMetadataProvider` consumes `useUnifiedSearchContext` for
// `parsedDateRange` + `buildQuery`, so reading the metadata context from
// inside `useUnifiedSearch` itself would form a provider cycle —
// `UnifiedSearchProvider` is mounted above `HostsTimeRangeMetadataProvider`
// and the metadata context would not exist yet. By gating downstream
// (inside the metadata provider's subtree) the dependency stays one-way.

import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTimeRangeMetadataContext } from '../../../../hooks/use_time_range_metadata';
import { useUnifiedSearchContext } from './use_unified_search';

export const useHostsPageReady = (): boolean => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { metricsView } = useMetricsDataViewContext();
  const { data: timeRangeMetadata, status: timeRangeMetadataStatus } =
    useTimeRangeMetadataContext();

  const schemaSettled =
    searchCriteria.preferredSchema != null ||
    timeRangeMetadataStatus === FETCH_STATUS.FAILURE ||
    (timeRangeMetadataStatus === FETCH_STATUS.SUCCESS &&
      (timeRangeMetadata?.schemas?.length ?? 0) === 0);

  return metricsView?.dataViewReference != null && schemaSettled;
};
