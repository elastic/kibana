/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type {
  EntityTimelineCategory,
  EntityTimelineData,
  EntityTimelineEvent,
  EntityTimelineEventKind,
  EntityTimelineLens,
  RiskModifierState,
} from './types';

export const HOUR_MS = 36e5;
export const DAY_MS = 24 * HOUR_MS;

export const CATEGORY_BY_KIND: Record<EntityTimelineEventKind, EntityTimelineCategory> = {
  alert: 'detections',
  alert_burst: 'detections',
  anomaly: 'detections',
  attack: 'detections',
  risk_level: 'risk',
  criticality: 'risk',
  watchlist: 'risk',
  resolution: 'identity',
  identity: 'identity',
  case: 'response',
  note: 'response',
  response_action: 'response',
  alertzero: 'alertzero',
};

export const CATEGORY_LABELS: Record<EntityTimelineCategory, string> = {
  detections: 'Detections',
  risk: 'Risk and context',
  identity: 'Identity',
  response: 'Investigation and response',
  alertzero: 'AlertZero',
};

export const CATEGORY_ORDER: EntityTimelineCategory[] = [
  'detections',
  'risk',
  'identity',
  'response',
  'alertzero',
];

export const KIND_LABELS: Record<EntityTimelineEventKind, string> = {
  alert: 'Alerts',
  alert_burst: 'Alert bursts',
  anomaly: 'Anomalies',
  attack: 'Attacks',
  risk_level: 'Risk level changes',
  criticality: 'Asset criticality',
  watchlist: 'Watchlists',
  resolution: 'Entity resolution',
  identity: 'Directory and HR changes',
  case: 'Cases',
  note: 'Notes',
  response_action: 'Response actions',
  alertzero: 'AlertZero actions',
};

export const KIND_ICONS: Record<EntityTimelineEventKind, IconType> = {
  alert: 'alert',
  alert_burst: 'aggregate',
  anomaly: 'machineLearningApp',
  attack: 'securitySignalDetected',
  risk_level: 'visLine',
  criticality: 'flag',
  watchlist: 'eye',
  resolution: 'link',
  identity: 'user',
  case: 'casesApp',
  note: 'comment',
  response_action: 'wrench',
  alertzero: 'sparkles',
};

export const ALL_KINDS = Object.keys(CATEGORY_BY_KIND) as EntityTimelineEventKind[];

/** Kinds the Risk lens can show; everything else never affects the score. */
export const RISK_LENS_KINDS: EntityTimelineEventKind[] = [
  'alert',
  'alert_burst',
  'criticality',
  'watchlist',
];

export type RiskFilterId = 'alerts' | 'criticality' | 'watchlists';

export const RISK_FILTER_KINDS: Record<RiskFilterId, EntityTimelineEventKind[]> = {
  alerts: ['alert', 'alert_burst'],
  criticality: ['criticality'],
  watchlists: ['watchlist'],
};

export const isAlertLike = (event: EntityTimelineEvent): boolean =>
  event.kind === 'alert' || event.kind === 'alert_burst';

export const isModifierEvent = (event: EntityTimelineEvent): boolean =>
  event.kind === 'criticality' || event.kind === 'watchlist';

export const isUncased = (event: EntityTimelineEvent): boolean =>
  isAlertLike(event) && !event.caseId && event.status !== 'closed';

export const eventTime = (event: EntityTimelineEvent): number => Date.parse(event.timestamp);

/**
 * Why an event in the risk window is not part of the score. `undefined` means
 * it either contributes or is not something users would expect to count.
 */
export const getRiskExclusionReason = (event: EntityTimelineEvent): string | undefined => {
  if (isAlertLike(event) && event.contribution == null) {
    return event.status === 'closed'
      ? 'Closed alerts are not scored'
      : 'Not scored by the risk engine';
  }
  if (event.kind === 'anomaly') {
    return 'Anomalies count only once a rule promotes them to an alert';
  }
  return undefined;
};

export type TimeRangeId = '24h' | '7d' | '30d' | '90d' | '1y';

export const TIME_RANGE_MS: Record<TimeRangeId, number> = {
  '24h': DAY_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
  '90d': 90 * DAY_MS,
  '1y': 366 * DAY_MS,
};

export const LENS_TIME_RANGES: Record<EntityTimelineLens, TimeRangeId[]> = {
  full: ['7d', '30d', '90d', '1y'],
  risk: ['24h', '7d', '30d'],
};

export const LENS_DEFAULT_RANGE: Record<EntityTimelineLens, TimeRangeId> = {
  full: '1y',
  risk: '30d',
};

export interface TimeWindow {
  from: number;
  to: number;
}

/** Attack window padded so the lead-up and the response afterwards stay visible. */
export const getAttackWindow = (attack: EntityTimelineEvent, now: number): TimeWindow => ({
  from: Date.parse(attack.attackStart ?? attack.timestamp) - HOUR_MS,
  to: now,
});

/** Bucket size for the overview chart, scaled to the visible span. */
export const getBucketMs = ({ from, to }: TimeWindow): number => {
  const span = to - from;
  if (span <= 2 * DAY_MS) return HOUR_MS;
  if (span <= 8 * DAY_MS) return 6 * HOUR_MS;
  if (span <= 32 * DAY_MS) return DAY_MS;
  if (span <= 95 * DAY_MS) return 3 * DAY_MS;
  return 7 * DAY_MS;
};

export type GroupingUnit = 'month' | 'day';

export const getGroupingUnit = ({ from, to }: TimeWindow): GroupingUnit =>
  to - from > 32 * DAY_MS ? 'month' : 'day';

const startOfDay = (time: number): number => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const getGroupKey = (event: EntityTimelineEvent, unit: GroupingUnit): string => {
  const date = new Date(event.timestamp);
  return unit === 'month'
    ? `${date.getFullYear()}-${date.getMonth()}`
    : String(startOfDay(date.getTime()));
};

export const getGroupLabel = (
  event: EntityTimelineEvent,
  unit: GroupingUnit,
  now: number
): string => {
  const date = new Date(event.timestamp);
  if (unit === 'month') {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  const dayLabel = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const daysBack = Math.round((startOfDay(now) - startOfDay(date.getTime())) / DAY_MS);
  if (daysBack === 0) return `Today · ${dayLabel}`;
  if (daysBack === 1) return `Yesterday · ${dayLabel}`;
  return dayLabel;
};

export interface ScorePoint {
  x: number;
  y: number;
  eventId?: string;
}

/**
 * Running risk score across the window: modifiers in effect at the start, then
 * each contributing alert and modifier change in order. This explains the score
 * as a sum; the engine itself is not additive (see discussion notes).
 */
export const getRunningScore = (
  data: EntityTimelineData,
  window: TimeWindow,
  now: number
): ScorePoint[] => {
  const contributing = data.events.filter(
    (event) =>
      eventTime(event) <= window.to &&
      (event.contribution != null || (isModifierEvent(event) && event.contributionDelta))
  );
  const riskWindowStart = now - data.riskWindowDays * DAY_MS;

  let score = contributing
    .filter((event) => isModifierEvent(event) && eventTime(event) < riskWindowStart)
    .reduce((total, event) => total + (event.contributionDelta ?? 0), 0);

  const points: ScorePoint[] = [];
  contributing
    .filter((event) => eventTime(event) >= riskWindowStart)
    .forEach((event) => {
      const time = eventTime(event);
      if (time < window.from) {
        score += event.contribution ?? event.contributionDelta ?? 0;
        return;
      }
      if (points.length === 0) points.push({ x: window.from, y: round(score) });
      score += event.contribution ?? event.contributionDelta ?? 0;
      points.push({ x: time, y: round(score), eventId: event.id });
    });

  if (points.length === 0) points.push({ x: window.from, y: round(score) });
  points.push({ x: window.to, y: round(score) });
  return points;
};

const CRITICALITY_LABELS: Record<string, string> = {
  unassigned: 'Unassigned',
  low_impact: 'Low impact',
  medium_impact: 'Medium impact',
  high_impact: 'High impact',
  extreme_impact: 'Extreme impact',
};

/** Criticality and watchlist modifiers as they stood at `time`, replayed from their events. */
export const getModifiersAt = (data: EntityTimelineData, time: number): RiskModifierState[] => {
  let criticality: RiskModifierState | undefined;
  const watchlists = new Map<string, RiskModifierState>();

  data.events
    .filter((event) => isModifierEvent(event) && eventTime(event) < time)
    .sort((a, b) => eventTime(a) - eventTime(b))
    .forEach((event) => {
      if (event.kind === 'criticality' && event.criticalityTo) {
        criticality = {
          id: 'criticality',
          label: 'Asset criticality',
          value: CRITICALITY_LABELS[event.criticalityTo],
          contribution: (criticality?.contribution ?? 0) + (event.contributionDelta ?? 0),
          since: event.timestamp,
          eventId: event.id,
        };
      }
      if (event.kind === 'watchlist' && event.watchlist) {
        if (event.watchlistAction === 'removed') {
          watchlists.delete(event.watchlist);
        } else {
          watchlists.set(event.watchlist, {
            id: `watchlist-${event.watchlist}`,
            label: 'Watchlist',
            value: event.watchlist,
            contribution: event.contributionDelta ?? 0,
            since: event.timestamp,
            eventId: event.id,
          });
        }
      }
    });

  return [...(criticality ? [criticality] : []), ...watchlists.values()];
};

/** Score right after each contributing event, keyed by event id. */
export const getScoreAfterEvent = (points: ScorePoint[]): Map<string, number> =>
  new Map(
    points
      .filter((point): point is Required<ScorePoint> => point.eventId != null)
      .map((point) => [point.eventId, point.y])
  );

const round = (value: number): number => Math.round(value * 10) / 10;

export const formatContribution = (value: number): string =>
  `${value > 0 ? '+' : ''}${value.toFixed(1)}`;

export const formatEventTime = (event: EntityTimelineEvent, unit: GroupingUnit): string => {
  const date = new Date(event.timestamp);
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return unit === 'month'
    ? `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`
    : time;
};

export const formatDuration = (fromIso: string, toIso: string): string => {
  const minutes = Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};
