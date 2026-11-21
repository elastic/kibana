/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Closed vocabularies that more than one Worker's outcome events read. They live in `common` so
 * the server event types and the report step's input schema share one definition.
 */

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
 * The manual-autonomy entry gate of a Rule Tuning or Rule Coverage review: `skipped` when no
 * entry gate ran, else how an analyst answered it, or `undecided` when nobody did.
 */
export const RULE_REVIEW_ENTRY_GATES = ['skipped', 'approved', 'declined', 'undecided'] as const;

export type RuleReviewEntryGate = (typeof RULE_REVIEW_ENTRY_GATES)[number];

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
