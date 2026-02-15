/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiEmptyPrompt,
  useEuiTheme,
} from '@elastic/eui';
import { Axis, Chart, CurveType, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import React, { memo, useMemo } from 'react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { HealthData } from './constants';
import { getP } from './constants';

const LINE_STYLE = { point: { visible: 'never' as const } };

export const HistoricalTrendsSection = memo<{ health: HealthData }>(({ health }) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const { buckets } = health.history_over_interval;

  const executionData = useMemo(
    () =>
      buckets.map((b) => ({
        x: new Date(b.timestamp).getTime(),
        total: b.stats.number_of_executions.total,
        failed: b.stats.number_of_executions.by_outcome?.failed ?? 0,
      })),
    [buckets]
  );

  const delayData = useMemo(
    () =>
      buckets.map((b) => ({
        x: new Date(b.timestamp).getTime(),
        p95: getP(b.stats.schedule_delay_ms.percentiles, 'p95', '95.0'),
      })),
    [buckets]
  );

  const gapData = useMemo(
    () =>
      buckets.map((b) => ({
        x: new Date(b.timestamp).getTime(),
        gaps: b.stats.number_of_detected_gaps.total,
      })),
    [buckets]
  );

  if (buckets.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visLine"
        title={<h4>{'No historical data'}</h4>}
        body={<p>{'Historical buckets are not available for the selected interval.'}</p>}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Executions over time */}
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>{'Executions Over Time'}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <Chart size={{ height: 180 }}>
          <Settings baseTheme={baseTheme} showLegend legendPosition="right" />
          <LineSeries
            id="total-executions"
            name="Total"
            data={executionData}
            xAccessor="x"
            yAccessors={['total']}
            xScaleType={ScaleType.Time}
            curve={CurveType.CURVE_MONOTONE_X}
            color={euiTheme.colors.vis.euiColorVis1}
            lineSeriesStyle={LINE_STYLE}
          />
          <LineSeries
            id="failed-executions"
            name="Failed"
            data={executionData}
            xAccessor="x"
            yAccessors={['failed']}
            xScaleType={ScaleType.Time}
            curve={CurveType.CURVE_MONOTONE_X}
            color={euiTheme.colors.vis.euiColorVis9}
            lineSeriesStyle={LINE_STYLE}
          />
          <Axis id="bottom" position={Position.Bottom} />
          <Axis id="left" position={Position.Left} />
        </Chart>
      </EuiFlexItem>

      {/* Schedule delay over time */}
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>{'p95 Schedule Delay Over Time'}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <Chart size={{ height: 180 }}>
          <Settings baseTheme={baseTheme} showLegend={false} />
          <LineSeries
            id="p95-delay"
            name="p95 Delay (ms)"
            data={delayData}
            xAccessor="x"
            yAccessors={['p95']}
            xScaleType={ScaleType.Time}
            curve={CurveType.CURVE_MONOTONE_X}
            color={euiTheme.colors.vis.euiColorVis5}
            lineSeriesStyle={LINE_STYLE}
          />
          <Axis id="bottom" position={Position.Bottom} />
          <Axis id="left" position={Position.Left} tickFormat={(v) => `${v} ms`} />
        </Chart>
      </EuiFlexItem>

      {/* Gaps over time */}
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>{'Detected Gaps Over Time'}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <Chart size={{ height: 180 }}>
          <Settings baseTheme={baseTheme} showLegend={false} />
          <LineSeries
            id="gaps-over-time"
            name="Gaps"
            data={gapData}
            xAccessor="x"
            yAccessors={['gaps']}
            xScaleType={ScaleType.Time}
            curve={CurveType.CURVE_MONOTONE_X}
            color={euiTheme.colors.vis.euiColorVis9}
            lineSeriesStyle={LINE_STYLE}
          />
          <Axis id="bottom" position={Position.Bottom} />
          <Axis id="left" position={Position.Left} />
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
HistoricalTrendsSection.displayName = 'HistoricalTrendsSection';
