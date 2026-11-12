/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
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
import { PAGE_LOADS_LABEL, SESSIONS_LABEL, SESSIONS_UNAVAILABLE_LABEL } from '../../../labels';
import type { TimeRangeSelect } from '../../../utils/brush_time_range';
import { onBrushTimeRange } from '../../../utils/brush_time_range';

const CHART_HEIGHT = 140;

const METRIC_STORAGE_KEY = 'xpack.digitalExperience.applications.chartMetric';

type ChartMetric = 'pageLoads' | 'sessions';

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

const toChartMetric = (value: string | undefined): ChartMetric =>
  value === 'sessions' ? 'sessions' : 'pageLoads';

/** The metric the user last picked, kept across visits; page loads by default. */
const useChartMetric = (): [ChartMetric, (metric: ChartMetric) => void] => {
  const [saved, setSaved] = useLocalStorage<ChartMetric>(METRIC_STORAGE_KEY, 'pageLoads');
  // Anything else in the storage, e.g. from an older version, falls back to page loads.
  return [toChartMetric(saved), setSaved];
};

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
  const [chosenMetric, setChosenMetric] = useChartMetric();

  // While the first answer is loading, the sessions are not known to be missing yet.
  const sessionsUnavailable = !isLoading && sessions === null;
  const metric: ChartMetric =
    chosenMetric === 'sessions' && !sessionsUnavailable ? 'sessions' : 'pageLoads';
  const points = metric === 'sessions' ? sessions ?? [] : pageLoads;
  const label = METRIC_LABELS[metric];
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
                isDisabled: sessionsUnavailable,
                toolTipContent: sessionsUnavailable ? SESSIONS_UNAVAILABLE_LABEL : undefined,
                'data-test-subj': 'digitalExperienceChartMetric-sessions',
              },
            ]}
            idSelected={metric}
            onChange={(id) => setChosenMetric(toChartMetric(id))}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ChartArea
        height={CHART_HEIGHT}
        isLoading={isLoading}
        hasData={hasData}
        emptyMessage={NO_DATA[metric]}
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
            id={metric}
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
