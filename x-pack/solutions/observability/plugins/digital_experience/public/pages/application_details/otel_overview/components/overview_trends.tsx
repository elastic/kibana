/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
  CurveType,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import type { DomainRange } from '@elastic/charts';
import {
  EuiButtonGroup,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import {
  DEFAULT_OVERVIEW_PERCENTILE,
  OVERVIEW_PERCENTILES,
} from '../../../../../common/overview_filters';
import type { OverviewPercentile } from '../../../../../common/overview_filters';
import type { OverviewTrendPoint } from '../../../../../common/types/overview';
import { ChartArea } from '../../../../components/chart_area';
import {
  APPLICATION_OVERVIEW_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../../ebt_constants';
import { useFormatters } from '../../../../hooks/use_formatters';
import { loadTimeLabel, PAGE_LOADS_LABEL } from '../../../../labels';
import type { TimeRangeSelect } from '../../../../utils/brush_time_range';
import { onBrushTimeRange } from '../../../../utils/brush_time_range';
import { formatDurationMs } from '../../../../utils/format_duration';

const CHART_HEIGHT = 128;

const HIDDEN_AXIS_LINES = { tickLine: { visible: false }, axisLine: { visible: false } };

const AREA_STYLE = { area: { opacity: 0.18 }, point: { visible: 'never' as const } };

const CHART_TYPE_STORAGE_KEY = 'xpack.digitalExperience.overview.trendChartType';

const TRENDS_TITLE = i18n.translate('xpack.digitalExperience.overview.trends.title', {
  defaultMessage: 'Trends',
});

const TRENDS_SUBTITLE = i18n.translate(
  'xpack.digitalExperience.overview.trends.subtitleDescription',
  {
    defaultMessage: 'Page loads and their load time over the selected range',
  }
);

const NO_PAGE_LOADS = i18n.translate('xpack.digitalExperience.overview.trends.noDataDescription', {
  defaultMessage: 'No page loads in the selected time range',
});

const NO_LOAD_TIMES = i18n.translate(
  'xpack.digitalExperience.overview.trends.noLoadTimesDescription',
  {
    defaultMessage: 'No page load reported a load time in the selected time range',
  }
);

const CHART_TYPE_LEGEND = i18n.translate(
  'xpack.digitalExperience.overview.trends.chartTypeLegendLabel',
  { defaultMessage: 'Trend chart type' }
);

const PERCENTILE_LABEL = i18n.translate('xpack.digitalExperience.overview.trends.percentileLabel', {
  defaultMessage: 'Load time percentile',
});

const PERCENTILE_PREPEND = i18n.translate(
  'xpack.digitalExperience.overview.trends.percentilePrepend',
  { defaultMessage: 'Percentile' }
);

const PERCENTILE_OPTIONS = OVERVIEW_PERCENTILES.map((percentile) => ({
  value: percentile,
  text: `p${percentile}`,
}));

const toPercentile = (value: string): OverviewPercentile =>
  OVERVIEW_PERCENTILES.find((percentile) => String(percentile) === value) ??
  DEFAULT_OVERVIEW_PERCENTILE;

type TrendChartType = 'area' | 'bar';

const CHART_TYPE_OPTIONS: Array<{ id: TrendChartType; label: string; iconType: string }> = [
  {
    id: 'area',
    label: i18n.translate('xpack.digitalExperience.overview.trends.areaChartButtonLabel', {
      defaultMessage: 'Area',
    }),
    iconType: 'chartArea',
  },
  {
    id: 'bar',
    label: i18n.translate('xpack.digitalExperience.overview.trends.barChartButtonLabel', {
      defaultMessage: 'Bar',
    }),
    iconType: 'chartBarVertical',
  },
];

const toChartType = (value: string | undefined): TrendChartType =>
  value === 'bar' ? 'bar' : 'area';

/** The chart type the user last picked, kept across visits; areas by default. */
const useTrendChartType = (): [TrendChartType, (chartType: TrendChartType) => void] => {
  const [saved, setSaved] = useLocalStorage<TrendChartType>(CHART_TYPE_STORAGE_KEY, 'area');
  // Anything else in the storage, e.g. from an older version, falls back to areas.
  return [toChartType(saved), setSaved];
};

/** One metric over the time range, as areas or bars on the shared time axis. */
function TrendChart({
  points,
  metric,
  name,
  color,
  formatValue,
  chartType,
  xDomain,
  onTimeRangeSelect,
}: {
  points: OverviewTrendPoint[];
  metric: 'pageLoads' | 'loadTimePercentileMs';
  name: string;
  color: string;
  formatValue: (value: number) => string;
  chartType: TrendChartType;
  xDomain: DomainRange | undefined;
  onTimeRangeSelect: TimeRangeSelect;
}) {
  const baseTheme = useElasticChartsTheme();
  const { formatDate, timeZone } = useFormatters();

  const seriesProps = {
    id: metric,
    name,
    color,
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
    xAccessor: 'timestamp',
    yAccessors: [metric],
    data: points,
    timeZone,
  };

  return (
    <Chart size={{ height: '100%' }}>
      <Settings
        baseTheme={baseTheme}
        showLegend={false}
        locale={i18n.getLocale()}
        onBrushEnd={onBrushTimeRange(onTimeRangeSelect)}
        xDomain={xDomain}
      />
      <Tooltip headerFormatter={({ value }) => formatDate(value)} />
      <Axis id="time" position={Position.Bottom} style={HIDDEN_AXIS_LINES} />
      <Axis
        id={`${metric}Axis`}
        position={Position.Left}
        gridLine={{ visible: true }}
        ticks={2}
        style={HIDDEN_AXIS_LINES}
        tickFormat={formatValue}
      />
      {/* A bucket without a value, e.g. without a timed page load, leaves a gap. */}
      {chartType === 'bar' ? (
        <BarSeries {...seriesProps} enableHistogramMode />
      ) : (
        <AreaSeries
          {...seriesProps}
          curve={CurveType.CURVE_MONOTONE_X}
          areaSeriesStyle={AREA_STYLE}
        />
      )}
    </Chart>
  );
}

/** One metric of the Trends panel: its label and value over the range, above its chart. */
function TrendRow({
  label,
  value,
  isLoading,
  hasData,
  emptyMessage,
  children,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  value: ReactNode;
  isLoading: boolean;
  hasData: boolean;
  emptyMessage: string;
  children: ReactNode;
  'data-test-subj': string;
}) {
  return (
    // A column of its own: the rows share the height of the panel, which is as tall as the panel
    // of the Core Web Vitals beside it, instead of leaving it empty under the charts.
    <div
      data-test-subj={dataTestSubj}
      css={{ display: 'flex', flexDirection: 'column', flex: '1 1 0' }}
    >
      <EuiFlexGroup css={{ flexGrow: 0 }} alignItems="baseline" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {label}
          </EuiText>
        </EuiFlexItem>
        {!isLoading && (
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <strong>{value}</strong>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <ChartArea
        grow
        height={CHART_HEIGHT}
        isLoading={isLoading}
        hasData={hasData}
        emptyMessage={emptyMessage}
      >
        {children}
      </ChartArea>
    </div>
  );
}

/**
 * Page loads and their load time over the time range, on the buckets the route returns, so both
 * charts line up; dragging over either of them selects a narrower range.
 */
export function OverviewTrends({
  points,
  pageLoads,
  loadTimePercentileMs,
  percentile,
  onPercentileChange,
  isLoading,
  onTimeRangeSelect,
}: {
  points: OverviewTrendPoint[];
  /** The page loads of the whole range, the sum of the points. */
  pageLoads: number;
  /** The load time of the whole range, which the points' percentiles do not add up to. */
  loadTimePercentileMs: number | null;
  /** The percentile of the load time and its trend. */
  percentile: OverviewPercentile;
  onPercentileChange: (percentile: OverviewPercentile) => void;
  isLoading: boolean;
  onTimeRangeSelect: TimeRangeSelect;
}) {
  const { euiTheme } = useEuiTheme();
  const { formatNumber } = useFormatters();
  const [chartType, setChartType] = useTrendChartType();

  const hasPageLoads = points.some((point) => point.pageLoads > 0);
  const hasLoadTimes = points.some((point) => point.loadTimePercentileMs !== null);

  // Both charts span the whole time range, whatever each one has data for.
  const xDomain: DomainRange | undefined =
    points.length > 0
      ? { min: points[0].timestamp, max: points[points.length - 1].timestamp }
      : undefined;

  const chartProps = { points, chartType, xDomain, onTimeRangeSelect };

  return (
    <EuiPanel
      hasBorder
      data-test-subj="digitalExperienceOverviewTrends"
      css={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* A flex group grows by default, which in the panel's column would take room from the charts. */}
      <EuiFlexGroup
        css={{ flexGrow: 0 }}
        alignItems="flexStart"
        justifyContent="spaceBetween"
        gutterSize="s"
      >
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>{TRENDS_TITLE}</h2>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {TRENDS_SUBTITLE}
          </EuiText>
        </EuiFlexItem>
        {/* Wide enough for the label of the select, which it would otherwise cut short. */}
        <EuiFlexItem grow={false} css={{ minInlineSize: '11rem' }}>
          <EuiSelect
            compressed
            prepend={PERCENTILE_PREPEND}
            aria-label={PERCENTILE_LABEL}
            options={PERCENTILE_OPTIONS}
            value={percentile}
            onChange={(event) => onPercentileChange(toPercentile(event.target.value))}
            data-test-subj="digitalExperienceOverviewPercentile"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
              element: APPLICATION_OVERVIEW_EBT_ELEMENTS.PERCENTILE,
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            data-test-subj="digitalExperienceOverviewTrendChartType"
            legend={CHART_TYPE_LEGEND}
            type="single"
            buttonSize="compressed"
            isIconOnly
            options={CHART_TYPE_OPTIONS}
            idSelected={chartType}
            onChange={(id) => setChartType(toChartType(id))}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <TrendRow
        data-test-subj="digitalExperienceOverviewPageLoadsTrend"
        label={PAGE_LOADS_LABEL}
        value={formatNumber(pageLoads)}
        isLoading={isLoading}
        hasData={hasPageLoads}
        emptyMessage={NO_PAGE_LOADS}
      >
        <TrendChart
          {...chartProps}
          metric="pageLoads"
          name={PAGE_LOADS_LABEL}
          color={euiTheme.colors.vis.euiColorVis0}
          formatValue={formatNumber}
        />
      </TrendRow>
      <EuiSpacer size="s" />
      <TrendRow
        data-test-subj="digitalExperienceOverviewLoadTimeTrend"
        label={loadTimeLabel(percentile)}
        value={
          loadTimePercentileMs === null ? (
            <EmptyCellValue />
          ) : (
            formatDurationMs(loadTimePercentileMs)
          )
        }
        isLoading={isLoading}
        hasData={hasLoadTimes}
        emptyMessage={hasPageLoads ? NO_LOAD_TIMES : NO_PAGE_LOADS}
      >
        <TrendChart
          {...chartProps}
          metric="loadTimePercentileMs"
          name={loadTimeLabel(percentile)}
          color={euiTheme.colors.vis.euiColorVis1}
          formatValue={formatDurationMs}
        />
      </TrendRow>
    </EuiPanel>
  );
}
