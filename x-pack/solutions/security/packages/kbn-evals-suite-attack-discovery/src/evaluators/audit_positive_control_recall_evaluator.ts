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

export const AUDIT_POSITIVE_CONTROL_RECALL_EVALUATOR_NAME = 'PositiveControlRecall';

/** Recall at or above this counts as having found the chain. */
export const POSITIVE_CONTROL_RECALL_THRESHOLD = 0.6;

/** Fraction of the required group's alert ids cited by any discovery. */
export const createAuditPositiveControlRecallEvaluator = (
  resolveReference?: AuditReferenceResolver
): Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput> => ({
  name: AUDIT_POSITIVE_CONTROL_RECALL_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const resolved = resolveAuditInputs({ metadata, output, resolveReference });
    if ('result' in resolved) return resolved.result;

    const { gold, discoveries } = resolved;
    const required = gold.requiredGroup ? gold.alertGroups[gold.requiredGroup] ?? [] : [];
    if (required.length === 0) {
      return notApplicable('Scenario declares no required group.');
    }

    const cited = new Set(discoveries.flatMap(({ alertIds }) => alertIds));
    const found = required.filter((id) => cited.has(id)).length;
    const recall = found / required.length;

    return {
      score: recall,
      label: recall >= POSITIVE_CONTROL_RECALL_THRESHOLD ? 'recalled' : 'missed',
      explanation: `${found}/${required.length} alerts of "${gold.requiredGroup}" cited`,
    };
  },
});
