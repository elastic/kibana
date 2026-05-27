/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, EuiFlexItem, EuiText, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { HostMetricsExplanationContent } from '../../../../../../components/lens';
import { Chart } from './chart';
import { Popover } from '../../../../../../components/popover';
import { useMetricsDataViewContext } from '../../../../../../containers/metrics_source';
import { useMetricsCharts } from '../../../hooks/use_metrics_charts';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { usePocSettingsContext } from '../../../hooks/use_poc_settings';
import { PERF_KEYS, perfTracker } from '../../../utils/perf_tracker';
import { autoBucketSpan, bucketSpanSeconds } from '../../../utils/bucket_span';
import { isSupportedEsqlMetric, toEsqlMetricsChartConfig } from './esql_metrics_chart';

export const MetricsGrid = () => {
  const { metricsView } = useMetricsDataViewContext();
  const { searchCriteria, parsedDateRange } = useUnifiedSearchContext();
  const { currentPage } = useHostsTableContext();
  const { useLensEsqlMetricsCharts } = usePocSettingsContext();

  const baseCharts = useMetricsCharts({
    indexPattern: metricsView?.dataViewReference.getIndexPattern(),
    schema: searchCriteria.preferredSchema,
  });

  // Resolved absolute ISO strings (from the unified-search context) →
  // numeric ms pair. Date.parse keeps the input narrow.
  const fromMs = useMemo(() => Date.parse(parsedDateRange.from), [parsedDateRange.from]);
  const toMs = useMemo(() => Date.parse(parsedDateRange.to), [parsedDateRange.to]);
  const span = useMemo(() => autoBucketSpan(fromMs, toMs), [fromMs, toMs]);
  const spanSeconds = useMemo(() => bucketSpanSeconds(span), [span]);

  const names = useMemo(() => currentPage.map((row) => row.name), [currentPage]);

  // When P16-A is on, rewrite each inventory chart config so its dataset
  // is an ES|QL query bounded to the current page's hosts. The chart's
  // chrome (title, legend, ybounds, fittingFunction, reference layers)
  // is preserved, so the only visual difference between the two paths is
  // the data behind the line.
  //
  // We skip the rewrite while `names` is empty — the legacy `<Chart>`
  // already shows a loading placeholder during Phase A and avoids
  // running Lens with an empty filter. Re-running through `useMemo` is
  // cheap (11 small JSON rebuilds) so a stale ES|QL string never reaches
  // Lens.
  const charts = useMemo(() => {
    if (!useLensEsqlMetricsCharts || names.length === 0) {
      return baseCharts;
    }
    return baseCharts.map((chart) => {
      const id = (chart as { id?: string }).id;
      if (!id || !isSupportedEsqlMetric(id)) {
        return chart;
      }
      return {
        ...toEsqlMetricsChartConfig({
          baseChart: chart,
          metric: id,
          names,
          span,
          spanSeconds,
        }),
        id,
      };
    });
  }, [useLensEsqlMetricsCharts, baseCharts, names, span, spanSeconds]);

  return (
    <>
      <MetricsGridHeader />
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="hostsView-metricChart">
        {charts.map((chart, index) => (
          <EuiFlexItem key={(chart as { id?: string }).id ?? index} grow={false}>
            <MetricsGridItem
              chart={chart}
              dataView={metricsView?.dataViewReference}
              perfEnabled={useLensEsqlMetricsCharts}
              span={span}
              hostsInScope={names.length}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
};

interface MetricsGridItemProps {
  chart: ReturnType<typeof useMetricsCharts>[number];
  dataView: DataView | undefined;
  perfEnabled: boolean;
  span: string;
  hostsInScope: number;
}

// One Lens chart with optional per-load perf tracking. The `onLoad` cycle
// brackets a single fetch + render: Lens fires `(true)` when it kicks
// off, then `(false)` when the result lands (or fails). We record the
// duration only when ES|QL is enabled so the legacy DSL path's wall
// times don't pollute the ES|QL distribution.
const MetricsGridItem = ({
  chart,
  dataView,
  perfEnabled,
  span,
  hostsInScope,
}: MetricsGridItemProps) => {
  const loadStartRef = useRef<number | null>(null);
  const id = (chart as { id?: string }).id ?? 'unknown';

  const handleOnLoad = useCallback(
    (isLoading: boolean) => {
      if (!perfEnabled) {
        loadStartRef.current = null;
        return;
      }
      if (isLoading) {
        loadStartRef.current = performance.now();
        return;
      }
      if (loadStartRef.current !== null) {
        const duration = performance.now() - loadStartRef.current;
        loadStartRef.current = null;
        perfTracker.record(PERF_KEYS.lensEsqlChart, duration, {
          metric: id,
          hosts: hostsInScope,
          span,
        });
      }
    },
    [perfEnabled, id, hostsInScope, span]
  );

  return <Chart {...chart} dataView={dataView} onLoad={handleOnLoad} />;
};

const MetricsGridHeader = () => (
  <EuiFlexGroup gutterSize="xs" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiText size="xs">
        {i18n.translate('xpack.infra.metricsGrid.learnMoreAboutMetricsTextLabel', {
          defaultMessage: 'Learn more about metrics',
        })}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <Popover>
        <HostMetricsExplanationContent />
      </Popover>
    </EuiFlexItem>
  </EuiFlexGroup>
);
