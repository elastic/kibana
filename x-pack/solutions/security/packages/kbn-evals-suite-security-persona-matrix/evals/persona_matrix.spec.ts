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
import {
  seedChrysalisAlerts,
  cleanupChrysalisAlerts,
  seedProfile,
} from '../src/fixtures/chrysalis_seed';
import { seedPersonaMatrixEnvironment, cleanupEnvSeeds } from '../src/fixtures/env_seeds';
import {
  seedPersonaMatrixTools,
  cleanupPersonaMatrixTools,
} from '../src/fixtures/persona_matrix_tools_seed';
import { assertPersonaMatrixToolsRegistered } from '../src/fixtures/tool_registration_check';

const DATASET_NAME = 'security: security-persona-matrix';
const DATASET_DESCRIPTION =
  'Breadth-first persona matrix: 21 prompts across 7 security skill categories.';

evaluate.describe('Security Persona Matrix', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
    await seedChrysalisAlerts({ esClient: esClient as unknown as EsClient, log, count: 3 });
    log.info('[persona-matrix] seeded Chrysalis alerts');
    await seedPersonaMatrixEnvironment({
      esClient: esClient as unknown as EsClient,
      kbnClient,
      log,
    });
    log.info('[persona-matrix] seeded environment-truth data (endpoint, labs, ti-mock, entity)');
    await seedPersonaMatrixTools({ kbnClient, log, parity: seedProfile === 'parity' });
    log.info(
      `[persona-matrix] seeded persona-matrix tools (profile: ${seedProfile}${
        seedProfile === 'parity' ? ' incl. original-era shims' : ''
      })`
    );
  });

  evaluate.afterAll(async ({ esClient, kbnClient, log }) => {
    await cleanupChrysalisAlerts({ esClient: esClient as unknown as EsClient, log });
    await cleanupEnvSeeds({
      esClient: esClient as unknown as EsClient,
      kbnClient,
      log,
    });
    await cleanupPersonaMatrixTools({ kbnClient, log });
  });

  evaluate('all 21 examples', async ({ evaluateDataset, kbnClient, log }) => {
    const examplesFilter = process.env.EVAL_EXAMPLES?.split(',')
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

    // Pre-flight: fail fast if an expected custom tool isn't registered, rather
    // than silently scoring a tool that doesn't exist.
    await assertPersonaMatrixToolsRegistered({ kbnClient, log });

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
