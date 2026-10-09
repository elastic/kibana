/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// First-paint gate shared by the Hosts page fetchers so each `useFetcher` fires
// once (not twice) and the `/host` request and KPI ES|QL query start in the
// same frame (KPI latency is `max(/host, kpis)`, not the sum). Don't add
// per-hook readiness checks — that re-serialises the fetches. The gate opens
// once the data view resolves and the schema settles, where "settled" also
// covers an empty/failed metadata fetch so degraded clusters don't hang.

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
