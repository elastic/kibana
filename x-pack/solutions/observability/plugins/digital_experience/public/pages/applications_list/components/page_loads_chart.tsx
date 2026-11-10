/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { TimeSeriesPoint } from '../../../../common/types/applications';
import { ChartArea } from '../../../components/chart_area';
import { useFormatters } from '../../../hooks/use_formatters';
import type { TimeRangeSelect } from '../../../utils/brush_time_range';
import { onBrushTimeRange } from '../../../utils/brush_time_range';

const CHART_HEIGHT = 140;

const TITLE = i18n.translate('xpack.digitalExperience.pageLoadsChart.title', {
  defaultMessage: 'Page loads',
});

const NO_DATA = i18n.translate('xpack.digitalExperience.pageLoadsChart.noData', {
  defaultMessage: 'No page loads in the selected time range',
});

/**
 * Page loads over the time range, where dragging over the bars selects a narrower range; the chart
 * area keeps its height while loading or empty.
 */
export function PageLoadsChart({
  points,
  isLoading,
  onTimeRangeSelect,
}: {
  points: TimeSeriesPoint[];
  isLoading: boolean;
  onTimeRangeSelect: TimeRangeSelect;
}) {
  const baseTheme = useElasticChartsTheme();
  const { formatDate, timeZone } = useFormatters();
  const hasPageLoads = points.some(({ count }) => count > 0);

  return (
    <EuiPanel hasBorder data-test-subj="digitalExperiencePageLoadsChart">
      <EuiTitle size="xs">
        <h2>{TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ChartArea
        height={CHART_HEIGHT}
        isLoading={isLoading}
        hasData={hasPageLoads}
        emptyMessage={NO_DATA}
      >
        <Chart size={{ height: CHART_HEIGHT }}>
          <Settings
            baseTheme={baseTheme}
            showLegend={false}
            locale={i18n.getLocale()}
            onBrushEnd={onBrushTimeRange(onTimeRangeSelect)}
          />
          <Tooltip headerFormatter={({ value }) => formatDate(value)} />
          <Axis id="time" position={Position.Bottom} />
          <Axis id="count" position={Position.Left} gridLine={{ visible: true }} ticks={4} />
          <BarSeries
            id="pageLoads"
            name={TITLE}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={['count']}
            data={points}
            enableHistogramMode
            timeZone={timeZone}
          />
        </Chart>
      </ChartArea>
    </EuiPanel>
  );
}
