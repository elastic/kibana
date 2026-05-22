/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PoC-only — the pre-Tier-3 Lens-driven KPI strip. Mirrors what the page
// rendered before P15a/P15b: four parallel Lens `metric` charts with the
// trendline restored, sharing the same `buildCombinedAssetFilter` derived
// from the table's host set.
//
// Stays alongside the new `<HostKpiTiles>` purely so the gear toggle can
// flip between the two for a like-for-like perf comparison. Delete this
// file (and remove the branch from `kpi_charts.tsx`) when the PoC lands.

import React, { useMemo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import type { LensConfig } from '@kbn/lens-embeddable-utils';
import { useReloadRequestTimeContext } from '../../../../../hooks/use_reload_request_time';
import { Kpi } from '../../../../../components/asset_details/components/kpis/kpi';
import { useHostKpiCharts } from '../../../../../components/asset_details/hooks/use_host_metrics_charts';
import { buildCombinedAssetFilter } from '../../../../../utils/filters/build';
import { useMetricsDataViewContext } from '../../../../../containers/metrics_source';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';
import { usePocSettingsContext } from '../../hooks/use_poc_settings';
import { getSubtitle } from './kpi_charts';

// P15a — the inventory model dropped `trendLine: true` from these four
// configs. To make the legacy toggle a faithful "before" we paint it back
// in here so the Lens chart fires the original `date_histogram` sub-agg.
type KpiLensConfig = LensConfig & { id: string; trendLine?: boolean };

export const LegacyKpiCharts = () => {
  const { searchCriteria, parsedDateRange } = useUnifiedSearchContext();
  const { reloadRequestTime } = useReloadRequestTimeContext();
  const { hostNodes, loading: hostsLoading } = useHostsViewContext();
  const { loading: hostCountLoading, count: hostCount } = useHostCountContext();
  const { metricsView } = useMetricsDataViewContext();
  // P15a — when ON, the legacy Lens KPI charts render without their per-
  // tile `date_histogram` sparkline (this is what the inventory model emits
  // today). When OFF, we restore `trendLine: true` so the comparison sees
  // the full pre-P15 cost.
  const { dropKpiTrendline } = usePocSettingsContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;
  const loading = hostsLoading || hostCountLoading;

  const filters = shouldUseSearchCriteria
    ? [...searchCriteria.filters, ...(searchCriteria.panelFilters ?? [])]
    : [
        buildCombinedAssetFilter({
          field: 'host.name',
          values: hostNodes.map((p) => p.name),
          dataView: metricsView?.dataViewReference,
        }),
      ];

  const getSubtitleFn = useMemo(
    () => (formulaValue: string) =>
      getSubtitle({
        limit: searchCriteria.limit,
        hostCount,
        formulaValue,
      }),
    [searchCriteria.limit, hostCount]
  );

  const baseCharts = useHostKpiCharts({
    indexPattern: metricsView?.dataViewReference?.getIndexPattern(),
    getSubtitle: getSubtitleFn,
    schema: searchCriteria.preferredSchema,
  });

  const chartsForRender: KpiLensConfig[] = useMemo(
    () =>
      dropKpiTrendline
        ? (baseCharts as KpiLensConfig[])
        : baseCharts.map((chart) => ({ ...chart, trendLine: true } as KpiLensConfig)),
    [baseCharts, dropKpiTrendline]
  );

  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: parsedDateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    filters,
    reloadRequestTime,
    charts: chartsForRender,
  });

  return (
    <>
      {afterLoadedState.charts.map((chartProps: KpiLensConfig) => (
        <EuiFlexItem key={chartProps.id}>
          <Kpi
            {...chartProps}
            dateRange={afterLoadedState.dateRange}
            filters={afterLoadedState.filters}
            query={afterLoadedState.query}
            lastReloadRequestTime={afterLoadedState.reloadRequestTime}
            loading={loading}
          />
        </EuiFlexItem>
      ))}
    </>
  );
};
