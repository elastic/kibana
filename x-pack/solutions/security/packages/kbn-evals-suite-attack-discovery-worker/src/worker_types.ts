/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { Example } from '@kbn/evals';
import type { Cohort } from './cohort_routing';

export type Verdict = 'false_positive' | 'true_positive' | 'inconclusive' | 'failed';
export type GoldVerdict = Exclude<Verdict, 'failed'>;

/** The stage a score belongs to, so generation and review quality can be read apart. */
export type Stage = 'generation' | 'review' | 'pipeline';

export interface WorkerInput extends Record<string, unknown> {
  scenarioId: string;
  spaceId: string;
}

/**
 * Per-scenario answer key for the review stage. The generation-stage gold (alert groups,
 * forbidden joins) lives with the scenario in `audit_failure_classes/`.
 */
export interface WorkerExpected extends Record<string, unknown> {
  goldVerdict: GoldVerdict;
  /** Other verdicts that are also correct, for rows whose evidence does not separate them. */
  alsoAccepts?: GoldVerdict[];
  expectedDiscoveries: 'none' | 'atLeastOne';
  /**
   * Set when the review workflow has no source for this row's evidence (it reads raw events from
   * `logs-endpoint.events.*` only, and cloud alerts carry no host). The row then leaves the
   * `VerdictMatchesGold` headline and is scored by `BlindReviewAbstained` instead.
   */
  blindReason?: string;
  /** Rubric for the review's verdict rationale (LLM judge, reported, never gated). */
  criteria: string[];
  /** Rubric for the generated discoveries' narrative (LLM judge, reported, never gated). */
  generationCriteria: string[];
}

/** Stamped on every example so each score doc carries the cohort and both stage models. */
export interface RoutingMetadata extends Record<string, unknown> {
  cohort: Cohort;
  generation_model: string;
  review_model: string;
}

export interface WorkerExampleMetadata extends RoutingMetadata {
  Title: string;
  scenarioId: string;
  inputVariant: 'baseline';
  provenance: 'authored';
}

export type WorkerExample = Example<WorkerInput, WorkerExpected, WorkerExampleMetadata>;

export interface StepSnapshot {
  stepId: string;
  status: string;
  input?: unknown;
  output?: unknown;
}

/**
 * What the review's FP/TP analysis step actually ran on, read from the per-step usage of the
 * analysis child execution (`stepUsage` entries for its `analyze` step).
 */
export interface ReviewAnalysisUsage {
  childExecutionId?: string;
  /** Distinct inference endpoint ids the `analyze` step reported; empty when none was known. */
  connectorIds: string[];
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  /** Why the model could not be determined; unset when `connectorIds` is trustworthy. */
  unresolvedReason?: string;
}

/**
 * What generation actually ran on, read from the `api_config` stored on each persisted
 * discovery. Generation token usage is not reported by the runner, so none is carried.
 */
export interface GenerationUsage {
  discoveryCount: number;
  /** Distinct `api_config.connector_id` values across the persisted discoveries. */
  connectorIds: string[];
  /** Distinct `api_config.model` values, reported only. */
  models: string[];
  /** Persisted discoveries that carried no connector id. */
  discoveriesWithoutConnector: number;
}

export interface ReviewArtifact {
  executionId: string;
  attackDiscoveryId?: string;
  status: string;
  /**
   * True only when the analysis chose to escalate and the escalation gate is still open: the
   * review is waiting on the analyst, not finished and not stuck.
   */
  parked: boolean;
  /** Set when the wait for this review ran out before it settled. */
  timedOutAfterMs?: number;
  /** The execution's error message, set when the review ended `failed`. */
  error?: string;
  verdict?: Verdict;
  investigationId?: string;
  investigationOpened: boolean;
  proposalStatus?: string;
  proposalDecision?: string;
  verdictSummary?: string;
  verdictRationale?: string;
  steps: StepSnapshot[];
  /** Unset when the review never ran the analysis step. */
  analysis?: ReviewAnalysisUsage;
}

export interface WorkerOutcomeEvent {
  stepId: string;
  status: string;
  runOutcome?: string;
  input?: Record<string, unknown>;
}

/**
 * Why generation produced nothing, read from the runner's outcome event. `refused` means every
 * failed batch was refused by the model, `failed` means a batch failed for any other reason (or
 * the reason could not be read), and `empty` means generation succeeded but found no attack.
 */
export interface GenerationFault {
  kind: 'refused' | 'failed' | 'empty';
  /** The first batch error, when one was readable. */
  message?: string;
}

export interface WorkerArtifacts {
  /**
   * Set only on the placeholder a failed row returns (seed, run, collect, cancel or cleanup threw,
   * or the row's scenario is unknown, or the experiment aborted before the row started). Every
   * built-in evaluator checks it first and reports `ROW_FAILED` instead of scoring the empty
   * artifacts.
   */
  rowError?: string;
  runnerExecutionId: string;
  runnerStatus: string;
  runnerError?: string;
  /** Number of step executions the runner recorded; 0 means it never ran a step. */
  runnerStepCount: number;
  /** Set when the wait for the runner ran out before it ended. */
  runnerTimedOutAfterMs?: number;
  seededAlertCount: number;
  /** The scenario's own ids of the alerts seeded into the space. */
  seededAlertIds: string[];
  /** The scenario's own ids of every open alert in the space once seeded (the readable set). */
  openAlertIds: string[];
  alertsAnalyzed?: number;
  attacksGenerated?: number;
  reviewsRequested?: number;
  /** Discoveries read back from the persisted index, with alert ids mapped to gold ids. */
  insights: AttackDiscovery[];
  generationUsage: GenerationUsage;
  persistedAttackIds: string[];
  /**
   * Documents in the space's attack discovery index carrying this run's generation uuids,
   * counted by a separate read; undefined when the index could not be read or the runner
   * reported no generation uuids.
   */
  indexedAttackCount?: number;
  /** Attacks `match_fingerprints` handed back for review; undefined when it did not run. */
  fingerprintReviewCount?: number;
  /** All attachments `match_fingerprints` reported: same-run siblings plus existing attaches. */
  fingerprintAttachCount?: number;
  /** Attachments to an Investigation that already existed; the space starts empty, so none expected. */
  fingerprintExistingAttachCount?: number;
  /** Attacks attached as same-run siblings of a reviewed group (listed by that group's review). */
  fingerprintSiblingAttackIds?: string[];
  /** `attack_discovery_id` of every review the matcher handed back. */
  fingerprintReviewedAttackIds?: string[];
  /** Reviews the matcher handed back that already point at an existing Investigation. */
  fingerprintMatchedCount?: number;
  fingerprintMatchFailed: boolean;
  dispatchedReviewExecutionIds: string[];
  reviews: ReviewArtifact[];
  /** Set only on the seeded-false-positive row. Coverage checks treat it as external to the runner. */
  seededDiscoveryId?: string;
  outcomes: WorkerOutcomeEvent[];
  /** Set when the runner reported that no batch produced an attack; see `GenerationFault`. */
  generationFault?: GenerationFault;
}
