/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0.
 */

/** Report fixture classes of the ad2-v1 corpus (design v1 §1, v5 T2 applicability). */
export type ReportClass = 'R-ioc' | 'R-beh-A' | 'R-beh-B' | 'R-decoy(a)' | 'R-decoy(bcd)-A';

export type HuntTier1Status =
  | 'environment_hits_found'
  | 'no_environment_hits'
  | 'no_searchable_terms';

export type HuntIncompleteReason =
  | 'search_partial'
  | 'index_unavailable'
  | 'generation_failed'
  | 'query_out_of_scope'
  | 'query_ungrounded'
  | 'quote_ungrounded'
  | 'execute_failed'
  | 'tier2_failed'
  | 'no_inference'
  | 'no_report_text'
  | 'nothing_searched';

export type HuntCompleteness = 'complete' | 'incomplete_retryable' | 'incomplete_final';

/** One Tier 2 behaviour as the coordinator reports it. */
export interface BehaviourRun {
  executed: boolean;
  hit: boolean;
  reason?: HuntIncompleteReason;
  technique_id?: string;
  hits?: Array<{ _id: string; _index: string }>;
}

/** The coordinator step-output shape the harness reads (run_hunt_coordinator step output). */
export interface CoordinatorRun {
  tier1_status: HuntTier1Status;
  tier1_incomplete?: HuntIncompleteReason[];
  tier2_skipped_reason?: HuntIncompleteReason;
  behaviours: BehaviourRun[];
  completeness?: HuntCompleteness;
  tier2_when?: string;
  tier2_target_sources?: string[];
}

export type Phase = 'E0' | 'E+' | 'E-';

export type M3Verdict = 'clean' | 'incomplete' | 'false-hit';

/** An M3 cell that cannot be scored; the reason names what was missing. */
export class InvalidCell extends Error {
  constructor(public readonly cause: string) {
    super(cause);
  }
}

/** Id buckets for M2 classification (design v3 §1.2 [R2-B4]). */
export type IdBucket =
  | 'planted'
  | 'noise'
  | 'twin-changed'
  | 'twin-retained'
  | 'fixture'
  | 'foreign'
  | 'true'
  | 'false';
