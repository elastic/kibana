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
    const seedProfile = process.env.SEED_PROFILE === 'parity' ? 'parity' : 'minimal';
    await seedPersonaMatrixTools({ kbnClient, log, parity: seedProfile === 'parity' });
    log.info(
      `[persona-matrix] seeded persona-matrix tools (profile: ${seedProfile}${
        seedProfile === 'parity' ? ' incl. original-era shims' : ''
      })`
    );
  });

  evaluate.afterAll(async ({ esClient, kbnClient, log }) => {
    await cleanupChrysalisAlerts({ esClient: esClient as unknown as EsClient, log });
    await cleanupPersonaMatrixTools({ kbnClient, log });
  });

  evaluate('all 21 examples', async ({ evaluateDataset, log }) => {
    const examplesFilter = process.env.EVAL_EXAMPLES
      ?.split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const examples = examplesFilter
      ? personaMatrixDataset.filter((ex) => examplesFilter.includes(ex.id))
      : personaMatrixDataset;
    if (examples.length === 0) {
      throw new Error(`EVAL_EXAMPLES matched no examples: ${examplesFilter?.join(',')}`);
    }

    log.info(
      `Running persona matrix evaluation with ${examples.length} examples${
        examplesFilter ? ` (filtered: ${examplesFilter.join(',')})` : ''
      }`
    );

    await evaluateDataset({
      dataset: {
        name: DATASET_NAME,
        description: DATASET_DESCRIPTION,
        examples,
      },
    });

    log.info('Persona matrix evaluation complete');
  });
});
