/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RumAlertTemplateId } from './rum_alerts';

export const RUM_ALERT_FIRE_STATUSES = new Set(['pending', 'active']);

export interface RumAlertEpisodeEvent {
  timestamp: string;
  episodeId?: string;
  status?: string;
  ruleId?: string;
  groupHash?: string;
}

export interface RumAlertFireBucket {
  timestamp: string;
  fires: number;
}

export interface RumAlertInvestigateTarget {
  pathname: string;
  frustration?: string;
}

export const isRumAlertFireStatus = (status: string | undefined): boolean =>
  Boolean(status && RUM_ALERT_FIRE_STATUSES.has(status));

/** Keep the latest event per episode (input must be newest-first). */
export const collapseRumAlertEpisodes = <T extends RumAlertEpisodeEvent>(
  events: T[],
  limit = 25
): T[] => {
  const seen = new Set<string>();
  const latest: T[] = [];
  for (const event of events) {
    const key = event.episodeId || `${event.ruleId ?? ''}:${event.timestamp}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    latest.push(event);
    if (latest.length >= limit) {
      break;
    }
  }
  return latest;
};

export const rumFiringServiceNames = (
  rules: Array<{ id: string; serviceName?: string }>,
  events: RumAlertEpisodeEvent[]
): Set<string> => {
  const latestByRule = new Map<string, RumAlertEpisodeEvent>();
  for (const event of events) {
    if (!event.ruleId || latestByRule.has(event.ruleId)) {
      continue;
    }
    latestByRule.set(event.ruleId, event);
  }
  const firing = new Set<string>();
  for (const rule of rules) {
    if (!rule.serviceName) {
      continue;
    }
    const latest = latestByRule.get(rule.id);
    if (latest && isRumAlertFireStatus(latest.status)) {
      firing.add(rule.serviceName);
    }
  }
  return firing;
};

export const lastRumAlertFiredAt = (
  events: RumAlertEpisodeEvent[],
  ruleId: string
): string | undefined => {
  for (const event of events) {
    if (event.ruleId === ruleId && isRumAlertFireStatus(event.status)) {
      return event.timestamp;
    }
  }
  return undefined;
};

export const bucketRumAlertFires = (
  events: RumAlertEpisodeEvent[],
  bucketMs = 3_600_000
): RumAlertFireBucket[] => {
  const hours = new Map<number, number>();
  for (const event of events) {
    if (!isRumAlertFireStatus(event.status)) {
      continue;
    }
    const parsed = Date.parse(event.timestamp);
    if (!Number.isFinite(parsed)) {
      continue;
    }
    const bucket = Math.floor(parsed / bucketMs) * bucketMs;
    hours.set(bucket, (hours.get(bucket) ?? 0) + 1);
  }
  return [...hours.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([ms, fires]) => ({ timestamp: new Date(ms).toISOString(), fires }));
};

export const rumAlertInvestigateTarget = (
  templateId: RumAlertTemplateId | null
): RumAlertInvestigateTarget => {
  switch (templateId) {
    case 'error_rate':
    case 'error_spike':
      return { pathname: '/errors' };
    case 'web_vital':
      return { pathname: '/pages' };
    case 'frustration':
    case 'session_frustration':
      return { pathname: '/session-replay', frustration: 'rage' };
    case 'session_error_rate':
      return { pathname: '/session-replay', frustration: 'error' };
    case 'traffic_drop':
    case 'traffic_spike':
    case 'session_traffic_drop':
    case 'session_traffic_spike':
      return { pathname: '/session-replay' };
    case 'ai':
      return { pathname: '/' };
    default:
      return { pathname: '/' };
  }
};

export const rumAlertEpisodeRange = (
  timestamp: string
): { rangeFrom: string; rangeTo: string } | undefined => {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return {
    rangeFrom: new Date(parsed - 60 * 60 * 1000).toISOString(),
    rangeTo: new Date(parsed + 15 * 60 * 1000).toISOString(),
  };
};
