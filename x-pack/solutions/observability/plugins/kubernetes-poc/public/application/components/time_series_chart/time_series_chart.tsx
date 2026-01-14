/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { TickFormatter } from '@elastic/charts';
import {
  AnnotationDomainType,
  Axis,
  Chart,
  CurveType,
  LineAnnotation,
  LineSeries,
  AreaSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
  niceTimeFormatByDay,
} from '@elastic/charts';
import { EuiIcon, EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import type { FormattedChangePoint } from './change_point_utils';
import { ChangePointAnnotationTooltip, ChangePointMarkerIcon } from './change_point_annotation';

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number | null;
}

export interface TimeSeriesChartProps {
  /** Unique identifier for the chart */
  id: string;
  /** Chart title displayed above the visualization */
  title: string;
  /** Time series data points */
  data: TimeSeriesDataPoint[];
  /** Change points to display as annotations */
  changePoints?: FormattedChangePoint[];
  /** Whether data is loading */
  loading?: boolean;
  /** Chart height in pixels */
  height?: number;
  /** Series name for the legend/tooltip */
  seriesName?: string;
  /** Y-axis value formatter */
  valueFormatter?: TickFormatter;
  /** Series type: line or area */
  seriesType?: 'line' | 'area';
  /** Line/area color */
  color?: string;
  /** Whether to show the legend */
  showLegend?: boolean;
  /** Whether to show axis labels */
  showAxisLabels?: boolean;
  /** Y-axis domain min */
  yMin?: number;
  /** Y-axis domain max */
  yMax?: number;
}

/**
 * Reusable time series chart component with change point annotations
 *
 * This component renders a line or area chart using @elastic/charts and
 * overlays change point annotations detected via the CHANGE_POINT ES|QL function.
 */
export function TimeSeriesChart({
  id,
  title,
  data,
  changePoints = [],
  loading = false,
  height = 200,
  seriesName,
  valueFormatter,
  seriesType = 'line',
  color,
  showLegend = false,
  showAxisLabels = true,
  yMin,
  yMax,
}: TimeSeriesChartProps) {
  const { plugins } = usePluginContext();
  const theme = useEuiTheme().euiTheme;

  const baseTheme = plugins.charts.theme.useChartsBaseTheme();
  const defaultTheme = plugins.charts.theme.chartsDefaultBaseTheme;

  // Calculate time range for formatting
  const timeRange = useMemo(() => {
    if (data.length === 0) return { min: Date.now() - 3600000, max: Date.now() };
    const timestamps = data.map((d) => d.timestamp);
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps),
    };
  }, [data]);

  // Create time formatter based on the time range
  const xFormatter = useMemo(() => {
    const duration = timeRange.max - timeRange.min;
    // Use day-based formatting for ranges > 1 day
    if (duration > 86400000) {
      return niceTimeFormatByDay(1);
    }
    return niceTimeFormatter([timeRange.min, timeRange.max]);
  }, [timeRange]);

  // Default value formatter
  const defaultValueFormatter = useCallback((value: number) => value.toFixed(2), []);
  const yFormatter = valueFormatter || defaultValueFormatter;

  // Chart theme customization
  const chartTheme = useMemo(
    () => ({
      chartMargins: { left: 0, right: 0, top: 8, bottom: 0 },
      chartPaddings: { top: 8, bottom: 8 },
      lineSeriesStyle: {
        point: { visible: false },
        line: { strokeWidth: 2 },
      },
      areaSeriesStyle: {
        point: { visible: false },
        line: { strokeWidth: 2 },
        area: { opacity: 0.3 },
      },
      axes: {
        axisLine: { visible: false },
        tickLine: { visible: false },
        gridLine: {
          vertical: { visible: true, dash: [4, 4] },
          horizontal: { visible: true, dash: [4, 4] },
        },
      },
    }),
    []
  );

  // Render loading state
  if (loading) {
    return (
      <div style={{ paddingTop: '8px', paddingLeft: '8px' }}>
        <EuiText size="s" style={{ fontWeight: 700 }}>
          {title}
        </EuiText>
        <div
          style={{
            height: height - 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiLoadingSpinner size="l" />
        </div>
      </div>
    );
  }

  // Render empty state
  if (data.length === 0) {
    return (
      <div style={{ paddingTop: '8px', paddingLeft: '8px' }}>
        <EuiText size="s" style={{ fontWeight: 700 }}>
          {title}
        </EuiText>
        <div
          style={{
            height: height - 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiIcon
            type="visLine"
            size="xl"
            color="subdued"
            aria-label={i18n.translate('xpack.kubernetesPoc.timeSeriesChart.noDataLabel', {
              defaultMessage: 'No data available',
            })}
          />
        </div>
      </div>
    );
  }

  const SeriesComponent = seriesType === 'area' ? AreaSeries : LineSeries;

  return (
    <div style={{ paddingTop: '8px', paddingLeft: '8px' }}>
      <EuiText size="s" style={{ fontWeight: 700 }}>
        {title}
      </EuiText>
      <Chart size={{ width: '100%', height: height - 32 }}>
        <Tooltip
          headerFormatter={(tooltipData) => xFormatter(tooltipData.value)}
          type="cross"
          snap
        />
        <Settings
          theme={[chartTheme, baseTheme]}
          baseTheme={defaultTheme}
          showLegend={showLegend}
          legendPosition={Position.Bottom}
          locale={i18n.getLocale()}
          noResults={
            <EuiIcon
              type="visLine"
              aria-label={i18n.translate('xpack.kubernetesPoc.timeSeriesChart.noResultsLabel', {
                defaultMessage: 'No results',
              })}
            />
          }
        />
        <Axis
          id="x_axis"
          position={Position.Bottom}
          hide={!showAxisLabels}
          tickFormat={xFormatter}
        />
        <Axis
          id="y_axis"
          position={Position.Left}
          hide={!showAxisLabels}
          tickFormat={yFormatter}
          domain={{ min: yMin ?? NaN, max: yMax ?? NaN }}
        />
        <SeriesComponent
          id={id}
          name={seriesName || title}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="timestamp"
          yAccessors={['value']}
          data={data}
          curve={CurveType.CURVE_MONOTONE_X}
          color={color ? [color] : undefined}
          yNice
        />
        {/* Render change point annotations */}
        {changePoints.map((changePoint, index) => {
          const annotationColor = theme.colors[changePoint.color] || theme.colors.darkShade;
          return (
            <LineAnnotation
              key={`${id}-change-point-${index}`}
              id={`${id}-change-point-${index}`}
              dataValues={[{ dataValue: changePoint.timestamp }]}
              domainType={AnnotationDomainType.XDomain}
              marker={<ChangePointMarkerIcon change={changePoint} />}
              markerPosition={Position.Top}
              style={{
                line: {
                  strokeWidth: 2,
                  stroke: annotationColor,
                  dash: [4, 4],
                  opacity: 0.8,
                },
              }}
              customTooltip={() => (
                <ChangePointAnnotationTooltip change={changePoint} xFormatter={xFormatter} />
              )}
            />
          );
        })}
      </Chart>
    </div>
  );
}
