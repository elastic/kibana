/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  LineAnnotation,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { sortBy, uniqBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import {
  MIN_BUCKET_SESSIONS,
  MIN_RELEASE_SESSIONS,
  OTHER_RELEASE_LABEL,
} from '../../../../../common/mobile/releases';
import type { HistogramBuckets } from '../../../../../common/types/applications';
import type {
  MobileReleaseMarker,
  MobileReleaseRow,
  MobileReleaseSeries,
} from '../../../../../common/types/mobile';
import { ChartArea } from '../../../../components/chart_area';
import { PartialBucketsEndzones } from '../../../../components/partial_buckets_endzones';
import { useFormatters } from '../../../../hooks/use_formatters';
import { MOBILE_ERROR_RATE_DESCRIPTION } from '../../../../labels';
import type { TimeRangeSelect } from '../../../../utils/brush_time_range';
import { onBrushTimeRange } from '../../../../utils/brush_time_range';
import { formatErrorRate } from '../../../../utils/format_error_rate';
import { getTimeChartXDomain } from '../../../../utils/histogram_interval';

/** Room for the plot and the legend below it. */
const CHART_HEIGHT = 240;

const HIDDEN_AXIS_LINES = { tickLine: { visible: false }, axisLine: { visible: false } };

const ERROR_RATE_TITLE = i18n.translate('xpack.digitalExperience.mobile.releases.errorRate.title', {
  defaultMessage: 'Error rate by release',
});

const ERROR_RATE_EMPTY = i18n.translate('xpack.digitalExperience.mobile.releases.errorRate.empty', {
  defaultMessage: 'No release has enough sessions to show an error rate',
});

const ADOPTION_TITLE = i18n.translate('xpack.digitalExperience.mobile.releases.adoption.title', {
  defaultMessage: 'Release adoption',
});

const ADOPTION_TOOLTIP = i18n.translate(
  'xpack.digitalExperience.mobile.releases.adoption.tooltip',
  {
    defaultMessage:
      'Distinct session.id values per release in each time bucket. The markers show where a release first appears.',
  }
);

const ADOPTION_EMPTY = i18n.translate('xpack.digitalExperience.mobile.releases.adoption.empty', {
  defaultMessage: 'No sessions in the selected time range',
});

const ERROR_RATE_TOOLTIP = i18n.translate(
  'xpack.digitalExperience.mobile.releases.errorRate.tooltip',
  {
    defaultMessage:
      '{description} Releases with fewer than {minSessions} sessions in the range are left out, and so are time buckets with fewer than {minBucketSessions}. The markers show where a release first appears.',
    values: {
      description: MOBILE_ERROR_RATE_DESCRIPTION,
      minSessions: MIN_RELEASE_SESSIONS,
      minBucketSessions: MIN_BUCKET_SESSIONS,
    },
  }
);

const seriesName = ({ release, isOther }: Pick<MobileReleaseSeries, 'release' | 'isOther'>) =>
  isOther ? OTHER_RELEASE_LABEL : release;

interface ReleaseChartProps {
  releases: MobileReleaseRow[];
  series: MobileReleaseSeries[];
  markers: MobileReleaseMarker[];
  histogram: HistogramBuckets;
  colors: ReadonlyMap<string, string>;
  /** Narrows the page's time range to the one dragged over the chart. */
  onTimeRangeSelect: TimeRangeSelect;
}

/**
 * A chart's bordered panel: an `h3` under the section's title, with the calculation in an info
 * tip, so both panels' headers are one line and their plots line up side by side.
 */
function ChartPanel({
  title,
  tooltip,
  hasData,
  emptyMessage,
  'data-test-subj': dataTestSubj,
  children,
}: {
  title: string;
  tooltip: string;
  hasData: boolean;
  emptyMessage: string;
  'data-test-subj': string;
  children: ReactNode;
}) {
  return (
    <EuiPanel hasBorder data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tooltip} type="info" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ChartArea
        height={CHART_HEIGHT}
        isLoading={false}
        hasData={hasData}
        emptyMessage={emptyMessage}
      >
        {children}
      </ChartArea>
    </EuiPanel>
  );
}

/** A line at each release's first appearance, labelled with the release. */
function FirstSeenMarkers({ markers, colors }: Pick<ReleaseChartProps, 'markers' | 'colors'>) {
  return (
    <>
      {markers.map(({ release, firstSeen }) => (
        <LineAnnotation
          key={release}
          id={`firstSeen-${release}`}
          domainType={AnnotationDomainType.XDomain}
          dataValues={[{ dataValue: firstSeen, details: release }]}
          style={{ line: { stroke: colors.get(release), strokeWidth: 1, dash: [4, 4] } }}
          marker={
            <EuiText size="xs" data-test-subj="digitalExperienceMobileReleaseMarker">
              {release}
            </EuiText>
          }
          markerPosition={Position.Top}
        />
      ))}
    </>
  );
}

function ReleaseChart({
  series,
  markers,
  histogram,
  colors,
  onTimeRangeSelect,
  renderSeries,
  formatValue,
  yAxisId,
}: Omit<ReleaseChartProps, 'releases'> & {
  renderSeries: (props: {
    series: MobileReleaseSeries;
    color: string | undefined;
    timeZone: string;
  }) => ReactNode;
  formatValue: (value: number) => string;
  yAxisId: string;
}) {
  const baseTheme = useElasticChartsTheme();
  const { formatDate, timeZone } = useFormatters();
  const xDomain = getTimeChartXDomain({
    points: sortBy(
      uniqBy(
        series.flatMap(({ points }) => points),
        'timestamp'
      ),
      'timestamp'
    ),
    histogram,
    timeZone,
    hasBars: false,
  });

  return (
    <Chart size={{ height: '100%' }}>
      {/* The legend below the plot keeps its width: hover a release to spotlight it, click to hide it. */}
      <Settings
        baseTheme={baseTheme}
        locale={i18n.getLocale()}
        xDomain={xDomain}
        showLegend
        legendPosition={Position.Bottom}
        onBrushEnd={onBrushTimeRange(onTimeRangeSelect)}
      />
      <Tooltip headerFormatter={({ value }) => formatDate(value)} />
      <PartialBucketsEndzones xDomain={xDomain} />
      <Axis id="time" position={Position.Bottom} style={HIDDEN_AXIS_LINES} />
      <Axis
        id={yAxisId}
        position={Position.Left}
        gridLine={{ visible: true }}
        ticks={3}
        style={HIDDEN_AXIS_LINES}
        tickFormat={formatValue}
      />
      <FirstSeenMarkers markers={markers} colors={colors} />
      {series.map((item) =>
        renderSeries({ series: item, color: colors.get(item.release), timeZone })
      )}
    </Chart>
  );
}

/** The error rate of each release with enough sessions, one line per release. */
export function ReleaseErrorRateChart({ releases, ...props }: ReleaseChartProps) {
  const withRate = new Set(
    releases.filter(({ errorRate }) => errorRate !== null).map(({ release }) => release)
  );
  const series = props.series.filter(({ release }) => withRate.has(release));

  return (
    <ChartPanel
      data-test-subj="digitalExperienceMobileReleaseErrorRateChart"
      title={ERROR_RATE_TITLE}
      tooltip={ERROR_RATE_TOOLTIP}
      hasData={series.length > 0}
      emptyMessage={ERROR_RATE_EMPTY}
    >
      <ReleaseChart
        {...props}
        series={series}
        yAxisId="releaseErrorRateAxis"
        formatValue={formatErrorRate}
        renderSeries={({ series: { release, isOther, points }, color, timeZone }) => (
          <LineSeries
            key={release}
            id={`errorRate-${release}`}
            name={seriesName({ release, isOther })}
            color={color}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={['errorRate']}
            data={points}
            curve={CurveType.CURVE_MONOTONE_X}
            timeZone={timeZone}
          />
        )}
      />
    </ChartPanel>
  );
}

/** The sessions of each release over time, stacked, to show how fast users move to a release. */
export function ReleaseAdoptionChart(props: Omit<ReleaseChartProps, 'releases'>) {
  const { formatNumber } = useFormatters();
  const { series } = props;

  return (
    <ChartPanel
      data-test-subj="digitalExperienceMobileReleaseAdoptionChart"
      title={ADOPTION_TITLE}
      tooltip={ADOPTION_TOOLTIP}
      hasData={series.some(({ points }) => points.length > 0)}
      emptyMessage={ADOPTION_EMPTY}
    >
      <ReleaseChart
        {...props}
        yAxisId="releaseAdoptionAxis"
        formatValue={formatNumber}
        renderSeries={({ series: { release, isOther, points }, color, timeZone }) => (
          <AreaSeries
            key={release}
            id={`adoption-${release}`}
            name={seriesName({ release, isOther })}
            color={color}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={['sessions']}
            stackAccessors={['timestamp']}
            data={points}
            curve={CurveType.CURVE_MONOTONE_X}
            areaSeriesStyle={{ area: { opacity: 0.6 }, point: { visible: 'never' } }}
            timeZone={timeZone}
          />
        )}
      />
    </ChartPanel>
  );
}
