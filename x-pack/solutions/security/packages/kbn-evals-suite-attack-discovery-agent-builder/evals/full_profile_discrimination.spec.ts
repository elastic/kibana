/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { buildFullProfileDiscriminationDataset } from '../src/datasets/full_profile_discrimination';
import { evaluate } from '../src/evaluate';
import {
  cleanupAd2ScenarioProfile,
  createAd2RunMarker,
  seedAd2ScenarioProfile,
} from '../src/scenario_registry';

const runMarker = createAd2RunMarker();

evaluate.describe(
  'Attack Discovery Agent Builder — full profile (on-demand)',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ esClient, fetch }) => {
      await seedAd2ScenarioProfile(esClient, fetch, { profile: 'full', runMarker });
      await fetch('/internal/elastic_assistant/update_anonymization_fields', {
        method: 'POST',
        headers: { 'elastic-api-version': '1' },
      });
    });

    evaluate.afterAll(async ({ esClient }) => {
      await cleanupAd2ScenarioProfile(esClient, { runMarker });
    });

    evaluate('full profile live-retrieval noise discrimination', async ({ evaluateDataset }) => {
      await evaluateDataset({ dataset: buildFullProfileDiscriminationDataset(runMarker) });
    });
  }
);
