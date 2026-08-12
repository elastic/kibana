/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Resolution groups for the Resolved entities view: one row per resolved
 * identity, aggregated from the raw records that make it up. A record that
 * never resolved to an identity is its own single-record group, so the view
 * still accounts for every record in the corpus.
 */

import type { EntityType } from '../../../../../common/entity_analytics/types';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import type { FaceliftIdentity, FaceliftRawRecord } from './data';
import {
  IDENTITIES,
  IDENTITY_BY_ID,
  RAW_RECORDS,
  buildAllEntityStoreHits,
  recordsForIdentity,
  riskDeltaPercent,
  scoreDeltaPercent,
} from './data';
import { filterHitsByEsQuery } from './grouping_data';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export const ALERT_SEVERITIES: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

export type AlertSeverityCounts = Record<AlertSeverity, number>;

/** A row in the Resolved entities table, or in the raw records nested under one. */
export interface EntityRow {
  /** Stable row key (identity id, or the raw record's mock id). */
  id: string;
  /** Entity Store id used to open the flyout. */
  entityId: string;
  name: string;
  entityType: EntityType;
  /** Raw records behind the row: the group size, or 1 for a single record. */
  records: number;
  /** Contributing sources, first contributor first. */
  sources: string[];
  riskScore: number;
  /** 24h risk change, in points. */
  riskDelta24h: number;
  /** The same change, as a percentage of yesterday's score. */
  riskChangePercent: number;
  criticality: CriticalityLevelWithUnassigned;
  alerts: number;
  alertsBySeverity: AlertSeverityCounts;
  lastSeen: string;
}

export interface ResolvedEntityRow extends EntityRow {
  /** The raw records this row aggregates. */
  rawRecords: EntityRow[];
  /** True when the record never resolved to an identity. */
  isUnresolved: boolean;
}

/** The identity a raw record resolved to, when there is one. */
export interface ResolvedToTarget {
  id: string;
  name: string;
  entityType: EntityType;
}

/** A row in the Raw records view — every record from the expanded groups. */
export interface RawRecordRow extends EntityRow {
  /** The resolved identity this record belongs to, or undefined if unresolved. */
  resolvedTo?: ResolvedToTarget;
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

/**
 * Severity mix of an entity's alerts, so the Alerts column can show the same
 * distribution bar the production table does without querying the alerts index.
 * The weights lean critical as risk climbs, and a group's mix is the sum of its
 * records' mixes.
 */
const severityWeights = (riskScore: number): AlertSeverityCounts => {
  if (riskScore > 90) return { critical: 0.4, high: 0.35, medium: 0.2, low: 0.05 };
  if (riskScore >= 70) return { critical: 0.2, high: 0.4, medium: 0.3, low: 0.1 };
  if (riskScore >= 40) return { critical: 0, high: 0.3, medium: 0.5, low: 0.2 };
  return { critical: 0, high: 0.1, medium: 0.4, low: 0.5 };
};

const splitAlertsBySeverity = (alerts: number, riskScore: number): AlertSeverityCounts => {
  const counts: AlertSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  if (alerts <= 0) return counts;

  const weights = severityWeights(riskScore);
  const shares = ALERT_SEVERITIES.map((severity) => {
    const exact = alerts * weights[severity];
    const whole = Math.floor(exact);
    counts[severity] = whole;
    return { severity, remainder: exact - whole };
  });

  // Largest remainder, so the severities always add back up to the alert count.
  let left = alerts - ALERT_SEVERITIES.reduce((total, s) => total + counts[s], 0);
  for (const { severity } of [...shares].sort((a, b) => b.remainder - a.remainder)) {
    if (left <= 0) break;
    counts[severity] += 1;
    left -= 1;
  }

  return counts;
};

const sumSeverities = (all: AlertSeverityCounts[]): AlertSeverityCounts =>
  all.reduce<AlertSeverityCounts>(
    (total, counts) => ({
      critical: total.critical + counts.critical,
      high: total.high + counts.high,
      medium: total.medium + counts.medium,
      low: total.low + counts.low,
    }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

/** Least to most critical, so a group can inherit the highest tier it contains. */
export const CRITICALITY_RANK: CriticalityLevelWithUnassigned[] = [
  'unassigned',
  'low_impact',
  'medium_impact',
  'high_impact',
  'extreme_impact',
];

const highestCriticality = (
  levels: CriticalityLevelWithUnassigned[]
): CriticalityLevelWithUnassigned =>
  levels.reduce<CriticalityLevelWithUnassigned>(
    (highest, level) =>
      CRITICALITY_RANK.indexOf(level) > CRITICALITY_RANK.indexOf(highest) ? level : highest,
    'unassigned'
  );

const mostRecent = (timestamps: string[]): string =>
  timestamps.reduce((latest, timestamp) => (timestamp > latest ? timestamp : latest));

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

const rowFromRecord = (record: FaceliftRawRecord): EntityRow => ({
  id: record.id,
  entityId: record.entityId,
  name: record.name,
  entityType: record.entityType,
  records: 1,
  sources: [record.source],
  riskScore: record.riskScore,
  riskDelta24h: record.riskDelta24h,
  riskChangePercent: scoreDeltaPercent(record.riskScore, record.riskDelta24h),
  criticality: record.criticality,
  alerts: record.alerts,
  alertsBySeverity: splitAlertsBySeverity(record.alerts, record.riskScore),
  lastSeen: record.lastSeen,
});

const groupFromIdentity = (identity: FaceliftIdentity): ResolvedEntityRow => {
  const rawRecords = recordsForIdentity(identity.id).map(rowFromRecord);

  return {
    id: identity.id,
    entityId: identity.id,
    name: identity.name,
    entityType: identity.entityType,
    records: rawRecords.length,
    sources: Array.from(new Set(rawRecords.flatMap((record) => record.sources))),
    riskScore: identity.riskScore,
    riskDelta24h: identity.riskDelta24h,
    riskChangePercent: riskDeltaPercent(identity),
    criticality: highestCriticality(rawRecords.map((record) => record.criticality)),
    alerts: rawRecords.reduce((total, record) => total + record.alerts, 0),
    alertsBySeverity: sumSeverities(rawRecords.map((record) => record.alertsBySeverity)),
    lastSeen: mostRecent(rawRecords.map((record) => record.lastSeen)),
    rawRecords,
    isUnresolved: false,
  };
};

const groupFromUnresolvedRecord = (record: FaceliftRawRecord): ResolvedEntityRow => {
  const row = rowFromRecord(record);
  return { ...row, rawRecords: [row], isUnresolved: true };
};

const buildResolvedEntities = (): ResolvedEntityRow[] => [
  ...IDENTITIES.filter((identity) => recordsForIdentity(identity.id).length > 0).map(
    groupFromIdentity
  ),
  ...RAW_RECORDS.filter((record) => !record.resolvedTo).map(groupFromUnresolvedRecord),
];

/**
 * Group-level entity store documents carry the aggregated values this view
 * shows (a target's sources are the union of its aliases'), so filtering those
 * documents keeps every row consistent with the KQL bar and the overview band.
 * Aliases are deliberately ignored: a row is kept or dropped as a whole.
 */
const groupIdForHitId = (hitId: string): string | undefined => {
  if (hitId.startsWith('target-')) return hitId.slice('target-'.length);
  if (hitId.startsWith('unresolved-')) return hitId.slice('unresolved-'.length);
  return undefined;
};

export interface EntitySummary {
  total: number;
  /** Entities scoring 70 or above, so Critical and High together. */
  criticalAndHigh: number;
  /** How that population moved in the last 24h. */
  criticalAndHighDelta: number;
}

/** Page-level totals for the header description; deliberately unfiltered. */
export const getEntitySummary = (): EntitySummary => {
  const rows = buildResolvedEntities();
  const isElevated = (score: number) => score >= 70;

  const criticalAndHigh = rows.filter((row) => isElevated(row.riskScore)).length;
  const yesterday = rows.filter((row) => isElevated(row.riskScore - row.riskDelta24h)).length;

  return {
    total: rows.length,
    criticalAndHigh,
    criticalAndHighDelta: criticalAndHigh - yesterday,
  };
};

export const getResolvedEntities = (query?: unknown): ResolvedEntityRow[] => {
  const rows = buildResolvedEntities();
  if (!query) return rows;

  const visible = new Set(
    filterHitsByEsQuery(buildAllEntityStoreHits(), query)
      .map((hit) => groupIdForHitId(hit._id))
      .filter((id): id is string => Boolean(id))
  );

  return rows.filter((row) => visible.has(row.id));
};

// ---------------------------------------------------------------------------
// Raw records view
// ---------------------------------------------------------------------------

const resolvedToFor = (record: FaceliftRawRecord): ResolvedToTarget | undefined => {
  if (!record.resolvedTo) return undefined;
  const identity = IDENTITY_BY_ID[record.resolvedTo];
  if (!identity) return undefined;
  return { id: identity.id, name: identity.name, entityType: identity.entityType };
};

const rawRecordRowFromRecord = (record: FaceliftRawRecord): RawRecordRow => ({
  ...rowFromRecord(record),
  resolvedTo: resolvedToFor(record),
});

/**
 * Alias / unresolved solo document ids, so a filter that matches a specific
 * raw record keeps that row in the Raw records view.
 */
const recordIdForHitId = (hitId: string): string | undefined => {
  if (hitId.startsWith('alias-')) return hitId.slice('alias-'.length);
  if (hitId.startsWith('unresolved-')) return hitId.slice('unresolved-'.length);
  return undefined;
};

/**
 * Every raw record that appears under a Resolved entities expansion — aliases
 * of resolved identities and unresolved solos alike.
 */
export const getRawRecords = (query?: unknown): RawRecordRow[] => {
  const rows = RAW_RECORDS.map(rawRecordRowFromRecord);
  if (!query) return rows;

  const visible = new Set(
    filterHitsByEsQuery(buildAllEntityStoreHits(), query)
      .map((hit) => recordIdForHitId(hit._id))
      .filter((id): id is string => Boolean(id))
  );

  return rows.filter((row) => visible.has(row.id));
};
