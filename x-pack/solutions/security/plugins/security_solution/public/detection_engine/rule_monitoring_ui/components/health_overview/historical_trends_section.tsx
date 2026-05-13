/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiEmptyPrompt,
  useEuiTheme,
} from '@elastic/eui';
import { Axis, Chart, CurveType, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { HealthData } from './types';
import * as i18n from './translations';

const LINE_STYLE = { point: { visible: 'never' as const } };

export const HistoricalTrendsSection = memo(function HistoricalTrendsSection({
  health,
}: {
  health: HealthData;
}) {
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
        p95: b.stats.schedule_delay_ms.percentiles['95.0'] ?? 0,
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
        title={<h4>{i18n.NO_HISTORICAL_DATA_TITLE}</h4>}
        body={<p>{i18n.NO_HISTORICAL_DATA_BODY}</p>}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>{i18n.EXECUTIONS_OVER_TIME}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <Chart size={{ height: 180 }}>
          <Settings baseTheme={baseTheme} showLegend legendPosition="right" />
          <LineSeries
            id="total-executions"
            name={i18n.TOTAL_SERIES}
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
            name={i18n.FAILED_SERIES}
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

      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>{i18n.P95_DELAY_OVER_TIME}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <Chart size={{ height: 180 }}>
          <Settings baseTheme={baseTheme} showLegend={false} />
          <LineSeries
            id="p95-delay"
            name={i18n.P95_DELAY_SERIES}
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

      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>{i18n.GAPS_OVER_TIME}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <Chart size={{ height: 180 }}>
          <Settings baseTheme={baseTheme} showLegend={false} />
          <LineSeries
            id="gaps-over-time"
            name={i18n.GAPS_SERIES}
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
