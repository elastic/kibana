/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Table rows for facelift v.7: the shared v.2 builders from
 * `../v2/resolved_entities_data`, with the columns that describe a period of
 * activity projected onto the window picked in the KQL bar.
 *
 * Risk score change, Alerts, Anomalies and Cases all answer "how much
 * happened", but the corpus stores a single figure per entity and no per-event
 * timestamps (see `./signal_windows`). v.7 reads those figures as the 30-day
 * totals — the default preset, so the table opens on the corpus as authored —
 * and thins them down for the narrower windows. Everything else on the row
 * (risk score, criticality, sources, watchlists, first/last seen) is current
 * state and does not move with the window.
 *
 * Groups are re-aggregated from their thinned raw records rather than thinned
 * directly, so an expanded row's children still add up to their parent in
 * every window. Sorting follows for free: it reads the same row fields.
 *
 * Page summary deltas are framed as “vs previous 30 days” in the v.7 header.
 */

import type {
  AlertSeverityCounts,
  EntityRow,
  RawRecordRow,
  ResolvedEntityRow,
} from '../v2/resolved_entities_data';
import {
  ALERT_SEVERITIES,
  getRawRecords as getRawRecordsV2,
  getResolvedEntities as getResolvedEntitiesV2,
} from '../v2/resolved_entities_data';
import type { PageFilters } from './data';
import { EMPTY_PAGE_FILTERS, scoreDeltaPercent } from './data';
import { getActiveTimeRange } from './active_time_range';
import { countInWindow, riskPointsInWindow } from './signal_windows';
import type { FaceliftTimeRangeId } from './time_range';

export * from '../v2/resolved_entities_data';

const NO_ALERTS: AlertSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

const sumSeverities = (all: AlertSeverityCounts[]): AlertSeverityCounts =>
  all.reduce<AlertSeverityCounts>(
    (total, counts) => ({
      critical: total.critical + counts.critical,
      high: total.high + counts.high,
      medium: total.medium + counts.medium,
      low: total.low + counts.low,
    }),
    NO_ALERTS
  );

/**
 * Thin a row's severity mix from `from` alerts down to `to`, keeping its
 * shape so the distribution bar still leans the way the entity's risk does.
 * Whole buckets first, then the largest remainders; ties go to the more severe
 * bucket because `ALERT_SEVERITIES` is ordered critical-first, so the single
 * alert left in a 24h window is the one worth looking at.
 */
const thinSeverities = (
  counts: AlertSeverityCounts,
  from: number,
  to: number
): AlertSeverityCounts => {
  if (to <= 0) {
    return { ...NO_ALERTS };
  }
  if (to >= from) {
    return counts;
  }

  const thinned: AlertSeverityCounts = { ...NO_ALERTS };
  const remainders = ALERT_SEVERITIES.map((severity) => {
    const exact = (counts[severity] / from) * to;
    thinned[severity] = Math.floor(exact);
    return { severity, remainder: exact % 1 };
  });

  let left = to - ALERT_SEVERITIES.reduce((total, severity) => total + thinned[severity], 0);
  for (const { severity } of [...remainders].sort((a, b) => b.remainder - a.remainder)) {
    if (left <= 0) {
      break;
    }
    thinned[severity] += 1;
    left -= 1;
  }

  return thinned;
};

/** A raw-record row with its period columns narrowed to `range`. */
const inWindow = <T extends EntityRow>(row: T, range: FaceliftTimeRangeId): T => {
  const alerts = countInWindow(row.alerts, range, { keepAtLeastOne: true });
  const riskPoints = riskPointsInWindow(row.riskDelta24h, range);

  return {
    ...row,
    riskDelta24h: riskPoints,
    riskChangePercent: scoreDeltaPercent(row.riskScore, riskPoints),
    alerts,
    alertsBySeverity: thinSeverities(row.alertsBySeverity, row.alerts, alerts),
    anomalies: countInWindow(row.anomalies, range, { keepAtLeastOne: true }),
    cases: countInWindow(row.cases, range, { keepAtLeastOne: false }),
  };
};

/**
 * A resolution group narrowed to `range`. Event counts are summed back up from
 * the group's records; the risk move belongs to the resolved identity itself,
 * so it is scaled directly rather than aggregated.
 */
const groupInWindow = (group: ResolvedEntityRow, range: FaceliftTimeRangeId): ResolvedEntityRow => {
  const rawRecords = group.rawRecords.map((record) => inWindow(record, range));
  const riskPoints = riskPointsInWindow(group.riskDelta24h, range);
  const totalOf = (pick: (record: EntityRow) => number) =>
    rawRecords.reduce((total, record) => total + pick(record), 0);

  return {
    ...group,
    riskDelta24h: riskPoints,
    riskChangePercent: scoreDeltaPercent(group.riskScore, riskPoints),
    alerts: totalOf((record) => record.alerts),
    alertsBySeverity: sumSeverities(rawRecords.map((record) => record.alertsBySeverity)),
    anomalies: totalOf((record) => record.anomalies),
    cases: totalOf((record) => record.cases),
    rawRecords,
  };
};

/** Resolved rows for the active window; the signature otherwise matches v.2. */
export const getResolvedEntities = (
  query?: unknown,
  pageFilters: PageFilters = EMPTY_PAGE_FILTERS,
  range: FaceliftTimeRangeId = getActiveTimeRange()
): ResolvedEntityRow[] => {
  const rows = getResolvedEntitiesV2(query, pageFilters);
  return range === '30d' ? rows : rows.map((group) => groupInWindow(group, range));
};

/** Raw-record counterpart of {@link getResolvedEntities}. */
export const getRawRecords = (
  query?: unknown,
  pageFilters: PageFilters = EMPTY_PAGE_FILTERS,
  range: FaceliftTimeRangeId = getActiveTimeRange()
): RawRecordRow[] => {
  const rows = getRawRecordsV2(query, pageFilters);
  return range === '30d' ? rows : rows.map((row) => inWindow(row, range));
};
