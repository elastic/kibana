/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VERDICT_LADDERS, scoreVerdict } from './jury';
import { isEisBacked, describeJudge } from './judge_provenance';

/** Where each judged evaluator stores its categorical verdict inside `evaluator.metadata`. */
export const VERDICT_PATHS: Record<string, [string, string]> = {
  Groundedness: ['groundednessAnalysis', 'summary_verdict'],
  Factuality: ['correctnessAnalysis', 'factual_accuracy_summary'],
  Relevance: ['correctnessAnalysis', 'relevance_summary'],
};

export interface ScoringPolicy {
  /** Drop scores from judges that are not EIS-backed connectors. */
  requireEisJudge?: boolean;
  /** Drop scores where the judge and the graded model are the same id. */
  excludeSelfJudged?: boolean;
  /** Score the judge's categorical verdict via an ordinal ladder. */
  useVerdictLadder?: boolean;
}

/** Minimal shape the policy reads; both callers' document types satisfy it. */
export interface PolicyScoreDoc {
  task?: { model?: { id?: string | null } | null } | null;
  evaluator?: {
    name?: string | null;
    score?: number | null;
    label?: string | null;
    direction?: string | null;
    model?: { id?: string | null } | null;
    metadata?: unknown;
  } | null;
}

export type PolicyRejection = 'non-quality' | 'non-eis' | 'self-judged' | 'unmapped-verdict';

export interface PolicyDecision {
  /** Effective score for the cell, or null when the document is dropped. */
  score: number | null;
  /** Why the document was dropped, when it was. */
  rejected?: PolicyRejection;
}

export interface PolicyExclusionCounts {
  nonQuality: number;
  nonEis: number;
  selfJudged: number;
  unmappedVerdict: number;
}

export const emptyExclusionCounts = (): PolicyExclusionCounts => ({
  nonQuality: 0,
  nonEis: 0,
  selfJudged: 0,
  unmappedVerdict: 0,
});

/**
 * Ladder score for a judged evaluator, or the stored continuous score when the evaluator
 * has no verdict vocabulary or the doc carries no `evaluator.metadata` (often stripped by the scores route).
 */
export function resolveVerdictScore(
  evaluatorName: string,
  doc: PolicyScoreDoc
): number | null | undefined {
  const ladder = VERDICT_LADDERS[evaluatorName];
  const path = VERDICT_PATHS[evaluatorName];
  if (!ladder || !path) {
    return doc.evaluator?.score;
  }

  const [blockKey, verdictKey] = path;
  const metadata = doc.evaluator?.metadata as Record<string, unknown> | undefined;
  if (metadata === undefined) {
    return doc.evaluator?.score;
  }
  const block = metadata[blockKey] as Record<string, unknown> | undefined;
  // Correctness evaluators nest their verdict under `summary`; Groundedness does not.
  const summary = (block?.summary as Record<string, unknown> | undefined) ?? block;
  const verdict = summary?.[verdictKey];

  return scoreVerdict(typeof verdict === 'string' ? verdict : undefined, ladder) ?? undefined;
}

/**
 * Apply the scoring policy to a single score document.
 * @param isExcludedName reports whether the config excludes an evaluator name; `evaluator.direction` is rarely persisted, so this is the primary non-quality signal.
 */
export function applyScoringPolicy(
  doc: PolicyScoreDoc,
  policy: ScoringPolicy,
  isExcludedName: (evaluatorName: string) => boolean
): PolicyDecision {
  const evaluatorName = doc.evaluator?.name;
  if (!evaluatorName) {
    return { score: null, rejected: 'non-quality' };
  }

  const judgeId = doc.evaluator?.model?.id;
  const taskModelId = doc.task?.model?.id;

  if (policy.requireEisJudge && judgeId && !isEisBacked(judgeId)) {
    return { score: null, rejected: 'non-eis' };
  }
  if (
    policy.excludeSelfJudged &&
    judgeId &&
    taskModelId &&
    describeJudge(judgeId, taskModelId).selfJudged
  ) {
    return { score: null, rejected: 'self-judged' };
  }

  const direction = doc.evaluator?.direction;
  if (direction && direction !== 'maximize') {
    return { score: null, rejected: 'non-quality' };
  }
  if (isExcludedName(evaluatorName)) {
    return { score: null, rejected: 'non-quality' };
  }

  const score = policy.useVerdictLadder
    ? resolveVerdictScore(evaluatorName, doc)
    : doc.evaluator?.score;

  if (typeof score !== 'number') {
    return { score: null, rejected: policy.useVerdictLadder ? 'unmapped-verdict' : undefined };
  }
  return { score };
}

/** Tally a rejection into the running exclusion counts. */
export function tallyRejection(
  counts: PolicyExclusionCounts,
  rejected: PolicyRejection | undefined
): void {
  if (rejected === 'non-quality') counts.nonQuality += 1;
  else if (rejected === 'non-eis') counts.nonEis += 1;
  else if (rejected === 'self-judged') counts.selfJudged += 1;
  else if (rejected === 'unmapped-verdict') counts.unmappedVerdict += 1;
}
