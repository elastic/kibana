/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateRelevanceScore } from '@kbn/evals';
import type { CorrectnessAnalysis, Evaluator } from '@kbn/evals';
import { deriveRelevanceLabel, isAgentResponseEmpty } from './relevance_label';

/**
 * Security-owned `Relevance` evaluator. A pure function of the correctness analysis the judge
 * already attached to the task output (no LLM call at evaluate time).
 *
 * Differences from the platform `Relevance` entry of `createQuantitativeCorrectnessEvaluators()`:
 * - The label of record is derived in code from the claim tags, not taken from the judge's own
 *   `relevance_summary`, which collapses to a single label on some judges. The judge label is kept
 *   in metadata so drift stays measurable.
 * - An empty final agent message scores 0 and is labeled IRRELEVANT. The judge tends to emit one
 *   central meta-claim about the emptiness, which would otherwise score 1.0.
 *
 * The score is otherwise the platform `calculateRelevanceScore` (share of central claims).
 */
export const createSecurityRelevanceEvaluator = (): Evaluator => ({
  name: 'Relevance',
  kind: 'LLM',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const correctnessAnalysis = (output as { correctnessAnalysis?: CorrectnessAnalysis } | null)
      ?.correctnessAnalysis;

    if (!correctnessAnalysis) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No correctness analysis available',
        metadata: metadata ?? undefined,
      };
    }

    const judgeRelevanceLabel = correctnessAnalysis.summary.relevance_summary;
    const responseIsEmpty = isAgentResponseEmpty(output);
    const label = responseIsEmpty
      ? 'IRRELEVANT'
      : deriveRelevanceLabel(correctnessAnalysis.analysis ?? []);

    return {
      score: responseIsEmpty ? 0 : calculateRelevanceScore(correctnessAnalysis),
      label,
      explanation: label,
      metadata: {
        ...(metadata ?? {}),
        correctnessAnalysis,
        judgeRelevanceLabel,
        relevanceLabelConsistent: judgeRelevanceLabel === label,
      },
    };
  },
});
