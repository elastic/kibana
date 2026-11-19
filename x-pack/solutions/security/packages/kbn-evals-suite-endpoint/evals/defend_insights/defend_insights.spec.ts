/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import {
  seedScenario,
  waitForEndpointPackage,
  waitForTransformPropagation,
} from '../../src/data_generators/endpoint_data';
import {
  cleanupDefendInsightsData,
  DEFEND_INSIGHTS_AGENT_ID_PREFIX,
} from '../../src/data_generators/cleanup';
import { DEFEND_INSIGHTS_CASES } from '../../src/data_generators/defend_insights_data';
import type { DefendInsightsDatasetExample } from '../../src/defend_insights/types';

// A failed generation is a measurement, not a flake: retrying would re-spend LLM calls and
// hide a regression behind a lucky second attempt.
evaluate.describe.configure({ retries: 0 });

evaluate.describe(
  'Elastic Defend defend insights: incompatible antivirus',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ kbnClient, esClient, internalEsClient, log }) => {
      await waitForEndpointPackage(kbnClient, esClient, log);
      await cleanupDefendInsightsData({ esClient, internalEsClient, log });

      for (const { scenario } of DEFEND_INSIGHTS_CASES) {
        await seedScenario({ esClient, internalEsClient }, scenario);
      }

      // The route resolves endpoint OS through the united metadata transform.
      await waitForTransformPropagation(
        esClient,
        log,
        {
          metadataCurrent: DEFEND_INSIGHTS_CASES.length,
          metadataUnited: DEFEND_INSIGHTS_CASES.length,
        },
        180_000,
        DEFEND_INSIGHTS_AGENT_ID_PREFIX
      );
    });

    evaluate.afterAll(async ({ esClient, internalEsClient, log }) => {
      await cleanupDefendInsightsData({ esClient, internalEsClient, log });
    });

    evaluate('incompatible antivirus insights', async ({ evaluateDefendInsightsDataset, log }) => {
      const examples: DefendInsightsDatasetExample[] = DEFEND_INSIGHTS_CASES.map(
        ({ name, scenario, expected }) => ({
          input: { endpointId: scenario.agentId, insightType: 'incompatible_antivirus' },
          output: expected,
          metadata: { exampleName: name },
        })
      );

      const results = await evaluateDefendInsightsDataset({
        dataset: {
          name: 'defend insights: incompatible antivirus',
          description:
            'Drives the Defend Insights route for seeded Windows hosts and checks the AV groups it returns.',
          examples,
        },
      });

      // task_error results carry a null score, so an all-infra-failure run would otherwise look empty
      // rather than broken.
      const evaluationRuns = results.flatMap((result) => result.evaluationRuns);
      const taskErrors = evaluationRuns.filter(({ result }) => result?.label === 'task_error');
      log.info(
        `defend insights: ${taskErrors.length} of ${evaluationRuns.length} evaluator results were task_error`
      );
      if (taskErrors.length > 0) {
        log.warning(
          `defend insights task_error: ${[
            ...new Set(taskErrors.map(({ result }) => result?.explanation)),
          ].join(' | ')}`
        );
      }
    });
  }
);
