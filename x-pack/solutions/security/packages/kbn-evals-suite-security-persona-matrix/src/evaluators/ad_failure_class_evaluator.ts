/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type {
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput,
} from '@kbn/evals-suite-attack-discovery/src/types';
import { isRecord } from './task_output_helpers';

export const AD_FAILURE_CLASS_EVALUATOR_NAME = 'AD Failure Class';

export type AdFailureClass =
  | 'none'
  | 'truncation'
  | 'poll_timeout'
  | 'max_attempts'
  | 'http_error'
  | 'never_materialized'
  | 'empty_result'
  | 'other';

// Terminal generation statuses of the generate API (mirrors the AD suite's
// client). A run that ends in one of these with nothing to show, and without an
// error string, produced no discovery document at all, except `succeeded`: that
// generation completed and simply found nothing (`empty_result`).
const TERMINAL_GENERATION_STATUSES = new Set(['succeeded', 'failed', 'canceled', 'dismissed']);

const TRUNCATION_REASON = /unexpected end of json|truncated|unterminated/i;
const MAX_ATTEMPTS_REASON = /max(?:imum)? (?:generation )?attempts/i;

// Matches the error strings produced by the generate API client and
// `runAttackDiscovery`; anything unrecognised is `other`.
const classifyError = (error: string): AdFailureClass => {
  if (/^generate response missing execution_uuid/.test(error)) return 'other';
  if (/^generate HTTP /.test(error)) return 'http_error';
  if (/^poll HTTP 404 \(generation never materialized\)/.test(error)) return 'never_materialized';
  if (/^poll HTTP /.test(error)) return 'http_error';
  if (/^poll timed out after /.test(error)) return 'poll_timeout';
  if (/^Failed to parse insights from the LLM response after \d+ attempts/.test(error)) {
    return 'max_attempts';
  }
  if (/^generation \w+: /.test(error)) {
    if (TRUNCATION_REASON.test(error)) return 'truncation';
    if (MAX_ATTEMPTS_REASON.test(error)) return 'max_attempts';
  }
  return 'other';
};

export const classifyAdFailure = (
  output: AttackDiscoveryTaskOutput | undefined
): AdFailureClass => {
  const errors = output?.errors ?? [];
  if (errors.length > 0) return classifyError(errors[0]);

  if (Array.isArray(output?.insights) && output.insights.length > 0) return 'none';

  const status = isRecord(output?.raw) ? output?.raw.status : undefined;
  if (status === 'timed_out') return 'poll_timeout';
  if (status === 'succeeded') return 'empty_result';
  if (typeof status === 'string' && TERMINAL_GENERATION_STATUSES.has(status)) {
    return 'never_materialized';
  }
  return 'other';
};

export const createAdFailureClassEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> => ({
  name: AD_FAILURE_CLASS_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const failureClass = classifyAdFailure(output);
    return {
      score: failureClass === 'none' ? 1 : 0,
      label: failureClass,
      metadata: { failure_class: failureClass, errors: output?.errors ?? [] },
    };
  },
});
