/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import type { AuditReferenceResolver } from '../audit_failure_classes/registry';
import { notApplicable, resolveAuditInputs } from './audit_evaluator_helpers';

export const AUDIT_NEGATIVE_CONTROL_EVALUATOR_NAME = 'NegativeControl';

/** For scenarios with nothing to find: 1 only when the model reports no discoveries. */
export const createAuditNegativeControlEvaluator = (
  resolveReference?: AuditReferenceResolver
): Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput> => ({
  name: AUDIT_NEGATIVE_CONTROL_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const resolved = resolveAuditInputs({ metadata, output, resolveReference });
    if ('result' in resolved) return resolved.result;

    const { gold, discoveries } = resolved;
    if (gold.expectedDiscoveries !== 'none') {
      return notApplicable('Scenario expects at least one discovery.');
    }

    return discoveries.length === 0
      ? { score: 1, label: 'no_discoveries' }
      : {
          score: 0,
          label: 'false_positive',
          explanation: `${discoveries.length} discoveries reported: ${discoveries
            .map(({ title }) => `"${title}"`)
            .join(', ')}`,
        };
  },
});
