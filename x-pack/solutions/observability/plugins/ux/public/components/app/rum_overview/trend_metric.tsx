/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
  CurveType,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import React, { useMemo, useState } from 'react';
import type { RumTrendPoint } from '../../../../common/rum_app';

export type TrendChartType = 'area' | 'bar';

const TREND_CHART_TYPE_KEY = 'ux.rum.trendChartType';

export const useTrendChartType = (): [TrendChartType, (next: TrendChartType) => void] => {
  const [chartType, setChartType] = useState<TrendChartType>(() => {
    try {
      return window.localStorage.getItem(TREND_CHART_TYPE_KEY) === 'bar' ? 'bar' : 'area';
    } catch {
      return 'area';
    }
  });
  return [
    chartType,
    (next) => {
      setChartType(next);
      try {
        window.localStorage.setItem(TREND_CHART_TYPE_KEY, next);
      } catch {
        // ignore quota / private-mode failures
      }
    },
  ];
};

export function TrendChartTypeGroup({
  chartType,
  onChange,
}: {
  chartType: TrendChartType;
  onChange: (next: TrendChartType) => void;
}) {
  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.ux.overview.trends.chartTypeAriaLabel', {
        defaultMessage: 'Trend chart type',
      })}
      type="single"
      buttonSize="compressed"
      isIconOnly
      idSelected={chartType}
      options={[
        {
          id: 'area',
          label: i18n.translate('xpack.ux.overview.trends.areaChartButtonLabel', {
            defaultMessage: 'Area',
          }),
          iconType: 'chartArea',
        },
        {
          id: 'bar',
          label: i18n.translate('xpack.ux.overview.trends.barChartButtonLabel', {
            defaultMessage: 'Bar',
          }),
          iconType: 'chartBarVertical',
        },
      ]}
      onChange={(id) => onChange(id === 'bar' ? 'bar' : 'area')}
      data-test-subj="uxTrendChartType"
    />
  );
}

const formatCount = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1000)}k`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return String(value);
};

const halfWindowChange = (values: number[]): number | null => {
  if (values.length < 2) {
    return null;
  }
  const split = Math.max(1, Math.floor(values.length / 2));
  const earlier = values.slice(0, split).reduce((sum, value) => sum + value, 0);
  const later = values.slice(split).reduce((sum, value) => sum + value, 0);
  if (earlier === 0) {
    return later > 0 ? null : 0;
  }
  return (later - earlier) / earlier;
};

export function TrendMetric({
  id,
  label,
  points,
  accessor,
  color,
  invertDelta,
  chartType = 'area',
  chartHeight = 88,
  headerExtra,
}: {
  id: string;
  label: string;
  points: RumTrendPoint[];
  accessor: Exclude<keyof RumTrendPoint, 'timestamp'>;
  color: string;
  invertDelta?: boolean;
  chartType?: TrendChartType;
  chartHeight?: number;
  headerExtra?: React.ReactNode;
}) {
  const { baseTheme, theme } = useChartThemes();

  const series = useMemo(
    () =>
      points.map((point) => ({
        x: new Date(point.timestamp).getTime(),
        y: Number(point[accessor]) || 0,
      })),
    [accessor, points]
  );

  const total = series.reduce((sum, point) => sum + point.y, 0);
  const change = halfWindowChange(series.map((point) => point.y));
  const xExtents: [number, number] =
    series.length > 0 ? [series[0].x, series[series.length - 1].x] : [0, 1];
  const tickFormat = niceTimeFormatter(xExtents);
  const axisTickFormat = (value: number): string => {
    const span = xExtents[1] - xExtents[0];
    const date = new Date(value);
    if (span <= 2 * 24 * 60 * 60 * 1000) {
      return new Intl.DateTimeFormat(i18n.getLocale(), {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    }
    return new Intl.DateTimeFormat(i18n.getLocale(), { month: 'short', day: 'numeric' }).format(
      date
    );
  };

  const deltaIsUp = change != null && change > 0;
  const deltaIsDown = change != null && change < 0;
  const deltaPositive = invertDelta ? deltaIsDown : deltaIsUp;
  const deltaNegative = invertDelta ? deltaIsUp : deltaIsDown;
  const deltaEuiColor = deltaPositive ? 'success' : deltaNegative ? 'danger' : 'subdued';

  const deltaLabel =
    change == null
      ? i18n.translate('xpack.ux.overview.trends.noCompare', { defaultMessage: 'n/a' })
      : `${change > 0 ? '+' : ''}${Math.round(change * 100)}%`;

  return (
    <div data-test-subj={`uxOverviewTrend-${id}`}>
      <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {label}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="m">
            <strong>{formatCount(total)}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.ux.overview.trends.vsEarlierTooltip', {
              defaultMessage: 'Later half of this range vs earlier half',
            })}
          >
            <EuiText size="xs" color={deltaEuiColor} tabIndex={0}>
              {change != null && change !== 0 && (
                <EuiIcon
                  type={deltaIsUp ? 'sortUp' : 'sortDown'}
                  size="s"
                  color={deltaEuiColor}
                  aria-hidden={true}
                />
              )}{' '}
              {deltaLabel}
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
        {headerExtra ? <EuiFlexItem grow={false}>{headerExtra}</EuiFlexItem> : null}
      </EuiFlexGroup>
      <div
        css={css`
          height: ${chartHeight}px;
          width: 100%;
        `}
      >
        {series.length === 0 ? (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.overview.trends.noData', {
              defaultMessage: 'No data in this range',
            })}
          </EuiText>
        ) : (
          <Chart size={{ height: chartHeight, width: '100%' }}>
            <Settings
              baseTheme={baseTheme}
              theme={[
                {
                  chartMargins: { left: 0, right: 4, top: 8, bottom: 10 },
                  chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
                  background: { color: 'transparent' },
                  scales: { barsPadding: 0.18 },
                },
                ...theme,
              ]}
              showLegend={false}
              locale={i18n.getLocale()}
            />
            <Tooltip headerFormatter={({ value }) => tickFormat(Number(value))} />
            <Axis
              id={`${id}-y`}
              position={Position.Left}
              ticks={2}
              tickFormat={(value) => formatCount(Number(value))}
              domain={{ min: 0, max: NaN }}
              style={{
                tickLine: { visible: false },
                axisLine: { visible: false },
              }}
            />
            <Axis
              id={`${id}-x`}
              position={Position.Bottom}
              ticks={3}
              timeAxisLayerCount={0}
              tickFormat={(value) => axisTickFormat(Number(value))}
              style={{
                tickLine: { visible: false },
                axisLine: { visible: false },
              }}
            />
            {chartType === 'bar' ? (
              <BarSeries
                id={id}
                name={label}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={series}
                color={color}
                enableHistogramMode
                barSeriesStyle={{
                  rect: { opacity: 0.85 },
                }}
              />
            ) : (
              <AreaSeries
                id={id}
                name={label}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={series}
                color={color}
                curve={CurveType.CURVE_MONOTONE_X}
                areaSeriesStyle={{
                  line: { strokeWidth: 1.5 },
                  area: { opacity: 0.18 },
                  point: { visible: 'never' },
                }}
              />
            )}
          </Chart>
        )}
      </div>
    </div>
  );
}
