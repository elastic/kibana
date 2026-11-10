/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Evaluator } from '@kbn/evals';
import type { AuditReferenceResolver } from '../audit_failure_classes/registry';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import { notApplicable, resolveAuditInputs } from './audit_evaluator_helpers';

export const AUDIT_META_ALERT_AS_EVIDENCE_EVALUATOR_NAME = 'MetaAlertAsEvidence';

/**
 * Threshold and aggregate alerts count other alerts ("5 alerts for user X"); they describe no
 * behaviour. A discovery whose cited alerts are all from `gold.metaAlertGroups` treats such a
 * count as compromise evidence: score 0. A discovery that cites the underlying alerts, with or
 * without a meta alert beside them, is judged on those alerts by the other evaluators.
 *
 * - no meta groups in the gold: score null (N/A)
 * - no discoveries: score 1, label `no_discoveries` (nothing was treated as evidence)
 * - discoveries but none cites a known alert id: score null, label `no_citations`. Ids absent from
 *   `gold.alertGroups` (invented by the model) are ignored, so a meta alert beside an invented id
 *   is still meta-only.
 * - otherwise 1 when no citing discovery is meta-only, else 0. Citing discoveries only are judged.
 *
 * Citation-based: it reads `alertIds`, not prose, so a discovery that cites the underlying alerts
 * but argues from the meta alert's count is not caught.
 */
export const createAuditMetaAlertAsEvidenceEvaluator = (
  resolveReference?: AuditReferenceResolver
): Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput> => ({
  name: AUDIT_META_ALERT_AS_EVIDENCE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const resolved = resolveAuditInputs({ metadata, output, resolveReference });
    if ('result' in resolved) return resolved.result;

    const { gold, discoveries } = resolved;
    const metaIds = new Set(
      (gold.metaAlertGroups ?? []).flatMap((group) => gold.alertGroups[group] ?? [])
    );
    if (metaIds.size === 0) {
      return notApplicable('Scenario has no threshold/meta alerts.');
    }
    if (discoveries.length === 0) {
      return { score: 1, label: 'no_discoveries' };
    }

    // The generation schema accepts any id string, so an invented id must not pass for evidence.
    const knownIds = new Set(Object.values(gold.alertGroups).flat());
    const citing = discoveries
      .map((discovery) => ({
        title: discovery.title,
        alertIds: discovery.alertIds.filter((id) => knownIds.has(id)),
      }))
      .filter(({ alertIds }) => alertIds.length > 0);
    if (citing.length === 0) {
      return {
        score: null,
        label: 'no_citations',
        explanation: `${discoveries.length} discoveries cite no known alert ids, so meta-alert use cannot be checked`,
      };
    }

    const metaOnly = citing.filter(({ alertIds }) => alertIds.every((id) => metaIds.has(id)));
    return metaOnly.length === 0
      ? { score: 1, label: 'underlying_alerts_cited' }
      : {
          score: 0,
          label: 'meta_alert_as_evidence',
          explanation: `Cites only threshold/meta alerts: ${metaOnly
            .map(({ title }) => `"${title}"`)
            .join(', ')}`,
        };
  },
});
