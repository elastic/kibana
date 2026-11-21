/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AlertDraft,
  type AuditScenario,
  defineAlerts,
  positiveChainWithNoiseScenario,
  sharedCiEgressScenario,
} from '@kbn/evals-suite-attack-discovery';

export const POSITIVE_CHAIN_LARGE_BATCH_SCENARIO_ID = 'positive-chain-large-batch';

/** Generation batch size the runner is started with for this scenario (the runner's minimum). */
export const LARGE_BATCH_SIZE = 50;

/** The runner's `max_alerts` for this scenario: its maximum, a full day, above the 106 seeded alerts. */
export const LARGE_BATCH_MAX_ALERTS = 10_000;

const CHAIN_GROUP = 'clickfix-chain';
/** How many times the shared-egress noise is repeated: 6 alerts each, so 102 noise alerts. */
const NOISE_REPEATS = 17;
const NOISE_STEP_MS = 3 * 60_000;

const groupOf = (alertId: string, alertGroups: Readonly<Record<string, readonly string[]>>) =>
  Object.keys(alertGroups).find((group) => alertGroups[group].includes(alertId));

const shiftTime = (time: string | number | undefined, offsetMs: number): string =>
  new Date(Date.parse(String(time)) + offsetMs).toISOString();

const SOURCE_GROUPS = positiveChainWithNoiseScenario.gold.alertGroups;

/** The four chain alerts, taken as they are from the single-batch scenario so the two cannot drift. */
const chainDrafts: AlertDraft[] = positiveChainWithNoiseScenario.alerts
  .filter(({ id }) => groupOf(id, SOURCE_GROUPS) === CHAIN_GROUP)
  .map(({ fields }, index) => ({ key: `chain-${index}`, group: CHAIN_GROUP, fields }));

/** The benign shared-egress alerts, repeated with shifted times so each repeat is a distinct alert. */
const noiseDrafts: AlertDraft[] = positiveChainWithNoiseScenario.alerts.flatMap(
  ({ id, fields }, index) => {
    const group = groupOf(id, SOURCE_GROUPS);
    if (!group || group === CHAIN_GROUP) return [];
    return Array.from({ length: NOISE_REPEATS }, (_, repeat) => ({
      key: `noise-${index}-${repeat}`,
      group,
      fields: { ...fields, '@timestamp': shiftTime(fields['@timestamp'], repeat * NOISE_STEP_MS) },
    }));
  }
);

const { alerts, alertGroups } = defineAlerts(POSITIVE_CHAIN_LARGE_BATCH_SCENARIO_ID, [
  ...chainDrafts,
  ...noiseDrafts,
]);

const NOISE_GROUPS = Object.keys(sharedCiEgressScenario.gold.alertGroups);

/**
 * Positive control at scale: the `positive-chain-with-noise` chain among 100+ benign alerts, so
 * generation runs more than one batch at `LARGE_BATCH_SIZE`. Gold and world match that scenario;
 * the chain must survive the batch split and the merge.
 */
export const positiveChainLargeBatchScenario: AuditScenario = {
  id: POSITIVE_CHAIN_LARGE_BATCH_SCENARIO_ID,
  description:
    'Positive control at scale: a ClickFix-style endpoint chain among 100+ unrelated shared-egress cloud alerts, generated in batches of 50.',
  provenance: 'authored',
  alerts,
  operatorContext: positiveChainWithNoiseScenario.operatorContext,
  gold: {
    alertGroups,
    forbiddenCoCitation: NOISE_GROUPS.map((group) => [CHAIN_GROUP, group] as const),
    expectedDiscoveries: 'atLeastOne',
    requiredGroup: CHAIN_GROUP,
    confirmedGroups: [CHAIN_GROUP],
  },
};
