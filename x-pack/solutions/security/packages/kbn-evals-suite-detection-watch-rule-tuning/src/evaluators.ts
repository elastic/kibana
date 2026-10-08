/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import {
  CHANGE_TYPES,
  CONFIDENCE_LEVELS,
  EXCEPTION_OPERATOR_PAYLOAD,
  PROPOSED_SEVERITIES,
  type ChangeType,
} from './constants';
import type { ExceptionEntry, RuleTuningProposal } from './workflow_task';

const asProposal = (output: unknown): RuleTuningProposal => output as RuleTuningProposal;
const asExpected = (expected: unknown): { change_type?: ChangeType } | undefined =>
  expected as { change_type?: ChangeType } | undefined;

/**
 * One `exception_entries` item must match the workflow's item union: a `field`,
 * an `operator` from the published vocabulary, and the payload that operator
 * requires (a `value` string, a `values` array, or nothing for
 * exists/does_not_exist). `value` mirrors the schema's `minLength: 1`; `values`
 * mirrors `minItems: 1` and leaves item contents to the schema.
 */
const isValidExceptionEntry = (entry: unknown): boolean => {
  if (entry == null || typeof entry !== 'object') {
    return false;
  }
  const { field, operator, value, values } = entry as ExceptionEntry;
  if (typeof field !== 'string' || field === '' || typeof operator !== 'string') {
    return false;
  }

  const required = (
    EXCEPTION_OPERATOR_PAYLOAD as Record<string, 'value' | 'values' | null | undefined>
  )[operator];
  // An operator outside the vocabulary has no defined payload, so the entry can
  // never be rendered or applied — reject rather than pass it through.
  if (required === undefined) {
    return false;
  }
  if (required === 'value') {
    return typeof value === 'string' && value !== '';
  }
  if (required === 'values') {
    return Array.isArray(values) && values.length > 0 && values.every((v) => typeof v === 'string');
  }
  return true;
};

/**
 * Primary metric: did the review workflow's `diagnose_rule` step pick the golden tuning path?
 * Binary per example; the mean across the dataset is the model's tuning-decision accuracy.
 */
export const changeTypeAccuracy: Evaluator = {
  name: 'ChangeTypeAccuracy',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const predicted = asProposal(output).change_type;
    const goldenLabel = asExpected(expected)?.change_type;
    const correct = predicted != null && predicted === goldenLabel;

    return {
      score: correct ? 1 : 0,
      label: predicted ?? 'none',
      explanation: `predicted="${predicted ?? 'none'}" expected="${goldenLabel ?? 'none'}"`,
      metadata: { predicted: predicted ?? null, expected: goldenLabel ?? null },
    };
  },
};

/**
 * Guardrail: the structured output must be a well-formed proposal — a `change_type`
 * from the workflow's six-branch union, a summary, the shared proposal-card fields
 * (title/fp_pattern/reasoning/confidence), and the payload fields that branch's
 * apply gate requires. Catches schema drift and failed executions independently
 * of whether the path was correct.
 */
export const validProposal: Evaluator = {
  name: 'ValidProposal',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const proposal = asProposal(output);
    const ruleType = (metadata as { ruleType?: string } | undefined)?.ruleType;

    const changeTypeValid =
      proposal.change_type != null &&
      (CHANGE_TYPES as readonly string[]).includes(proposal.change_type);

    let payloadValid = true;
    switch (proposal.change_type) {
      case 'exception':
        // The workflow renders and applies exception_entries one by one; a bare
        // change_type with no entries produces an empty exception.
        payloadValid =
          Array.isArray(proposal.exception_entries) &&
          proposal.exception_entries.length > 0 &&
          proposal.exception_entries.every(isValidExceptionEntry);
        break;
      case 'query':
        // Mirrors can_preview_query_change: only a `query` rule can have its query
        // previewed and patched, so a proposed_query on any other rule type can
        // never be applied.
        payloadValid =
          typeof proposal.proposed_query === 'string' &&
          proposal.proposed_query !== '' &&
          ruleType === 'query';
        break;
      case 'risk_score':
        // Mirrors the risk_score branch's schema bounds and severity vocabulary.
        payloadValid =
          Number.isInteger(proposal.proposed_risk_score) &&
          (proposal.proposed_risk_score as number) >= 0 &&
          (proposal.proposed_risk_score as number) <= 100 &&
          (PROPOSED_SEVERITIES as readonly string[]).includes(String(proposal.proposed_severity));
        break;
      case 'threshold':
        // Mirrors the threshold branch (#291874): integer minimum 1, grouping
        // fields, cardinality array ([] allowed). Only a `threshold` rule can
        // have its threshold previewed and patched.
        payloadValid =
          ruleType === 'threshold' &&
          Number.isInteger(proposal.proposed_threshold_value) &&
          (proposal.proposed_threshold_value as number) >= 1 &&
          Array.isArray(proposal.proposed_threshold_field) &&
          proposal.proposed_threshold_field.length > 0 &&
          proposal.proposed_threshold_field.every((f) => typeof f === 'string' && f !== '') &&
          Array.isArray(proposal.proposed_threshold_cardinality);
        break;
      case 'schedule':
        // Mirrors the schedule branch (#294332): both fields are always
        // populated because the patch replaces them atomically.
        payloadValid =
          typeof proposal.proposed_interval === 'string' &&
          proposal.proposed_interval !== '' &&
          typeof proposal.proposed_from === 'string' &&
          proposal.proposed_from !== '';
        break;
      case 'manual':
        // The hand-off branch's whole content IS the summary, checked below.
        payloadValid = true;
        break;
      default:
        break;
    }

    // Every branch requires `summary` plus the shared proposal-card fields the
    // gate renders (`title`, `fp_pattern`, `reasoning`, `confidence`), and the
    // review_tuning gate opens only when `structured_output.summary != null` —
    // a summary-less proposal can never produce an approval decision, whatever
    // its change_type.
    const nonEmptyString = (v: unknown) => typeof v === 'string' && v.trim() !== '';
    const summaryValid = nonEmptyString(proposal.summary);
    const commonFieldsValid =
      nonEmptyString(proposal.title) &&
      nonEmptyString(proposal.fp_pattern) &&
      nonEmptyString(proposal.reasoning) &&
      (CONFIDENCE_LEVELS as readonly string[]).includes(String(proposal.confidence));

    const valid = changeTypeValid && payloadValid && summaryValid && commonFieldsValid;

    return {
      score: valid ? 1 : 0,
      label: valid ? 'valid' : 'invalid',
      metadata: {
        changeTypeValid,
        payloadValid,
        summaryValid,
        commonFieldsValid,
        ruleType: ruleType ?? null,
      },
    };
  },
};
