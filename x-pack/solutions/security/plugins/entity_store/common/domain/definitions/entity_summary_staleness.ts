/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitySummaryAttribute } from './entity.gen';

/**
 * Staleness signal ids stored on `entity.attributes.summary.staleness.enabled_signals`.
 * Snapshot property names in `entity.schema.yaml` must stay in sync with these values.
 */
export const ENTITY_SUMMARY_STALENESS_SIGNALS = ['risk_score'] as const;

export type EntitySummaryStalenessSignal = (typeof ENTITY_SUMMARY_STALENESS_SIGNALS)[number];

export type EntitySummaryStaleness = NonNullable<EntitySummaryAttribute['staleness']>;

export type EntitySummaryStalenessSnapshot = EntitySummaryStaleness['snapshot'];

export type EntitySummaryHighlight = EntitySummaryAttribute['highlights'][number];

/** POST body for saving a summary. The API route adds `generated_by` from the authenticated user. */
export interface SaveEntityAiSummarySummary {
  highlights: EntitySummaryAttribute['highlights'];
  recommendedActions?: EntitySummaryAttribute['recommendedActions'];
  generated_at: number;
  staleness: EntitySummaryStaleness;
}

export interface SaveEntityAiSummaryParams {
  entityId: string;
  entityType: string;
  summary: SaveEntityAiSummarySummary;
}

/**
 * Signals enabled by default. Intentionally a subset in future once user/space
 * configuration is implemented — do not collapse this into ENTITY_SUMMARY_STALENESS_SIGNALS.
 */
export const DEFAULT_ENTITY_SUMMARY_STALENESS_SIGNALS: EntitySummaryStalenessSignal[] = [
  'risk_score',
];

/** Normalized entity fields used when capturing and comparing staleness snapshots. */
export interface EntitySummaryStalenessEntitySnapshot {
  /** `entity.risk.calculated_score_norm` — same value shown in the entity flyout risk summary. */
  riskScoreNorm?: number | null;
}

const RISK_SCORE_EPSILON = 0.01;

interface EntitySummaryStalenessSignalDefinition {
  capture: (entity: EntitySummaryStalenessEntitySnapshot) => EntitySummaryStalenessSnapshot;
  staleReason: (
    stored: EntitySummaryStalenessSnapshot,
    current: EntitySummaryStalenessEntitySnapshot
  ) => string | undefined;
}

/**
 * Scalar signals (e.g. risk score) are only compared when both stored and current values are
 * present. Null/missing on either side is not stale (e.g. risk not loaded yet).
 */
const staleReasonWhenBothPresent = <T>(
  baseline: T | null | undefined,
  current: T | null | undefined,
  format: (stored: T, value: T) => string | undefined
): string | undefined => {
  if (baseline == null || current == null) {
    return undefined;
  }
  return format(baseline, current);
};

const isKnownStalenessSignal = (signal: string): signal is EntitySummaryStalenessSignal =>
  (ENTITY_SUMMARY_STALENESS_SIGNALS as readonly string[]).includes(signal);

/**
 * Registry of staleness signals. Each entry maps a signal id to snapshot capture and comparison.
 * Add new signals here and to `ENTITY_SUMMARY_STALENESS_SIGNALS` / `entity.schema.yaml`.
 */
const ENTITY_SUMMARY_STALENESS_SIGNALS_REGISTRY = {
  risk_score: {
    capture: (entity) => ({ risk_score: entity.riskScoreNorm ?? null }),
    staleReason: (stored, current) =>
      staleReasonWhenBothPresent(stored.risk_score, current.riskScoreNorm, (baseline, score) =>
        Math.abs(score - baseline) <= RISK_SCORE_EPSILON
          ? undefined
          : `Risk score changed from ${baseline} to ${score}`
      ),
  },
} as const satisfies Record<EntitySummaryStalenessSignal, EntitySummaryStalenessSignalDefinition>;

export const buildEntitySummaryStaleness = (
  entitySnapshot: EntitySummaryStalenessEntitySnapshot,
  enabledSignals: EntitySummaryStalenessSignal[] = DEFAULT_ENTITY_SUMMARY_STALENESS_SIGNALS
): EntitySummaryStaleness => ({
  enabled_signals: enabledSignals,
  snapshot: enabledSignals.reduce<EntitySummaryStalenessSnapshot>(
    (snapshot, signal) => ({
      ...snapshot,
      ...ENTITY_SUMMARY_STALENESS_SIGNALS_REGISTRY[signal].capture(entitySnapshot),
    }),
    {}
  ),
});

export const computeEntitySummaryStalenessReasons = (
  summary: EntitySummaryAttribute,
  entitySnapshot: EntitySummaryStalenessEntitySnapshot
): string[] => {
  const staleness = summary.staleness;
  if (!staleness?.enabled_signals?.length || !staleness.snapshot) {
    return [];
  }

  const { enabled_signals: enabledSignals, snapshot: storedSnapshot } = staleness;

  return enabledSignals.flatMap((signal) => {
    // `enabled_signals` on stored documents is typed as string[] from the schema, not this union.
    if (!isKnownStalenessSignal(signal)) {
      return [];
    }

    const reason = ENTITY_SUMMARY_STALENESS_SIGNALS_REGISTRY[signal].staleReason(
      storedSnapshot,
      entitySnapshot
    );
    return reason ? [reason] : [];
  });
};
