/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '../src/evaluate';
import { createCanaryEvaluators, createEvaluateDataset } from '../src/evaluators/dataset_evaluator';
import { collectHuntArtifacts } from '../src/collect';
import { HUNT_A_SPACE_ID, HUNT_B_SPACE_ID, SPACE_REPORT_IDS } from '../src/constants';
import { resetHuntReport } from '../src/seed_hunt_data';
import { goldenDataset } from '../datasets/golden';
import { hardCases } from '../datasets/hard_cases';
import { canaryDataset } from '../datasets/canary';

evaluate.describe('Hunt Watch Worker', { tag: tags.serverless.security.complete }, () => {
  const datasets = [
    { key: 'golden', name: 'hunt-watch: golden', examples: goldenDataset },
    { key: 'hard', name: 'hunt-watch: hard cases', examples: hardCases },
    { key: 'canary', name: 'hunt-watch: canary', examples: canaryDataset },
  ] as const;

  for (const { key, name, examples } of datasets) {
    evaluate(
      `scores the ${key} cohort`,
      async ({
        huntWatchClient,
        evaluators,
        executorClient,
        esClient,
        fetch,
        log,
        evaluationConnector,
      }) => {
        const evaluateDataset = createEvaluateDataset({
          huntWatchClient,
          evaluators,
          executorClient,
          esClient,
          fetch,
          log,
          judge: {
            judgeConnectorId: evaluationConnector.id,
            judgeConnectorName: evaluationConnector.name,
          },
        });
        await evaluateDataset({
          dataset: {
            name,
            description: `Hunt Watch Worker: ${key} cohort`,
            examples: [...examples],
          },
          ...(key === 'canary' ? { evaluatorOverrides: createCanaryEvaluators() } : {}),
        });
      }
    );
  }

  evaluate(
    'keeps Investigations and Proposals inside the triggering space',
    async ({ huntWatchClient, esClient, fetch, log }) => {
      const runIn = async (spaceId: string, reportId: string) => {
        await resetHuntReport({ esClient, fetch, log, reportId, spaceId });
        const run = await huntWatchClient.run({ spaceId, reportIds: [reportId] });
        return collectHuntArtifacts({ run, reportIds: [reportId], fetch, esClient, log });
      };
      const a = await runIn(HUNT_A_SPACE_ID, SPACE_REPORT_IDS.spaceA);

      // Space B's report was never triggered: it must have no Investigation and no Proposals,
      // and space A's Investigation must not be visible from space B.
      const bUntouched = await collectHuntArtifacts({
        run: { ...(await huntWatchClient.run({ spaceId: HUNT_B_SPACE_ID, reportIds: [] })) },
        reportIds: [SPACE_REPORT_IDS.spaceB],
        fetch,
        esClient,
        log,
      });
      const bSeesA = await collectHuntArtifacts({
        run: { ...(await huntWatchClient.run({ spaceId: HUNT_B_SPACE_ID, reportIds: [] })) },
        reportIds: [SPACE_REPORT_IDS.spaceA],
        fetch,
        esClient,
        log,
      });

      const problems = [
        ...(a.reports[SPACE_REPORT_IDS.spaceA]?.conversation
          ? []
          : ['space A has no Investigation']),
        ...(bUntouched.reports[SPACE_REPORT_IDS.spaceB]?.conversation
          ? ['space B got an Investigation without being triggered']
          : []),
        ...(bSeesA.reports[SPACE_REPORT_IDS.spaceA]?.conversation
          ? ["space A's Investigation is visible from space B"]
          : []),
      ];
      if (problems.length > 0) throw new Error(problems.join('; '));
    }
  );
});
