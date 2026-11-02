/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { EvaluationResult } from '@kbn/evals';
import { getAuditGold } from '../audit_failure_classes/gold';
import type { AuditGold } from '../audit_failure_classes/types';
import type { AttackDiscoveryTaskOutput } from '../types';

export const notApplicable = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'N/A',
  explanation,
});

/**
 * Resolves the gold and discoveries an audit evaluator needs, or the N/A result to return.
 * A task that produced no parsed output is not "quiet", so it is never scored as a pass.
 */
export const resolveAuditInputs = ({
  metadata,
  output,
}: {
  metadata: unknown;
  output: AttackDiscoveryTaskOutput | undefined;
}): { gold: AuditGold; discoveries: AttackDiscovery[] } | { result: EvaluationResult } => {
  const gold = getAuditGold(metadata);
  if (!gold) {
    return { result: notApplicable('Example has no audit gold in its metadata.') };
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
  return { gold, discoveries: output.insights };
};
