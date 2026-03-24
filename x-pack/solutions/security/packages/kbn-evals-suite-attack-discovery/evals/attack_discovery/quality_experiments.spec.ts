/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import Fs from 'fs/promises';
import Path from 'path';
import { evaluate } from '../../src/evaluate';
import { runAttackDiscovery } from '../../src/task/run_attack_discovery';
import type { AnonymizedAlert, AttackDiscoveryTaskOutput, RoundMetrics } from '../../src/types';

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

const qualityEvaluators = [
  {
    name: 'InsightCount',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.insights?.length ?? 0,
      explanation: `${output?.insights?.length ?? 0} insights`,
    }),
  },
  {
    name: 'AvgAlertIdsPerInsight',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => {
      const insights = output?.insights ?? [];
      if (insights.length === 0) return { score: 0 };
      const total = insights.reduce((s, i) => s + (i.alertIds?.length ?? 0), 0);
      return { score: total / insights.length, explanation: `${total} IDs / ${insights.length} insights` };
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
    name: 'LatencySeconds',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.metadata?.latency?.durationMs
        ? output.metadata.latency.durationMs / 1000
        : 999,
    }),
  },
  {
    name: 'RoundsCompleted',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.rounds?.length ?? 0,
    }),
  },
];

evaluate.describe('AD Quality Experiments', { tag: tags.stateful.classic }, () => {
  // ─── Experiment A: Granular prompt with current batch size ───
  evaluate(
    'experiment-A: granular prompt, 50 alerts/round',
    async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
      const alerts = await fetchAlerts(attackDiscoveryClient, log);
      if (alerts.length === 0) { log.warning('No alerts'); return; }

      // Override the prompt in the task runner via env var
      process.env.ATTACK_DISCOVERY_PROMPT_OVERRIDE = Path.resolve(
        __dirname,
        '../../src/prompts/attack_discovery_granular_prompt.text'
      );

      try {
        await executorClient.runExperiment(
          {
            dataset: {
              name: 'experiment-A-granular-prompt-50',
              description: `Granular prompt, 50/round, ${alerts.length} alerts`,
              examples: [{
                input: {
                  mode: 'incrementalProgressive' as const,
                  anonymizedAlerts: alerts,
                  alertsPerRound: 50,
                  maxRounds: 10,
                },
                output: { attackDiscoveries: [] },
              }],
            },
            task: async ({ input }) =>
              runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
          },
          qualityEvaluators
        );
      } finally {
        delete process.env.ATTACK_DISCOVERY_PROMPT_OVERRIDE;
      }
    }
  );

  // ─── Experiment B: Default prompt with smaller batch ───
  evaluate(
    'experiment-B: default prompt, 25 alerts/round',
    async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
      const alerts = await fetchAlerts(attackDiscoveryClient, log);
      if (alerts.length === 0) { log.warning('No alerts'); return; }

      await executorClient.runExperiment(
        {
          dataset: {
            name: 'experiment-B-default-prompt-25',
            description: `Default prompt, 25/round, ${alerts.length} alerts`,
            examples: [{
              input: {
                mode: 'incrementalProgressive' as const,
                anonymizedAlerts: alerts,
                alertsPerRound: 25,
                maxRounds: 10,
              },
              output: { attackDiscoveries: [] },
            }],
          },
          task: async ({ input }) =>
            runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
        },
        qualityEvaluators
      );
    }
  );

  // ─── Experiment C: Granular prompt with smaller batch ───
  evaluate(
    'experiment-C: granular prompt, 25 alerts/round',
    async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
      const alerts = await fetchAlerts(attackDiscoveryClient, log);
      if (alerts.length === 0) { log.warning('No alerts'); return; }

      process.env.ATTACK_DISCOVERY_PROMPT_OVERRIDE = Path.resolve(
        __dirname,
        '../../src/prompts/attack_discovery_granular_prompt.text'
      );

      try {
        await executorClient.runExperiment(
          {
            dataset: {
              name: 'experiment-C-granular-prompt-25',
              description: `Granular prompt + smaller batch, ${alerts.length} alerts`,
              examples: [{
                input: {
                  mode: 'incrementalProgressive' as const,
                  anonymizedAlerts: alerts,
                  alertsPerRound: 25,
                  maxRounds: 10,
                },
                output: { attackDiscoveries: [] },
              }],
            },
            task: async ({ input }) =>
              runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
          },
          qualityEvaluators
        );
      } finally {
        delete process.env.ATTACK_DISCOVERY_PROMPT_OVERRIDE;
      }
    }
  );
});
