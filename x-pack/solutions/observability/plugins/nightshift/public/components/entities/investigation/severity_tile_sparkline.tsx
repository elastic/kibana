/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  AreaSeries,
  Chart,
  CurveType,
  LineSeries,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { useChartThemes } from '../../../hooks/use_chart_themes';
import type { SeverityTrendPoint } from './severity_tiles_trend';

const CHART_HEIGHT_PX = 44;

export interface SeverityTileSparklineProps {
  data: readonly SeverityTrendPoint[];
  lineColor: string;
  fillColor: string;
  /** Shared peak across the four tiles so sparklines share a Y scale. */
  valueMax: number;
  'aria-label': string;
}

export const SeverityTileSparkline = ({
  data,
  lineColor,
  fillColor,
  valueMax,
  'aria-label': ariaLabel,
}: SeverityTileSparklineProps): React.ReactElement => {
  const { baseTheme, sparklineTheme } = useChartThemes();
  const series = useMemo(
    () => data.map((point) => ({ x: point.time, y: point.value })),
    [data]
  );
  const yMax = Math.max(1, valueMax);
  const domainSeries = useMemo(
    () => [
      { x: series[0]?.x ?? 0, y: 0 },
      { x: series[series.length - 1]?.x ?? 1, y: yMax },
    ],
    [series, yMax]
  );

  return (
    <div
      aria-label={ariaLabel}
      role="img"
      css={{ width: '100%', height: CHART_HEIGHT_PX, minWidth: 0 }}
    >
      <Chart size={{ width: '100%', height: CHART_HEIGHT_PX }}>
        <Settings
          baseTheme={baseTheme}
          theme={sparklineTheme}
          showLegend={false}
          xDomain={{
            min: series[0]?.x ?? 0,
            max: series[series.length - 1]?.x ?? 1,
          }}
        />
        <Tooltip type="none" />
        <AreaSeries
          id="severity-trend-area"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={series}
          curve={CurveType.CURVE_MONOTONE_X}
          color={fillColor}
          areaSeriesStyle={{ area: { opacity: 0.35 } }}
        />
        <LineSeries
          id="severity-trend-line"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={series}
          curve={CurveType.CURVE_MONOTONE_X}
          color={lineColor}
          lineSeriesStyle={{
            line: { strokeWidth: 1.5 },
            point: { visible: 'never' },
          }}
        />
        {/* Invisible domain series keeps every tile on the shared Y max. */}
        <LineSeries
          id="severity-trend-domain"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={domainSeries}
          color="transparent"
          lineSeriesStyle={{ line: { strokeWidth: 0 }, point: { visible: 'never' } }}
        />
      </Chart>
    </div>
  );
};
