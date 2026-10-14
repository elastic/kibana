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

/** Expected structural result for one report in a run. Scored by the CODE evaluators. */
export interface HuntReportExpectation {
  reportId: string;
  hasConfirmedHit: boolean;
  /** Tier 1 status. Omitted when the report is never hunted (blocked scope, unknown id). */
  tier1Status?: HuntTier1Status;
  /** Whether any Tier 2 behavior executes. `false` for prose-only reports with nothing searchable. */
  tier2Executed?: boolean;
  /** Expected number of pending `respond` Proposals attached to the report's Investigation. */
  pendingProposals: number | { min: number };
  /**
   * Whether report `evidence[]` and `last_hunted_at` are written. The hunt child writes evidence
   * exactly when its coordinator completed (`hunt.output.status === 'success'`), independent of
   * packaging. `iff_hunt_success` is for rows where the hunt may legitimately end partial.
   */
  evidenceWritten: boolean | 'iff_hunt_success';
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
  /** Expected `incomplete_stage` when `partial`, e.g. `packaging`. */
  incompleteStage?: string;
  /** Whether the scope gate short-circuits before find-or-create (`index_scope_blocked`). */
  indexScopeBlocked: boolean;
  /** Expected skip reasons from candidate selection, e.g. `not_found`. */
  skipped?: string[];
  reports: HuntReportExpectation[];
}

export interface HuntWatchExample {
  id: string;
  cohort: HuntCohort;
  input: {
    spaceId: string;
    /** Named report ids for the manual trigger. */
    reportIds: string[];
  };
  output: {
    expected: HuntExpected;
    /** LLM rubric criteria (reported, not gated). */
    criteria: string[];
  };
}
