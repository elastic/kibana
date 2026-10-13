/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SummaryDiagnostics } from './summary_diagnostics';

/** A custom timeline event seeded into a conversation through `_add_events`. */
export interface SeededEvent {
  /**
   * Only custom event types are accepted by `_add_events`; built-in types (`user_message`, …)
   * are rejected with a 400.
   */
  type: 'text_note';
  data: Record<string, string>;
}

/** One linked investigation: a conversation carrying seeded timeline events. */
export interface CaseInvestigation {
  /** Label used in logs and reports (`inv-1` is the first linked investigation). */
  id: string;
  title: string;
  events: SeededEvent[];
}

/**
 * A fact deliberately planted in exactly one linked investigation. `key` is the
 * distinctive token (host name, hash, IP, CVE, …) determinism is checked on;
 * `text` is the sentence carrying it.
 */
export interface PlantedFact {
  id: string;
  key: string;
  text: string;
  /** Index into `EscalationCase.investigations`. */
  investigation: number;
}

/** A question whose answer is derivable from exactly one linked investigation. */
export interface PlantedQuestion {
  id: string;
  question: string;
  /** Expected answer text; graded by key-token containment. */
  answer: string;
  /** Facts the answer is derived from; must all live in one investigation. */
  factIds: string[];
}

/** One grounded-QA case: an escalation with N linked investigations. */
export interface EscalationCase {
  id: string;
  description: string;
  investigations: CaseInvestigation[];
  plantedFacts: PlantedFact[];
  questions: PlantedQuestion[];
}

export interface CaseValidationIssue {
  caseId: string;
  problem: string;
}

/**
 * Why the escalation summary was read: `settled` (a run that saw the last attachment
 * completed), `quiet-window` (all runs terminal, none after the last attachment: a product
 * miss, still scored), or `diagnostics-unavailable` (timing unknown; the first non-empty summary
 * was read, which can predate the last attachment).
 */
export type SummarySettledBy = 'settled' | 'quiet-window' | 'diagnostics-unavailable';

/** Raw per-case outputs the task produces. */
export interface EscalationTaskOutput {
  caseId: string;
  escalationId: string;
  investigationIds: string[];
  /** The escalation `metadata.summary` after the summarize workflow ran. */
  summary: string | undefined;
  /** Chat answers keyed by question id; undefined when the round failed. */
  answers: Record<string, string | undefined>;
  /** Error message per question whose converse round failed; those score 0. */
  answerErrors?: Record<string, string>;
  /** Summary-run vs attachment-add timing for this escalation; evidence only, never graded. */
  summaryDiagnostics?: SummaryDiagnostics;
  /**
   * Why the summary was read (see `waitForSettledSummary`). `diagnostics-unavailable` means the
   * read timing is unknown and the summary may predate the last attachment: report those runs
   * separately rather than folding them into a recall comparison.
   */
  summarySettledBy?: SummarySettledBy;
  /**
   * Index of the investigation the mutation arm withheld from the escalation.
   * Precision graders (ClaimGrounding, unsupported specifics) use the corpus
   * without it; recall stays graded on the full labels.
   */
  droppedInvestigation?: number;
}
