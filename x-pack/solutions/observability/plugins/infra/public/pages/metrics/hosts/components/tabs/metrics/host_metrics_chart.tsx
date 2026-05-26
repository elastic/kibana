/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P16 — replacement for the legacy `<Chart/>` (Lens xy) used by the Metrics
// tab. Renders a single host-breakdown line chart from the data already
// fetched by `useHostsMetricsTimeseries`. Uses `@elastic/charts` directly so
// the page avoids the Lens embeddable mount cost — eleven Lens mounts is the
// single largest piece of JS work on the legacy Metrics tab on cold load.
//
// Visual parity with Lens:
// - Multi-series line chart with one line per host (legend stats off — the
//   legacy charts only show the host name).
// - Time axis on `@timestamp` with a `niceTimeFormatter` for tooltips, same
//   as `inventory_view/components/timeline/timeline.tsx`.
// - Y axis formatted per metric (percent / bytes / bits / number) — same
//   shape `InfraFormatter`-driven legacy charts produced.

import React, { useMemo } from 'react';
import {
  Axis,
  Chart,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import numeral from '@elastic/numeral';
import { METRIC_CHART_HEIGHT } from '../../../../../../common/visualizations/constants';
import type {
  HostsTimeseriesMetric,
  HostsTimeseriesSeries,
} from '../../../../../../../common/http_api';

interface HostMetricsChartProps {
  metric: HostsTimeseriesMetric;
  title: string;
  series: HostsTimeseriesSeries[];
  loading: boolean;
  // Echo the bucket span the server picked so we can surface "each point is
  // a 10-minute average" in the tooltip wrapper. Optional — falls back to a
  // generic chart title when absent.
  bucketSpan?: string;
}

// Formatter table mirrors the inventory-model formula's `format` field so the
// y-axis ticks read the same as today's Lens output:
//   - `percent`: 1-based ratio → `12.3%`
//   - `bytes` / `bits`: human-readable storage / bandwidth
//   - `number`: locale-formatted integer (mostly used by IOPS)
const FORMATTERS: Record<HostsTimeseriesMetric, (value: number | null) => string> = {
  cpuUsage: fmtPercent,
  normalizedLoad1m: fmtPercent,
  memoryUsage: fmtPercent,
  memoryFree: fmtBytes,
  diskSpaceAvailable: fmtBytes,
  diskIORead: fmtNumber,
  diskIOWrite: fmtNumber,
  diskReadThroughput: fmtBytes,
  diskWriteThroughput: fmtBytes,
  rx: fmtBits,
  tx: fmtBits,
};

export const HostMetricsChart: React.FC<HostMetricsChartProps> = ({
  metric,
  title,
  series,
  loading,
  bucketSpan,
}) => {
  // Stable x-domain from the first non-empty series so the chart doesn't pan
  // around as different hosts come online / offline within the window. Using
  // the first series is safe because the server emits aligned buckets for
  // every host — they all share the same x-axis. Read from `entry.data`
  // (which still contains nulls) rather than `cleanedSeries` below so the
  // domain spans the full requested window even when the first / last
  // buckets are empty.
  const xDomain = useMemo(() => {
    for (const entry of series) {
      if (entry.data.length > 0) {
        const min = entry.data[0].x;
        const max = entry.data[entry.data.length - 1].x;
        return { min, max };
      }
    }
    return undefined;
  }, [series]);

  // `@elastic/charts` validates each datapoint and logs a warning whenever a
  // `LineSeries` receives a non-numeric `y` — including the API's explicit
  // `null` for "bucket exists, no data reported". The legacy Lens charts
  // dodge this by configuring `fit: nearest`, but we render through
  // `@elastic/charts` directly, so the equivalent is to drop the null
  // buckets up front. Visually identical (the time x-scale connects the
  // remaining points), no warning floods on every refresh / sort / page
  // change. Single pass keyed on `series` so we don't re-filter when the
  // host order shifts during pagination.
  const cleanedSeries = useMemo(
    () =>
      series.map((entry) => ({
        ...entry,
        data: entry.data.filter((point) => point.y != null),
      })),
    [series]
  );

  const formatter = FORMATTERS[metric];

  if (loading && series.length === 0) {
    return (
      <ChartPanel title={title} bucketSpan={bucketSpan}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="center"
          css={css`
            height: ${METRIC_CHART_HEIGHT}px;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ChartPanel>
    );
  }

  if (series.length === 0) {
    return (
      <ChartPanel title={title} bucketSpan={bucketSpan}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="center"
          css={css`
            height: ${METRIC_CHART_HEIGHT}px;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              {i18n.translate('xpack.infra.hostsView.metricsChart.noData', {
                defaultMessage: 'No data',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ChartPanel>
    );
  }

  return (
    <ChartPanel title={title} bucketSpan={bucketSpan}>
      <div
        css={css`
          height: ${METRIC_CHART_HEIGHT}px;
        `}
      >
        <Chart>
          <Settings
            showLegend
            legendPosition={Position.Bottom}
            xDomain={xDomain}
            // `legacyChartTheme` is not strictly required — keeping defaults
            // so the chart picks up the active EUI theme (light/dark). If we
            // need brand colours later, swap in `useTimelineChartTheme()`.
          />
          <Tooltip
            headerFormatter={({ value }) =>
              xDomain
                ? niceTimeFormatter([xDomain.min, xDomain.max])(value as number)
                : String(value)
            }
          />
          <Axis
            id="bottom"
            position={Position.Bottom}
            showOverlappingTicks
            tickFormat={xDomain ? niceTimeFormatter([xDomain.min, xDomain.max]) : (v) => String(v)}
          />
          <Axis
            id="left"
            position={Position.Left}
            tickFormat={(v) => formatter(typeof v === 'number' ? v : null)}
          />
          {cleanedSeries.map((entry) => (
            <LineSeries
              key={entry.host}
              id={entry.host}
              name={entry.host}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={entry.data}
              // Nulls are filtered above so we don't need the `fit` prop —
              // the time x-scale draws a continuous line through whatever
              // numeric points remain, which matches Lens's `fit: nearest`
              // behaviour for the single-bucket gaps that show up on idle
              // hosts (network / disk-IO metrics).
            />
          ))}
        </Chart>
      </div>
    </ChartPanel>
  );
};

interface ChartPanelProps {
  title: string;
  bucketSpan?: string;
  children: React.ReactNode;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ title, bucketSpan, children }) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="s">
    <EuiFlexGroup alignItems="baseline" gutterSize="s" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>
      {bucketSpan ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.infra.hostsView.metricsChart.bucketSpanLabel', {
              defaultMessage: 'Per {span}',
              values: { span: bucketSpan },
            })}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
    {children}
  </EuiPanel>
);

// `numeral` format strings come straight from
// `metrics_data_access/.../formulas/*.ts` so the y-axis matches what the
// legacy Lens chart rendered. The `null` branch returns the EUI default for
// no-data ("–") so axis ticks past the data range still render.
function fmtPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '–';
  return `${(value * 100).toFixed(1)}%`;
}

function fmtBytes(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '–';
  return numeral(value).format('0.0 b');
}

function fmtBits(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '–';
  return numeral(value).format('0.0 bps');
}

function fmtNumber(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '–';
  return numeral(value).format('0,0');
}
