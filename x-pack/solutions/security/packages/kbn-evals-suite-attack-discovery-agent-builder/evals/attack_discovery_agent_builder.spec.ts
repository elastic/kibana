/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { cleanupAttackDiscoveryFixtures, seedAttackDiscoveryFixtures } from '../src/fixtures';
import { goldenPathDataset, goldenPathExamples } from '../src/dataset';
import { evaluate } from '../src/evaluate';

// The dataset object carries the examples' scoring annotations AND the
// declaration of the checks this fixture cannot feed
// (`goldenPathDataset.nonScoringEvaluators`); every slice below spreads it, so a
// slice can never silently lose either.
const dataset = goldenPathDataset;

evaluate.describe('Attack Discovery Agent Builder', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ esClient, fetch }) => {
    await seedAttackDiscoveryFixtures(esClient, fetch);
    await fetch('/internal/elastic_assistant/update_anonymization_fields', {
      method: 'POST',
      headers: { 'elastic-api-version': '1' },
    });
  });

  evaluate.afterAll(async ({ esClient }) => {
    await cleanupAttackDiscoveryFixtures(esClient);
  });

  evaluate('golden provided-alerts path', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        ...dataset,
        name: `${dataset.name} (provided-alerts)`,
        examples: goldenPathExamples.filter(
          ({ metadata }) => metadata?.fixture === 'provided-alerts'
        ),
      },
    });
  });

  evaluate('golden live-retrieval path', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        ...dataset,
        name: `${dataset.name} (live-retrieval)`,
        examples: goldenPathExamples.filter(
          ({ metadata }) => metadata?.fixture === 'live-retrieval'
        ),
      },
    });
  });

  evaluate('non-golden multiple-alert-sets path', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        ...dataset,
        name: `${dataset.name} (multiple-alert-sets)`,
        examples: goldenPathExamples.filter(
          ({ metadata }) => metadata?.fixture === 'multiple-alert-sets'
        ),
      },
    });
  });

  evaluate('non-golden missing-alert retrieval', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        ...dataset,
        name: `${dataset.name} (missing-alert-retrieval)`,
        examples: goldenPathExamples.filter(
          ({ metadata }) => metadata?.fixture === 'missing-alert-retrieval'
        ),
      },
    });
  });

  evaluate('non-golden status-only mode', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        ...dataset,
        name: `${dataset.name} (status-only)`,
        examples: goldenPathExamples.filter(({ metadata }) => metadata?.fixture === 'status-only'),
      },
    });
  });
});
