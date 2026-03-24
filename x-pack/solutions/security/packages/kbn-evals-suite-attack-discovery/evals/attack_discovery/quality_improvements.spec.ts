/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// NOTE: When running multiple specs in one suite, set KBN_EVALS_SKIP_CONNECTOR_SETUP=true
// and pre-create connectors, to avoid UUID mismatch after connector recreation.

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { runAttackDiscovery } from '../../src/task/run_attack_discovery';
import type { AnonymizedAlert, AttackDiscoveryTaskOutput } from '../../src/types';

const fetchAlerts = async (client: any, log: any): Promise<AnonymizedAlert[]> => {
  let alerts = await client.searchAlertsAsContext({
    alertsIndexPattern: 'insights-alerts-*',
    size: 100,
    start: 'now-365d',
  });
  if (alerts.length === 0) {
    alerts = await client.searchAlertsAsContext({ size: 100 });
  }
  log.info(`Fetched ${alerts.length} alerts`);
  return alerts;
};

const evaluators = [
  {
    name: 'InsightCount',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.insights?.length ?? 0,
    }),
  },
  {
    name: 'AvgAlertIds',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => {
      const ins = output?.insights ?? [];
      if (ins.length === 0) return { score: 0 };
      return { score: ins.reduce((s, i) => s + (i.alertIds?.length ?? 0), 0) / ins.length };
    },
  },
  {
    name: 'TotalTokens',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.metadata?.tokens?.totalTokens ?? 0,
    }),
  },
  {
    name: 'Latency',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.metadata?.latency?.durationMs ? output.metadata.latency.durationMs / 1000 : 999,
    }),
  },
  {
    name: 'Rounds',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.rounds?.length ?? 0,
    }),
  },
];

const makeInput = (alerts: AnonymizedAlert[], opts: Record<string, boolean>) => ({
  mode: 'incrementalProgressive' as const,
  anonymizedAlerts: alerts,
  alertsPerRound: 25,
  maxRounds: 10,
  qualityOptions: opts,
});

evaluate.describe('Quality Improvements A/B', { tag: tags.stateful.classic }, () => {
  // Baseline: no improvements, 25/round
  evaluate('baseline: 25/round, no improvements', async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
    const alerts = await fetchAlerts(attackDiscoveryClient, log);
    if (!alerts.length) return;
    await executorClient.runExperiment({
      dataset: { name: 'qi-baseline', description: 'Baseline 25/round', examples: [{ input: makeInput(alerts, {}), output: { attackDiscoveries: [] } }] },
      task: async ({ input }) => runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
    }, evaluators);
  });

  // #1: Synthesis pass only
  evaluate('improvement-1: synthesis pass', async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
    const alerts = await fetchAlerts(attackDiscoveryClient, log);
    if (!alerts.length) return;
    await executorClient.runExperiment({
      dataset: { name: 'qi-synthesis', description: 'With synthesis pass', examples: [{ input: makeInput(alerts, { synthesisPass: true }), output: { attackDiscoveries: [] } }] },
      task: async ({ input }) => runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
    }, evaluators);
  });

  // #2: Alert clustering only
  evaluate('improvement-2: alert clustering', async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
    const alerts = await fetchAlerts(attackDiscoveryClient, log);
    if (!alerts.length) return;
    await executorClient.runExperiment({
      dataset: { name: 'qi-clustering', description: 'With alert clustering', examples: [{ input: makeInput(alerts, { clusterAlerts: true }), output: { attackDiscoveries: [] } }] },
      task: async ({ input }) => runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
    }, evaluators);
  });

  // #3: Progressive context only
  evaluate('improvement-3: progressive context', async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
    const alerts = await fetchAlerts(attackDiscoveryClient, log);
    if (!alerts.length) return;
    await executorClient.runExperiment({
      dataset: { name: 'qi-progressive-ctx', description: 'With progressive context', examples: [{ input: makeInput(alerts, { progressiveContext: true }), output: { attackDiscoveries: [] } }] },
      task: async ({ input }) => runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
    }, evaluators);
  });

  // #4: Adaptive batch size only
  evaluate('improvement-4: adaptive batch', async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
    const alerts = await fetchAlerts(attackDiscoveryClient, log);
    if (!alerts.length) return;
    await executorClient.runExperiment({
      dataset: { name: 'qi-adaptive', description: 'With adaptive batch size', examples: [{ input: makeInput(alerts, { adaptiveBatchSize: true }), output: { attackDiscoveries: [] } }] },
      task: async ({ input }) => runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
    }, evaluators);
  });

  // All improvements combined
  evaluate('all-improvements: combined', async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
    const alerts = await fetchAlerts(attackDiscoveryClient, log);
    if (!alerts.length) return;
    await executorClient.runExperiment({
      dataset: { name: 'qi-all', description: 'All improvements', examples: [{ input: makeInput(alerts, { synthesisPass: true, clusterAlerts: true, progressiveContext: true, adaptiveBatchSize: true }), output: { attackDiscoveries: [] } }] },
      task: async ({ input }) => runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
    }, evaluators);
  });
});
