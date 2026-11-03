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

export interface ReviewArtifact {
  executionId: string;
  attackDiscoveryId?: string;
  status: string;
  /** True when the review is waiting on the analyst gate rather than finished. */
  parked: boolean;
  verdict?: Verdict;
  investigationId?: string;
  investigationOpened: boolean;
  proposalStatus?: string;
  proposalDecision?: string;
  verdictSummary?: string;
  verdictRationale?: string;
  steps: StepSnapshot[];
}

export interface WorkerOutcomeEvent {
  stepId: string;
  status: string;
  runOutcome?: string;
  input?: Record<string, unknown>;
}

export interface WorkerArtifacts {
  runnerExecutionId: string;
  runnerStatus: string;
  runnerError?: string;
  seededAlertCount: number;
  alertsAnalyzed?: number;
  attacksGenerated?: number;
  reviewsRequested?: number;
  /** Discoveries read back from the persisted index, with alert ids mapped to gold ids. */
  insights: AttackDiscovery[];
  persistedAttackIds: string[];
  /** Attacks `match_fingerprints` handed back for review; undefined when it did not run. */
  fingerprintReviewCount?: number;
  fingerprintAttachCount?: number;
  fingerprintMatchFailed: boolean;
  dispatchedReviewExecutionIds: string[];
  reviews: ReviewArtifact[];
  outcomes: WorkerOutcomeEvent[];
}
