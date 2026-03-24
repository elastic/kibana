/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { runAttackDiscovery } from '../../src/task/run_attack_discovery';

evaluate.describe('Incremental Attack Discovery', { tag: tags.stateful.classic }, () => {
  evaluate(
    'progressive 200 alerts in rounds of 50',
    async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
      // Fetch real alerts — try insights-alerts first (load_attack_discovery_data), then default
      let alerts = await attackDiscoveryClient.searchAlertsAsContext({
        alertsIndexPattern: 'insights-alerts-*',
        size: 200,
        start: 'now-365d',
      });
      if (alerts.length === 0) {
        alerts = await attackDiscoveryClient.searchAlertsAsContext({ size: 200 });
      }

      if (alerts.length === 0) {
        log.warning('No alerts found in cluster — skipping incremental eval');
        return;
      }

      log.info(`Loaded ${alerts.length} alerts for incremental progressive eval`);

      await executorClient.runExperiment(
        {
          dataset: {
            name: 'incremental-progressive-real-llm',
            description: `Progressive incremental AD: ${alerts.length} alerts, 50/round`,
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
          task: async ({ input }) => {
            return runAttackDiscovery({
              inferenceClient,
              attackDiscoveryClient,
              input,
              log,
            });
          },
        },
        [
          {
            name: 'ProducedInsights',
            kind: 'CODE',
            evaluate: async ({ output }) => ({
              score: output?.insights && output.insights.length > 0 ? 1 : 0,
              explanation: `${output?.insights?.length ?? 0} insights produced`,
            }),
          },
          {
            name: 'ContextBudgetPerRound',
            kind: 'CODE',
            evaluate: async ({ output }) => {
              if (!output?.rounds?.length) {
                return { score: 0, explanation: 'No round data' };
              }
              const maxTokens = Math.max(
                ...output.rounds.map((r) => r.inputTokens + r.outputTokens)
              );
              return {
                score: maxTokens <= 32000 ? 1 : 0,
                explanation: `Max round tokens: ${maxTokens} (limit: 32K)`,
              };
            },
          },
          {
            name: 'RoundsCompleted',
            kind: 'CODE',
            evaluate: async ({ output }) => {
              const roundCount = output?.rounds?.length ?? 0;
              return {
                score: roundCount,
                explanation: `${roundCount} rounds completed`,
              };
            },
          },
          {
            name: 'TokenReductionRatio',
            kind: 'CODE',
            evaluate: async ({ output }) => {
              if (!output?.rounds?.length || output.rounds.length < 2) {
                return { score: 0, explanation: 'Need >= 2 rounds to measure reduction' };
              }
              const maxRoundInput = Math.max(...output.rounds.map((r) => r.inputTokens));
              const totalInput = output.rounds.reduce((s, r) => s + r.inputTokens, 0);
              const reduction = 1 - maxRoundInput / totalInput;
              return {
                score: reduction,
                explanation: `Max round: ${maxRoundInput}, total: ${totalInput}, reduction: ${(reduction * 100).toFixed(1)}%`,
              };
            },
          },
          {
            name: 'TotalLatencySeconds',
            kind: 'CODE',
            evaluate: async ({ output }) => ({
              score: output?.metadata?.latency?.durationMs
                ? output.metadata.latency.durationMs / 1000
                : 999,
            }),
          },
          {
            name: 'TotalTokens',
            kind: 'CODE',
            evaluate: async ({ output }) => ({
              score: output?.metadata?.tokens?.totalTokens ?? 0,
            }),
          },
        ]
      );
    }
  );
});
