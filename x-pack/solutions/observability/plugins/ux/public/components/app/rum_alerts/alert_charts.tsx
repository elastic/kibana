/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import React, { useMemo } from 'react';
import type { RumAlertFireBucket } from '../../../../common/rum_alert_episodes';
import type { RumAlertTemplateId } from '../../../../common/rum_alerts';
import { TrendMetric } from '../rum_overview/trend_metric';
import { useRumTrends } from '../rum_overview/use_rum_trends';

const FireArea = ({ buckets }: { buckets: RumAlertFireBucket[] }) => {
  const { euiTheme } = useEuiTheme();
  const { baseTheme, theme } = useChartThemes();
  const series = useMemo(
    () =>
      buckets.map((bucket) => ({
        x: new Date(bucket.timestamp).getTime(),
        y: bucket.fires,
      })),
    [buckets]
  );
  const total = series.reduce((sum, point) => sum + point.y, 0);
  const xExtents: [number, number] =
    series.length > 0 ? [series[0].x, series[series.length - 1].x] : [0, 1];
  const tickFormat = niceTimeFormatter(xExtents);
  const label = i18n.translate('xpack.ux.alerts.firesChartLabel', {
    defaultMessage: 'Alert fires',
  });

  return (
    <div data-test-subj="uxAlertFireTrend">
      <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {label}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="m">
            <strong>{total}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          height: 88px;
          width: 100%;
        `}
      >
        <Chart size={{ height: 88, width: '100%' }}>
          <Settings
            baseTheme={baseTheme}
            theme={[
              {
                chartMargins: { left: 0, right: 4, top: 8, bottom: 0 },
                chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
                background: { color: 'transparent' },
              },
              ...theme,
            ]}
            showLegend={false}
            locale={i18n.getLocale()}
          />
          <Tooltip headerFormatter={({ value }) => tickFormat(Number(value))} />
          <Axis
            id="ux-alert-fires-y"
            position={Position.Left}
            ticks={2}
            tickFormat={(value) => String(Math.round(Number(value)))}
            domain={{ min: 0, max: NaN }}
            style={{ tickLine: { visible: false }, axisLine: { visible: false } }}
          />
          <Axis
            id="ux-alert-fires-x"
            position={Position.Bottom}
            ticks={3}
            tickFormat={tickFormat}
            timeAxisLayerCount={1}
            style={{ tickLine: { visible: false }, axisLine: { visible: false } }}
          />
          <AreaSeries
            id="fires"
            name={label}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={series}
            color={euiTheme.colors.danger}
            curve={CurveType.CURVE_MONOTONE_X}
            areaSeriesStyle={{
              line: { strokeWidth: 1.5 },
              area: { opacity: 0.18 },
              point: { visible: 'never' },
            }}
          />
        </Chart>
      </div>
    </div>
  );
};

export function RumAlertCharts({
  fireTrend,
  templateIds,
}: {
  fireTrend: RumAlertFireBucket[];
  templateIds: Array<RumAlertTemplateId | null>;
}) {
  const { euiTheme } = useEuiTheme();
  const { points, loading } = useRumTrends();
  const showErrors = templateIds.some(
    (templateId) => templateId === 'error_rate' || templateId === 'error_spike'
  );
  const showSessions = templateIds.some(
    (templateId) => templateId === 'traffic_drop' || templateId === 'traffic_spike'
  );
  const showFires = fireTrend.length > 0;

  if (!showFires && !showErrors && !showSessions) {
    return null;
  }

  return (
    <EuiFlexGroup data-test-subj="uxAlertCharts">
      {showFires && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <FireArea buckets={fireTrend} />
          </EuiPanel>
        </EuiFlexItem>
      )}
      {showErrors && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            {loading && points.length === 0 ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <TrendMetric
                id="alert-errors"
                label={i18n.translate('xpack.ux.alerts.errorsTrendLabel', {
                  defaultMessage: 'Errors',
                })}
                points={points}
                accessor="errors"
                color={euiTheme.colors.danger}
                invertDelta
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      )}
      {showSessions && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            {loading && points.length === 0 ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <TrendMetric
                id="alert-sessions"
                label={i18n.translate('xpack.ux.alerts.sessionsTrendLabel', {
                  defaultMessage: 'Sessions',
                })}
                points={points}
                accessor="sessions"
                color={euiTheme.colors.vis.euiColorVis0}
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
