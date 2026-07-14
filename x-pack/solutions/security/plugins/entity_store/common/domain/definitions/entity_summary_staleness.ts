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
 * signal ids. Entity risk is the sole staleness trigger, so only `risk_score` is captured.
 */
export interface EntitySummaryStalenessSnapshot {
  /** `entity.risk.calculated_score_norm` at generation time (flyout risk gauge). */
  risk_score?: number | null;
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
  recommended_actions?: string[] | null;
  generated_at: number;
  staleness: EntitySummaryStaleness;
}

export interface SaveEntityAiSummaryParams {
  entityId: string;
  entityType: string;
  summary: SaveEntityAiSummarySummary;
  /**
   * Raw counts of what the model produced, captured client-side *before* structural capping.
   * The persisted summary is capped, so it can't reveal how much the model overshot — these
   * counts let telemetry measure that. Optional: callers that don't generate client-side
   * (or a future server-side flow) can omit them.
   */
  modelOutputCounts?: {
    highlights: number;
    recommendedActions: number;
  };
}

/**
 * A persisted AI summary as read back from the entity metadata datastream
 * (`.entities.v2.metadata.security_{namespace}`) and returned by the read route.
 * The flyout hydrates its display from this shape.
 */
export interface PersistedEntityAiSummary {
  highlights: EntitySummaryHighlight[];
  recommended_actions?: string[] | null;
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

/**
 * Normalized entity fields used when capturing and comparing staleness snapshots.
 * Entity risk is the sole staleness trigger, so this carries only the risk score.
 */
export interface EntitySummaryStalenessEntitySnapshot {
  /** `entity.risk.calculated_score_norm` — same value shown in the entity flyout risk summary. */
  riskScoreNorm?: number | null;
}

const RISK_SCORE_EPSILON = 0.01;

/** Risk-score staleness change, carrying the before/after normalized scores. */
export interface RiskScoreStalenessReason {
  signal: 'risk_score';
  previousScore: number;
  currentScore: number;
}

/**
 * A single detected staleness change. Discriminated on `signal` and carrying the raw
 * values that changed — deliberately NOT a display string.
 *
 * This shared domain module is server + client safe and i18n-free, so all presentation copy
 * (header labels AND detail messages) is composed and translated at the UI layer from this
 * structured data. Add a variant here (and a matching registry entry) per new signal.
 */
export type EntitySummaryStalenessReason = RiskScoreStalenessReason;

interface EntitySummaryStalenessSignalDefinition {
  capture: (entity: EntitySummaryStalenessEntitySnapshot) => EntitySummaryStalenessSnapshot;
  detectChange: (
    stored: EntitySummaryStalenessSnapshot,
    current: EntitySummaryStalenessEntitySnapshot
  ) => EntitySummaryStalenessReason | undefined;
}

/**
 * Scalar signals (e.g. risk score) are only compared when both stored and current values are
 * present. Null/missing on either side is not stale (e.g. risk not loaded yet).
 */
const detectChangeWhenBothPresent = <T, R>(
  baseline: T | null | undefined,
  current: T | null | undefined,
  detect: (stored: T, value: T) => R | undefined
): R | undefined => {
  if (baseline == null || current == null) {
    return undefined;
  }
  return detect(baseline, current);
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
    detectChange: (stored, current) =>
      detectChangeWhenBothPresent(
        stored.risk_score,
        current.riskScoreNorm,
        (previousScore, currentScore) =>
          Math.abs(currentScore - previousScore) <= RISK_SCORE_EPSILON
            ? undefined
            : { signal: 'risk_score', previousScore, currentScore }
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
): EntitySummaryStalenessReason[] => {
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

    const definition = ENTITY_SUMMARY_STALENESS_SIGNALS_REGISTRY[signal];
    const reason = definition.detectChange(storedSnapshot, entitySnapshot);
    return reason ? [reason] : [];
  });
};

/**
 * Distinct signal ids for the changed signals, preserving first-seen order. Drives the
 * dynamic staleness header instead of hard-coding a single signal: the UI maps each id to a
 * translated label, so adding a signal to the registry flows through automatically.
 */
export const getChangedStalenessSignals = (
  reasons: EntitySummaryStalenessReason[]
): EntitySummaryStalenessSignal[] => {
  const seen = new Set<EntitySummaryStalenessSignal>();
  return reasons.reduce<EntitySummaryStalenessSignal[]>((signals, { signal }) => {
    if (!seen.has(signal)) {
      seen.add(signal);
      signals.push(signal);
    }
    return signals;
  }, []);
};
