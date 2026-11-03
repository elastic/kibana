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

/**
 * Fraction of the required group's alert ids cited by any discovery. When the gold sets
 * `requiredAnyOf` (input that cannot tell the groups apart), the score is the best recall over
 * those groups.
 */
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
    const candidates = gold.requiredGroup ? [gold.requiredGroup] : gold.requiredAnyOf ?? [];
    if (candidates.length === 0) {
      return notApplicable('Scenario declares no required group.');
    }

    const cited = new Set(discoveries.flatMap(({ alertIds }) => alertIds));
    const results = candidates.map((group) => {
      const required = gold.alertGroups[group] ?? [];
      const found = required.filter((id) => cited.has(id)).length;
      return {
        group,
        found,
        total: required.length,
        recall: required.length ? found / required.length : 0,
      };
    });
    const best = results.reduce((top, next) => (next.recall > top.recall ? next : top));

    return {
      score: best.recall,
      label: best.recall >= POSITIVE_CONTROL_RECALL_THRESHOLD ? 'recalled' : 'missed',
      explanation: `${best.found}/${best.total} alerts of "${best.group}" cited${
        candidates.length > 1 ? ` (best of ${candidates.join(', ')})` : ''
      }`,
    };
  },
});
