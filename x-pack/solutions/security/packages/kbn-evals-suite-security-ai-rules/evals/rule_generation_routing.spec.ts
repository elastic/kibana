/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { seedFindRulesFixtures } from '@kbn/evals-suite-security-skills/src/fixtures/find_rules_fixtures';
import { evaluate } from '../src/evaluate';
import { ruleRoutingExamples } from '../datasets/routing_examples';

const DATASET_NAME = 'security-ai-rules: rule-generation-routing';
const DATASET_DESCRIPTION =
  'Default-agent natural-language routing for detection rule creation vs find-security-rules inventory queries. Track B — L1/L2/L4 baseline without forced tool prompt or rule attachment.';

evaluate.describe('AI Rule Generation Routing', { tag: tags.serverless.security.complete }, () => {
  let teardown: (() => Promise<void>) | undefined;

  evaluate.beforeAll(async ({ kbnClient, esClient, log, uiSettings }) => {
    await uiSettings.set({ 'agentBuilder:experimentalFeatures': true });
    const seeded = await seedFindRulesFixtures({ kbnClient, esClient, log });
    teardown = seeded.cleanup;
  });

  evaluate.afterAll(async ({ uiSettings }) => {
    await uiSettings.unset('agentBuilder:experimentalFeatures');
    if (teardown) await teardown();
  });

  evaluate(
    'routes rule creation and find-rules intents on the default agent',
    async ({ evaluateRoutingDataset, log }) => {
      log.info(
        `Running rule-generation routing evaluation with ${ruleRoutingExamples.length} examples`
      );
      await evaluateRoutingDataset({
        dataset: {
          name: DATASET_NAME,
          description: DATASET_DESCRIPTION,
          examples: ruleRoutingExamples,
        },
      });
      log.info('Rule-generation routing evaluation complete');
    }
  );
});
