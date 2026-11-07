/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDelta, ResolutionIdentity, TrendWindow } from './types';
import { levelOf, WINDOW_MS } from './entities_logic';

/* ================= Risk-score history → deltas + first-High ================= */

/** A single point on an entity's risk-score history timeseries. */
export interface RiskHistoryPoint {
  timestamp: number;
  scoreNorm: number;
}

const EMPTY_DELTA: EntityDelta = { alerts: 0, risk: 0, anoms: 0 };

/**
 * The score at (or just before) `now - windowMs`, used as the baseline for a
 * window delta. Points must be sorted ascending by timestamp. Returns the
 * latest point at/under the boundary, or the earliest point when history does
 * not reach back that far (so the delta is the full observed change, never
 * fabricated).
 */
export const baselineScoreAt = (
  points: RiskHistoryPoint[],
  boundaryMs: number
): number | undefined => {
  if (points.length === 0) return undefined;
  let baseline: number | undefined;
  for (const point of points) {
    if (point.timestamp <= boundaryMs) baseline = point.scoreNorm;
    else break;
  }
  // No point at/under the boundary → history starts after it; use the earliest.
  return baseline ?? points[0].scoreNorm;
};

/**
 * Computes the risk delta for each trend window from a sorted-ascending
 * history series and the current score. Honest by construction: when there is
 * no usable history the delta is 0 (flat), never invented.
 */
export const riskDeltasFromHistory = (
  points: RiskHistoryPoint[],
  currentScore: number,
  now: number
): Record<TrendWindow, number> => {
  const windows: TrendWindow[] = ['w1', 'w7', 'w30'];
  const out = {} as Record<TrendWindow, number>;
  for (const win of windows) {
    const baseline = baselineScoreAt(points, now - WINDOW_MS[win]);
    out[win] = baseline === undefined ? 0 : Math.round(currentScore - baseline);
  }
  return out;
};

/**
 * First time the entity's risk level EVER reached High (score ≥ 70), from the
 * ascending history series. Returns undefined when it never crossed — so the
 * "first-time High/Critical" tile only counts genuinely-observed crossings.
 */
export const firstHighFromHistory = (points: RiskHistoryPoint[]): number | undefined => {
  const crossing = points.find((point) => point.scoreNorm >= 70);
  return crossing?.timestamp;
};

/** Builds the full per-window delta triple by merging risk/alert/anomaly deltas. */
export const buildDeltas = (
  riskByWindow: Record<TrendWindow, number>,
  alertsByWindow: Record<TrendWindow, number>,
  anomsByWindow: Record<TrendWindow, number>
): Record<TrendWindow, EntityDelta> => ({
  w1: { risk: riskByWindow.w1, alerts: alertsByWindow.w1, anoms: anomsByWindow.w1 },
  w7: { risk: riskByWindow.w7, alerts: alertsByWindow.w7, anoms: anomsByWindow.w7 },
  w30: { risk: riskByWindow.w30, alerts: alertsByWindow.w30, anoms: anomsByWindow.w30 },
});

export const emptyDeltas = (): Record<TrendWindow, EntityDelta> => ({
  w1: { ...EMPTY_DELTA },
  w7: { ...EMPTY_DELTA },
  w30: { ...EMPTY_DELTA },
});

/* ================= Attack Discovery markdown → entity references ================= */

/**
 * Extracts real entity names referenced by an Attack Discovery from its
 * `*_with_replacements` markdown (tokens already substituted with real values).
 * Matches the two shapes the AD writer emits:
 *   - `{{ host.name SRVWIN01 }}` / `{{ user.name root }}` (token form, replaced)
 *   - bare backtick/`**bold**` names are NOT parsed (too ambiguous).
 * Returns the set of distinct names found (host + user).
 */
export const extractAttackEntities = (markdown: string | undefined): string[] => {
  if (!markdown) return [];
  const names = new Set<string>();
  const tokenRe = /\{\{\s*(?:host|user|service)\.name\s+([^}]+?)\s*\}\}/g;
  let match: RegExpExecArray | null = tokenRe.exec(markdown);
  while (match !== null) {
    const value = match[1].trim();
    if (value) names.add(value);
    match = tokenRe.exec(markdown);
  }
  return [...names];
};

/**
 * Normalizes an entity name for matching an attack reference against a store
 * identifier. The store uses raw ECS identifiers (e.g. `alex.chen`,
 * `LAPTOP-FIN03`); attack markdown uses the same raw values, but casing can
 * vary, so match case-insensitively.
 */
export const normalizeEntityKey = (value: string): string => value.trim().toLowerCase();

/* ================= Resolution lookup → identities ================= */

/** A row from the risk-score resolution lookup table. */
export interface ResolutionLookupRow {
  entityId: string;
  resolutionTargetId: string | null;
  propagationTargetId: string | null;
  relationshipType: string | null;
}

/* ================= Raw entity-store record → row primitives ================= */

/**
 * Extra primitives pulled from a raw entity-store record beyond what
 * `toIntelligenceEntity` flattens: lifecycle timestamps and the source list.
 * `entity.source` is polymorphic (array or scalar) in this deployment, and
 * timestamps live under `entity.lifecycle.*` (not `entity.first_seen_*`).
 */
export interface EntityStorePrimitives {
  firstSeen: number | undefined;
  lastSeen: number | undefined;
  sources: string[];
  isService: boolean;
}

interface RawEntityRecordShape {
  entity?: {
    EngineMetadata?: { Type?: string };
    source?: string[] | string;
    lifecycle?: { first_seen?: string; last_seen?: string; last_activity?: string };
  };
}

const toEpoch = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : ms;
};

/** Extracts lifecycle timestamps, source list, and service-ness from a record. */
export const extractEntityPrimitives = (record: unknown): EntityStorePrimitives => {
  const raw = record as RawEntityRecordShape;
  const entity = raw.entity;
  const rawSource = entity?.source;
  const sources = Array.isArray(rawSource)
    ? rawSource.filter((s): s is string => typeof s === 'string')
    : typeof rawSource === 'string'
    ? [rawSource]
    : [];
  return {
    firstSeen: toEpoch(entity?.lifecycle?.first_seen),
    lastSeen: toEpoch(entity?.lifecycle?.last_seen),
    sources,
    isService: entity?.EngineMetadata?.Type === 'service',
  };
};

/**
 * Builds the resolution-group identities for an entity from (a) its entity-store
 * source list and (b) the resolution lookup rows that resolve to it. When
 * neither yields anything, returns an empty list and the UI degrades to "—".
 */
export const buildResolutionIdentities = (
  entityId: string,
  sources: string[],
  lookupRows: ResolutionLookupRow[]
): ResolutionIdentity[] => {
  const identities: ResolutionIdentity[] = [];
  const seen = new Set<string>();

  // Source-derived identities: each distinct data source the entity was seen in.
  for (const source of sources) {
    const key = `src:${source}`;
    if (source && !seen.has(key)) {
      seen.add(key);
      identities.push({ source, value: source, note: 'observed source' });
    }
  }

  // Resolution lookup: other entity ids that resolve/propagate to this one.
  for (const row of lookupRows) {
    const resolvesHere =
      row.resolutionTargetId === entityId || row.propagationTargetId === entityId;
    if (resolvesHere && row.entityId !== entityId && !seen.has(`res:${row.entityId}`)) {
      seen.add(`res:${row.entityId}`);
      identities.push({
        source: 'resolution',
        value: row.entityId,
        note: row.relationshipType ?? 'resolved identity',
      });
    }
  }

  return identities;
};

/* ================= Alerts aggregation → per-entity signal ================= */

/** Reduced per-entity alert signal from the alerts aggregation. */
export interface EntityAlertSignal {
  total: number;
  ruleNames: string[];
  lastAlert: number | undefined;
  /** Alert count within each trend window (for the alert delta). */
  windowCounts: Record<TrendWindow, number>;
}

/** Empty alert signal for entities with no alerts. */
export const emptyAlertSignal = (): EntityAlertSignal => ({
  total: 0,
  ruleNames: [],
  lastAlert: undefined,
  windowCounts: { w1: 0, w7: 0, w30: 0 },
});

/**
 * Derives the level label at both the current score and the window baseline,
 * exposed for tests / UI badges.
 */
export const levelChange = (
  currentScore: number,
  baselineScore: number | undefined
): { current: string; baseline: string | undefined } => ({
  current: levelOf(currentScore),
  baseline: baselineScore === undefined ? undefined : levelOf(baselineScore),
});
