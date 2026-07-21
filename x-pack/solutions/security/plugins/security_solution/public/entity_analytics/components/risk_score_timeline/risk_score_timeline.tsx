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
  ColorVariant,
  CurveType,
  LineAnnotation,
  LineSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
  Tooltip,
  type PointStyleAccessor,
  type ProjectedValues,
} from '@elastic/charts';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingChart,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import type { DateRangePickerSettings, TimeRangeBoundsOption } from '@kbn/date-range-picker/types';
import { DateRangePicker, type DateRangePickerOnChangeProps } from '@kbn/date-range-picker';
import { isEmpty } from 'lodash/fp';
import dateMath from '@kbn/datemath';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskScoreHistoryEntry } from '../../../../common/api/entity_analytics';
import { RISK_LEVEL_RANGES } from '../../../../common/entity_analytics/risk_engine';
import { DEFAULT_TIMEPICKER_QUICK_RANGES } from '../../../../common/constants';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { useRiskScoreHistory } from '../../api/hooks/use_risk_score_history';
import {
  prepareTimelineEntries,
  startOfLocalDay,
  startOfLocalHour,
  type TimelineBucketInterval,
} from './prepare_timeline_entries';

export interface RiskScoreTimelinePointSelection {
  timestamp: string;
  scoreNorm: number;
}

export interface RiskScoreTimelineProps {
  entityType: EntityType;
  entityId: string;
  from: string;
  to: string;
  scoreType?: RiskScoreHistoryEntry['score_type'];
  /**
   * Authoritative current score from the entity store (right-flyout source).
   * When set, overrides the rightmost history chart point so it matches the
   * Risk score metric.
   */
  currentScoreNorm?: number;
  currentScoreLevel?: RiskScoreHistoryEntry['calculated_level'];
  selectedTimestamp?: string;
  onPointSelect: (point: RiskScoreTimelinePointSelection | undefined) => void;
  onRangeChange: (range: { from: string; to: string }) => void;
}

const CHART_HEIGHT = 180;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
/** Native line-chart point radius (Elastic Charts default). */
const POINT_RADIUS = 3;
/** Native hover / selected highlight radius. */
const POINT_HIGHLIGHT_RADIUS = 5;

const DEFAULT_DATE_PICKER_VALUE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.riskScoreTimeline.defaultDateRangeLabel',
  { defaultMessage: 'Last 30 days' }
);

const DEFAULT_DATE_PICKER_SETTINGS: DateRangePickerSettings = {
  roundRelativeTime: true,
  timePrecision: 's',
};

interface QuickRange {
  from: string;
  to: string;
  display: string;
}

interface SavedRange {
  from: string;
  to: string;
  label: string;
}

export const RiskScoreTimeline: React.FC<RiskScoreTimelineProps> = ({
  entityType,
  entityId,
  from,
  to,
  scoreType,
  currentScoreNorm,
  currentScoreLevel,
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

  const currentScore = useMemo(
    () =>
      currentScoreNorm != null && currentScoreNorm > 0
        ? {
            calculated_score_norm: currentScoreNorm,
            calculated_level: currentScoreLevel,
          }
        : undefined,
    [currentScoreNorm, currentScoreLevel]
  );

  const {
    chartEntries: entries,
    interval,
  } = useMemo(
    () => prepareTimelineEntries(data?.entries ?? [], from, to, currentScore),
    [data?.entries, from, to, currentScore]
  );
  const minInterval = interval === '1h' ? ONE_HOUR_MS : ONE_DAY_MS;
  const isHourlyView = interval === '1h';

  const [datePickerValue, setDatePickerValue] = useState(DEFAULT_DATE_PICKER_VALUE);
  const [datePickerSettings, setDatePickerSettings] = useState<DateRangePickerSettings>(
    DEFAULT_DATE_PICKER_SETTINGS
  );
  const [recentTimeRanges, setRecentTimeRanges] = useState<TimeRangeBoundsOption[]>([]);
  const [previousRange, setPreviousRange] = useState<SavedRange | undefined>(undefined);
  const [quickRanges] = useUiSetting$<QuickRange[]>(DEFAULT_TIMEPICKER_QUICK_RANGES);

  const presets = useMemo<TimeRangeBoundsOption[]>(
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

  const applyRangeChange = useCallback(
    (next: { from: string; to: string }, label: string, options?: { clearDrillDown?: boolean }) => {
      setDatePickerValue(label);
      setRecentTimeRanges((prev) => {
        const key = `${next.from}|${next.to}`;
        const deduped = prev.filter((range) => `${range.start}|${range.end}` !== key);
        return [{ start: next.from, end: next.to, label }, ...deduped].slice(0, 10);
      });
      if (options?.clearDrillDown) {
        setPreviousRange(undefined);
      }
      onPointSelect(undefined);
      onRangeChange(next);
    },
    [onPointSelect, onRangeChange]
  );

  const handleDatePickerChange = useCallback(
    (args: DateRangePickerOnChangeProps) => {
      if (args.isInvalid) {
        return;
      }
      // Manual picker edits leave day drill-down.
      applyRangeChange({ from: args.start, to: args.end }, args.value, { clearDrillDown: true });
    },
    [applyRangeChange]
  );

  const handleDrillIntoDay = useCallback(
    (dayTimestamp: string) => {
      const dayStartMs = startOfLocalDay(toEpochMs(dayTimestamp));
      const now = Date.now();
      const isToday = dayStartMs === startOfLocalDay(now);
      // Past days: full local calendar day. Today: through end of the current hour.
      const dayEndMs = isToday
        ? startOfLocalHour(now) + ONE_HOUR_MS - 1
        : dayStartMs + ONE_DAY_MS - 1;
      const dayFrom = new Date(dayStartMs).toISOString();
      const dayTo = new Date(dayEndMs).toISOString();
      // Explicit day-bounded label so the picker does not parse a lone date as
      // "that day until now".
      const dayLabel = formatDayRangeLabel(dayStartMs, dayEndMs);

      setPreviousRange({ from, to, label: datePickerValue });
      applyRangeChange({ from: dayFrom, to: dayTo }, dayLabel);
    },
    [applyRangeChange, datePickerValue, from, to]
  );

  const handleBackToPreviousRange = useCallback(() => {
    if (!previousRange) {
      return;
    }
    applyRangeChange(
      { from: previousRange.from, to: previousRange.to },
      previousRange.label,
      { clearDrillDown: true }
    );
  }, [applyRangeChange, previousRange]);

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
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.securitySolution.entityAnalytics.riskScoreTimeline.title', {
                defaultMessage: 'History',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {previousRange !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="returnKey"
                  onClick={handleBackToPreviousRange}
                  data-test-subj="riskScoreTimeline-BackToPreviousRange"
                >
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.riskScoreTimeline.backToPreviousRange',
                    {
                      defaultMessage: 'Back to {label}',
                      values: { label: previousRange.label },
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <DateRangePicker
                value={datePickerValue}
                onChange={handleDatePickerChange}
                settings={datePickerSettings}
                onSettingsChange={setDatePickerSettings}
                presets={presets}
                recent={recentTimeRanges}
                width="auto"
                compressed
                data-test-subj="riskScoreTimeline-DateRangePicker"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <TimelineBody
        entries={entries}
        isLoading={isLoading}
        isError={error !== undefined}
        from={from}
        to={to}
        minInterval={minInterval}
        interval={interval}
        selectedTimestamp={selectedTimestamp}
        onPointSelect={onPointSelect}
        onDrillIntoDay={handleDrillIntoDay}
        currentScoreNorm={currentScoreNorm}
        isHourlyView={isHourlyView}
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
  interval: TimelineBucketInterval;
  selectedTimestamp?: string;
  onPointSelect: (point: RiskScoreTimelinePointSelection | undefined) => void;
  onDrillIntoDay: (dayTimestamp: string) => void;
  currentScoreNorm?: number;
  isHourlyView: boolean;
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
  onDrillIntoDay,
  currentScoreNorm,
  isHourlyView,
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
        onDrillIntoDay={onDrillIntoDay}
        currentScoreNorm={currentScoreNorm}
        isHourlyView={isHourlyView}
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
  onPointSelect: (point: RiskScoreTimelinePointSelection | undefined) => void;
  onDrillIntoDay: (dayTimestamp: string) => void;
  currentScoreNorm?: number;
  isHourlyView: boolean;
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  entries,
  from,
  to,
  minInterval,
  selectedTimestamp,
  onPointSelect,
  onDrillIntoDay,
  currentScoreNorm,
  isHourlyView,
}) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  const xDomain = useMemo(() => {
    const min = dateMath.parse(from)?.valueOf();
    const max = dateMath.parse(to, { roundUp: true })?.valueOf();
    if (min === undefined || max === undefined) {
      return undefined;
    }
    return {
      min,
      max,
      ...(minInterval !== undefined && { minInterval }),
    };
  }, [from, to, minInterval]);

  const axisTimeFormatter = useMemo(() => {
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

      if (!isHourlyView) {
        // Daily view: click a day → zoom into hourly scores for that day.
        const nearestDay = nearestEntryTimestamp(entries, x);
        onDrillIntoDay(nearestDay);
        return;
      }

      // Hourly view: select the densified hour under the cursor (all 24h are
      // clickable; Contributions are mocked when the history API has no doc).
      const nearest = findNearestEntry(entries, x);
      const lastEntry = entries[entries.length - 1];

      // The rightmost chart point is overlaid with the entity-store score (right
      // flyout). Selecting that observation should show the same Contributions as
      // "latest", not empty/mocked history contributions.
      if (
        currentScoreNorm != null &&
        currentScoreNorm > 0 &&
        nearest['@timestamp'] === lastEntry?.['@timestamp']
      ) {
        onPointSelect(undefined);
        return;
      }

      const nextPoint = {
        timestamp: nearest['@timestamp'],
        scoreNorm: nearest.calculated_score_norm,
      };
      onPointSelect(
        selectedTimestamp === nextPoint.timestamp ? undefined : nextPoint
      );
    },
    [
      isHourlyView,
      entries,
      onDrillIntoDay,
      onPointSelect,
      selectedTimestamp,
      currentScoreNorm,
    ]
  );

  const selectedMs = selectedTimestamp === undefined ? undefined : toEpochMs(selectedTimestamp);

  const pointStyleAccessor = useCallback<PointStyleAccessor>(
    ({ x }) =>
      x === selectedMs
        ? {
            // Match hover highlight size + series color, but solid/bold (not semi-transparent).
            fill: ColorVariant.Series,
            stroke: ColorVariant.Series,
            strokeWidth: 2,
            radius: POINT_HIGHLIGHT_RADIUS,
            opacity: 1,
          }
        : null,
    [selectedMs]
  );

  const seriesName = isHourlyView
    ? i18n.translate('xpack.securitySolution.entityAnalytics.riskScoreTimeline.hourlySeriesName', {
        defaultMessage: 'Risk score',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.riskScoreTimeline.dailySeriesName', {
        defaultMessage: 'Max risk score',
      });

  const chartTheme = useMemo(
    () => ({
      lineSeriesStyle: {
        point: {
          visible: 'always' as const,
          fill: ColorVariant.Series,
          stroke: ColorVariant.Series,
          strokeWidth: 0,
          radius: POINT_RADIUS,
          opacity: 1,
          focused: { strokeWidth: 2.5 },
        },
        isolatedPoint: {
          fill: ColorVariant.Series,
          stroke: ColorVariant.Series,
          strokeWidth: 0,
          radius: POINT_RADIUS,
        },
      },
      // Native hover: larger semi-transparent mark around the focused point.
      highlighter: {
        point: {
          opacity: 1,
          fill: ColorVariant.Series,
          stroke: ColorVariant.Series,
          strokeWidth: 1.5,
          radius: POINT_RADIUS,
          onHover: {
            opacity: 0.5,
            fill: ColorVariant.Series,
            stroke: ColorVariant.None,
            strokeWidth: 0,
            radius: POINT_HIGHLIGHT_RADIUS,
          },
        },
      },
      // Hover crosshair: dashed guides in borderBasePlain.
      crosshair: {
        line: {
          visible: true,
          stroke: euiTheme.colors.borderBasePlain,
          strokeWidth: 1,
          dash: [4, 4],
        },
        crossLine: {
          visible: true,
          stroke: euiTheme.colors.borderBasePlain,
          strokeWidth: 1,
          dash: [4, 4],
        },
      },
    }),
    [euiTheme.colors.borderBasePlain]
  );

  // Daily: date only. Hourly: Kibana dateFormat with millis, e.g. "Jul 21, 2026 @ 13:06:57.982".
  const tooltipHeaderFormatter = useMemo(
    () =>
      isHourlyView
        ? timeFormatter('MMM D, YYYY [@] HH:mm:ss.SSS')
        : timeFormatter('MMMM D, YYYY'),
    [isHourlyView]
  );

  const formatTooltipHeader = useCallback(
    ({ value }: { value: number }) => tooltipHeaderFormatter(value),
    [tooltipHeaderFormatter]
  );

  return (
    <div
      css={{
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        paddingBlock: euiTheme.size.s, // 8px vertical padding of the white chart background
      }}
    >
      <Chart size={{ height: CHART_HEIGHT }}>
        <Settings
          baseTheme={baseTheme}
          theme={chartTheme}
          xDomain={xDomain}
          onProjectionClick={handleProjectionClick}
        />
        <Tooltip headerFormatter={formatTooltipHeader} />
        <Axis id="riskScoreTimelineTime" position={Position.Bottom} tickFormat={axisTimeFormatter} />
        <Axis
          id="riskScoreTimelineScore"
          position={Position.Left}
          domain={{ min: 0, max: 100 }}
          ticks={11}
          integersOnly
          tickFormat={formatScoreAxisTick}
        />
        {THRESHOLDS.map(({ level, value }) => (
          <LineAnnotation
            key={level}
            id={`riskScoreTimelineThreshold-${level}`}
            domainType={AnnotationDomainType.YDomain}
            // Keep threshold guides behind series points so filled dots fully cover them.
            zIndex={-1}
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
            zIndex={0}
            dataValues={[{ dataValue: selectedMs, details: selectedTimestamp }]}
            marker={<EuiIcon type="dot" data-test-subj="riskScoreTimeline-SelectedPoint" />}
            markerPosition={Position.Top}
            style={{
              line: {
                strokeWidth: 2,
                stroke: euiTheme.colors.borderBaseProminent,
                dash: [4, 4],
                opacity: 1,
              },
            }}
          />
        )}
        <LineSeries
          id="riskScoreTimelineSeries"
          name={seriesName}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          data={chartData}
          curve={CurveType.LINEAR}
          tickFormat={formatScoreNorm}
          pointStyleAccessor={pointStyleAccessor}
        />
      </Chart>
    </div>
  );
};

TimelineChart.displayName = 'TimelineChart';

/** Always show risk score values with two decimal places in tooltips. */
const formatScoreNorm = (value: number): string => value.toFixed(2);

/** Integer-only Y-axis labels (no fractional digits). */
const formatScoreAxisTick = (value: number): string => `${Math.round(value)}`;

// the 'Unknown' band starts at 0 and needs no boundary line
const THRESHOLDS = Object.entries(RISK_LEVEL_RANGES)
  .filter(([, range]) => range.start > 0)
  .map(([level, range]) => ({ level, value: range.start }));

const toEpochMs = (timestamp: string): number => new Date(timestamp).getTime();

const findNearestEntry = (
  entries: RiskScoreHistoryEntry[],
  x: number
): RiskScoreHistoryEntry =>
  entries.reduce((nearest, entry) =>
    Math.abs(toEpochMs(entry['@timestamp']) - x) < Math.abs(toEpochMs(nearest['@timestamp']) - x)
      ? entry
      : nearest
  );

const nearestEntryTimestamp = (entries: RiskScoreHistoryEntry[], x: number): string =>
  findNearestEntry(entries, x)['@timestamp'];

const formatDayRangeLabel = (dayStartMs: number, dayEndMs: number): string => {
  const start = new Date(dayStartMs);
  const end = new Date(dayEndMs);
  const day = start.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const startTime = start.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endTime = end.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day} ${startTime} to ${day} ${endTime}`;
};
