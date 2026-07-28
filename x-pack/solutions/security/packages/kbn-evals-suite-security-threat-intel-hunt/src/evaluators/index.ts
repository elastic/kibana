/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createRagEvaluators } from '@kbn/evals';
import { validateQuery } from '@kbn/esql-language';
import type { HuntTaskOutput } from '../types';

/**
 * Technique extraction is a set-membership problem (which MITRE ATT&CK
 * technique IDs did the LLM find in the report?), which is exactly the shape
 * the framework's RAG evaluators score. We map each extracted `technique_id`
 * onto a `RetrievedDoc` under a synthetic `techniques` index, and the labeled
 * ground-truth techniques onto the `GroundTruth` map. This gives us
 * Precision@K / Recall@K / F1@K for free, all deterministic CODE evaluators
 * — no judge LLM. The K is the labeled-technique count so F1 is order-free.
 *
 * **Known limitation:** the RAG evaluator does exact string matching on
 * technique IDs, so a model that returns `T1566.001` (sub-technique) is
 * scored as a miss when the ground truth is `T1566` (parent). Use the
 * MITRE-aware Technique Accuracy evaluator below for the real accuracy
 * number that accounts for parent ↔ child relationships.
 */
const RAG_INDEX = 'techniques';

export function createTechniqueRagEvaluators(): Evaluator[] {
  return createRagEvaluators<HuntTaskOutput, { techniques: string[] }>({
    // Score against the full labeled set (F1 is set-membership, not ranked).
    k: 32,
    extractRetrievedDocs: (output) =>
      (output?.techniques ?? []).map((id) => ({ index: RAG_INDEX, id })),
    extractGroundTruth: (expected) => ({
      [RAG_INDEX]: Object.fromEntries((expected?.techniques ?? []).map((id) => [id, 1])),
    }),
  });
}

/**
 * MITRE-aware technique-accuracy evaluator (PR #35 § 5, Correctness dimension).
 *
 * Scores technique extraction with parent ↔ child sub-technique matching:
 * if the ground truth is `T1566` and the model returned `T1566.001`, that's
 * a hit (the sub-technique IS the parent). Conversely, if the ground truth
 * is `T1566.001` and the model returned the parent `T1566`, that's also a
 * hit (the model identified the right area, just less specifically).
 *
 * This replaces the RAG Precision@32/Recall@32 as the primary correctness
 * signal. Those RAG evaluators are retained for backwards-compatibility
 * comparison but their scores are suppressed by exact-ID mismatch.
 *
 * Deterministic CODE — no judge LLM.
 */
export function createTechniqueAccuracyEvaluator(
  expectedByReport: Map<string, Set<string>>
): Evaluator {
  return {
    name: 'Technique Accuracy (MITRE-aware)',
    kind: 'CODE',
    evaluate: async ({ input, output }) => {
      const out = output as HuntTaskOutput | undefined;
      const reportId = (input as { report_id?: string } | undefined)?.report_id;
      const expected = reportId
        ? expectedByReport.get(reportId) ?? new Set<string>()
        : new Set<string>();

      const proposed = out?.techniques ?? [];
      const parents = new Set(out?.parentTechniques ?? []);

      if (expected.size === 0 && proposed.length === 0) {
        return {
          score: 1,
          explanation: 'Correctly extracted no techniques from a benign report',
        };
      }

      const matches = (proposedId: string, expectedSet: Set<string>): boolean => {
        if (expectedSet.has(proposedId)) return true;
        const parentOfProposed = proposedId.split('.')[0];
        if (expectedSet.has(parentOfProposed)) return true;
        for (const exp of expectedSet) {
          if (exp.split('.')[0] === proposedId) return true;
        }
        return false;
      };

      const truePositives = proposed.filter((t) => matches(t, expected)).length;
      const falsePositives = proposed.length - truePositives;
      const falseNegatives = [...expected].filter(
        (t) => !proposed.includes(t) && !proposed.includes(t.split('.')[0]) && !parents.has(t)
      ).length;

      const precision = proposed.length > 0 ? truePositives / proposed.length : 1;
      const recall = expected.size > 0 ? truePositives / expected.size : 1;
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      return {
        score: f1,
        explanation: `P=${precision.toFixed(2)} R=${recall.toFixed(2)} F1=${f1.toFixed(
          2
        )} (TP=${truePositives} FP=${falsePositives} FN=${falseNegatives})`,
        metadata: { precision, recall, f1, truePositives, falsePositives, falseNegatives },
      };
    },
  };
}

/**
 * Deterministic evaluator: every `proposed_esql_rule` the LLM emitted must be
 * a syntactically valid ES|QL query. Uses `@kbn/esql-language` `validateQuery`
 * (AST/syntax only — no field resolution, no live ES). Scores the fraction of
 * proposed rules that parse. A model that proposes detection rules the
 * platform can't run is producing unusable output regardless of technique
 * accuracy, so this is a separate quality axis from Precision/Recall.
 */
export function createEsqlValidityEvaluator(): Evaluator {
  return {
    name: 'ES|QL Rule Validity',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const rules = (output as HuntTaskOutput | undefined)?.esqlRules ?? [];
      if (rules.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No ES|QL rules were proposed',
        };
      }

      const results = await Promise.all(
        rules.map(async (query) => {
          if (!query || typeof query !== 'string') {
            return { query: String(query), valid: false };
          }
          try {
            const { errors } = await validateQuery(query);
            return { query, valid: errors.length === 0 };
          } catch (err) {
            return { query, valid: false };
          }
        })
      );

      const valid = results.filter((r) => r.valid).length;
      return {
        score: valid / results.length,
        explanation: `${valid}/${results.length} proposed ES|QL rules are syntactically valid`,
        metadata: { valid, total: results.length },
      };
    },
  };
}

/**
 * Deterministic safety evaluator: the fraction of technique IDs the model
 * proposed that were NOT real MITRE ATT&CK techniques. The service already
 * validates every extracted ID against `@kbn/securitysolution-mitre-catalog`
 * and reports the rejects as `dropped_unknown_ids`, so this reads a
 * ground-truth signal straight from the platform — no judge LLM.
 *
 * Score is 1.0 = no hallucinations (all proposed IDs were real), 0.0 = every
 * proposed ID was invented. This is the proof that a released model is not
 * fabricating detections, and it is model-independent in its scoring.
 */
export function createHallucinationRateEvaluator(): Evaluator {
  return {
    name: 'Technique Hallucination Rate',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const out = output as HuntTaskOutput | undefined;
      const kept = out?.techniques ?? [];
      const dropped = out?.droppedUnknownIds ?? [];
      const proposed = kept.length + dropped.length;

      if (proposed === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'Model proposed no techniques',
        };
      }

      const hallucinationRate = dropped.length / proposed;
      return {
        // Higher score = safer (fewer invented techniques).
        score: 1 - hallucinationRate,
        explanation:
          dropped.length === 0
            ? `All ${proposed} proposed techniques are real ATT&CK IDs`
            : `${
                dropped.length
              }/${proposed} proposed techniques were invented (dropped: ${dropped.join(', ')})`,
        metadata: { proposed, dropped: dropped.length, droppedIds: dropped },
      };
    },
  };
}

/**
 * Confidence calibration, per example. True ECE is an aggregate metric across
 * the whole dataset, so this evaluator does two things:
 *   1. Emits a per-example Brier-style score: mean squared error between each
 *      proposed technique's confidence and whether it was actually correct
 *      (in the labeled set). Lower Brier = better calibration; we report
 *      `1 - brier` so higher score is better, consistent with the others.
 *   2. Stashes the raw (confidence, correct) pairs in `metadata` so the
 *      aggregate ECE can be computed offline from the per-model score docs.
 *
 * No judge LLM — this reads the model's own `llm_confidence` against
 * ground-truth correctness.
 */
export function createCalibrationEvaluator(expectedByReport: Map<string, Set<string>>): Evaluator {
  return {
    name: 'Confidence Calibration (Brier)',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const out = output as HuntTaskOutput | undefined;
      const reportId = out?.reportId;
      const behaviors = out?.behaviors ?? [];
      const truth = reportId
        ? expectedByReport.get(reportId) ?? new Set<string>()
        : new Set<string>();

      if (behaviors.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No techniques with confidence were proposed',
        };
      }

      const pairs = behaviors.map((b) => {
        const confidence = clamp01(b.llm_confidence);
        const correct = isTechniqueCorrect(b.technique_id, b.parent_technique_id, truth);
        return { technique_id: b.technique_id, confidence, correct };
      });

      const brier =
        pairs.reduce((sum, p) => sum + (p.confidence - p.correct) ** 2, 0) / pairs.length;

      return {
        score: 1 - brier,
        explanation: `Brier score ${brier.toFixed(3)} over ${pairs.length} proposed techniques`,
        metadata: { brier, pairs },
      };
    },
  };
}

/**
 * Expected Calibration Error (ECE) evaluator (PR #35 § 5.3).
 *
 * The architecture mandates ECE as the **primary** calibration metric (gate:
 * ECE <= 0.10), with Brier as a supporting view. ECE bins predictions by
 * confidence level and measures the weighted average gap between each bin's
 * mean confidence and its actual accuracy. This directly answers the autonomy
 * gate question: "when the model says 90% confident, is it right 90% of the
 * time?"
 *
 * Also enforces the high-confidence bin rule: predictions with >=0.80
 * confidence must be correct >=80% of the time on clean-profile scenarios
 * before the capability can move to supervised autonomous execution.
 *
 * Per-example ECE is approximate (few data points per example); the aggregate
 * across the full dataset is the gate metric. Raw (confidence, correct) pairs
 * are stashed in metadata so the true dataset-level ECE can be computed
 * offline from per-model score docs.
 *
 * Score = 1 - ECE (so higher is better, consistent with other evaluators).
 * Deterministic CODE -- no judge LLM.
 */
export function createEceEvaluator(expectedByReport: Map<string, Set<string>>): Evaluator {
  const NUM_BINS = 10;
  const HIGH_CONF_THRESHOLD = 0.8;

  return {
    name: 'Expected Calibration Error',
    kind: 'CODE',
    evaluate: async ({ input, output }) => {
      const out = output as HuntTaskOutput | undefined;
      const reportId = (input as { report_id?: string } | undefined)?.report_id;
      const behaviors = out?.behaviors ?? [];
      const truth = reportId
        ? expectedByReport.get(reportId) ?? new Set<string>()
        : new Set<string>();

      if (behaviors.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No techniques with confidence were proposed',
        };
      }

      const pairs = behaviors.map((b) => {
        const confidence = clamp01(b.llm_confidence);
        const correct = isTechniqueCorrect(b.technique_id, b.parent_technique_id, truth);
        return { confidence, correct };
      });

      const bins = Array.from({ length: NUM_BINS }, () => ({
        confidences: [] as number[],
        corrects: [] as number[],
      }));

      for (const { confidence, correct } of pairs) {
        const binIdx = Math.min(Math.floor(confidence * NUM_BINS), NUM_BINS - 1);
        bins[binIdx].confidences.push(confidence);
        bins[binIdx].corrects.push(correct);
      }

      let weightedError = 0;
      const totalN = pairs.length;
      const binDetails: Array<{ range: string; n: number; avgConf: number; acc: number }> = [];

      for (let i = 0; i < NUM_BINS; i++) {
        const bin = bins[i];
        if (bin.confidences.length > 0) {
          const avgConf = bin.confidences.reduce((a, b) => a + b, 0) / bin.confidences.length;
          const acc = bin.corrects.reduce((a, b) => a + b, 0) / bin.corrects.length;
          const n = bin.confidences.length;
          weightedError += (n / totalN) * Math.abs(avgConf - acc);
          binDetails.push({
            range: `[${(i / NUM_BINS).toFixed(1)}, ${((i + 1) / NUM_BINS).toFixed(1)})`,
            n,
            avgConf: Number(avgConf.toFixed(3)),
            acc: Number(acc.toFixed(3)),
          });
        }
      }

      const highConfPairs = pairs.filter((p) => p.confidence >= HIGH_CONF_THRESHOLD);
      const highConfAcc =
        highConfPairs.length > 0
          ? highConfPairs.reduce((a, p) => a + p.correct, 0) / highConfPairs.length
          : 1;
      const highConfGatePassed = highConfAcc >= 0.8;

      return {
        score: 1 - weightedError,
        explanation: `ECE=${weightedError.toFixed(
          3
        )} (gate: <=0.10); high-conf bin acc=${highConfAcc.toFixed(2)} (gate: >=0.80 ${
          highConfGatePassed ? 'PASS' : 'FAIL'
        })`,
        metadata: {
          ece: weightedError,
          highConfidenceAccuracy: highConfAcc,
          highConfidenceGatePassed: highConfGatePassed,
          highConfidenceN: highConfPairs.length,
          bins: binDetails,
          pairs: pairs.map((p) => ({ confidence: p.confidence, correct: p.correct })),
        },
      };
    },
  };
}

/**
 * Checks whether a proposed technique is correct against the expected set,
 * using MITRE-aware parent/child matching (same logic as the Technique
 * Accuracy evaluator).
 */
function isTechniqueCorrect(
  techniqueId: string,
  parentTechniqueId: string | undefined,
  expected: Set<string>
): number {
  if (expected.has(techniqueId)) return 1;
  const parent = techniqueId.split('.')[0];
  if (expected.has(parent)) return 1;
  if (parentTechniqueId && expected.has(parentTechniqueId)) return 1;
  for (const exp of expected) {
    if (exp.split('.')[0] === techniqueId) return 1;
  }
  return 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
