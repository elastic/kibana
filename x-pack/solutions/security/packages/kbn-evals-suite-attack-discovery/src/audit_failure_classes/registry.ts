/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AttackDiscoveryDatasetExample } from '../types';
import { ENRICHED_ADDITIONAL_CONTEXT } from './default_allowlist';
import { renderAlert } from './render_alert';
import { benignBatchScenario } from './scenarios/benign_batch';
import { positiveChainWithNoiseScenario } from './scenarios/positive_chain_with_noise';
import { sameDisplayNameCrossAccountScenario } from './scenarios/same_display_name_cross_account';
import { sharedCiEgressScenario } from './scenarios/shared_ci_egress';
import { thresholdMetaAlertsScenario } from './scenarios/threshold_meta_alerts';
import type { AuditExampleMetadata, AuditInputVariant, AuditScenario } from './types';

/** Every scenario the audit-failure-class eval runs. */
export const AUDIT_SCENARIOS: readonly AuditScenario[] = [
  sharedCiEgressScenario,
  sameDisplayNameCrossAccountScenario,
  thresholdMetaAlertsScenario,
  benignBatchScenario,
  positiveChainWithNoiseScenario,
];

export const AUDIT_INPUT_VARIANTS: readonly AuditInputVariant[] = ['baseline', 'enriched'];

export const getAuditExampleName = (scenarioId: string, variant: AuditInputVariant): string =>
  `${scenarioId}.${variant}`;

/** One example per scenario x input variant, so each model is scored per variant. */
export const buildAuditExamples = (
  scenarios: readonly AuditScenario[] = AUDIT_SCENARIOS
): AttackDiscoveryDatasetExample[] =>
  scenarios.flatMap((scenario) =>
    AUDIT_INPUT_VARIANTS.map((inputVariant): AttackDiscoveryDatasetExample => {
      const metadata: AuditExampleMetadata = {
        Title: getAuditExampleName(scenario.id, inputVariant),
        scenarioId: scenario.id,
        inputVariant,
        provenance: scenario.provenance,
        gold: scenario.gold,
      };
      return {
        input: {
          mode: 'bundledAlerts',
          anonymizedAlerts: scenario.alerts.map((alert) => renderAlert(alert, inputVariant)),
          ...(inputVariant === 'enriched'
            ? { additionalContext: ENRICHED_ADDITIONAL_CONTEXT }
            : {}),
        },
        output: { attackDiscoveries: [] },
        metadata,
      };
    })
  );
