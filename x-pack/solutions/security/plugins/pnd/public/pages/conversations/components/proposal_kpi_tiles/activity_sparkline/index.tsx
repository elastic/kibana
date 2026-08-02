/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  AreaSeries,
  Axis,
  Chart,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { useEuiTheme } from '@elastic/eui';
import type { RecommendedAction } from '@kbn/pnd-common';

import { useMeasuredWidth } from '../../../../../hooks/use_measured_width';
import { SECTION_ACCENT_TOKEN } from '../../../helpers/section_accent_token';
import type { PndSparklinePoint } from '../helpers/build_sparkline_series';
import { formatSparklineHour } from '../helpers/format_sparkline_hour';
import { getSparklineTheme } from '../helpers/get_sparkline_theme';
import * as i18n from '../../../translations';

/** Tall enough to read a shape from, short enough to stay a footnote under the count. */
export const SPARKLINE_HEIGHT_PX = 40;

export interface ActivitySparklineProps {
  action: RecommendedAction;
  /** The phase name, which is what the tooltip series is called. */
  label: string;
  /** One point per hour, oldest first. Empty when the activity read failed or has not landed. */
  series: PndSparklinePoint[];
}

/**
 * The 24h gates-opened shape under a KPI tile's count.
 *
 * **Decorative, and marked as such.** `aria-hidden` is not an oversight: the tile's own `aria-label`
 * already says what the count means, and 24 hourly buckets read aloud would bury it. Everything the
 * chart says visually is available in text.
 *
 * Nothing is drawn until the column reports a width, because `@elastic/charts` sizes in pixels
 * rather than percentages — and nothing is drawn for an empty series either. That second case is the
 * activity route's failure mode reaching the screen: a flat line at zero would be an affirmative
 * claim that no gate opened all day, so the tile keeps its count and simply loses its chart.
 */
export const ActivitySparkline: React.FC<ActivitySparklineProps> = ({ action, label, series }) => {
  const { euiTheme } = useEuiTheme();
  const baseTheme = useElasticChartsTheme();
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const theme = useMemo(() => getSparklineTheme(), []);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  return (
    <div
      aria-hidden="true"
      css={css`
        block-size: ${SPARKLINE_HEIGHT_PX}px;
        inline-size: 100%;
        min-inline-size: 0;
      `}
      data-test-subj={`pndBriefKpiSparkline-${action}`}
      ref={ref}
    >
      {width > 0 && series.length > 0 ? (
        <Chart size={{ height: SPARKLINE_HEIGHT_PX, width }}>
          <Settings baseTheme={baseTheme} showLegend={false} theme={[theme]} />

          <Tooltip
            headerFormatter={({ value }) => formatSparklineHour({ time: Number(value), timeZone })}
            type={TooltipType.VerticalCursor}
          />

          <Axis domain={{ max: NaN, min: 0 }} hide id="left" position={Position.Left} />
          <Axis hide id="bottom" position={Position.Bottom} />

          <AreaSeries
            color={euiTheme.colors.vis[SECTION_ACCENT_TOKEN[action]]}
            data={series}
            id={`pnd-activity-sparkline-${action}`}
            name={label}
            tickFormat={(count) => i18n.sparklineEventCount(Number(count))}
            timeZone={timeZone}
            xAccessor="time"
            xScaleType={ScaleType.Time}
            yAccessors={['y']}
            yScaleType={ScaleType.Linear}
          />
        </Chart>
      ) : null}
    </div>
  );
};
