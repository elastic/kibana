/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Replacements } from '@kbn/elastic-assistant-common';
import type { AttackDiscoveryDatasetExample } from '../types';
import { ENRICHED_ADDITIONAL_CONTEXT } from './default_allowlist';
import { getAnonymizationSeed, renderAlerts, type RenderedAlerts } from './render_alert';
import { benignBatchScenario } from './scenarios/benign_batch';
import { positiveChainWithNoiseScenario } from './scenarios/positive_chain_with_noise';
import { sameDisplayNameCrossAccountScenario } from './scenarios/same_display_name_cross_account';
import { sharedCiEgressScenario } from './scenarios/shared_ci_egress';
import { thresholdMetaAlertsScenario } from './scenarios/threshold_meta_alerts';
import type { AuditExampleMetadata, AuditGold, AuditInputVariant, AuditScenario } from './types';

/** Every scenario the audit-failure-class eval runs. */
export const AUDIT_SCENARIOS: readonly AuditScenario[] = [
  sharedCiEgressScenario,
  sameDisplayNameCrossAccountScenario,
  thresholdMetaAlertsScenario,
  benignBatchScenario,
  positiveChainWithNoiseScenario,
];

export const AUDIT_INPUT_VARIANTS: readonly AuditInputVariant[] = ['baseline', 'enriched'];

/** `<scenario>.<variant>`: the example name, and the example id on stored score rows. */
export const getAuditExampleName = (scenarioId: string, variant: AuditInputVariant): string =>
  `${scenarioId}.${variant}`;

const renderCache = new Map<string, RenderedAlerts>();

/**
 * Product-style anonymized alerts and the token replacements for one scenario and variant.
 * Deterministic: the same scenario and variant always yield the same tokens.
 */
export const getAuditRendering = (
  scenario: AuditScenario,
  variant: AuditInputVariant
): RenderedAlerts => {
  const seed = getAnonymizationSeed(scenario.id, variant);
  const cached = renderCache.get(seed);
  if (cached) return cached;
  const rendered = renderAlerts(scenario.alerts, variant, seed);
  renderCache.set(seed, rendered);
  return rendered;
};

export interface AuditReference {
  gold: AuditGold;
  /** Anonymization token to original value for the example's rendered alerts. */
  replacements: Replacements;
}

export type AuditReferenceResolver = (metadata: unknown) => AuditReference | undefined;

/**
 * Looks gold and replacements up in the registry from the example metadata. Metadata carries
 * only `scenarioId` and `inputVariant`, so stored score rows never hold the answer key.
 */
export const resolveAuditReference: AuditReferenceResolver = (metadata) => {
  if (typeof metadata !== 'object' || metadata === null) return undefined;
  const { scenarioId, inputVariant } = metadata as Partial<AuditExampleMetadata>;
  const scenario = AUDIT_SCENARIOS.find(({ id }) => id === scenarioId);
  if (!scenario || !AUDIT_INPUT_VARIANTS.some((variant) => variant === inputVariant)) {
    return undefined;
  }
  return {
    gold: scenario.gold,
    replacements: getAuditRendering(scenario, inputVariant as AuditInputVariant).replacements,
  };
};

/** One example per scenario x input variant, so each model is scored per variant. */
export const buildAuditExamples = (
  scenarios: readonly AuditScenario[] = AUDIT_SCENARIOS
): AttackDiscoveryDatasetExample[] =>
  scenarios.flatMap((scenario) =>
    AUDIT_INPUT_VARIANTS.map((inputVariant): AttackDiscoveryDatasetExample => {
      const name = getAuditExampleName(scenario.id, inputVariant);
      const metadata: AuditExampleMetadata = {
        Title: name,
        scenarioId: scenario.id,
        inputVariant,
        provenance: scenario.provenance,
      };
      return {
        id: name,
        input: {
          mode: 'bundledAlerts',
          anonymizedAlerts: getAuditRendering(scenario, inputVariant).anonymizedAlerts,
          ...(inputVariant === 'enriched'
            ? { additionalContext: ENRICHED_ADDITIONAL_CONTEXT }
            : {}),
        },
        output: { attackDiscoveries: [] },
        metadata,
      };
    })
  );
