/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  AnnotationDomainType,
  Axis,
  Chart,
  CurveType,
  LineAnnotation,
  LineSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  type PointStyleAccessor,
  type ProjectedValues,
} from '@elastic/charts';
import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingChart,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiSuperDatePickerRecentRange,
  type OnTimeChangeProps,
} from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import { isEmpty, take } from 'lodash/fp';
import dateMath from '@kbn/datemath';
import { parseInterval } from '@kbn/data-plugin/common';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskScoreHistoryEntry } from '../../../../common/api/entity_analytics';
import { RISK_LEVEL_RANGES } from '../../../../common/entity_analytics/risk_engine';
import { DEFAULT_DATE_FORMAT, DEFAULT_TIMEPICKER_QUICK_RANGES } from '../../../../common/constants';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { useRiskScoreHistory } from '../../api/hooks/use_risk_score_history';

export interface RiskScoreTimelineProps {
  entityType: EntityType;
  entityId: string;
  from: string;
  to: string;
  scoreType?: RiskScoreHistoryEntry['score_type'];
  selectedTimestamp?: string;
  onPointSelect: (timestamp: string | undefined) => void;
  onRangeChange: (range: { from: string; to: string }) => void;
}

const CHART_HEIGHT = 180;
const X_DOMAIN_RIGHT_PADDING = 0.03;
const MAX_RECENTLY_USED_RANGES = 9;

interface QuickRange {
  from: string;
  to: string;
  display: string;
}

// Used only to floor the chart's x-domain `minInterval` so buckets keep a
// sensible minimum spacing; moment's calendar-unit approximations are fine here.
const intervalToMs = (interval: string | undefined): number | undefined =>
  interval === undefined ? undefined : parseInterval(interval)?.asMilliseconds();

export const RiskScoreTimeline: React.FC<RiskScoreTimelineProps> = ({
  entityType,
  entityId,
  from,
  to,
  scoreType,
  selectedTimestamp,
  onPointSelect,
  onRangeChange,
}) => {
  const { data, isLoading, error } = useRiskScoreHistory({
    entityType,
    entityId,
    from,
    to,
    scoreType,
  });

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const minInterval = useMemo(() => intervalToMs(data?.interval), [data?.interval]);

  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState<EuiSuperDatePickerRecentRange[]>([]);
  const [quickRanges] = useUiSetting$<QuickRange[]>(DEFAULT_TIMEPICKER_QUICK_RANGES);
  const [dateFormat] = useUiSetting$<string>(DEFAULT_DATE_FORMAT);

  const commonlyUsedRanges = useMemo(
    () =>
      isEmpty(quickRanges)
        ? []
        : quickRanges.map(({ from: rangeFrom, to: rangeTo, display }) => ({
            start: rangeFrom,
            end: rangeTo,
            label: display,
          })),
    [quickRanges]
  );

  const onTimeChange = ({ start, end, isInvalid }: OnTimeChangeProps) => {
    if (isInvalid) {
      return;
    }
    onRangeChange({ from: start, to: end });
    setRecentlyUsedRanges((ranges) => [
      { start, end },
      ...take(
        MAX_RECENTLY_USED_RANGES,
        ranges.filter((range) => !(range.start === start && range.end === end))
      ),
    ]);
  };

  return (
    <div
      data-test-subj="riskScoreTimeline"
      aria-label={i18n.translate(
        'xpack.securitySolution.entityAnalytics.riskScoreTimeline.ariaLabel',
        { defaultMessage: 'Risk score history timeline' }
      )}
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.securitySolution.entityAnalytics.riskScoreTimeline.title', {
                defaultMessage: 'Risk score history',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={from}
            end={to}
            onTimeChange={onTimeChange}
            commonlyUsedRanges={commonlyUsedRanges}
            recentlyUsedRanges={recentlyUsedRanges}
            dateFormat={dateFormat}
            isAutoRefreshOnly={false}
            showUpdateButton="iconOnly"
            compressed
            width="auto"
            data-test-subj="riskScoreTimeline-RangeSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <TimelineBody
        entries={entries}
        isLoading={isLoading}
        isError={error !== undefined}
        from={from}
        to={to}
        minInterval={minInterval}
        selectedTimestamp={selectedTimestamp}
        onPointSelect={onPointSelect}
      />
    </div>
  );
};

RiskScoreTimeline.displayName = 'RiskScoreTimeline';

interface TimelineBodyProps {
  entries: RiskScoreHistoryEntry[];
  isLoading: boolean;
  isError: boolean;
  from: string;
  to: string;
  minInterval?: number;
  selectedTimestamp?: string;
  onPointSelect: (timestamp: string | undefined) => void;
}

const TimelineBody: React.FC<TimelineBodyProps> = ({
  entries,
  isLoading,
  isError,
  from,
  to,
  minInterval,
  selectedTimestamp,
  onPointSelect,
}) => {
  if (isError) {
    return (
      <EuiCallOut
        announceOnMount
        data-test-subj="riskScoreTimeline-Error"
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.riskScoreTimeline.errorTitle',
          { defaultMessage: 'There was an error retrieving risk score history.' }
        )}
        color="danger"
        iconType="error"
      />
    );
  }

  if (isLoading) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={{ height: CHART_HEIGHT }}
        data-test-subj="riskScoreTimeline-Loading"
      >
        <EuiLoadingChart size="l" />
      </EuiFlexGroup>
    );
  }

  if (entries.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="riskScoreTimeline-Empty"
        css={{ height: CHART_HEIGHT }}
        body={
          <EuiText size="s">
            {i18n.translate('xpack.securitySolution.entityAnalytics.riskScoreTimeline.emptyBody', {
              defaultMessage: 'No risk score history found for this time range.',
            })}
          </EuiText>
        }
      />
    );
  }

  return (
    <TimelineChart
      entries={entries}
      from={from}
      to={to}
      minInterval={minInterval}
      selectedTimestamp={selectedTimestamp}
      onPointSelect={onPointSelect}
    />
  );
};

TimelineBody.displayName = 'TimelineBody';

interface TimelineChartProps {
  entries: RiskScoreHistoryEntry[];
  from: string;
  to: string;
  minInterval?: number;
  selectedTimestamp?: string;
  onPointSelect: (timestamp: string | undefined) => void;
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  entries,
  from,
  to,
  minInterval,
  selectedTimestamp,
  onPointSelect,
}) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  const xDomain = useMemo(() => {
    const min = dateMath.parse(from)?.valueOf();
    const max = dateMath.parse(to, { roundUp: true })?.valueOf();
    if (min === undefined || max === undefined) {
      return undefined;
    }
    // points at the domain boundary (`to` is usually `now`) get half-clipped and
    // are hard to click, so pad the right edge past the newest scores
    return {
      min,
      max: max + (max - min) * X_DOMAIN_RIGHT_PADDING,
      ...(minInterval !== undefined && { minInterval }),
    };
  }, [from, to, minInterval]);

  const timeFormatter = useMemo(() => {
    const first = toEpochMs(entries[0]['@timestamp']);
    const last = toEpochMs(entries[entries.length - 1]['@timestamp']);
    const [min, max] = [xDomain?.min ?? first, xDomain?.max ?? last];
    return niceTimeFormatter([min, max]);
  }, [entries, xDomain]);

  const chartData = useMemo(
    () => entries.map((entry) => [toEpochMs(entry['@timestamp']), entry.calculated_score_norm]),
    [entries]
  );

  const handleProjectionClick = useCallback(
    ({ x }: ProjectedValues) => {
      if (typeof x !== 'number') {
        return;
      }

      const nearest = nearestEntryTimestamp(entries, x);
      onPointSelect(nearest === selectedTimestamp ? undefined : nearest);
    },
    [entries, onPointSelect, selectedTimestamp]
  );

  const selectedMs = selectedTimestamp === undefined ? undefined : toEpochMs(selectedTimestamp);

  const pointStyleAccessor = useCallback<PointStyleAccessor>(
    ({ x }) =>
      x === selectedMs ? { fill: euiTheme.colors.primary, stroke: euiTheme.colors.primary } : null,
    [selectedMs, euiTheme.colors.primary]
  );

  return (
    <Chart size={{ height: CHART_HEIGHT }}>
      <Settings
        baseTheme={baseTheme}
        theme={{ lineSeriesStyle: { point: { visible: 'always' } } }}
        xDomain={xDomain}
        onProjectionClick={handleProjectionClick}
      />
      <Axis id="riskScoreTimelineTime" position={Position.Bottom} tickFormat={timeFormatter} />
      <Axis
        id="riskScoreTimelineScore"
        position={Position.Left}
        domain={{ min: 0, max: 100 }}
        ticks={3}
      />
      {THRESHOLDS.map(({ level, value }) => (
        <LineAnnotation
          key={level}
          id={`riskScoreTimelineThreshold-${level}`}
          domainType={AnnotationDomainType.YDomain}
          dataValues={[{ dataValue: value, details: level }]}
          marker={
            <EuiText size="xs" color="subdued">
              {level}
            </EuiText>
          }
          markerPosition={Position.Right}
          style={{
            line: { strokeWidth: 1, stroke: euiTheme.colors.borderBaseSubdued, dash: [4, 4] },
          }}
        />
      ))}
      {selectedMs !== undefined && (
        <LineAnnotation
          id="riskScoreTimelineSelection"
          domainType={AnnotationDomainType.XDomain}
          dataValues={[{ dataValue: selectedMs, details: selectedTimestamp }]}
          marker={<EuiIcon type="dot" data-test-subj="riskScoreTimeline-SelectedPoint" />}
          markerPosition={Position.Top}
          style={{ line: { strokeWidth: 2, stroke: euiTheme.colors.primary } }}
        />
      )}
      <LineSeries
        id="riskScoreTimelineSeries"
        name={i18n.translate(
          'xpack.securitySolution.entityAnalytics.riskScoreTimeline.seriesName',
          {
            defaultMessage: 'Risk score',
          }
        )}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={0}
        yAccessors={[1]}
        data={chartData}
        curve={CurveType.CURVE_STEP_AFTER}
        pointStyleAccessor={pointStyleAccessor}
      />
    </Chart>
  );
};

TimelineChart.displayName = 'TimelineChart';

// the 'Unknown' band starts at 0 and needs no boundary line
const THRESHOLDS = Object.entries(RISK_LEVEL_RANGES)
  .filter(([, range]) => range.start > 0)
  .map(([level, range]) => ({ level, value: range.start }));

const toEpochMs = (timestamp: string): number => new Date(timestamp).getTime();

const nearestEntryTimestamp = (entries: RiskScoreHistoryEntry[], x: number): string =>
  entries.reduce((nearest, entry) =>
    Math.abs(toEpochMs(entry['@timestamp']) - x) < Math.abs(toEpochMs(nearest['@timestamp']) - x)
      ? entry
      : nearest
  )['@timestamp'];
