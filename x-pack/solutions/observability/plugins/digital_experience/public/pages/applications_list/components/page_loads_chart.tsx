/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { TimeSeriesPoint } from '../../../../common/types/applications';
import { ChartArea } from '../../../components/chart_area';
import { useFormatters } from '../../../hooks/use_formatters';
import { usePersistedChoice } from '../../../hooks/use_persisted_choice';
import { PAGE_LOADS_LABEL, SESSIONS_LABEL, SESSIONS_UNAVAILABLE_LABEL } from '../../../labels';
import type { TimeRangeSelect } from '../../../utils/brush_time_range';
import { onBrushTimeRange } from '../../../utils/brush_time_range';

const CHART_HEIGHT = 140;

const METRIC_STORAGE_KEY = 'xpack.digitalExperience.applications.chartMetric';

const CHART_METRICS = ['pageLoads', 'sessions'] as const;

type ChartMetric = (typeof CHART_METRICS)[number];

const METRIC_LABELS: Record<ChartMetric, string> = {
  pageLoads: PAGE_LOADS_LABEL,
  sessions: SESSIONS_LABEL,
};

const NO_DATA: Record<ChartMetric, string> = {
  pageLoads: i18n.translate('xpack.digitalExperience.pageLoadsChart.noData', {
    defaultMessage: 'No page loads in the selected time range',
  }),
  sessions: i18n.translate('xpack.digitalExperience.pageLoadsChart.noSessions', {
    defaultMessage: 'No sessions started in the selected time range',
  }),
};

const METRIC_LEGEND = i18n.translate('xpack.digitalExperience.pageLoadsChart.metricLegend', {
  defaultMessage: 'Chart metric',
});

/**
 * Page loads, or the sessions that started, over the time range, where dragging over the bars
 * selects a narrower range; the chart area keeps its height while loading or empty. Sessions are
 * only counted when the applications are read from the sessions index, so the choice of sessions
 * is kept while they are not, and the chart shows page loads until they are again.
 */
export function PageLoadsChart({
  pageLoads,
  sessions,
  isLoading,
  onTimeRangeSelect,
}: {
  pageLoads: TimeSeriesPoint[];
  /** The sessions that started in each bucket, `null` when they are not counted. */
  sessions: TimeSeriesPoint[] | null;
  isLoading: boolean;
  onTimeRangeSelect: TimeRangeSelect;
}) {
  const baseTheme = useElasticChartsTheme();
  const { formatDate, timeZone } = useFormatters();
  // The metric the user last picked, kept across visits; page loads by default.
  const [chosenMetric, setChosenMetric] = usePersistedChoice(
    METRIC_STORAGE_KEY,
    CHART_METRICS,
    'pageLoads'
  );

  // While loading, sessions may still arrive; after it, `null` means they can't be counted.
  const canShowSessions = isLoading || sessions !== null;
  const shownMetric: ChartMetric =
    chosenMetric === 'sessions' && canShowSessions ? 'sessions' : 'pageLoads';
  const points = shownMetric === 'sessions' ? sessions ?? [] : pageLoads;
  const label = METRIC_LABELS[shownMetric];
  const hasData = points.some(({ count }) => count > 0);

  return (
    <EuiPanel hasBorder data-test-subj="digitalExperiencePageLoadsChart">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{label}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            data-test-subj="digitalExperienceChartMetric"
            legend={METRIC_LEGEND}
            type="single"
            buttonSize="compressed"
            options={[
              {
                id: 'pageLoads',
                label: PAGE_LOADS_LABEL,
                'data-test-subj': 'digitalExperienceChartMetric-pageLoads',
              },
              {
                id: 'sessions',
                label: SESSIONS_LABEL,
                isDisabled: !canShowSessions,
                toolTipContent: canShowSessions ? undefined : SESSIONS_UNAVAILABLE_LABEL,
                'data-test-subj': 'digitalExperienceChartMetric-sessions',
              },
            ]}
            idSelected={shownMetric}
            onChange={setChosenMetric}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ChartArea
        height={CHART_HEIGHT}
        isLoading={isLoading}
        hasData={hasData}
        emptyMessage={NO_DATA[shownMetric]}
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
            id={shownMetric}
            name={label}
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
