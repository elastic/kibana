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
  type PartialTheme,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { groupBy, mapValues, sortBy, sortedLastIndex, sumBy, uniqBy } from 'lodash';
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
  MobileReleasePoint,
  MobileReleaseRow,
  MobileReleaseSeries,
} from '../../../../../common/types/mobile';
import { ChartArea } from '../../../../components/chart_area';
import { PartialBucketsEndzones } from '../../../../components/partial_buckets_endzones';
import { useFormatters } from '../../../../hooks/use_formatters';
import { usePersistedChoice } from '../../../../hooks/use_persisted_choice';
import { MOBILE_ERROR_RATE_DESCRIPTION } from '../../../../labels';
import type { TimeRangeSelect } from '../../../../utils/brush_time_range';
import { onBrushTimeRange } from '../../../../utils/brush_time_range';
import { formatErrorRate } from '../../../../utils/format_error_rate';
import { getTimeChartXDomain } from '../../../../utils/histogram_interval';

/** Room for the plot and the legend below it. */
const CHART_HEIGHT = 240;

const HIDDEN_AXIS_LINES = { tickLine: { visible: false }, axisLine: { visible: false } };

/** Room above the plot for the release markers' labels, which would be clipped at its edge. */
const MARKER_LABEL_ROOM: PartialTheme = { chartMargins: { top: 20 } };

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
  actions,
  hasData,
  emptyMessage,
  'data-test-subj': dataTestSubj,
  children,
}: {
  title: string;
  tooltip: string;
  /** Controls at the end of the header, e.g. what the chart plots. */
  actions?: ReactNode;
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
        <EuiFlexItem grow={!actions}>
          <EuiIconTip content={tooltip} type="info" />
        </EuiFlexItem>
        {actions && <EuiFlexItem grow={false}>{actions}</EuiFlexItem>}
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

/** The releases of markers that share a line, e.g. "2.3.0, 2.2.1" or "2.3.0 +2". */
const markerLabel = (releases: readonly string[]): string =>
  releases.length <= 2
    ? releases.join(', ')
    : i18n.translate('xpack.digitalExperience.mobile.releases.markerMore', {
        defaultMessage: '{release} +{count}',
        values: { release: releases[0], count: releases.length - 1 },
      });

/**
 * A line where releases first appear, labelled with them. Releases first seen in the same bucket
 * share one line, in the colour of the first, so their labels don't overlap.
 */
function FirstSeenMarkers({
  markers,
  colors,
  bucketTimestamps,
}: Pick<ReleaseChartProps, 'markers' | 'colors'> & {
  /** The start of every bucket, sorted. */
  bucketTimestamps: readonly number[];
}) {
  const bucketOf = (time: number) =>
    bucketTimestamps[sortedLastIndex(bucketTimestamps, time) - 1] ?? time;
  const groups = Object.values(
    groupBy(sortBy(markers, 'firstSeen'), ({ firstSeen }) => bucketOf(firstSeen))
  );

  return (
    <>
      {groups.map((group) => {
        const [{ release, firstSeen }] = group;
        const label = markerLabel(group.map((marker) => marker.release));
        return (
          <LineAnnotation
            key={release}
            id={`firstSeen-${release}`}
            domainType={AnnotationDomainType.XDomain}
            dataValues={[{ dataValue: firstSeen, details: label }]}
            style={{ line: { stroke: colors.get(release), strokeWidth: 1, dash: [4, 4] } }}
            marker={
              <EuiText size="xs" data-test-subj="digitalExperienceMobileReleaseMarker">
                {label}
              </EuiText>
            }
            markerPosition={Position.Top}
          />
        );
      })}
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
  yDomain,
}: Omit<ReleaseChartProps, 'releases'> & {
  renderSeries: (props: {
    series: MobileReleaseSeries;
    color: string | undefined;
    timeZone: string;
  }) => ReactNode;
  formatValue: (value: number) => string;
  yAxisId: string;
  /** Fixes the y axis, e.g. 0 to 1 for shares; fitted to the data when unset. */
  yDomain?: { min: number; max: number };
}) {
  const baseTheme = useElasticChartsTheme();
  const { formatDate, timeZone } = useFormatters();
  const buckets = sortBy(
    uniqBy(
      series.flatMap(({ points }) => points),
      'timestamp'
    ),
    'timestamp'
  );
  const xDomain = getTimeChartXDomain({
    points: buckets,
    histogram,
    timeZone,
    hasBars: false,
  });

  return (
    <Chart size={{ height: '100%' }}>
      {/* The legend below the plot keeps its width: hover a release to spotlight it, click to hide it. */}
      <Settings
        baseTheme={baseTheme}
        theme={MARKER_LABEL_ROOM}
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
        domain={yDomain}
      />
      <FirstSeenMarkers
        markers={markers}
        colors={colors}
        bucketTimestamps={buckets.map(({ timestamp }) => timestamp)}
      />
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

const ADOPTION_MODE_STORAGE_KEY = 'xpack.digitalExperience.mobile.releaseAdoptionMode';

const ADOPTION_MODES = ['sessions', 'share'] as const;

type AdoptionMode = (typeof ADOPTION_MODES)[number];

const ADOPTION_MODE_LEGEND = i18n.translate(
  'xpack.digitalExperience.mobile.releases.adoption.modeLegend',
  { defaultMessage: 'Release adoption as' }
);

const ADOPTION_MODE_OPTIONS: Array<{ id: AdoptionMode; label: string; 'data-test-subj': string }> =
  [
    {
      id: 'sessions',
      label: i18n.translate('xpack.digitalExperience.mobile.releases.adoption.sessionsMode', {
        defaultMessage: 'Sessions',
      }),
      'data-test-subj': 'digitalExperienceMobileReleaseAdoptionMode-sessions',
    },
    {
      id: 'share',
      label: i18n.translate('xpack.digitalExperience.mobile.releases.adoption.shareMode', {
        defaultMessage: 'Share',
      }),
      'data-test-subj': 'digitalExperienceMobileReleaseAdoptionMode-share',
    },
  ];

const SHARE_DOMAIN = { min: 0, max: 1 };

/**
 * Each point with its share of the bucket's sessions across the releases; `null` in a bucket
 * without sessions. Shares hide the swings of traffic over the day, so a rollout's progress shows.
 */
export const withBucketShares = (
  series: readonly MobileReleaseSeries[]
): Array<
  MobileReleaseSeries & { points: Array<MobileReleasePoint & { share: number | null }> }
> => {
  const totals = mapValues(
    groupBy(
      series.flatMap(({ points }) => points),
      'timestamp'
    ),
    (points) => sumBy(points, 'sessions')
  );
  return series.map((item) => ({
    ...item,
    points: item.points.map((point) => {
      const total = totals[point.timestamp] ?? 0;
      return { ...point, share: total > 0 ? point.sessions / total : null };
    }),
  }));
};

/**
 * The sessions of each release over time, stacked, to show how fast users move to a release: as
 * counts, or as shares of each bucket's sessions.
 */
export function ReleaseAdoptionChart(props: Omit<ReleaseChartProps, 'releases'>) {
  const { formatNumber, formatShare } = useFormatters();
  // The mode the user last picked, kept across visits; sessions by default.
  const [mode, setMode] = usePersistedChoice(ADOPTION_MODE_STORAGE_KEY, ADOPTION_MODES, 'sessions');
  const isShare = mode === 'share';
  const series = isShare ? withBucketShares(props.series) : props.series;

  return (
    <ChartPanel
      data-test-subj="digitalExperienceMobileReleaseAdoptionChart"
      title={ADOPTION_TITLE}
      tooltip={ADOPTION_TOOLTIP}
      actions={
        <EuiButtonGroup
          data-test-subj="digitalExperienceMobileReleaseAdoptionMode"
          legend={ADOPTION_MODE_LEGEND}
          type="single"
          buttonSize="compressed"
          options={ADOPTION_MODE_OPTIONS}
          idSelected={mode}
          onChange={setMode}
        />
      }
      hasData={series.some(({ points }) => points.some(({ sessions }) => sessions > 0))}
      emptyMessage={ADOPTION_EMPTY}
    >
      <ReleaseChart
        {...props}
        series={series}
        yAxisId="releaseAdoptionAxis"
        formatValue={isShare ? formatShare : formatNumber}
        yDomain={isShare ? SHARE_DOMAIN : undefined}
        renderSeries={({ series: { release, isOther, points }, color, timeZone }) => (
          <AreaSeries
            key={release}
            id={`adoption-${release}`}
            name={seriesName({ release, isOther })}
            color={color}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={[isShare ? 'share' : 'sessions']}
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
