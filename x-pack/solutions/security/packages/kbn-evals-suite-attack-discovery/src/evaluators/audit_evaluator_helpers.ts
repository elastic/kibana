/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { EvaluationResult } from '@kbn/evals';
import { deanonymizeDiscoveries } from '../audit_failure_classes/deanonymize_discoveries';
import {
  resolveAuditReference,
  type AuditReferenceResolver,
} from '../audit_failure_classes/registry';
import type { AuditGold } from '../audit_failure_classes/types';
import type { AttackDiscoveryTaskOutput } from '../types';

export const notApplicable = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'N/A',
  explanation,
});

/**
 * Looks up the gold for the example (by `metadata.scenarioId`, in the registry) and the model
 * insights, with anonymization tokens in the insights mapped back to the original values so
 * evaluators compare real entities. Returns a ready-made result instead when either is unavailable: an example with no
 * known scenario is N/A, and a run with no parsed insights is a `task_error` with a null score,
 * never a pass. `resolveReference` is a seam for unit tests.
 */
export const resolveAuditInputs = ({
  metadata,
  output,
  resolveReference = resolveAuditReference,
}: {
  metadata: unknown;
  output: AttackDiscoveryTaskOutput | undefined;
  resolveReference?: AuditReferenceResolver;
}):
  | { gold: AuditGold; replacements: Replacements; discoveries: AttackDiscovery[] }
  | { result: EvaluationResult } => {
  const reference = resolveReference(metadata);
  if (!reference) {
    return { result: notApplicable('Example metadata names no known audit scenario.') };
  }
  if (!Array.isArray(output?.insights)) {
    return {
      result: {
        score: null,
        label: 'task_error',
        explanation: String(output?.errors?.[0] ?? 'Task produced no insights.').slice(0, 500),
      },
    };
  }
  return {
    ...reference,
    discoveries: deanonymizeDiscoveries(output.insights, reference.replacements),
  };
};
