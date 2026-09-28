/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { LABELS, type Label } from './constants';

export interface PayloadConformanceExpectation {
  /** Maximum allowed length of `summary_markdown` (default 8k chars). */
  maxSummaryLength?: number;
}

/**
 * The graded output's verdict. The real workflow emits the label as a plain
 * string on `verdict` (both in the `ai.agent` step's `structured_output` and
 * in the `workflow.output` step: `{"verdict": "true_positive", ...}`), while
 * the object form (label/classification) was the schema-contract guess — the
 * evaluators accept both so the wiring is robust to either shape.
 */
export type GradedVerdict =
  | string
  | { verdict?: string; label?: string; classification?: string }
  | undefined;

interface Output {
  verdict?: GradedVerdict;
  executionStatus?: string;
}

/** Extracts the canonical verdict label from either output shape. */
export const verdictLabel = (verdict: GradedVerdict): string | undefined => {
  if (verdict == null || typeof verdict === 'string') return verdict;
  return verdict.label ?? verdict.classification ?? verdict.verdict;
};

/** Extracts summary_markdown when the verdict carries one (object form). */
const verdictSummary = (verdict: GradedVerdict): string | undefined =>
  typeof verdict === 'object' && verdict != null
    ? (verdict as { summary_markdown?: string }).summary_markdown
    : undefined;

const asOutput = (output: unknown): Output => output as Output;

const expectedLabel = (expected: unknown): Label | undefined =>
  (expected as { label?: Label; classification?: Label } | undefined)?.label ??
  (expected as { classification?: Label } | undefined)?.classification;

/**
 * Primary metric (CODE): did the workflow's verdict label match the corpus
 * gold label? A missing/undefined verdict scores 0 — it is reported as an
 * incorrect verdict, never thrown, so infra failures stay visible in metrics.
 */
export const verdictAccuracy: Evaluator = {
  name: 'VerdictAccuracy',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const predicted = verdictLabel(asOutput(output).verdict);
    const golden = expectedLabel(expected);
    const correct = predicted != null && golden != null && predicted === golden;

    return {
      score: correct ? 1 : 0,
      label: predicted ?? 'none',
      explanation: `predicted="${predicted ?? 'none'}" expected="${golden ?? 'none'}"`,
      metadata: {
        predicted: predicted ?? null,
        expected: golden ?? null,
        executionStatus: asOutput(output).executionStatus,
      },
    };
  },
};

/**
 * Guardrail (CODE): the structured output must be a well-formed verdict —
 * the label is from the canonical enum and `summary_markdown` is present and
 * within the length bound. Fails independently of whether the label was
 * correct, so schema drift is caught separately from accuracy.
 */
export const payloadConformance: Evaluator = {
  name: 'PayloadConformance',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const verdict = asOutput(output).verdict;
    const maxSummary =
      (expected as PayloadConformanceExpectation | undefined)?.maxSummaryLength ?? 8192;

    const label = verdictLabel(verdict);
    const summary = verdictSummary(verdict);
    const labelValid = label != null && (LABELS as readonly string[]).includes(label);
    // String-form verdicts (the real workflow shape) carry the label only —
    // their summary lives on the workflow output, not the graded verdict — so
    // the summary bound applies only to the object form.
    const summaryValid =
      typeof verdict === 'string'
        ? true
        : typeof summary === 'string' && summary.trim().length > 0 && summary.length <= maxSummary;
    const valid = labelValid && summaryValid;

    return {
      score: valid ? 1 : 0,
      label: valid ? 'valid' : 'invalid',
      metadata: {
        labelValid,
        summaryValid,
        summaryLength: summary?.length ?? null,
        maxSummaryLength: maxSummary,
        executionStatus: asOutput(output).executionStatus,
      },
    };
  },
};

/**
 * LLM criteria evaluator: judges the verdict's summary quality against the
 * corpus case's gold rationale and evidence. Follows the criteria pattern the
 * alert-analysis suite uses (`evaluators.criteria(RATIONALE_CRITERIA)`); these
 * strings are the shared criteria that suite wires into `selectEvaluators`.
 */
export const VERDICT_QUALITY_CRITERIA = [
  'The summary cites specific observable evidence from the case payload (process names, ' +
    'command lines, domains, IPs, event sequences) rather than only restating the label',
  'The summary names the decision gate or invariant it applied to reach the verdict',
  'The summary does not invent events, entities, or fields that are not present in the case payload',
];

/** Convenience hook for suites composing criteria into `selectEvaluators`. */
export const verdictQualityEvaluator = (criteria: (criteria: string[]) => Evaluator): Evaluator =>
  criteria(VERDICT_QUALITY_CRITERIA);
