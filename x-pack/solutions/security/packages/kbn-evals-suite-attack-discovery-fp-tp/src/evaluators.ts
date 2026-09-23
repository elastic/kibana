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

interface Output {
  verdict?: { label?: string; classification?: string; summary_markdown?: string };
  executionStatus?: string;
}

const asOutput = (output: unknown): Output => output as Output;

const expectedLabel = (expected: unknown): Label | undefined =>
  (expected as { label?: Label } | undefined)?.label;

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
    const predicted = asOutput(output).verdict?.label ?? asOutput(output).verdict?.classification;
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

    const labelValid =
      verdict != null &&
      (verdict.label ?? verdict.classification) != null &&
      (LABELS as readonly string[]).includes((verdict.label ?? verdict.classification) as string);
    const summaryValid =
      verdict != null &&
      typeof verdict.summary_markdown === 'string' &&
      verdict.summary_markdown.trim().length > 0 &&
      verdict.summary_markdown.length <= maxSummary;
    const valid = labelValid && summaryValid;

    return {
      score: valid ? 1 : 0,
      label: valid ? 'valid' : 'invalid',
      metadata: {
        labelValid,
        summaryValid,
        summaryLength: verdict?.summary_markdown?.length ?? null,
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
