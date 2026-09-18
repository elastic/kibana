/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { buildDenseProfileLiveRetrievalDataset } from '../src/datasets/dense_profile_live_retrieval';
import {
  cleanupAd2ScenarioProfile,
  createAd2RunMarker,
  seedAd2ScenarioProfile,
} from '../src/scenario_registry';
import type { Ad2SeedRunScope } from '../src/scenario_registry';
import { evaluate } from '../src/evaluate';

// This run's marker, created here rather than in `beforeAll` so the dataset the
// spec evaluates is built from the same marker the seed writes with: the
// retrieval scope, the expected population and the reference `alertIds` all
// name THIS run's documents, and the cleanup can only reach them.
const runMarker = createAd2RunMarker();
const dataset = buildDenseProfileLiveRetrievalDataset(runMarker);

// The scope the cleanup deletes: whatever this spec's own seed stamped, so the
// `afterAll` can never reach a concurrent run's documents.
let seeded: Ad2SeedRunScope | undefined;

evaluate.describe(
  'Attack Discovery Agent Builder — dense profile (scenario registry)',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ esClient, fetch }) => {
      seeded = await seedAd2ScenarioProfile(esClient, fetch, { profile: 'dense', runMarker });
      await fetch('/internal/elastic_assistant/update_anonymization_fields', {
        method: 'POST',
        headers: { 'elastic-api-version': '1' },
      });
    });

    evaluate.afterAll(async ({ esClient }) => {
      if (seeded !== undefined) {
        await cleanupAd2ScenarioProfile(esClient, seeded);
      }
    });

    evaluate('dense profile live retrieval', async ({ evaluateDataset }) => {
      await evaluateDataset({ dataset });
    });
  }
);
