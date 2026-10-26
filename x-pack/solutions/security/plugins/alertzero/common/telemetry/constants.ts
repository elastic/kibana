/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Closed vocabularies for the Worker outcome events: the Attack Discovery Worker's own, every
 * Worker's run and item outcomes, and the Investigation close reasons any Worker reports. They live
 * in `common` so the server event types and the report step's input schema share one definition.
 */

/** How an Attack Discovery Worker run ended, as far as its own outputs can tell. */
export const AD_WORKER_RUN_OUTCOMES = [
  'produced',
  'empty_no_alerts',
  'empty_no_attacks',
  'empty_all_duplicates',
  'degraded_partial',
  'failed_all_batches',
] as const;

export type AdWorkerRunOutcome = (typeof AD_WORKER_RUN_OUTCOMES)[number];

/** The FP/TP analysis verdict of one reviewed attack; `failed` covers errors and timeouts. */
export const AD_WORKER_ANALYSIS_VERDICTS = [
  'true_positive',
  'false_positive',
  'inconclusive',
  'failed',
] as const;

export type AdWorkerAnalysisVerdict = (typeof AD_WORKER_ANALYSIS_VERDICTS)[number];

/** The analysis verdicts that escalate an attack to a forensics handoff. */
export const AD_WORKER_ESCALATED_VERDICTS = ['true_positive', 'inconclusive'] as const;

export type AdWorkerEscalatedVerdict = (typeof AD_WORKER_ESCALATED_VERDICTS)[number];

/** How a completed escalation gate resolved the forensics handoff. */
export const AD_WORKER_HANDOFF_OUTCOMES = [
  'approved',
  'dismissed',
  'expired',
  'approved_action_failed',
] as const;

export type AdWorkerHandoffOutcome = (typeof AD_WORKER_HANDOFF_OUTCOMES)[number];

/**
 * Mirrors the `investigation` conversation template's `close_reason` SELECT options, which Agent
 * Builder declares inline in its server plugin and does not export.
 */
export const INVESTIGATION_CLOSE_REASONS = [
  'false_positive',
  'benign',
  'resolved',
  'duplicate',
  'other',
] as const;

export type InvestigationCloseReason = (typeof INVESTIGATION_CLOSE_REASONS)[number];

/**
 * How any Worker run ended, in one vocabulary shared by every Worker. `produced` did the work it
 * found; the `empty_*` outcomes found nothing to do (no work queued, a search that found nothing,
 * or every candidate held back by a capacity limit); `degraded_partial` produced results for some
 * items while others failed or were skipped; the `failed_*` outcomes produced nothing because the
 * source could not be read or every item failed; `blocked_precondition` never started because a
 * precondition (such as a readable data scope) was not met.
 */
export const WORKER_RUN_OUTCOMES = [
  'produced',
  'empty_nothing_pending',
  'empty_nothing_found',
  'empty_at_capacity',
  'degraded_partial',
  'failed_source_unavailable',
  'failed_all_items',
  'blocked_precondition',
] as const;

export type WorkerRunOutcome = (typeof WORKER_RUN_OUTCOMES)[number];

/**
 * The main reason a Worker run did less than the work it found. `none` when it did not;
 * `missing_data` when an input or an intermediate result it needed was missing;
 * `dependency_unavailable` when a service, model or child workflow it relies on failed or could
 * not be read; `partial_timeout` when some items ran out of time; `capacity` when a limit held
 * work back.
 */
export const WORKER_DEGRADED_REASONS = [
  'none',
  'missing_data',
  'dependency_unavailable',
  'partial_timeout',
  'capacity',
  'other',
] as const;

export type WorkerDegradedReason = (typeof WORKER_DEGRADED_REASONS)[number];

/** How the Alert Triage closure review's proposal settled; `unknown` is any other gate state. */
export const ALERT_TRIAGE_CLOSURE_OUTCOMES = [
  'approved',
  'dismissed',
  'expired',
  'unknown',
] as const;

export type AlertTriageClosureOutcome = (typeof ALERT_TRIAGE_CLOSURE_OUTCOMES)[number];

/**
 * What a Worker review's proposal came to: `approved` or `dismissed` by an analyst (or
 * auto-approved), `undecided` when a proposal was raised but nobody decided it, and `none` when
 * the review raised no proposal.
 */
export const WORKER_REVIEW_DECISIONS = ['approved', 'dismissed', 'undecided', 'none'] as const;

export type WorkerReviewDecision = (typeof WORKER_REVIEW_DECISIONS)[number];

/** The model's stated confidence in a recommendation, or `none` when there was no recommendation. */
export const WORKER_RECOMMENDATION_CONFIDENCES = ['low', 'medium', 'high', 'none'] as const;

export type WorkerRecommendationConfidence = (typeof WORKER_RECOMMENDATION_CONFIDENCES)[number];

/**
 * The kind of tuning change a Rule Tuning review proposed. `manual` is the action-less arm, which
 * also takes any change type the other arms do not name; `none` means no change was proposed.
 */
export const RULE_TUNING_CHANGE_TYPES = [
  'query',
  'risk_score',
  'exception',
  'threshold',
  'schedule',
  'manual',
  'none',
] as const;

export type RuleTuningChangeType = (typeof RULE_TUNING_CHANGE_TYPES)[number];

/**
 * The manual-autonomy entry gate of a Rule Tuning or Rule Coverage review: `skipped` when no
 * entry gate ran, else how an analyst answered it, or `undecided` when nobody did.
 */
export const RULE_REVIEW_ENTRY_GATES = ['skipped', 'approved', 'declined', 'undecided'] as const;

export type RuleReviewEntryGate = (typeof RULE_REVIEW_ENTRY_GATES)[number];

/** The coverage check's verdict on a detection gap, or `none` when the check produced none. */
export const RULE_COVERAGE_VERDICTS = [
  'covered_enabled',
  'covered_disabled',
  'prebuilt_available',
  'no_coverage',
  'none',
] as const;

export type RuleCoverageVerdict = (typeof RULE_COVERAGE_VERDICTS)[number];

/**
 * A detection rule's type, in the vocabulary of security-team#19891: `ml` is `machine_learning`,
 * `query` includes `saved_query`, and any other type is `other`.
 */
export const DETECTION_RULE_TYPES = [
  'query',
  'eql',
  'esql',
  'threshold',
  'new_terms',
  'ml',
  'threat_match',
  'other',
] as const;

export type DetectionRuleType = (typeof DETECTION_RULE_TYPES)[number];

/** Whether a detection rule is an Elastic prebuilt rule or a custom one. */
export const DETECTION_RULE_SOURCES = ['prebuilt', 'custom'] as const;

export type DetectionRuleSource = (typeof DETECTION_RULE_SOURCES)[number];

/**
 * What a Rule Coverage review proposed: enable, install, create or confirm a rule, an action-less
 * `manual_follow_up` report when the check's result could not be acted on, or `none`.
 */
export const RULE_COVERAGE_PROPOSAL_KINDS = [
  'enable_rule',
  'install_prebuilt_rule',
  'create_rule',
  'confirm_coverage',
  'manual_follow_up',
  'none',
] as const;

export type RuleCoverageProposalKind = (typeof RULE_COVERAGE_PROPOSAL_KINDS)[number];

/** The Hunt child's result status for one report; `unknown` is any other value. */
export const HUNT_REPORT_HUNT_STATUSES = ['success', 'partial', 'failed', 'unknown'] as const;

export type HuntReportHuntStatus = (typeof HUNT_REPORT_HUNT_STATUSES)[number];

/** The Hunt packaging child's own status for one report. */
export const HUNT_REPORT_PACKAGE_STATUSES = ['success', 'run_incomplete'] as const;

export type HuntReportPackageStatus = (typeof HUNT_REPORT_PACKAGE_STATUSES)[number];

/** Why Hunt packaging held back its Proposals, mirroring the packaging step's `mintSuppression`. */
export const HUNT_REPORT_MINT_SUPPRESSIONS = [
  'none',
  'existing_proposals',
  'check_failed',
] as const;

export type HuntReportMintSuppression = (typeof HUNT_REPORT_MINT_SUPPRESSIONS)[number];

/**
 * How one Endpoint Analysis run settled its indicator: `processed` with findings attached,
 * `no_host` when the discovery named no host (retired as processed with nothing to analyze),
 * `failed` when no findings landed, `proposals_lost` when findings landed but a containment
 * proposal did not reach the queue, `unreachable` when the Investigation could not be read,
 * `invalid` for a malformed indicator, and `not_pending` when the indicator was no longer pending.
 */
export const ENDPOINT_ANALYSIS_OUTCOMES = [
  'processed',
  'no_host',
  'failed',
  'proposals_lost',
  'unreachable',
  'invalid',
  'not_pending',
] as const;

export type EndpointAnalysisOutcome = (typeof ENDPOINT_ANALYSIS_OUTCOMES)[number];
