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
import {
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
  euiPaletteColorBlind,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import type { FormattedChangePoint } from './change_point_utils';
import { ChangePointAnnotationTooltip, ChangePointMarkerIcon } from './change_point_annotation';

export interface GroupedDataPoint {
  timestamp: number;
  value: number | null;
  group: string;
}

export interface GroupedTimeSeriesChartProps {
  /** Unique identifier for the chart */
  id: string;
  /** Chart title displayed above the visualization */
  title: string;
  /** Time series data points grouped by category */
  data: GroupedDataPoint[];
  /** Change points to display as annotations (keyed by group name) */
  changePoints?: Record<string, FormattedChangePoint[]>;
  /** Whether data is loading */
  loading?: boolean;
  /** Chart height in pixels */
  height?: number;
  /** Y-axis value formatter */
  valueFormatter?: TickFormatter;
  /** Series type: line or area */
  seriesType?: 'line' | 'area';
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
 * Grouped time series chart component with change point annotations
 *
 * This component renders a line or area chart with multiple series based on a grouping field
 * (e.g., cluster name) using @elastic/charts and overlays change point annotations.
 */
export function GroupedTimeSeriesChart({
  id,
  title,
  data,
  changePoints = {},
  loading = false,
  height = 316,
  valueFormatter,
  seriesType = 'line',
  showLegend = true,
  showAxisLabels = true,
  yMin,
  yMax,
}: GroupedTimeSeriesChartProps) {
  const { plugins } = usePluginContext();
  const theme = useEuiTheme().euiTheme;

  const baseTheme = plugins.charts.theme.useChartsBaseTheme();
  const defaultTheme = plugins.charts.theme.chartsDefaultBaseTheme;

  // Get unique groups from data
  const groups = useMemo(() => {
    const uniqueGroups = new Set(data.map((d) => d.group));
    return Array.from(uniqueGroups).sort();
  }, [data]);

  // Generate colors for each group
  const groupColors = useMemo(() => {
    const palette = euiPaletteColorBlind();
    return groups.reduce((acc, group, index) => {
      acc[group] = palette[index % palette.length];
      return acc;
    }, {} as Record<string, string>);
  }, [groups]);

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

  // Group data by group name for rendering
  const groupedData = useMemo(() => {
    return groups.reduce((acc, group) => {
      acc[group] = data
        .filter((d) => d.group === group)
        .map((d) => ({ timestamp: d.timestamp, value: d.value }))
        .sort((a, b) => a.timestamp - b.timestamp);
      return acc;
    }, {} as Record<string, Array<{ timestamp: number; value: number | null }>>);
  }, [data, groups]);

  // Flatten all change points for rendering
  const allChangePoints = useMemo(() => {
    return Object.entries(changePoints).flatMap(([groupName, points]) =>
      points.map((point, index) => ({
        ...point,
        groupName,
        uniqueId: `${groupName}-${index}`,
      }))
    );
  }, [changePoints]);

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
            aria-label={i18n.translate('xpack.kubernetesPoc.groupedChart.noDataLabel', {
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
              aria-label={i18n.translate('xpack.kubernetesPoc.groupedChart.noResultsLabel', {
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
        {/* Render a series for each group */}
        {groups.map((group) => (
          <SeriesComponent
            key={group}
            id={`${id}-${group}`}
            name={group}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={['value']}
            data={groupedData[group]}
            curve={CurveType.CURVE_MONOTONE_X}
            color={[groupColors[group]]}
            yNice
          />
        ))}
        {/* Render change point annotations */}
        {allChangePoints.map((changePoint) => {
          const annotationColor = theme.colors[changePoint.color] || theme.colors.darkShade;
          return (
            <LineAnnotation
              key={`${id}-change-point-${changePoint.uniqueId}`}
              id={`${id}-change-point-${changePoint.uniqueId}`}
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
