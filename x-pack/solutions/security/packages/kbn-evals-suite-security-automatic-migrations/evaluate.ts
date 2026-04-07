/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReportDisplayOptions, EvaluationDataset } from '@kbn/evals';
import { evaluate as base, createDefaultTerminalReporter } from '@kbn/evals';
import { DashboardMigrationClient } from './src/dashboards/migration_client';
import {
  createEvaluateDataset,
  getDatasetSkipSummaries,
  clearDatasetSkipSummaries,
  formatEvalSummary,
} from './src/dashboards/evaluate_dataset';
import type { DashboardExample } from './datasets/dashboards/types';

type EvaluateDatasetFn = (args: { dataset: EvaluationDataset<DashboardExample> }) => Promise<void>;

interface WorkerFixtures {
  migrationClient: DashboardMigrationClient;
  evaluateDataset: EvaluateDatasetFn;
  reportDisplayOptions: ReportDisplayOptions;
  reportModelScore: ReturnType<typeof createDefaultTerminalReporter>;
}

export const evaluate = base.extend<{}, WorkerFixtures>({
  migrationClient: [
    async ({ fetch, log }, use) => {
      await use(new DashboardMigrationClient(fetch, log));
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    async ({ evaluators, executorClient, migrationClient, log, connector }, use) => {
      await use(
        createEvaluateDataset({
          evaluators,
          executorClient,
          migrationClient,
          log,
          connectorId: connector.id,
        })
      );
    },
    { scope: 'worker' },
  ],
  reportDisplayOptions: [
    async ({ evaluators }, use) => {
      const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
        evaluators.traceBasedEvaluators;

      const evaluatorDisplayOptions: ReportDisplayOptions['evaluatorDisplayOptions'] = new Map([
        [inputTokens.name, { decimalPlaces: 1, statsToInclude: ['mean', 'median'] }],
        [outputTokens.name, { decimalPlaces: 1, statsToInclude: ['mean', 'median'] }],
        [cachedTokens.name, { decimalPlaces: 1, statsToInclude: ['mean', 'median'] }],
        [toolCalls.name, { decimalPlaces: 1, statsToInclude: ['mean', 'median'] }],
        [latency.name, { unitSuffix: 's', statsToInclude: ['mean', 'median'] }],
        ['Lookup Join Presence', { statsToInclude: ['mean'] }],
        ['ES|QL Syntax Validity', { statsToInclude: ['mean'] }],
        ['Markdown Error Detection', { statsToInclude: ['mean'] }],
        ['Panel Count Preservation', { statsToInclude: ['mean'] }],
        ['Translation Completeness', { statsToInclude: ['mean'] }],
        ['Index Pattern Validity', { statsToInclude: ['mean'] }],
        ['translation_fidelity', { statsToInclude: ['mean'] }],
      ]);

      await use({
        evaluatorDisplayOptions,
        evaluatorDisplayGroups: [
          {
            evaluatorNames: [inputTokens.name, outputTokens.name, cachedTokens.name],
            combinedColumnName: 'Tokens',
          },
          {
            evaluatorNames: [
              'ES|QL Syntax Validity',
              'Markdown Error Detection',
              'Panel Count Preservation',
              'Translation Completeness',
              'Index Pattern Validity',
            ],
            combinedColumnName: 'Structural Validity',
          },
          {
            evaluatorNames: ['Lookup Join Presence', 'translation_fidelity'],
            combinedColumnName: 'Translation Quality',
          },
        ],
      });
    },
    { scope: 'worker' },
  ],
  reportModelScore: [
    async ({ reportDisplayOptions }, use) => {
      const defaultReporter = createDefaultTerminalReporter({ reportDisplayOptions });
      await use(async (scoreRepository, runId, log, filter) => {
        await defaultReporter(scoreRepository, runId, log, filter);

        const evalSummary = formatEvalSummary(getDatasetSkipSummaries());
        if (evalSummary) {
          log.info(`\n${evalSummary}`);
        }
        clearDatasetSkipSummaries();
      });
    },
    { scope: 'worker' },
  ],
});
