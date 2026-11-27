/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
  type TooltipProps,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { EuiScreenReaderOnly, EuiText } from '@elastic/eui';
import { groupBy, sortBy, sortedLastIndex, uniqBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { MIN_BUCKET_SESSIONS, MIN_RELEASE_SESSIONS } from '../../../../../common/mobile/releases';
import type { HistogramBuckets } from '../../../../../common/types/applications';
import type {
  MobileReleaseMarker,
  MobileReleaseRow,
  MobileReleaseSeries,
} from '../../../../../common/types/mobile';
import { ChartPanel } from '../chart_panel';
import { PartialBucketsEndzones } from '../../../../components/partial_buckets_endzones';
import { useFormatters } from '../../../../hooks/use_formatters';
import { MOBILE_ERROR_RATE_DESCRIPTION, OTHER_RELEASE_LABEL } from '../../../../labels';
import type { TimeRangeSelect } from '../../../../utils/brush_time_range';
import { onBrushTimeRange } from '../../../../utils/brush_time_range';
import { getTimeChartXDomain } from '../../../../utils/histogram_interval';

const HIDDEN_AXIS_LINES = { tickLine: { visible: false }, axisLine: { visible: false } };

const CHART_SIZE = { height: '100%' };
const GRID_LINE = { visible: true };
const ERROR_RATE_ACCESSORS = ['errorRate'];
const SESSIONS_ACCESSORS = ['sessions'];
const STACK_ACCESSORS = ['timestamp'];
const AREA_STYLE = { area: { opacity: 0.6 }, point: { visible: 'never' as const } };

const MARKER_LABEL_ROOM: PartialTheme = { chartMargins: { top: 20 } };

const ERROR_RATE_TITLE = i18n.translate('xpack.digitalExperience.mobile.releases.errorRate.title', {
  defaultMessage: 'Error rate by release',
});

const ERROR_RATE_EMPTY = i18n.translate('xpack.digitalExperience.mobile.releases.errorRate.empty', {
  defaultMessage:
    'No release has enough sessions to show an error rate over time: it takes {minSessions} sessions in the time range, and {minBucketSessions} in a time bucket.',
  values: { minSessions: MIN_RELEASE_SESSIONS, minBucketSessions: MIN_BUCKET_SESSIONS },
});

const ADOPTION_TITLE = i18n.translate('xpack.digitalExperience.mobile.releases.adoption.title', {
  defaultMessage: 'Release adoption',
});

const ADOPTION_TOOLTIP = i18n.translate(
  'xpack.digitalExperience.mobile.releases.adoption.tooltip',
  {
    defaultMessage:
      'Distinct session.id values per release in each time bucket, stacked. The markers show where a release first appears.',
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
  onTimeRangeSelect: TimeRangeSelect;
}

const markerLabel = (releases: readonly string[]): string =>
  releases.length <= 2
    ? releases.join(', ')
    : i18n.translate('xpack.digitalExperience.mobile.releases.markerMore', {
        defaultMessage: '{release} +{count}',
        values: { release: releases[0], count: releases.length - 1 },
      });

const MARKER_LABEL_CSS = { whiteSpace: 'nowrap' } as const;

const firstSeenDetails = (
  markers: ReadonlyArray<{ release: string; firstSeen: number }>,
  formatDate: (date: number) => string
): string =>
  i18n.translate('xpack.digitalExperience.mobile.releases.markerDetails', {
    defaultMessage: 'First seen: {releases}',
    values: {
      releases: markers
        .map(({ release, firstSeen }) =>
          i18n.translate('xpack.digitalExperience.mobile.releases.markerRelease', {
            defaultMessage: '{release} ({date})',
            values: { release, date: formatDate(firstSeen) },
          })
        )
        .join(', '),
    },
  });

// Releases first seen in the same bucket share one line, so their labels don't overlap
function FirstSeenMarkers({
  markers,
  colors,
  bucketTimestamps,
}: Pick<ReleaseChartProps, 'markers' | 'colors'> & {
  bucketTimestamps: readonly number[];
}) {
  const { formatDate } = useFormatters();
  const bucketOf = (time: number) =>
    bucketTimestamps[sortedLastIndex(bucketTimestamps, time) - 1] ?? time;
  const groups = Object.values(
    groupBy(sortBy(markers, 'firstSeen'), ({ firstSeen }) => bucketOf(firstSeen))
  );

  return (
    <>
      {groups.map((group) => {
        const [{ release, firstSeen }] = group;
        const details = firstSeenDetails(group, formatDate);
        return (
          <LineAnnotation
            key={release}
            id={`firstSeen-${release}`}
            domainType={AnnotationDomainType.XDomain}
            dataValues={[{ dataValue: firstSeen, details }]}
            style={{ line: { stroke: colors.get(release), strokeWidth: 1, dash: [4, 4] } }}
            marker={
              <EuiText
                size="xs"
                css={MARKER_LABEL_CSS}
                data-test-subj="digitalExperienceMobileReleaseMarker"
              >
                {/* The label may shorten the releases; screen readers get them all */}
                <span aria-hidden={true}>{markerLabel(group.map((marker) => marker.release))}</span>
                <EuiScreenReaderOnly>
                  <span>{details}</span>
                </EuiScreenReaderOnly>
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
  const buckets = useMemo(
    () =>
      sortBy(
        uniqBy(
          series.flatMap(({ points }) => points),
          'timestamp'
        ),
        'timestamp'
      ),
    [series]
  );
  const bucketTimestamps = useMemo(() => buckets.map(({ timestamp }) => timestamp), [buckets]);
  const xDomain = useMemo(
    () => getTimeChartXDomain({ points: buckets, histogram, timeZone, hasBars: false }),
    [buckets, histogram, timeZone]
  );
  const onBrushEnd = useMemo(() => onBrushTimeRange(onTimeRangeSelect), [onTimeRangeSelect]);
  const headerFormatter = useCallback<NonNullable<TooltipProps['headerFormatter']>>(
    ({ value }) => formatDate(value),
    [formatDate]
  );

  return (
    <Chart size={CHART_SIZE}>
      {/* Below the plot, so the legend doesn't take its width */}
      <Settings
        baseTheme={baseTheme}
        theme={MARKER_LABEL_ROOM}
        locale={i18n.getLocale()}
        xDomain={xDomain}
        showLegend
        legendPosition={Position.Bottom}
        onBrushEnd={onBrushEnd}
      />
      <Tooltip headerFormatter={headerFormatter} />
      <PartialBucketsEndzones xDomain={xDomain} />
      <Axis id="time" position={Position.Bottom} style={HIDDEN_AXIS_LINES} />
      <Axis
        id={yAxisId}
        position={Position.Left}
        gridLine={GRID_LINE}
        ticks={3}
        style={HIDDEN_AXIS_LINES}
        tickFormat={formatValue}
      />
      <FirstSeenMarkers markers={markers} colors={colors} bucketTimestamps={bucketTimestamps} />
      {series.map((item) =>
        renderSeries({ series: item, color: colors.get(item.release), timeZone })
      )}
    </Chart>
  );
}

/** The error rate of each release with enough sessions, over time. */
export function ReleaseErrorRateChart({
  releases,
  series: allSeries,
  ...props
}: ReleaseChartProps) {
  const { formatErrorRate } = useFormatters();
  const series = useMemo(() => {
    const withRate = new Set(
      releases.filter(({ errorRate }) => errorRate !== null).map(({ release }) => release)
    );
    // Over the range's floor, a release can still have no bucket over the bucket's
    return allSeries.filter(
      ({ release, points }) =>
        withRate.has(release) && points.some(({ errorRate }) => errorRate !== null)
    );
  }, [releases, allSeries]);

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
            yAccessors={ERROR_RATE_ACCESSORS}
            data={points}
            curve={CurveType.CURVE_MONOTONE_X}
            timeZone={timeZone}
          />
        )}
      />
    </ChartPanel>
  );
}

/** The sessions of each release over time, stacked. */
export function ReleaseAdoptionChart(props: Omit<ReleaseChartProps, 'releases'>) {
  const { formatNumber } = useFormatters();
  const { series } = props;

  return (
    <ChartPanel
      data-test-subj="digitalExperienceMobileReleaseAdoptionChart"
      title={ADOPTION_TITLE}
      tooltip={ADOPTION_TOOLTIP}
      hasData={series.some(({ points }) => points.some(({ sessions }) => sessions > 0))}
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
            yAccessors={SESSIONS_ACCESSORS}
            stackAccessors={STACK_ACCESSORS}
            data={points}
            curve={CurveType.CURVE_MONOTONE_X}
            areaSeriesStyle={AREA_STYLE}
            timeZone={timeZone}
          />
        )}
      />
    </ChartPanel>
  );
}
