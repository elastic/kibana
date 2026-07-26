/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { evaluate } from '../src/evaluate';
import { personaMatrixDataset } from '../src/datasets';
import { seedChrysalisAlerts, cleanupChrysalisAlerts } from '../src/fixtures/chrysalis_seed';

const DATASET_NAME = 'security: security-persona-matrix';
const DATASET_DESCRIPTION =
  'Breadth-first persona matrix: 21 prompts across 7 security skill categories.';

evaluate.describe('Security Persona Matrix', { tag: tags.serverless.security.complete }, () => {
  evaluate.beforeAll(async ({ esClient, log }) => {
    await seedChrysalisAlerts({ esClient: esClient as unknown as EsClient, log, count: 3 });
    log.info('[persona-matrix] seeded Chrysalis alerts');
  });

  evaluate.afterAll(async ({ esClient, log }) => {
    await cleanupChrysalisAlerts({ esClient: esClient as unknown as EsClient, log });
  });

  evaluate('all 21 examples', async ({ evaluateDataset, log }) => {
    log.info(`Running persona matrix evaluation with ${personaMatrixDataset.length} examples`);

    await evaluateDataset({
      dataset: {
        name: DATASET_NAME,
        description: DATASET_DESCRIPTION,
        examples: personaMatrixDataset,
      },
    });

    log.info('Persona matrix evaluation complete');
  });
});
