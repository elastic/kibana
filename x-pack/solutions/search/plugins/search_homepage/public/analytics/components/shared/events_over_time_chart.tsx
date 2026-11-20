/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  niceTimeFormatter,
} from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import type { AnalyticsEventsOverTime } from '../../../../common/analytics';
import { formatCompactNumber } from './event_source_utils';

const CHART_SIZE = { width: '100%', height: '100%' };
const COUNT_TICKS = 3;

export interface EventsOverTimeChartProps {
  data: AnalyticsEventsOverTime;
  /** Id of the element that titles the chart. */
  titleId: string;
  /** Text alternative read out in place of the bars. */
  description: string;
}

/** Bars of event counts; loaded on demand so the charts library stays off the page-load path. */
export const EventsOverTimeChart = ({
  data: { from, to, intervalMs, buckets },
  titleId,
  description,
}: EventsOverTimeChartProps): React.JSX.Element => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const chartData = useMemo(() => [...buckets], [buckets]);

  return (
    <Chart size={CHART_SIZE}>
      <Settings
        baseTheme={baseTheme}
        locale={i18n.getLocale()}
        showLegend={false}
        xDomain={{ min: from, max: to, minInterval: intervalMs }}
        ariaLabelledBy={titleId}
        ariaDescription={description}
        ariaUseDefaultSummary={false}
      />
      <Axis
        id="time"
        position={Position.Bottom}
        tickFormat={niceTimeFormatter([from, to])}
        gridLine={{ visible: false }}
      />
      <Axis
        id="count"
        position={Position.Left}
        ticks={COUNT_TICKS}
        integersOnly
        tickFormat={formatCompactNumber}
        gridLine={{ visible: true }}
      />
      <BarSeries
        id="events"
        name={i18n.translate('xpack.searchHomepage.analytics.eventsOverTime.seriesName', {
          defaultMessage: 'Events',
        })}
        data={chartData}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="timestamp"
        yAccessors={['count']}
        color={euiTheme.colors.vis.euiColorVis0}
        enableHistogramMode
      />
    </Chart>
  );
};
