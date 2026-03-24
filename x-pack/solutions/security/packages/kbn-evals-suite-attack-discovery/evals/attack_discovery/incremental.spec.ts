/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { runAttackDiscovery } from '../../src/task/run_attack_discovery';
import type { AnonymizedAlert, AttackDiscoveryTaskOutput, RoundMetrics } from '../../src/types';

const fetchAlerts = async (attackDiscoveryClient: any, log: any): Promise<AnonymizedAlert[]> => {
  let alerts = await attackDiscoveryClient.searchAlertsAsContext({
    alertsIndexPattern: 'insights-alerts-*',
    size: 200,
    start: 'now-365d',
  });
  if (alerts.length === 0) {
    alerts = await attackDiscoveryClient.searchAlertsAsContext({ size: 200 });
  }
  log.info(`Fetched ${alerts.length} alerts`);
  return alerts;
};

const commonEvaluators = [
  {
    name: 'ProducedInsights',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.insights && output.insights.length > 0 ? 1 : 0,
      explanation: `${output?.insights?.length ?? 0} insights produced`,
    }),
  },
  {
    name: 'ContextBudgetPerRound',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => {
      if (!output?.rounds?.length) return { score: 0, explanation: 'No round data' };
      const maxTokens = Math.max(
        ...output.rounds.map((r: RoundMetrics) => r.inputTokens + r.outputTokens)
      );
      return {
        score: maxTokens <= 32000 ? 1 : 0,
        explanation: `Max round tokens: ${maxTokens} (limit: 32K)`,
      };
    },
  },
  {
    name: 'RoundsCompleted',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.rounds?.length ?? 0,
      explanation: `${output?.rounds?.length ?? 0} rounds completed`,
    }),
  },
  {
    name: 'TokenReductionRatio',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => {
      if (!output?.rounds?.length || output.rounds.length < 2) {
        return { score: 0, explanation: 'Need >= 2 rounds to measure reduction' };
      }
      const maxRoundInput = Math.max(
        ...output.rounds.map((r: RoundMetrics) => r.inputTokens)
      );
      const totalInput = output.rounds.reduce(
        (s: number, r: RoundMetrics) => s + r.inputTokens,
        0
      );
      const reduction = 1 - maxRoundInput / totalInput;
      return {
        score: reduction,
        explanation: `Max round: ${maxRoundInput}, total: ${totalInput}, reduction: ${(reduction * 100).toFixed(1)}%`,
      };
    },
  },
  {
    name: 'TotalLatencySeconds',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.metadata?.latency?.durationMs
        ? output.metadata.latency.durationMs / 1000
        : 999,
    }),
  },
  {
    name: 'TotalTokens',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
      score: output?.metadata?.tokens?.totalTokens ?? 0,
    }),
  },
];

evaluate.describe('Incremental Attack Discovery', { tag: tags.stateful.classic }, () => {
  // ─── Progressive Mode ───
  evaluate(
    'progressive: all alerts in rounds of 50',
    async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
      const alerts = await fetchAlerts(attackDiscoveryClient, log);
      if (alerts.length === 0) {
        log.warning('No alerts — skipping');
        return;
      }

      await executorClient.runExperiment(
        {
          dataset: {
            name: 'incremental-progressive-real-llm',
            description: `Progressive: ${alerts.length} alerts, 50/round`,
            examples: [
              {
                input: {
                  mode: 'incrementalProgressive' as const,
                  anonymizedAlerts: alerts,
                  alertsPerRound: 50,
                  maxRounds: 10,
                },
                output: { attackDiscoveries: [] },
              },
            ],
          },
          task: async ({ input }) =>
            runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
        },
        commonEvaluators
      );
    }
  );

  // ─── Delta Mode — Initial Run ───
  evaluate(
    'delta: initial run processes all alerts',
    async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
      const alerts = await fetchAlerts(attackDiscoveryClient, log);
      if (alerts.length === 0) {
        log.warning('No alerts — skipping');
        return;
      }

      await executorClient.runExperiment(
        {
          dataset: {
            name: 'incremental-delta-initial',
            description: `Delta initial: ${alerts.length} total, 0 previously processed`,
            examples: [
              {
                input: {
                  mode: 'incrementalDelta' as const,
                  anonymizedAlerts: alerts,
                  previouslyProcessedCount: 0,
                  alertsPerRound: 50,
                  maxRounds: 10,
                },
                output: { attackDiscoveries: [] },
              },
            ],
          },
          task: async ({ input }) =>
            runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
        },
        [
          ...commonEvaluators,
          {
            name: 'DeltaProcessedAll',
            kind: 'CODE' as const,
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => {
              const totalProcessed = output?.rounds?.reduce(
                (s: number, r: RoundMetrics) => s + r.alertCount,
                0
              ) ?? 0;
              return {
                score: totalProcessed > 0 ? 1 : 0,
                explanation: `Processed ${totalProcessed} alerts (all are new on first run)`,
              };
            },
          },
        ]
      );
    }
  );

  // ─── Delta Mode — Incremental Run (only new alerts) ───
  evaluate(
    'delta: incremental run processes only new alerts',
    async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
      const alerts = await fetchAlerts(attackDiscoveryClient, log);
      if (alerts.length < 20) {
        log.warning('Not enough alerts for delta test — skipping');
        return;
      }

      // Simulate: 80% of alerts already processed, only 20% are new
      const previouslyProcessedCount = Math.floor(alerts.length * 0.8);
      const expectedDelta = alerts.length - previouslyProcessedCount;
      log.info(
        `Delta test: ${alerts.length} total, ${previouslyProcessedCount} processed, ${expectedDelta} new`
      );

      await executorClient.runExperiment(
        {
          dataset: {
            name: 'incremental-delta-incremental',
            description: `Delta incremental: ${expectedDelta} new of ${alerts.length} total`,
            examples: [
              {
                input: {
                  mode: 'incrementalDelta' as const,
                  anonymizedAlerts: alerts,
                  previouslyProcessedCount,
                  alertsPerRound: 50,
                  maxRounds: 10,
                },
                output: { attackDiscoveries: [] },
              },
            ],
          },
          task: async ({ input }) =>
            runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
        },
        [
          ...commonEvaluators,
          {
            name: 'DeltaEfficiency',
            kind: 'CODE' as const,
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => {
              const totalProcessed = output?.rounds?.reduce(
                (s: number, r: RoundMetrics) => s + r.alertCount,
                0
              ) ?? 0;
              // Score = efficiency (should process ~20% of alerts, not 100%)
              const efficiency = 1 - totalProcessed / alerts.length;
              return {
                score: efficiency,
                explanation: `Processed ${totalProcessed}/${alerts.length} alerts (${(efficiency * 100).toFixed(0)}% skipped as already processed)`,
              };
            },
          },
        ]
      );
    }
  );
});
