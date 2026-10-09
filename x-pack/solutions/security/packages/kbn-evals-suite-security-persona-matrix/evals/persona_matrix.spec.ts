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
import {
  seedPersonaMatrixTools,
  cleanupPersonaMatrixTools,
} from '../src/fixtures/persona_matrix_tools_seed';

const DATASET_NAME = 'security: security-persona-matrix';
const DATASET_DESCRIPTION =
  'Breadth-first persona matrix: 21 prompts across 7 security skill categories.';

evaluate.describe('Security Persona Matrix', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
    await seedChrysalisAlerts({ esClient: esClient as unknown as EsClient, log, count: 3 });
    log.info('[persona-matrix] seeded Chrysalis alerts');
    await seedPersonaMatrixTools({ kbnClient, log });
    log.info('[persona-matrix] seeded virustotal_lookup + on_call_lookup tools');
  });

  evaluate.afterAll(async ({ esClient, kbnClient, log }) => {
    await cleanupChrysalisAlerts({ esClient: esClient as unknown as EsClient, log });
    await cleanupPersonaMatrixTools({ kbnClient, log });
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
