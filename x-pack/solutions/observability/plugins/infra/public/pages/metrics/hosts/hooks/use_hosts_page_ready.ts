/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// First-paint gate shared by the Hosts page fetchers (`useHostsView`,
// `useHostCount`, `useHostsKpisEsql`). Returns `true` once both upstream
// prerequisites have settled, so each `useFetcher` fires once instead of
// twice — and, because all three read the *same* gate, the `/host` request
// and the client-side ES|QL KPI query start in the same frame (KPI latency
// is `max(/host, kpis)`, not the sum). Don't reintroduce per-hook readiness
// checks that would re-serialise the fetches.
//
// The two prerequisites both shift the `useFetcher` payload identity on
// first load (and would otherwise double-fire the endpoints):
//   1. `metricsView?.dataViewReference` — undefined until the data view
//      resolves; changes `buildQuery`'s identity once defined.
//   2. `preferredSchema` — null until the `time_range_metadata` fetch lets
//      `SearchBar` flip it to a concrete schema.
//
// `schemaSettled` also opens when the metadata fetch settled but no schema
// will ever be set (empty cluster or failed fetch), otherwise the empty /
// degraded render would block indefinitely on those clusters.

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
