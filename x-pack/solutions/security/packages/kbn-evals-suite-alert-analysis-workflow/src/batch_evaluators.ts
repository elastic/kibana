/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { Classification } from './constants';

/** What the batch task returns: one prediction per planned alert, in plan order. */
export interface BatchOutput {
  predictions: Array<{ classification?: Classification }>;
  executionStatus: string;
}

/** What the batch is graded against, in plan order (same index = same alert); `shapes` names the shape each alert was built from. */
export interface BatchExpected {
  labels: Classification[];
  shapes: string[];
  /** Which alerts come from a hard shape. */
  hard: boolean[];
}

interface Score {
  score: number | null;
  explanation: string;
}

const ratio = (hits: number, total: number, what: string): Score => ({
  score: total === 0 ? null : hits / total,
  explanation: `${hits}/${total} ${what}`,
});

const countWhere = (
  { predictions }: BatchOutput,
  { labels }: BatchExpected,
  expected: Classification,
  predicted: (p: Classification | undefined) => boolean
): { hits: number; total: number } => {
  const indices = labels.flatMap((label, i) => (label === expected ? [i] : []));
  return {
    hits: indices.filter((i) => predicted(predictions[i]?.classification)).length,
    total: indices.length,
  };
};

const METRICS: Record<string, (output: BatchOutput, expected: BatchExpected) => Score> = {
  // Alerts that got any verdict back. Dropped or cut-off verdicts show up here first.
  BatchCoverage: (output, { labels }) =>
    ratio(
      output.predictions.filter(({ classification }) => classification).length,
      labels.length,
      'alerts got a verdict'
    ),

  // Missing verdicts count as wrong, so a model that drops alerts cannot score well. The
  // explanation names the shapes it got wrong: one shape wrong in every run points at its label.
  BatchAccuracy: (output, { labels, shapes }) => {
    const wrongByShape = new Map<string, number>();
    labels.forEach((label, i) => {
      if (output.predictions[i]?.classification !== label) {
        wrongByShape.set(shapes[i], (wrongByShape.get(shapes[i]) ?? 0) + 1);
      }
    });
    const wrong = [...wrongByShape.entries()].map(([shape, n]) => `${shape} x${n}`).join(', ');
    const { score, explanation } = ratio(
      labels.length - [...wrongByShape.values()].reduce((a, b) => a + b, 0),
      labels.length,
      'alerts classified as labeled'
    );
    return { score, explanation: wrong ? `${explanation}; wrong: ${wrong}` : explanation };
  },

  // Accuracy on the hard shapes alone (lookalike malware, unfamiliar vendors, prompt injection),
  // where a cheaper model is most likely to slip. Absent from standard batches.
  HardShapeAccuracy: (output, { labels, hard }) => {
    const indices = hard.flatMap((isHard, i) => (isHard ? [i] : []));
    return ratio(
      indices.filter((i) => output.predictions[i]?.classification === labels[i]).length,
      indices.length,
      'hard-shape alerts classified as labeled'
    );
  },

  // The dangerous error: a true positive marked false_positive would be closed as benign.
  // 1 minus the share of true positives that were marked false_positive.
  MaliciousNotClosed: (output, expected) => {
    const { hits, total } = countWhere(
      output,
      expected,
      'true_positive',
      (p) => p === 'false_positive'
    );
    return {
      score: total === 0 ? null : 1 - hits / total,
      explanation: `${hits}/${total} true positives marked false_positive`,
    };
  },

  // Benign alerts escalated as true_positive: analyst noise, not a missed attack.
  BenignNotEscalated: (output, expected) => {
    const { hits, total } = countWhere(
      output,
      expected,
      'false_positive',
      (p) => p === 'true_positive'
    );
    return {
      score: total === 0 ? null : 1 - hits / total,
      explanation: `${hits}/${total} false positives marked true_positive`,
    };
  },

  // Alerts built from one shape carry identical evidence, so they must get one verdict.
  // Share of shapes whose returned verdicts all agree; shapes with none are left to coverage.
  VerdictConsistency: (output, { shapes }) => {
    const byShape = new Map<string, Set<string>>();
    shapes.forEach((shape, i) => {
      const verdict = output.predictions[i]?.classification;
      if (verdict) {
        byShape.set(shape, (byShape.get(shape) ?? new Set()).add(verdict));
      }
    });
    const consistent = [...byShape.values()].filter((verdicts) => verdicts.size === 1).length;
    return ratio(consistent, byShape.size, 'shapes got a single verdict');
  },
};

export const batchEvaluators: Evaluator[] = Object.entries(METRICS).map(([name, metric]) => ({
  name,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { score, explanation } = metric(output as BatchOutput, expected as BatchExpected);
    return { score, explanation };
  },
}));
