/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '../src/evaluate';
import { createCanaryEvaluators, createEvaluateDataset } from '../src/evaluators/dataset_evaluator';
import { collectHuntArtifacts, getConversation } from '../src/collect';
import { HUNT_A_SPACE_ID, HUNT_B_SPACE_ID, SPACE_REPORT_IDS } from '../src/constants';
import { buildHuntInvestigationConversationId, resetHuntReport } from '../src/seed_hunt_data';
import { goldenDataset } from '../datasets/golden';
import { hardCases } from '../datasets/hard_cases';
import { canaryDataset } from '../datasets/canary';
import { holdoutDataset } from '../datasets/holdout';

evaluate.describe('Hunt Watch Worker', { tag: tags.serverless.security.complete }, () => {
  const datasets = [
    { key: 'golden', name: 'hunt-watch: golden', examples: goldenDataset },
    { key: 'hard', name: 'hunt-watch: hard cases', examples: hardCases },
    { key: 'canary', name: 'hunt-watch: canary', examples: canaryDataset },
    { key: 'holdout', name: 'hunt-watch: holdout', examples: holdoutDataset },
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
        config,
      }) => {
        // Holdout measures generalisation against the iteration cohorts, so it runs on demand,
        // not in the weekly step (see datasets/holdout.ts).
        evaluate.skip(
          key === 'holdout' && process.env.HUNT_WATCH_HOLDOUT !== '1',
          'holdout cohort runs only with HUNT_WATCH_HOLDOUT=1'
        );
        const evaluateDataset = createEvaluateDataset({
          huntWatchClient,
          evaluators,
          executorClient,
          esClient,
          fetch,
          log,
          kibanaUrl: config.hosts.kibana,
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
    'keeps Investigations inside the triggering space',
    async ({ huntWatchClient, esClient, fetch, log }) => {
      const reportId = SPACE_REPORT_IDS.spaceA;
      await resetHuntReport({ esClient, fetch, log, reportId, spaceId: HUNT_A_SPACE_ID });
      const run = await huntWatchClient.run({ spaceId: HUNT_A_SPACE_ID, reportIds: [reportId] });
      const a = await collectHuntArtifacts({ run, reportIds: [reportId], fetch, esClient, log });

      // Space B is never triggered here: its own copy must have no Investigation, and space A's
      // Investigation must not resolve from space B even though the report ids share a source.
      const conversationId = buildHuntInvestigationConversationId({
        spaceId: HUNT_A_SPACE_ID,
        reportId,
      });
      const [bOwn, bSeesA] = await Promise.all([
        getConversation({
          fetch,
          spaceId: HUNT_B_SPACE_ID,
          conversationId: buildHuntInvestigationConversationId({
            spaceId: HUNT_B_SPACE_ID,
            reportId: SPACE_REPORT_IDS.spaceB,
          }),
        }),
        getConversation({ fetch, spaceId: HUNT_B_SPACE_ID, conversationId }),
      ]);

      const problems = [
        ...(a.reports[reportId]?.conversation ? [] : ['space A has no Investigation']),
        ...(bOwn ? ['space B has an Investigation without being triggered'] : []),
        ...(bSeesA ? ["space A's Investigation is readable from space B"] : []),
      ];
      if (problems.length > 0) throw new Error(problems.join('; '));
    }
  );
});
