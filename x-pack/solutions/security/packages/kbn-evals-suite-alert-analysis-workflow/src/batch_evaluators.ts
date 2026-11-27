/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { Classification } from './constants';
import type { WorkflowTiming } from './workflow_task';

/** What the batch task returns: one prediction per planned alert, in plan order. */
export interface BatchOutput {
  predictions: Array<{ classification?: Classification }>;
  executionStatus: string;
  /** Read by the trace-based evaluators. */
  traceId?: string;
  timing?: WorkflowTiming;
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

/** Alerts named per explanation; the rest collapse into "+N more" to keep result docs small. */
const MAX_NAMED_ALERTS = 10;

/**
 * Batch alert ids embed a per-run uuid and are not in the expected output, so alerts are named
 * `shape#index`: the index is the plan position, identical across runs and models.
 */
const nameAlerts = (indices: number[], shapes: string[]): string => {
  const names = indices.slice(0, MAX_NAMED_ALERTS).map((i) => `${shapes[i]}#${i}`);
  const rest = indices.length - names.length;
  return rest > 0 ? `${names.join(', ')}, +${rest} more` : names.join(', ');
};

/** Plan positions of the alerts labeled `expected`, split by what the model returned for them. */
const partitionByVerdict = (
  { predictions }: BatchOutput,
  { labels }: BatchExpected,
  expected: Classification,
  offending: Classification
): { total: number; offending: number[]; missing: number[] } => {
  const indices = labels.flatMap((label, i) => (label === expected ? [i] : []));
  return {
    total: indices.length,
    offending: indices.filter((i) => predictions[i]?.classification === offending),
    missing: indices.filter((i) => !predictions[i]?.classification),
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
  // 1 minus the share of true positives that were marked false_positive. A true positive with no
  // verdict is not scored here (BatchCoverage and BatchAccuracy catch it) but is named apart, so
  // a dropped verdict is not mistaken for a closed one.
  MaliciousNotClosed: (output, expected) => {
    const { total, offending, missing } = partitionByVerdict(
      output,
      expected,
      'true_positive',
      'false_positive'
    );
    const closed = offending.length ? `: ${nameAlerts(offending, expected.shapes)}` : '';
    const dropped = missing.length ? `; no verdict: ${nameAlerts(missing, expected.shapes)}` : '';
    return {
      score: total === 0 ? null : 1 - offending.length / total,
      explanation: `${offending.length}/${total} true positives marked false_positive${closed}${dropped}`,
    };
  },

  // Benign alerts escalated as true_positive: analyst noise, not a missed attack.
  BenignNotEscalated: (output, expected) => {
    const { total, offending, missing } = partitionByVerdict(
      output,
      expected,
      'false_positive',
      'true_positive'
    );
    const escalated = offending.length ? `: ${nameAlerts(offending, expected.shapes)}` : '';
    const dropped = missing.length ? `; no verdict: ${nameAlerts(missing, expected.shapes)}` : '';
    return {
      score: total === 0 ? null : 1 - offending.length / total,
      explanation: `${offending.length}/${total} false positives marked true_positive${escalated}${dropped}`,
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
