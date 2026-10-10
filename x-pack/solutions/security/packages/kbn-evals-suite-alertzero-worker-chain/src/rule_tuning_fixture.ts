/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { randomUUID } from 'crypto';
import type { EsClient } from '@kbn/scout';
import { buildFpTpExampleWorld } from '@kbn/evals-suite-attack-discovery-fp-tp/src/scenarios';
import { seedFixture, type FpTpWorld } from '@kbn/evals-suite-attack-discovery-fp-tp/src/world';
import { kbnRequestFromFetch } from '@kbn/evals-suite-attack-discovery-fp-tp/src/kbn_request';
import type { ChainScenario } from './chain_runner';
import { runRuleTuningScenario, type RuleTuningScenarioInput } from './rule_tuning_scenario';
import { spacePath, type KbnRequestContext } from './worker_settings';

export type TuningFamily = 'encoded-powershell' | 'mimicrat-clickfix';

export const buildRuleTuningWorld = (
  family: TuningFamily,
  suffix: string,
  ruleId: string,
  ruleRevision = 0
): FpTpWorld => {
  const fpId = family === 'encoded-powershell' ? `${family}.fp` : `${family}.fp-benign-mimic`;
  const fp = buildFpTpExampleWorld(fpId, `${suffix}-fp`);
  const tp = buildFpTpExampleWorld(`${family}.tp`, `${suffix}-tp`);
  const alert = (source: Record<string, unknown>, id: string, falsePositive: boolean) => ({
    id,
    source: {
      ...source,
      'kibana.alert.uuid': id,
      'kibana.alert.rule.uuid': ruleId,
      'kibana.alert.rule.rule_id': ruleId,
      // The sweep only fans out a rule whose alerts carry its current revision.
      'kibana.alert.rule.revision': ruleRevision,
      'kibana.alert.rule.name': `Rule Tuning TP control ${suffix}`,
      'kibana.alert.workflow_status': falsePositive ? 'closed' : 'open',
      'kibana.alert.workflow_reason': falsePositive ? 'false_positive' : 'true_positive',
      'kibana.alert.workflow_tags': [],
    },
  });
  const fpSource = fp.alerts[0]?.source;
  const tpSource = tp.alerts[0]?.source;
  if (!fpSource || !tpSource) throw new Error(`Missing FP/TP alerts for ${family}`);
  return {
    attackId: `tuning-${suffix}`,
    alerts: [
      ...Array.from({ length: 12 }, (_, i) => alert(fpSource, `tuning-${suffix}-fp-${i}`, true)),
      alert(tpSource, `tuning-${suffix}-tp`, false),
    ],
    events: [...fp.events, ...tp.events],
    entities: [...fp.entities, ...tp.entities],
  };
};

/**
 * The operator dispatches the per-space Rule Tuning worker and the product's own sweep
 * launches the review, so the review runs as the worker service account. The harness
 * never triggers the review with the worker's credential.
 */
export const runSeededRuleTuningScenario = async ({
  operator,
  esClient,
  family,
  ...input
}: Omit<RuleTuningScenarioInput, 'ruleId' | 'alertIds'> & {
  operator: KbnRequestContext;
  esClient: EsClient;
  family: TuningFamily;
}) => {
  // seedFixture owns the default-space alert index; do not pretend it is space-aware.
  if (operator.spaceId !== 'default') {
    throw new Error('Seeded Rule Tuning requires a dedicated default-space stack');
  }
  const suffix = randomUUID();
  const { id: ruleId, revision } = await operator.fetch<{ id: string; revision: number }>(
    '/api/detection_engine/rules',
    {
      method: 'POST',
      version: '2023-10-31',
      headers: { 'elastic-api-version': '2023-10-31', 'kbn-xsrf': 'true' },
      body: JSON.stringify({
        rule_id: `tuning-${suffix}`,
        name: `Rule Tuning TP control ${suffix}`,
        description: 'Isolated FP/TP tuning control',
        type: 'query',
        language: 'kuery',
        // Enabled so the sweep will review it; matches nothing so it adds no alerts of its own.
        query: 'process.name:__alertzero_rule_tuning_control_never_matches__',
        index: ['logs-*'],
        severity: 'medium',
        risk_score: 47,
        enabled: true,
        interval: '5m',
        from: 'now-10m',
      }),
    }
  );
  let cleanup: (() => Promise<void>) | undefined;
  try {
    const world = buildRuleTuningWorld(family, suffix, ruleId, revision);
    const seeded = await seedFixture({
      esClient,
      kbnRequest: kbnRequestFromFetch(operator.fetch),
      world,
    });
    cleanup = seeded.cleanup;
    const scenario: ChainScenario = {
      key: `rule-tuning-${family}-${input.autonomy}`,
      workerChain: ['rule-tuning'],
      declaredAutonomy: { 'rule-tuning': input.autonomy },
      alerts: seeded.seededWorld.alerts.map(({ id }) => ({ id })),
      rule: { id: ruleId, name: `Rule Tuning TP control ${suffix}` },
      tpRuleIds: [ruleId],
      goldVerdict: 'true_positive',
    };
    const record = await runRuleTuningScenario(operator, {
      ...input,
      ruleId: scenario.rule.id,
      alertIds: scenario.alerts.map(({ id }) => id),
    });
    return { ...record, scenarioKey: scenario.key, tpRuleIds: scenario.tpRuleIds };
  } finally {
    try {
      await cleanup?.();
    } finally {
      await operator.fetch(spacePath(operator.spaceId, '/api/detection_engine/rules'), {
        method: 'DELETE',
        version: '2023-10-31',
        headers: { 'elastic-api-version': '2023-10-31', 'kbn-xsrf': 'true' },
        query: { id: ruleId },
      });
    }
  }
};
