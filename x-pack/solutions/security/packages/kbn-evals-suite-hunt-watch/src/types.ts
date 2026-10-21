/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Tier 1 (environment IOC search) statuses; mirrors the Hunt result schema in `@kbn/alertzero-common`. */
export type HuntTier1Status =
  | 'scope_blocked'
  | 'no_searchable_terms'
  | 'no_environment_hits'
  | 'environment_hits_found';

/** Run-level outcome labels from the Worker's `resolve_run_outcome` step. */
export type HuntRunOutcome = 'completed' | 'partial' | 'failed';

export type HuntCohort = 'golden' | 'hard' | 'canary' | 'holdout';

/**
 * Expected structural result for one report in a run. Scored by the CODE evaluators.
 *
 * Omission convention: an optional field a row leaves out is unpinned. Its evaluator returns
 * `N/A` and the judge is told the value is open. Absence is never implied by omission; it is
 * pinned explicitly (`pendingProposals: 0`, `sseAttachment: false`, `investigationStatus:
 * 'none'`), so a reader can tell "not measured" from "measured and expected to be nothing".
 */
export interface HuntReportExpectation {
  reportId: string;
  hasConfirmedHit: boolean;
  /** Tier 1 status. Omitted when the report is never hunted (blocked scope, unknown id). */
  tier1Status?: HuntTier1Status;
  /** Whether any Tier 2 behavior executes. `false` for prose-only reports with nothing searchable. */
  tier2Executed?: boolean;
  /**
   * Pending `respond` Proposals on the report's Investigation: an exact count, or a minimum of
   * at least one. `0` means the run created no Proposal in any status, not merely none pending.
   * Omit it where the count is genuinely out of scope (an IOC-only hit that may or may not carry
   * an actionable principal, a multi-candidate row where convergence decides which Investigation
   * holds the shared Proposal). `{ min: 0 }` is always true and is rejected by
   * `src/dataset_contract.test.ts`.
   */
  pendingProposals?: number | { min: number };
  /**
   * Whether report `evidence[]` and `last_hunted_at` are written. The hunt child writes evidence
   * exactly when the coordinator result's `completed_successfully` is true (`write_evidence` in
   * `hunt.yaml`): `complete` or `incomplete_final`, never `incomplete_retryable`. That is not the
   * child's own `status`, which is `partial` for both incomplete kinds, so a hunt that retired a
   * report with evidence marked incomplete still counts as written here.
   * `iff_completed_successfully` is for rows where the hunt may legitimately end partial.
   */
  evidenceWritten: boolean | 'iff_completed_successfully';
  /** Whether a schema-valid SSE attachment is expected on the Investigation. */
  sseAttachment: boolean;
  /**
   * Investigation conversation `metadata.status`, or `none` when no Investigation is created.
   * Omitted where the Worker's behavior is not pinned (canary).
   */
  investigationStatus?: 'open' | 'closed' | 'none';
}

export interface HuntExpected {
  /**
   * Acceptable run outcomes. Strict rows list one; hard hit rows accept `completed` or `partial`.
   * Omitted where the Worker's label is not pinned yet (blocked scope, unknown id): those rows are
   * gated on the scope gate / skip reason / zero writes instead.
   */
  outcome?: HuntRunOutcome[];
  /**
   * Expected `incomplete_stage` for a run that does not complete, e.g. `hunt` or `packaging`.
   * Checked only when the actual outcome is not `completed`, so a row that accepts `completed`
   * or `partial` can still pin where a partial run is allowed to stop. Required on every row
   * whose `outcome` admits `partial` (enforced by `src/dataset_contract.test.ts`).
   */
  incompleteStage?: string;
  /** Whether the scope gate short-circuits before find-or-create (`index_scope_blocked`). */
  indexScopeBlocked: boolean;
  /** Expected skip reasons from candidate selection, e.g. `not_found`. */
  skipped?: string[];
  /**
   * When true, the CODE `Proposal Convergence` evaluator requires that actioned
   * Proposals for the same subject (target plus criticality level, as packaging keys it)
   * are minted once across this run's Investigations,
   * and that at least one converging Investigation (or the live Proposal's comment)
   * records the "Also raised by" / "no second Proposal" convergence text. Used by
   * multi-candidate rows that share principals across report ids.
   */
  proposalConvergence?: boolean;
  reports: HuntReportExpectation[];
}

/**
 * Faults the task injects after `resetHuntReport` and before the run. Each one is a condition the
 * product can meet in the field, staged deterministically:
 *  - `investigation_locked`: the report's Investigation conversation already exists as a private
 *    conversation owned by another user, so the Worker's `find_or_create` cannot read it, the hunt
 *    child skips the coordinator, and the run ends `failed` with nothing written.
 */
export type HuntFault = 'investigation_locked';

export interface HuntWatchExample {
  id: string;
  cohort: HuntCohort;
  input: {
    spaceId: string;
    /** Named report ids for the manual trigger. */
    reportIds: string[];
    /** Fault to stage before the run; see `HuntFault`. */
    fault?: HuntFault;
  };
  output: {
    expected: HuntExpected;
    /** LLM rubric criteria (reported, not gated). */
    criteria: string[];
  };
}
