/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerState } from '../../tasks/entity_maintainers/types';

/**
 * Per-run summary of the KI promotion maintainer. Persisted on the task
 * state so operators can inspect what the previous run did via the entity
 * maintainer status API without having to chase logs.
 *
 * Counter conventions mirror `KiRelationshipsLastRun`:
 *  - Every counter starts at 0 and is monotonically incremented during the
 *    run. The maintainer never resets a counter mid-run.
 *  - "Skipped" counters are mutually exclusive per candidate; a candidate
 *    contributes to AT MOST one skipped counter per pass.
 *  - `bulkUpdateErrors` counts ES bulk-item failures (the maintainer
 *    tolerates them like `ki-relationships` does — see the partial-failure
 *    path in `run.ts`); it is not a fatal-error counter.
 *
 * Declared as a type alias (not an interface) so it satisfies the recursive
 * `JsonValue` constraint that `EntityMaintainerState` carries: an interface
 * is treated as a nominal type without an implicit index signature, which
 * trips `EntityMaintainerState['lastRun']` ('Property … is incompatible with
 * index signature'). The structurally identical type alias passes the check.
 */
export interface KiPromotionLastRun {
  /**
   * Total promotion candidates the maintainer evaluated, across both the
   * promote pass and the demote pass. A doc counted here may end up in
   * exactly one of `promoted`, `demoted`, or one of the `skipped*` buckets.
   */
  candidatesEvaluated: number;
  /** Documents successfully promoted from `generic` to a static engine this run. */
  promoted: number;
  /** Documents successfully demoted from a static engine back to `generic` this run. */
  demoted: number;
  /**
   * Promotion candidates whose target identity field was absent on the
   * stored doc (no `host.id|name|hostname` for host, no `service.name`
   * for service). Skipped without writes; will be re-evaluated next run.
   */
  skippedMissingIdentityField: number;
  /**
   * Promotion candidates whose underlying KI feature's `groupingField`
   * was not in the ECS-known set for the target engine (the kill switch
   * defined in decision E of the plan). Skipped without writes; will not
   * become eligible until extraction starts using an ECS field.
   */
  skippedNonEcsGroupingField: number;
  /**
   * Pre-execution check that the operator has set BOTH
   * `promoteToTypedThreshold` (non-null) AND a non-empty
   * `promotedEntityTypes`. Counted once per run when the check fails;
   * the maintainer then returns immediately (`promoted` and `demoted` are
   * both 0 in that case).
   */
  skippedThresholdMisconfigured: number;
  /**
   * Promotion candidates whose backing KI feature is at-or-below the
   * promote threshold (i.e. extracted, but not eligible for promotion).
   * These are the same docs the demote pass watches for if they were
   * previously promoted; on the promote pass they are skipped here.
   */
  skippedLowConfidenceFeature: number;
  /**
   * Count of ES bulk-update item-level errors. Tolerated by the
   * maintainer (matches `ki-relationships` semantics): the maintainer
   * logs a warning and lets the next run retry. Surfaced here so
   * operators can see when the per-item error count is non-zero across
   * consecutive runs.
   */
  bulkUpdateErrors: number;
}

// Likewise a type alias (not an interface) so the recursive `JsonValue`
// constraint inherited from `EntityMaintainerState` still admits this shape.
export type KiPromotionState = EntityMaintainerState & {
  lastRun: KiPromotionLastRun | null;
  lastRunTimestamp: string | null;
};

export const INITIAL_STATE: KiPromotionState = {
  lastRun: null,
  lastRunTimestamp: null,
};
