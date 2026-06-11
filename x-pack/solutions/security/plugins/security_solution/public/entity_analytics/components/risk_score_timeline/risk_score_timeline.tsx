/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
  type ProjectedValues,
} from '@elastic/charts';
import {
  EuiButtonGroup,
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
import dateMath from '@kbn/datemath';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskScoreHistoryEntry } from '../../../../common/api/entity_analytics';
import { RISK_LEVEL_RANGES } from '../../../../common/entity_analytics/risk_engine';
import { useRiskScoreHistory } from '../../api/hooks/use_risk_score_history';

export interface RiskScoreTimelineProps {
  entityType: EntityType;
  entityId: string;
  from: string;
  to: string;
  scoreType?: RiskScoreHistoryEntry['score_type'];
  selectedTimestamp?: string;
  onPointSelect: (timestamp: string | undefined) => void;
  onRangeChange: (from: string) => void;
}

const CHART_HEIGHT = 180;
const CHART_PAGE_SIZE = 1000;

export const RANGE_PRESETS = [
  {
    id: 'now-7d',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.riskScoreTimeline.rangePreset7d',
      { defaultMessage: '7d' }
    ),
  },
  {
    id: 'now-30d',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.riskScoreTimeline.rangePreset30d',
      { defaultMessage: '30d' }
    ),
  },
  {
    id: 'now-90d',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.riskScoreTimeline.rangePreset90d',
      { defaultMessage: '90d' }
    ),
  },
  {
    id: 'now-1y',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.riskScoreTimeline.rangePreset1y',
      { defaultMessage: '1y' }
    ),
  },
];

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
    pageSize: CHART_PAGE_SIZE,
  });

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);

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
          <EuiButtonGroup
            buttonSize="compressed"
            legend={i18n.translate(
              'xpack.securitySolution.entityAnalytics.riskScoreTimeline.rangeLegend',
              { defaultMessage: 'Risk score history time range' }
            )}
            options={RANGE_PRESETS}
            idSelected={from}
            onChange={(id) => onRangeChange(id)}
            data-test-subj="riskScoreTimeline-RangeSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <TimelineBody
        entries={entries}
        isLoading={isLoading}
        isError={error !== null && error !== undefined}
        from={from}
        to={to}
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
  selectedTimestamp?: string;
  onPointSelect: (timestamp: string | undefined) => void;
}

const TimelineBody: React.FC<TimelineBodyProps> = ({
  entries,
  isLoading,
  isError,
  from,
  to,
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
  selectedTimestamp?: string;
  onPointSelect: (timestamp: string | undefined) => void;
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  entries,
  from,
  to,
  selectedTimestamp,
  onPointSelect,
}) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  const xDomain = useMemo(() => {
    const min = dateMath.parse(from)?.valueOf();
    const max = dateMath.parse(to, { roundUp: true })?.valueOf();
    return min !== undefined && max !== undefined ? { min, max } : undefined;
  }, [from, to]);

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
          style={{ line: { strokeWidth: 1, stroke: euiTheme.colors.borderBaseSubdued, dash: [4, 4] } }}
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
        name={i18n.translate('xpack.securitySolution.entityAnalytics.riskScoreTimeline.seriesName', {
          defaultMessage: 'Risk score',
        })}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={0}
        yAccessors={[1]}
        data={chartData}
        curve={CurveType.CURVE_STEP_AFTER}
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
