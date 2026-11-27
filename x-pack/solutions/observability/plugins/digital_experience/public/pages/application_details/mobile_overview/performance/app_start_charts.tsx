/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Axis,
  Chart,
  CurveType,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  type TooltipProps,
} from '@elastic/charts';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { StartType } from '../../../../../common/mobile/app_starts';
import type { HistogramBuckets } from '../../../../../common/types/applications';
import type { MobileAppStartPoint } from '../../../../../common/types/mobile';
import { PartialBucketsEndzones } from '../../../../components/partial_buckets_endzones';
import { useFormatters } from '../../../../hooks/use_formatters';
import type { TimeRangeSelect } from '../../../../utils/brush_time_range';
import { onBrushTimeRange } from '../../../../utils/brush_time_range';
import { formatDurationMs } from '../../../../utils/format_duration';
import { getTimeChartXDomain } from '../../../../utils/histogram_interval';
import { ChartPanel } from '../chart_panel';
import {
  APP_START_DESCRIPTIONS,
  APP_START_TITLES,
  NO_STARTS_OF_TYPE,
  appStartCountLabel,
} from '../app_start_labels';

const CHART_SIZE = { height: '100%' };
const GRID_LINE = { visible: true };
const HIDDEN_AXIS_LINES = { tickLine: { visible: false }, axisLine: { visible: false } };
const AVG_ACCESSORS = ['avg'];

const CHART_TITLES: Readonly<Record<StartType, string>> = {
  cold: i18n.translate('xpack.digitalExperience.mobile.performance.coldStartChart', {
    defaultMessage: 'Avg. cold start over time',
  }),
  warm: i18n.translate('xpack.digitalExperience.mobile.performance.warmStartChart', {
    defaultMessage: 'Avg. warm start over time',
  }),
};

const CHART_TEST_SUBJECTS: Readonly<Record<StartType, string>> = {
  cold: 'digitalExperienceMobileColdStartChart',
  warm: 'digitalExperienceMobileWarmStartChart',
};

/** A bucket's average and the starts it averages; a `null` average draws a gap. */
interface AppStartDatum {
  timestamp: number;
  avg: number | null;
  count: number;
}

/** The average of one start type over time, with each bucket's starts in its tooltip. */
export function AppStartChart({
  type,
  points,
  histogram,
  onTimeRangeSelect,
}: {
  type: StartType;
  points: MobileAppStartPoint[];
  histogram: HistogramBuckets;
  onTimeRangeSelect: TimeRangeSelect;
}) {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const lineColors: Readonly<Record<StartType, string>> = {
    cold: euiTheme.colors.vis.euiColorVis0,
    warm: euiTheme.colors.vis.euiColorVis1,
  };
  const { formatDate, timeZone } = useFormatters();
  const data = useMemo(
    () =>
      points.map(({ timestamp, [type]: { avg, count } }): AppStartDatum => ({
        timestamp,
        avg,
        count,
      })),
    [points, type]
  );
  const xDomain = useMemo(
    () => getTimeChartXDomain({ points: data, histogram, timeZone, hasBars: false }),
    [data, histogram, timeZone]
  );
  const onBrushEnd = useMemo(() => onBrushTimeRange(onTimeRangeSelect), [onTimeRangeSelect]);
  const headerFormatter = useCallback<NonNullable<TooltipProps['headerFormatter']>>(
    ({ value }) => formatDate(value),
    [formatDate]
  );
  const TooltipFooter = useCallback<
    Exclude<NonNullable<TooltipProps<AppStartDatum>['footer']>, string>
  >(
    ({ items: [item] }) =>
      item?.datum ? (
        <EuiText size="xs" color="subdued" data-test-subj="digitalExperienceMobileAppStartCount">
          {appStartCountLabel(type, item.datum.count)}
        </EuiText>
      ) : null,
    [type]
  );

  return (
    <ChartPanel
      data-test-subj={CHART_TEST_SUBJECTS[type]}
      title={CHART_TITLES[type]}
      tooltip={APP_START_DESCRIPTIONS[type]}
      hasData={data.some(({ count }) => count > 0)}
      emptyMessage={NO_STARTS_OF_TYPE[type]}
    >
      <Chart size={CHART_SIZE}>
        <Settings
          baseTheme={baseTheme}
          locale={i18n.getLocale()}
          xDomain={xDomain}
          showLegend
          legendPosition={Position.Bottom}
          onBrushEnd={onBrushEnd}
        />
        <Tooltip<AppStartDatum> headerFormatter={headerFormatter} footer={TooltipFooter} />
        <PartialBucketsEndzones xDomain={xDomain} />
        <Axis id="time" position={Position.Bottom} style={HIDDEN_AXIS_LINES} />
        <Axis
          id={`${type}StartAxis`}
          position={Position.Left}
          gridLine={GRID_LINE}
          ticks={3}
          style={HIDDEN_AXIS_LINES}
          tickFormat={formatDurationMs}
        />
        <LineSeries
          id={`${type}Start`}
          name={APP_START_TITLES[type]}
          color={lineColors[type]}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="timestamp"
          yAccessors={AVG_ACCESSORS}
          data={data}
          curve={CurveType.CURVE_MONOTONE_X}
          timeZone={timeZone}
        />
      </Chart>
    </ChartPanel>
  );
}
