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
import { createAttackDiscoveryBasicEvaluator } from '../../src/evaluators/attack_discovery_basic_evaluator';
import type { AnonymizedAlert, AttackDiscoveryTaskOutput, RoundMetrics } from '../../src/types';

const fetchAlerts = async (attackDiscoveryClient: any, log: any): Promise<AnonymizedAlert[]> => {
  let alerts = await attackDiscoveryClient.searchAlertsAsContext({
    alertsIndexPattern: 'insights-alerts-*',
    size: 100,
    start: 'now-365d',
  });
  if (alerts.length === 0) {
    alerts = await attackDiscoveryClient.searchAlertsAsContext({ size: 100 });
  }
  log.info(`Fetched ${alerts.length} alerts for quality comparison`);
  return alerts;
};

evaluate.describe('AD Quality Comparison', { tag: tags.stateful.classic }, () => {
  // ─── Baseline: Single-pass (standard mode) ───
  evaluate(
    'baseline: single-pass all alerts',
    async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
      const alerts = await fetchAlerts(attackDiscoveryClient, log);
      if (alerts.length === 0) {
        log.warning('No alerts — skipping');
        return;
      }

      await executorClient.runExperiment(
        {
          dataset: {
            name: 'quality-baseline-single-pass',
            description: `Single-pass (standard): ${alerts.length} alerts, no rounds`,
            examples: [
              {
                input: {
                  mode: 'bundledAlerts' as const,
                  anonymizedAlerts: alerts,
                },
                output: { attackDiscoveries: [] },
              },
            ],
          },
          task: async ({ input }) =>
            runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log }),
        },
        [
          createAttackDiscoveryBasicEvaluator(),
          {
            name: 'InsightCount',
            kind: 'CODE',
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
              score: output?.insights?.length ?? 0,
              explanation: `${output?.insights?.length ?? 0} insights generated`,
            }),
          },
          {
            name: 'TotalTokens',
            kind: 'CODE',
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
              score: output?.metadata?.tokens?.totalTokens ?? 0,
            }),
          },
          {
            name: 'LatencySeconds',
            kind: 'CODE',
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
              score: output?.metadata?.latency?.durationMs
                ? output.metadata.latency.durationMs / 1000
                : 999,
            }),
          },
          {
            name: 'AvgAlertIdsPerInsight',
            kind: 'CODE',
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => {
              const insights = output?.insights ?? [];
              if (insights.length === 0) return { score: 0, explanation: 'No insights' };
              const totalAlertIds = insights.reduce(
                (s, i) => s + (i.alertIds?.length ?? 0),
                0
              );
              const avg = totalAlertIds / insights.length;
              return {
                score: avg,
                explanation: `${totalAlertIds} alert IDs across ${insights.length} insights (avg ${avg.toFixed(1)}/insight)`,
              };
            },
          },
        ]
      );
    }
  );

  // ─── Incremental progressive with same alerts ───
  evaluate(
    'incremental: progressive rounds of 50',
    async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
      const alerts = await fetchAlerts(attackDiscoveryClient, log);
      if (alerts.length === 0) {
        log.warning('No alerts — skipping');
        return;
      }

      await executorClient.runExperiment(
        {
          dataset: {
            name: 'quality-incremental-progressive',
            description: `Incremental progressive: ${alerts.length} alerts, 50/round`,
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
        [
          createAttackDiscoveryBasicEvaluator(),
          {
            name: 'InsightCount',
            kind: 'CODE',
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
              score: output?.insights?.length ?? 0,
              explanation: `${output?.insights?.length ?? 0} insights generated`,
            }),
          },
          {
            name: 'TotalTokens',
            kind: 'CODE',
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
              score: output?.metadata?.tokens?.totalTokens ?? 0,
            }),
          },
          {
            name: 'LatencySeconds',
            kind: 'CODE',
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => ({
              score: output?.metadata?.latency?.durationMs
                ? output.metadata.latency.durationMs / 1000
                : 999,
            }),
          },
          {
            name: 'MaxRoundTokens',
            kind: 'CODE',
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => {
              if (!output?.rounds?.length) return { score: 0 };
              const maxTokens = Math.max(
                ...output.rounds.map((r: RoundMetrics) => r.inputTokens + r.outputTokens)
              );
              return {
                score: maxTokens,
                explanation: `Max round tokens: ${maxTokens}`,
              };
            },
          },
          {
            name: 'AvgAlertIdsPerInsight',
            kind: 'CODE',
            evaluate: async ({ output }: { output: AttackDiscoveryTaskOutput }) => {
              const insights = output?.insights ?? [];
              if (insights.length === 0) return { score: 0, explanation: 'No insights' };
              const totalAlertIds = insights.reduce(
                (s, i) => s + (i.alertIds?.length ?? 0),
                0
              );
              const avg = totalAlertIds / insights.length;
              return {
                score: avg,
                explanation: `${totalAlertIds} alert IDs across ${insights.length} insights (avg ${avg.toFixed(1)}/insight)`,
              };
            },
          },
        ]
      );
    }
  );
});
