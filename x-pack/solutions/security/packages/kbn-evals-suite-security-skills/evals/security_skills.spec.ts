/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { securitySkillsExamples } from '../src/datasets';
import { seedFindRulesFixtures } from '../src/fixtures/find_rules_fixtures';

const DATASET_NAME = 'security: security-skills';
const DATASET_DESCRIPTION =
  'Agent Builder security skill routing: find-security-rules inventory queries and general security skills (alert-analysis, threat-hunting). Includes distractor examples.';

evaluate.describe('Security Skills', { tag: tags.stateful.classic }, () => {
  let teardown: (() => Promise<void>) | undefined;

  evaluate.beforeAll(async ({ kbnClient, esClient, log, uiSettings }) => {
    // Ensure Agent Builder experimental features are enabled
    await uiSettings.set({ 'agentBuilder:experimentalFeatures': true });
    const seeded = await seedFindRulesFixtures({ kbnClient, esClient, log });
    teardown = seeded.cleanup;
  });

  evaluate.afterAll(async ({ uiSettings }) => {
    await uiSettings.unset('agentBuilder:experimentalFeatures');
    if (teardown) await teardown();
  });

  evaluate('find-rules and security skill routing', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: DATASET_NAME,
        description: DATASET_DESCRIPTION,
        examples: securitySkillsExamples,
      },
    });
  });
});
