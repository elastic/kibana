/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import { notApplicable, resolveAuditInputs } from './audit_evaluator_helpers';

export const AUDIT_FORBIDDEN_JOIN_EVALUATOR_NAME = 'ForbiddenJoin';

/**
 * Invented entity joins: 0 when one discovery cites alerts from two groups the gold forbids
 * joining (for example principals that only share an egress IP), else 1.
 */
export const createAuditForbiddenJoinEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> => ({
  name: AUDIT_FORBIDDEN_JOIN_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const resolved = resolveAuditInputs({ metadata, output });
    if ('result' in resolved) return resolved.result;

    const { gold, discoveries } = resolved;
    if (gold.forbiddenCoCitation.length === 0) {
      return notApplicable('Scenario declares no forbidden joins.');
    }

    const violations = discoveries.flatMap((discovery) => {
      const cited = new Set(discovery.alertIds);
      const touches = (group: string): boolean =>
        (gold.alertGroups[group] ?? []).some((id) => cited.has(id));
      return gold.forbiddenCoCitation
        .filter(([left, right]) => touches(left) && touches(right))
        .map(([left, right]) => `"${discovery.title}" joins ${left} with ${right}`);
    });

    return violations.length === 0
      ? { score: 1, label: 'no_forbidden_join' }
      : { score: 0, label: 'forbidden_join', explanation: violations.join('; ') };
  },
});
