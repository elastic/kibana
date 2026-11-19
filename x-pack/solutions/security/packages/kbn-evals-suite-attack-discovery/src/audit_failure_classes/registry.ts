/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Replacements } from '@kbn/elastic-assistant-common';
import type { AttackDiscoveryDatasetExample } from '../types';
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

export const AUDIT_INPUT_VARIANTS: readonly AuditInputVariant[] = [
  'baseline',
  'enriched',
  'enriched_context',
];

/** `<scenario>.<variant>`: the example name, and the example id on stored score rows. */
export const getAuditExampleName = (scenarioId: string, variant: AuditInputVariant): string =>
  `${scenarioId}.${variant}`;

type RenderVariant = 'baseline' | 'enriched';
/** Keyed on the scenario object, so a scenario that reuses a registered id never gets a stale rendering. */
const renderCache = new WeakMap<AuditScenario, Map<RenderVariant, RenderedAlerts>>();

/**
 * Product-style anonymized alerts and the token replacements for one scenario and variant.
 * Deterministic: the same scenario and variant always yield the same tokens. `enriched` and
 * `enriched_context` share one rendering, so they differ only in the additional context.
 */
export const getAuditRendering = (
  scenario: AuditScenario,
  variant: AuditInputVariant
): RenderedAlerts => {
  const renderVariant: RenderVariant = variant === 'baseline' ? 'baseline' : 'enriched';
  const byVariant = renderCache.get(scenario) ?? new Map<RenderVariant, RenderedAlerts>();
  renderCache.set(scenario, byVariant);
  const cached = byVariant.get(renderVariant);
  if (cached) return cached;
  const rendered = renderAlerts(
    scenario.alerts,
    renderVariant,
    getAnonymizationSeed(scenario.id, renderVariant)
  );
  byVariant.set(renderVariant, rendered);
  return rendered;
};

/**
 * The gold that applies to one variant: the scenario gold with the recall target
 * (`requiredGroup` / `requiredAnyOf`) replaced by the variant override, when there is one.
 */
export const getGoldForVariant = (gold: AuditGold, variant: AuditInputVariant): AuditGold => {
  const { variantOverrides, requiredGroup, requiredAnyOf, ...rest } = gold;
  const target = variantOverrides?.[variant] ?? { requiredGroup, requiredAnyOf };
  return {
    ...rest,
    ...(target.requiredGroup !== undefined ? { requiredGroup: target.requiredGroup } : {}),
    ...(target.requiredAnyOf !== undefined ? { requiredAnyOf: target.requiredAnyOf } : {}),
  };
};

/**
 * Throws when a scenario's gold is malformed: groups must partition the scenario's alerts, every
 * group named by the gold must exist, a forbidden pair is two distinct groups, and the recall
 * target is declared exactly when discoveries are expected (for the base gold and each override).
 */
export const validateGold = (scenario: AuditScenario): void => {
  const { id, alerts, gold } = scenario;
  const fail = (message: string): never => {
    throw new Error(`Invalid gold for scenario "${id}": ${message}`);
  };
  const alertIds = new Set(alerts.map((alert) => alert.id));
  if (alertIds.size !== alerts.length) fail('alert ids are not unique');
  const groups = Object.keys(gold.alertGroups);
  const grouped = Object.values(gold.alertGroups).flat();
  grouped.forEach((alertId) => {
    if (!alertIds.has(alertId)) fail(`alert id "${alertId}" is in a group but not in the alerts`);
  });
  if (new Set(grouped).size !== grouped.length) fail('an alert id is in more than one group');
  if (grouped.length !== alerts.length) fail('every alert must belong to a group');
  Object.entries(gold.alertGroups).forEach(([group, ids]) => {
    if (ids.length === 0) fail(`group "${group}" is empty`);
  });

  const requireGroup = (group: string, where: string): void => {
    if (!groups.includes(group)) fail(`${where} names unknown group "${group}"`);
  };
  gold.forbiddenCoCitation.forEach((pair) => {
    if (pair.length !== 2 || pair[0] === pair[1]) {
      fail(`forbiddenCoCitation needs two distinct groups, got ${JSON.stringify(pair)}`);
    }
    pair.forEach((group) => requireGroup(group, 'forbiddenCoCitation'));
  });
  gold.confirmedGroups.forEach((group) => requireGroup(group, 'confirmedGroups'));
  (gold.metaAlertGroups ?? []).forEach((group) => requireGroup(group, 'metaAlertGroups'));

  const overrides = Object.entries(gold.variantOverrides ?? {});
  [{ where: 'gold', target: gold as Pick<AuditGold, 'requiredGroup' | 'requiredAnyOf'> }]
    .concat(
      overrides.map(([variant, target]) => ({ where: `variantOverrides.${variant}`, target }))
    )
    .forEach(({ where, target }) => {
      if (target.requiredGroup !== undefined) {
        requireGroup(target.requiredGroup, `${where}.requiredGroup`);
      }
      (target.requiredAnyOf ?? []).forEach((group) =>
        requireGroup(group, `${where}.requiredAnyOf`)
      );
      if (target.requiredGroup !== undefined && target.requiredAnyOf !== undefined) {
        fail(`${where} sets both requiredGroup and requiredAnyOf`);
      }
    });

  AUDIT_INPUT_VARIANTS.forEach((variant) => {
    const effective = getGoldForVariant(gold, variant);
    const hasTarget =
      effective.requiredGroup !== undefined || (effective.requiredAnyOf ?? []).length > 0;
    if (hasTarget !== (gold.expectedDiscoveries === 'atLeastOne')) {
      fail(
        `variant "${variant}" must declare a recall target exactly when discoveries are expected`
      );
    }
  });
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
  const variant = inputVariant as AuditInputVariant;
  return {
    gold: getGoldForVariant(scenario.gold, variant),
    replacements: getAuditRendering(scenario, variant).replacements,
  };
};

/**
 * One example per scenario x input variant, so each model is scored per variant. Validates each
 * scenario's gold first, so a malformed scenario fails when the dataset is built.
 */
export const buildAuditExamples = (
  scenarios: readonly AuditScenario[] = AUDIT_SCENARIOS
): AttackDiscoveryDatasetExample[] =>
  scenarios.flatMap((scenario) => {
    validateGold(scenario);
    return AUDIT_INPUT_VARIANTS.map((inputVariant): AttackDiscoveryDatasetExample => {
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
          ...(inputVariant === 'enriched_context'
            ? { additionalContext: scenario.operatorContext }
            : {}),
        },
        output: { attackDiscoveries: [] },
        metadata,
      };
    });
  });
