/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiScreenReaderOnly, useEuiTheme, useResizeObserver } from '@elastic/eui';
import {
  AreaSeries,
  Axis,
  Chart,
  ColorVariant,
  CurveType,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
  type PointStyleAccessor,
} from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import { useKibanaTimeZone } from '../../hooks/use_kibana_time_zone';

export interface SparklinePoint {
  x: number;
  y: number;
}

/**
 * The `euiTheme.size` key the chart is drawn at, exported so the card's loading
 * skeleton reserves exactly the height the chart will occupy — a literal in
 * either place would let the two drift and make the card jump on load.
 */
export const SPARKLINE_HEIGHT_SIZE = 'xxxl';

const CHART_MARGINS = { top: 2, bottom: 0, left: 2, right: 6 } as const;
/** Pixels the zero line sits above the canvas floor, so an empty category still draws. */
const BASELINE_PX = 6;
/** Pixels of headroom above the peak so the end dot (radius below) never clips. */
const HEADROOM_PX = 4;
/** Pixels the x axis runs past "Now", so the line does not stop on the card edge. */
const FLAT_TAIL_PX = 4;
const ENDPOINT_RADIUS_PX = 3;
const LINE_STROKE_WIDTH_PX = 1.5;
const AREA_FILL_OPACITY = 0.2;

const PARTIAL_THEME = {
  chartMargins: CHART_MARGINS,
  chartPaddings: { top: 0, bottom: 0, left: 0, right: 0 },
  background: { color: 'transparent' },
};

interface TrendSparklineProps {
  series: SparklinePoint[];
  /** Already resolved to a real colour value by the parent. */
  color: string;
  ariaLabel: string;
  /** Used as the @elastic/charts spec id, so it must not change with locale. */
  panelId: string;
  seriesName: string;
  /**
   * Renders the end of the bucket's time range in the tooltip header. Required
   * rather than defaulted: a default that silently disagrees with the window the
   * data was fetched for produces wrong tooltips with no type error.
   */
  bucketMinutes: number;
  /**
   * Peak shared across the sibling cards so 5 / 1 / 2 read against one scale. Required for
   * the same reason as `bucketMinutes`: a per-tile fallback would be a second, silent scale.
   */
  yMax: number;
}

/**
 * Compact trend line for one proposal category: area wash, a thin line, and a dot on the
 * current value. The y domain starts a few pixels below zero so an empty category still shows
 * a line, and the x domain runs a few pixels past "Now" so the line does not end abruptly.
 * The data itself is passed through untouched.
 */
export const TrendSparkline: React.FC<TrendSparklineProps> = ({
  series,
  color,
  ariaLabel,
  panelId,
  seriesName,
  bucketMinutes,
  yMax,
}) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const locale = i18n.getLocale();
  const timeZone = useKibanaTimeZone();

  // State, not a ref: the observer must attach on mount, and a ref read during render is
  // still null then, which would leave the chart hidden until an unrelated re-render.
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
  const { width: chartWidth } = useResizeObserver(wrapper, 'width');
  const chartHeight = parseInt(euiTheme.size[SPARKLINE_HEIGHT_SIZE], 10);

  const first = series[0];
  const last = series[series.length - 1];

  // Vertical geometry in data units: lift zero off the floor and leave room for the dot.
  const peak = Math.max(1, yMax);
  const plotHeight = chartHeight - CHART_MARGINS.top - CHART_MARGINS.bottom;
  const countPerPx = peak / Math.max(1, plotHeight - BASELINE_PX - HEADROOM_PX);
  const yDomain = { min: -BASELINE_PX * countPerPx, max: peak + HEADROOM_PX * countPerPx };

  // Horizontal tail: extend the axis (not the data) past the last bucket.
  const plotWidth = chartWidth - CHART_MARGINS.left - CHART_MARGINS.right;
  const span = first && last ? last.x - first.x : 0;
  const tailMs = span > 0 ? (FLAT_TAIL_PX * span) / Math.max(1, plotWidth - FLAT_TAIL_PX) : 0;
  const xDomain = first && last ? { min: first.x, max: last.x + tailMs } : undefined;

  const lastX = last?.x;
  const endpointStyle = useCallback<PointStyleAccessor>(
    ({ x }) =>
      x === lastX
        ? {
            radius: ENDPOINT_RADIUS_PX,
            fill: ColorVariant.Series,
            stroke: ColorVariant.Series,
            strokeWidth: 0,
            opacity: 1,
          }
        : null,
    [lastX]
  );

  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone };
  // `value` is the raw x, i.e. the bucket's start timestamp in ms.
  const headerFormatter = ({ value }: { value: number }) => {
    const start = new Date(value);
    const end = new Date(value + bucketMinutes * 60 * 1000);
    return `${start.toLocaleTimeString(locale, timeOpts)} – ${end.toLocaleTimeString(
      locale,
      timeOpts
    )}`;
  };
  // Goes on the series as `tickFormat`, which is where the tooltip reads the
  // value format from — `Tooltip` no longer takes a `valueFormatter`.
  const valueFormatter = (count: number) =>
    i18n.translate('xpack.alertzero.proposalsTrendChart.tooltipOpen', {
      defaultMessage: '{count} open',
      values: { count },
    });

  const areaSeriesStyle = useMemo(
    () => ({
      area: { fill: color, opacity: AREA_FILL_OPACITY, visible: true },
      line: { stroke: color, strokeWidth: LINE_STROKE_WIDTH_PX, visible: true },
      // Points are drawn but zero-sized; the accessor grows only the "Now" point.
      point: { visible: 'always' as const, radius: 0, strokeWidth: 0 },
    }),
    [color]
  );

  return (
    <>
      <EuiScreenReaderOnly>
        <span>{ariaLabel}</span>
      </EuiScreenReaderOnly>
      <div ref={setWrapper} css={{ width: '100%', height: chartHeight, minWidth: 0 }}>
        {chartWidth > 0 && series.length > 0 && (
          <Chart
            size={{ height: chartHeight, width: chartWidth }}
            aria-hidden="true"
            data-test-subj="alertZeroProposalsTrendSparkline"
          >
            <Settings
              theme={[PARTIAL_THEME]}
              baseTheme={chartBaseTheme}
              showLegend={false}
              locale={locale}
              xDomain={xDomain}
            />
            <Tooltip type={TooltipType.VerticalCursor} headerFormatter={headerFormatter} />
            <Axis
              id={`${panelId}-y`}
              position={Position.Left}
              hide={true}
              gridLine={{ visible: false }}
              domain={yDomain}
            />
            <AreaSeries
              id={panelId}
              name={seriesName}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={series}
              timeZone={timeZone}
              curve={CurveType.CURVE_MONOTONE_X}
              color={color}
              yNice={false}
              areaSeriesStyle={areaSeriesStyle}
              pointStyleAccessor={endpointStyle}
              tickFormat={valueFormatter}
            />
          </Chart>
        )}
      </div>
    </>
  );
};
