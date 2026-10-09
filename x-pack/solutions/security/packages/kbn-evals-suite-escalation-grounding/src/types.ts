/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file is governed by the Elastic License
 * 2.0.
 */

/** A custom timeline event seeded into a conversation through `_add_events`. */
export interface SeededEvent {
  /** `user_message` (journal note) or `text_note` (comment). */
  type: 'user_message' | 'text_note';
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
  /**
   * Index of the investigation the mutation arm withheld from the escalation.
   * Precision graders (ClaimGrounding, unsupported specifics) use the corpus
   * without it; recall stays graded on the full labels.
   */
  droppedInvestigation?: number;
}
