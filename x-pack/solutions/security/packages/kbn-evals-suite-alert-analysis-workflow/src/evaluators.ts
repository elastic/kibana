/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createTrajectoryEvaluator } from '@kbn/evals';
import type { ExecutionStatus } from '@kbn/workflows';
import { CLASSIFICATIONS, type Classification } from './constants';
import type { AlertAnalysisVerdict, ClassificationMethod } from './workflow_task';
import {
  analyzeBatchVerdicts,
  integrityChecks,
  type BatchAlertRef,
  type BatchVerdictDiagnostics,
  type RawVerdictLike,
} from './batch_verdicts';

interface ExpectedVerdict {
  classification: Classification;
}

const asVerdict = (output: unknown): AlertAnalysisVerdict => output as AlertAnalysisVerdict;
const asExpected = (expected: unknown): ExpectedVerdict | undefined =>
  expected as ExpectedVerdict | undefined;

/**
 * Primary metric: did the workflow's `ai.agent` step classify the alert the same way as
 * the golden label? Binary per example; the mean across a dataset is the workflow's
 * true-positive/false-positive accuracy for the model under test.
 */
export const classificationAccuracy: Evaluator = {
  name: 'ClassificationAccuracy',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const predicted = asVerdict(output).classification;
    const goldenLabel = asExpected(expected)?.classification;
    const correct = predicted != null && predicted === goldenLabel;

    return {
      score: correct ? 1 : 0,
      label: predicted ?? 'none',
      explanation: `predicted="${predicted ?? 'none'}" expected="${goldenLabel ?? 'none'}"`,
      metadata: {
        predicted: predicted ?? null,
        expected: goldenLabel ?? null,
        confidenceScore: asVerdict(output).confidenceScore ?? null,
        executionStatus: asVerdict(output).executionStatus,
      },
    };
  },
};

/**
 * Guardrail: the structured output must be a well-formed verdict — a classification from
 * the workflow's enum and a confidence score in [0, 1]. Catches schema drift and failed
 * executions (no verdict) independently of whether the label was correct.
 */
export const validVerdict: Evaluator = {
  name: 'ValidVerdict',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const verdict = asVerdict(output);
    const classificationValid =
      verdict.classification != null &&
      (CLASSIFICATIONS as readonly string[]).includes(verdict.classification);
    const confidenceValid =
      typeof verdict.confidenceScore === 'number' &&
      verdict.confidenceScore >= 0 &&
      verdict.confidenceScore <= 1;
    const valid = classificationValid && confidenceValid;

    return {
      score: valid ? 1 : 0,
      label: valid ? 'valid' : 'invalid',
      metadata: {
        classificationValid,
        confidenceValid,
        executionStatus: verdict.executionStatus,
      },
    };
  },
};

/**
 * L2 guardrail: the workflow pre-builds context, so the `ai.agent` step should not call tools.
 * Golden path is empty; any tool call fails trajectory.
 */
export const createAlertAnalysisTrajectoryEvaluator = (): Evaluator => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) => asVerdict(output).toolCallIds ?? [],
    goldenPathExtractor: () => [],
    orderWeight: 1,
    coverageWeight: 0,
  });

  return {
    ...inner,
    name: 'trajectory',
    evaluate: async (args) => {
      if (asVerdict(args.output).toolCallsUnavailable) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'Workflow trace unavailable — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  };
};

// ── Multi-alert batch evaluators ─────────────────────────────────────────────────────────────
//
// Deterministic (CODE) evaluators over the RAW verdict array of a multi-alert batch. Each is scored
// separately and reported under its own name; none is folded into ClassificationAccuracy/ValidVerdict
// (which grade a single-alert run) or into each other.

/** What the batch task hands the evaluators: the alerts it seeded plus the raw verdict array. */
export interface BatchTaskOutput {
  /** The alerts of the batch in the order they were given to the workflow. */
  alerts: BatchAlertRef[];
  rawVerdicts: RawVerdictLike[];
  executionId: string;
  executionStatus: ExecutionStatus;
  classificationMethod: ClassificationMethod;
}

const asBatch = (output: unknown): BatchTaskOutput => output as BatchTaskOutput;

const diagnose = (output: unknown): BatchVerdictDiagnostics => {
  const batch = asBatch(output);
  return analyzeBatchVerdicts(batch.alerts ?? [], batch.rawVerdicts ?? []);
};

const diagnosticsMetadata = (d: BatchVerdictDiagnostics, output: unknown) => ({
  batchSize: d.batchSize,
  rawVerdictCount: d.rawVerdictCount,
  overGeneratedBy: d.overGeneratedBy,
  foreignIds: d.foreignIds,
  duplicateIds: d.duplicateIds,
  missingIds: d.missingIds,
  coverage: d.coverage,
  orderMismatchCount: d.orderMismatchCount,
  contentMismatchCount: d.contentMismatches.length,
  contentMismatches: d.contentMismatches,
  ambiguousVerdicts: d.ambiguousVerdicts,
  determinableVerdicts: d.determinableVerdicts,
  undeterminedVerdicts: d.undeterminedVerdicts,
  executionStatus: asBatch(output).executionStatus,
  classificationMethod: asBatch(output).classificationMethod,
});

/**
 * Batch integrity: per batch, verdict count == alert count, every id is a batch id, no id repeats,
 * and every alert got a verdict. All four must hold for a 1; the failed checks are named in the label.
 * A run that produced no verdicts at all (failed execution) scores 0, never N/A: an empty array is
 * exactly the failure the check is for.
 */
export const batchVerdictIntegrity: Evaluator = {
  name: 'BatchVerdictIntegrity',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const d = diagnose(output);
    const checks = integrityChecks(d);
    const failed = Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([name]) => name);
    return {
      score: failed.length === 0 ? 1 : 0,
      label: failed.length === 0 ? 'intact' : failed.join(','),
      explanation:
        `alerts=${d.batchSize} rawVerdicts=${d.rawVerdictCount} foreign=${d.foreignIds.length} ` +
        `duplicate=${d.duplicateIds.length} missing=${d.missingIds.length}`,
      metadata: { ...diagnosticsMetadata(d, output), checks },
    };
  },
};

/** Fraction of batch alerts that received a verdict. 1.00 means no alert was dropped or merged away. */
export const batchVerdictCoverage: Evaluator = {
  name: 'BatchVerdictCoverage',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const d = diagnose(output);
    return {
      score: d.coverage,
      label: d.missingIds.length === 0 ? 'complete' : 'incomplete',
      explanation: `${d.matchedIds.length}/${d.batchSize} alerts answered`,
      metadata: diagnosticsMetadata(d, output),
    };
  },
};

/**
 * Verdict↔alert correspondence. A verdict whose id is a real sibling alert passes every membership
 * check while describing another alert (a same-length hex swap does this). Decided from content:
 * a verdict mismatches when its rationale/factors name another batch alert's unique marker (host,
 * binary, scanned file) and none of its own. Verdicts whose text names no marker are UNDETERMINED
 * and never counted as matches: when no verdict at all is determinable the score is N/A (null), not
 * 1, and the determinable/undetermined counts are shown beside every score. Models often paraphrase
 * ("unsigned process from AppData") without naming a host or binary, so this evaluator is expected to
 * be undetermined for them. A single id corrupted onto a sibling id is caught by BatchVerdictIntegrity
 * (the sibling id is then repeated and the original is missing); this check covers the permutation
 * case, where two verdicts trade ids and the ids stay unique.
 * Verdict ORDER versus the order alerts were given is recorded as `orderMismatchCount` but is not
 * scored, because the run route does not promise to present the alerts in the order of `alertIds`.
 */
export const batchVerdictCorrespondence: Evaluator = {
  name: 'BatchVerdictCorrespondence',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const d = diagnose(output);
    const mismatches = d.contentMismatches.length;
    if (mismatches === 0 && d.determinableVerdicts === 0) {
      // Nothing to compare: no verdict named any alert's unique evidence. Scoring this 1 would
      // report "consistent" for a check that decided nothing, so it is N/A and the counts are kept.
      return {
        score: null,
        label: 'undetermined',
        explanation:
          `no verdict named a batch alert's unique evidence (${d.undeterminedVerdicts} undetermined, ` +
          `orderMismatches=${d.orderMismatchCount})`,
        metadata: diagnosticsMetadata(d, output),
      };
    }
    return {
      score: mismatches === 0 ? 1 : 0,
      label: mismatches === 0 ? 'consistent' : 'mismatched',
      explanation:
        `mismatched=${mismatches} determinable=${d.determinableVerdicts} ` +
        `undetermined=${d.undeterminedVerdicts} orderMismatches=${d.orderMismatchCount}`,
      metadata: diagnosticsMetadata(d, output),
    };
  },
};

/** Per-alert accuracy inside a batch: fraction of batch alerts whose paired verdict has the golden label. */
export const batchClassificationAccuracy: Evaluator = {
  name: 'BatchClassificationAccuracy',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const d = diagnose(output);
    const right = Math.round(d.accuracy * d.batchSize);
    return {
      score: d.accuracy,
      label: `${right}/${d.batchSize}`,
      explanation: `${right} of ${d.batchSize} alerts carry the golden label`,
      metadata: { ...diagnosticsMetadata(d, output), predictions: d.predictions },
    };
  },
};

export const BATCH_EVALUATORS: Evaluator[] = [
  batchVerdictIntegrity,
  batchVerdictCoverage,
  batchVerdictCorrespondence,
  batchClassificationAccuracy,
];
