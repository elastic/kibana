/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiBasicTable, useEuiTheme } from '@elastic/eui';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import React, { memo, useMemo } from 'react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { HealthData } from './types';
import { CHART_HEIGHT } from './constants';
import * as i18n from './translations';

interface PerformanceRow {
  metric: string;
  p50: number;
  p95: number;
  p99: number;
  p999: number;
}

export const PerformanceSection = memo(function PerformanceSection({
  health,
}: {
  health: HealthData;
}) {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const stats = health.stats_over_interval;

  const rows = useMemo<PerformanceRow[]>(
    () => [
      buildPerfRow(i18n.EXECUTION_DURATION, stats.execution_duration_ms),
      buildPerfRow(i18n.SEARCH_DURATION, stats.search_duration_ms),
      buildPerfRow(i18n.INDEXING_DURATION, stats.indexing_duration_ms),
      buildPerfRow(i18n.SCHEDULE_DELAY, stats.schedule_delay_ms),
    ],
    [stats]
  );

  const barData = useMemo(
    () =>
      rows.flatMap((row) => [
        { percentile: 'p50', metric: row.metric, value: row.p50 },
        { percentile: 'p95', metric: row.metric, value: row.p95 },
        { percentile: 'p99', metric: row.metric, value: row.p99 },
        { percentile: 'p99.9', metric: row.metric, value: row.p999 },
      ]),
    [rows]
  );

  const metricColors = useMemo(
    () => [
      euiTheme.colors.vis.euiColorVis0,
      euiTheme.colors.vis.euiColorVis1,
      euiTheme.colors.vis.euiColorVis2,
      euiTheme.colors.vis.euiColorVis3,
    ],
    [euiTheme]
  );

  return (
    <>
      <Chart size={{ height: CHART_HEIGHT }}>
        <Settings baseTheme={baseTheme} showLegend legendPosition="right" />
        <BarSeries
          id="performancePercentiles"
          data={barData}
          xAccessor="percentile"
          yAccessors={['value']}
          splitSeriesAccessors={['metric']}
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          color={metricColors}
        />
        <Axis id="bottom" position={Position.Bottom} />
        <Axis id="left" position={Position.Left} tickFormat={(v) => `${v} ms`} />
      </Chart>
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={rows}
        columns={PERF_COLUMNS}
        tableCaption={i18n.PERFORMANCE_TABLE_CAPTION}
        compressed
      />
    </>
  );
});

const buildPerfRow = (
  label: string,
  agg: { percentiles: Record<string, number> } | undefined
): PerformanceRow => ({
  metric: label,
  p50: agg?.percentiles['50.0'] ?? 0,
  p95: agg?.percentiles['95.0'] ?? 0,
  p99: agg?.percentiles['99.0'] ?? 0,
  p999: agg?.percentiles['99.9'] ?? 0,
});

const PERF_COLUMNS: Array<EuiBasicTableColumn<PerformanceRow>> = [
  { field: 'metric', name: i18n.METRIC_COLUMN, width: '30%' },
  { field: 'p50', name: 'p50', render: (v: number) => `${Math.round(v)} ms` },
  { field: 'p95', name: 'p95', render: (v: number) => `${Math.round(v)} ms` },
  { field: 'p99', name: 'p99', render: (v: number) => `${Math.round(v)} ms` },
  { field: 'p999', name: 'p99.9', render: (v: number) => `${Math.round(v)} ms` },
];
