/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hosts page KPI strip — four headline tiles (CPU Usage, Normalized Load,
// Memory Usage, Disk Usage) rendered as Lens `chartType: 'metric'`
// embeddables with the inventory-model formula configs and the
// per-tile trendline that ships on main.
//
// `getSubtitle` is exported so legacy tests can assert the "Average (of N
// hosts)" copy logic without re-mounting the whole strip.

import React, { useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
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
import { PERF_KEYS, perfTracker } from '../../utils/perf_tracker';
import {
  MAX_AS_FIRST_FUNCTION_PATTERN,
  AVG_OR_AVERAGE_AS_FIRST_FUNCTION_PATTERN,
} from '../../../../../components/asset_details/constants';
import { isSupportedEsqlKpi, toEsqlKpiChartConfig } from './esql_kpi_chart';
import { HostKpiTiles } from './host_kpi_tiles';

export const getSubtitle = ({
  formulaValue,
  limit,
  hostCount,
}: {
  formulaValue: string;
  limit: number;
  hostCount: number;
}) => {
  if (MAX_AS_FIRST_FUNCTION_PATTERN.test(formulaValue)) {
    return limit < hostCount
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max.limit', {
          defaultMessage: 'Max (of {limit} hosts)',
          values: { limit },
        })
      : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max', {
          defaultMessage: 'Max',
        });
  }
  if (AVG_OR_AVERAGE_AS_FIRST_FUNCTION_PATTERN.test(formulaValue)) {
    return limit < hostCount
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: { limit },
        })
      : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average', {
          defaultMessage: 'Average',
        });
  }
  return limit < hostCount
    ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
        defaultMessage: 'of {limit} hosts',
        values: { limit },
      })
    : '';
};

// The inventory model omits `trendLine` from these four configs because
// other surfaces (e.g. the asset detail flyout) reuse the same catalogue
// and don't want the per-tile sparkline. The Hosts page strip on main
// has always painted the trendline, so we add it back here. Lens's
// `chartType: 'metric'` formula path picks up `trendLine: true` and
// fires a second `date_histogram` sub-aggregation per tile.
type KpiLensConfig = LensConfig & { id: string; trendLine?: boolean };

// Three-way switch between the KPI render paths. The choice of subtree is
// stable for a given mount, so each branch's hook order is independent —
// flipping the toggle remounts the subtree, which is the behaviour we
// want for an A/B/C benchmark (cold-start timings reset between paths).
//
// Precedence (highest first):
//   1. `useEsqlEndpointKpi` (P15b) — server endpoint + plain indicator,
//      bypasses Lens entirely.
//   2. `useLensEsqlKpiCharts` (P15c) — Lens metric viz, ES|QL datasource,
//      no trendline.
//   3. neither — Lens metric viz, DSL/formula datasource, trendline per
//      the `kpiTrendline` flag (the pre-PoC main behaviour).
export const KpiCharts = () => {
  const { useEsqlEndpointKpi } = usePocSettingsContext();
  if (useEsqlEndpointKpi) {
    return <HostKpiTiles />;
  }
  return <LensKpiCharts />;
};

const LensKpiCharts = () => {
  const { searchCriteria, parsedDateRange } = useUnifiedSearchContext();
  const { reloadRequestTime } = useReloadRequestTimeContext();
  const { hostNodes, loading: hostsLoading } = useHostsViewContext();
  const { loading: hostCountLoading, count: hostCount } = useHostCountContext();
  const { metricsView } = useMetricsDataViewContext();
  const { useLensEsqlKpiCharts, kpiTrendline } = usePocSettingsContext();

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

  // When P15c is on, swap each KPI tile's `dataset` / `value` to the ES|QL
  // scalar query. The rest of the chart's chrome — `title`, `format`,
  // `decimals`, `subtitle`, `seriesColor` — flows through from the
  // inventory model config so the two render paths are visually identical
  // for the headline number. The trendline (P15a) is intentionally
  // disabled on the ES|QL path (see `esql_kpi_chart.ts` header); the DSL
  // path still honours `kpiTrendline`.
  //
  // Host scoping comes from the embeddable's `filters` prop (the
  // `host.name` filter built above) — Lens converts it into the ES|QL
  // `filter` request parameter, so the swap is safe even on the initial
  // render where `hostNodes` hasn't resolved yet.
  const chartsForRender: KpiLensConfig[] = useMemo(() => {
    if (useLensEsqlKpiCharts) {
      return baseCharts.map((chart) => {
        const id = (chart as { id?: string }).id;
        if (!id || !isSupportedEsqlKpi(id)) {
          return { ...chart, trendLine: kpiTrendline } as KpiLensConfig;
        }
        return toEsqlKpiChartConfig({
          baseChart: chart as KpiLensConfig,
          metric: id,
        });
      });
    }
    return baseCharts.map((chart) => ({ ...chart, trendLine: kpiTrendline } as KpiLensConfig));
  }, [baseCharts, useLensEsqlKpiCharts, kpiTrendline]);

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
          <KpiCell
            chart={chartProps}
            dateRange={afterLoadedState.dateRange}
            filters={afterLoadedState.filters}
            query={afterLoadedState.query}
            lastReloadRequestTime={afterLoadedState.reloadRequestTime}
            loading={loading}
            perfEnabled={useLensEsqlKpiCharts}
          />
        </EuiFlexItem>
      ))}
    </>
  );
};

// Per-tile wrapper that owns the `onLoad` callback so the closure can stay
// stable between renders. Lens's `onLoad` fires twice per cycle when a
// trendline is present (once per layer); we record one sample on the
// loaded→not-loaded transition only so the perf overlay sees a single
// number per tile rather than the loading-pulse events.
const KpiCell: React.FC<{
  chart: KpiLensConfig;
  dateRange: ReturnType<typeof useUnifiedSearchContext>['parsedDateRange'];
  query?: ReturnType<typeof useUnifiedSearchContext>['searchCriteria']['query'];
  filters: ReturnType<typeof useUnifiedSearchContext>['searchCriteria']['filters'];
  lastReloadRequestTime?: number;
  loading: boolean;
  perfEnabled: boolean;
}> = ({ chart, dateRange, query, filters, lastReloadRequestTime, loading, perfEnabled }) => {
  // Track the most recent mount-start so we can attribute a wall-time to
  // each `loaded` event. Using a ref (not state) keeps this off the React
  // render path — the perf overlay subscribes to `perfTracker` directly.
  const startedAt = useRef<number | null>(null);
  if (startedAt.current === null) {
    startedAt.current = performance.now();
  }

  const handleOnLoad = useCallback(
    (isLoading: boolean) => {
      if (!perfEnabled) return;
      if (isLoading) {
        startedAt.current = performance.now();
        return;
      }
      if (startedAt.current !== null) {
        const duration = performance.now() - startedAt.current;
        perfTracker.record(PERF_KEYS.lensEsqlKpi, duration, { tile: chart.id });
        startedAt.current = null;
      }
    },
    [perfEnabled, chart.id]
  );

  return (
    <Kpi
      {...chart}
      dateRange={dateRange}
      filters={filters}
      query={query}
      lastReloadRequestTime={lastReloadRequestTime}
      loading={loading}
      onLoad={perfEnabled ? handleOnLoad : undefined}
    />
  );
};
