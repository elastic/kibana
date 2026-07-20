/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import { createEvaluatePreviewDataset } from '../src/evaluate_dataset';
import { seedRulePreviewAlerts } from '../src/seed';
import { PROMPT_INDEXED, PROMPT_VAGUE } from '../src/types';
import type { PreviewExample } from '../src/types';

const PREVIEW_DATASET: PreviewExample[] = [
  {
    input: { prompt: PROMPT_VAGUE },
    output: null,
    metadata: { promptMode: 'vague', minAlertCount: 1 },
  },
  {
    input: { prompt: PROMPT_INDEXED },
    output: null,
    metadata: { promptMode: 'indexed', minAlertCount: 1 },
  },
];

evaluate.describe(
  'Detection rule preview converse',
  { tag: tags.serverless.security.complete },
  () => {
    // agentBuilder:experimentalFeatures is forced on for this suite via the
    // evals_rule_preview Scout server config (--uiSettings.overrides.*), so it
    // is not toggled here — the settings API rejects mutating an overridden key.
    evaluate.beforeAll(async ({ esClient, log }) => {
      await seedRulePreviewAlerts(esClient, 8);
      log.info('Seeded logs-endpoint.events.process-default failure events for preview evals');
    });

    evaluate(
      'vague + indexed prompt modes',
      async ({ executorClient, evaluators, chatClient, esClient, connector, log }) => {
        const runDataset = createEvaluatePreviewDataset({
          evaluators,
          executorClient,
          chatClient,
          esClient,
          connectorId: connector.id,
          log,
        });

        await runDataset({
          dataset: {
            name: 'detection-rule-preview: converse',
            description:
              'Exercises detection-rule-edit + security.run_rule_preview CLI across vague and indexed prompt modes. ' +
              'The model/connector is provided by the Scout-driven Playwright project config.',
            examples: PREVIEW_DATASET,
          },
        });
      }
    );
  }
);
