/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Staleness signal ids compared when deciding whether a persisted AI summary is stale.
 * Snapshot property names on {@link EntitySummaryStalenessSnapshot} must stay in sync.
 */
export const ENTITY_SUMMARY_STALENESS_SIGNALS = ['risk_score'] as const;

export type EntitySummaryStalenessSignal = (typeof ENTITY_SUMMARY_STALENESS_SIGNALS)[number];

/** A single structured highlight section produced by the LLM. */
export interface EntitySummaryHighlight {
  title: string;
  text: string;
}

/**
 * Signal values captured at generation time. Property names correspond to staleness
 * signal ids; only `risk_score` is compared today (see the registry below), the others
 * are captured for the deferred staleness-signal-parity follow-up.
 */
export interface EntitySummaryStalenessSnapshot {
  /** `entity.risk.calculated_score_norm` at generation time (flyout risk gauge). */
  risk_score?: number | null;
  /** `entity.behaviors.anomaly_job_ids` at generation time. */
  anomaly_job_ids?: string[] | null;
  /** `entity.behaviors.rule_names` at generation time. */
  rule_names?: string[] | null;
}

/** Policy and snapshot used for summary staleness checks. */
export interface EntitySummaryStaleness {
  /** Signal ids to compare when deciding if the summary is stale. */
  enabled_signals: string[];
  snapshot: EntitySummaryStalenessSnapshot;
}

/** POST body for saving a summary. The API route adds `generated_by` from the authenticated user. */
export interface SaveEntityAiSummarySummary {
  highlights: EntitySummaryHighlight[];
  recommendedActions?: string[] | null;
  generated_at: number;
  staleness: EntitySummaryStaleness;
}

export interface SaveEntityAiSummaryParams {
  entityId: string;
  entityType: string;
  summary: SaveEntityAiSummarySummary;
}

/**
 * A persisted AI summary as read back from the entity metadata datastream
 * (`.entities.v2.metadata.security_{namespace}`) and returned by the read route.
 * The flyout hydrates its display from this shape.
 */
export interface PersistedEntityAiSummary {
  highlights: EntitySummaryHighlight[];
  recommendedActions?: string[] | null;
  /** Unix timestamp (ms) of when the summary was generated. */
  generated_at: number;
  /** Username of the user who triggered generation (set server-side). */
  generated_by: string;
  staleness: EntitySummaryStaleness;
  anomaly_job_ids?: string[];
  variant_id?: string;
}

/**
 * Response of the persisted-summary read route. `canRead` is false when the
 * caller lacks read access to the metadata index — the flyout then falls back
 * to on-demand generation instead of showing a persisted summary.
 */
export interface GetPersistedAiSummaryResponse {
  summary: PersistedEntityAiSummary | null;
  canRead: boolean;
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
  /**
   * `entity.behaviors.anomaly_job_ids` at generation time. Captured by callers today;
   * the staleness comparison for this signal is a follow-up (only `risk_score` is compared).
   */
  anomalyJobIds?: string[] | null;
  /**
   * `entity.behaviors.rule_names` at generation time. Captured by callers today;
   * the staleness comparison for this signal is a follow-up (only `risk_score` is compared).
   */
  ruleNames?: string[] | null;
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
  summary: { staleness?: EntitySummaryStaleness | null },
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
