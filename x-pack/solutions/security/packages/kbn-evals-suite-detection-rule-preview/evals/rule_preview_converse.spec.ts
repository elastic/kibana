/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { previewConverseMatrix } from '../datasets/preview_converse_matrix';
import { evaluate } from '../src/evaluate';
import { createEvaluatePreviewDataset } from '../src/evaluate_dataset';
import { seedRulePreviewAlerts } from '../src/seed';

evaluate.describe(
  'Detection rule preview converse matrix',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(async ({ esClient, log }) => {
      await seedRulePreviewAlerts(esClient, 8);
      log.info('Seeded logs-endpoint.events.process-default failure events for preview evals');
    });

    evaluate(
      'multi-model Prompt A + Prompt B',
      async ({ executorClient, evaluators, chatClient, esClient, log }) => {
        const runDataset = createEvaluatePreviewDataset({
          evaluators,
          executorClient,
          chatClient,
          esClient,
          log,
        });

        await runDataset({
          dataset: {
            name: 'detection-rule-preview: converse-matrix',
            description:
              'Exercises detection-rule-edit + security.run_rule_preview CLI across models and prompt modes',
            examples: previewConverseMatrix.map((example) => ({
              ...example,
              input: {
                prompt: example.prompt,
                connectorId: example.connectorId,
              },
              output: null,
            })),
          },
        });
      }
    );
  }
);
