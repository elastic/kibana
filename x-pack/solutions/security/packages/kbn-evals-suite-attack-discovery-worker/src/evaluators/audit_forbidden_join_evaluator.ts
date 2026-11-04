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

export const AUDIT_FORBIDDEN_JOIN_EVALUATOR_NAME = 'ForbiddenJoin';

/**
 * Invented entity joins: 0 when one discovery cites alerts from two groups the gold forbids
 * joining (for example principals that only share an egress IP), else 1.
 *
 * The check reads `alertIds`, so a discovery that cites nothing cannot be judged, even if its
 * prose joins the pair. Semantics:
 * - no discoveries: score 1 (nothing was joined). It is the one case where a silent model scores
 *   well here, which is why `NegativeControl` and `PositiveControlRecall` exist beside it.
 * - discoveries exist but none cites any alert id: score null, label `no_citations`. A null score
 *   is left out of the per-evaluator mean, so an unjudgeable run neither pads nor drags it.
 *   The dataset gate still counts it as a miss (`isCodeMiss`): a check that could not run is not
 *   a pass.
 * - a mix: only the citing discoveries are judged; the explanation counts the ones skipped.
 */
export const createAuditForbiddenJoinEvaluator = (
  resolveReference?: AuditReferenceResolver
): Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput> => ({
  name: AUDIT_FORBIDDEN_JOIN_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const resolved = resolveAuditInputs({ metadata, output, resolveReference });
    if ('result' in resolved) return resolved.result;

    const { gold, discoveries } = resolved;
    if (gold.forbiddenCoCitation.length === 0) {
      return notApplicable('Scenario declares no forbidden joins.');
    }

    const citing = discoveries.filter(({ alertIds }) => alertIds.length > 0);
    if (discoveries.length > 0 && citing.length === 0) {
      return {
        score: null,
        label: 'no_citations',
        explanation: `${discoveries.length} discoveries cite no alert ids, so joins cannot be checked`,
      };
    }
    const uncited = discoveries.length - citing.length;
    const skipped = uncited > 0 ? ` (${uncited} discoveries without citations not judged)` : '';

    const violations = citing.flatMap((discovery) => {
      const cited = new Set(discovery.alertIds);
      const touches = (group: string): boolean =>
        (gold.alertGroups[group] ?? []).some((id) => cited.has(id));
      return gold.forbiddenCoCitation
        .filter(([left, right]) => touches(left) && touches(right))
        .map(([left, right]) => `"${discovery.title}" joins ${left} with ${right}`);
    });

    return violations.length === 0
      ? {
          score: 1,
          label: 'no_forbidden_join',
          ...(skipped ? { explanation: skipped.trim() } : {}),
        }
      : { score: 0, label: 'forbidden_join', explanation: `${violations.join('; ')}${skipped}` };
  },
});
