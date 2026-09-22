/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import {
  bitsMshtaProvidedAlertsExample,
  cleanProfileProvidedAlertsDataset,
  encodedPowershellProvidedAlertsExample,
  linuxCurlProvidedAlertsExample,
  wmiLateralProvidedAlertsExample,
} from '../src/datasets/clean_profile_provided_alerts';
import { cleanupAd2ScenarioProfile, seedAd2ScenarioProfile } from '../src/scenario_registry';
import { evaluate } from '../src/evaluate';

evaluate.describe(
  'Attack Discovery Agent Builder — clean profile (scenario registry)',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ esClient, fetch }) => {
      await seedAd2ScenarioProfile(esClient, fetch, { profile: 'clean' });
      await fetch('/internal/elastic_assistant/update_anonymization_fields', {
        method: 'POST',
        headers: { 'elastic-api-version': '1' },
      });
    });

    evaluate.afterAll(async ({ esClient }) => {
      await cleanupAd2ScenarioProfile(esClient);
    });

    evaluate(
      'scenario registry encoded-powershell provided-alerts',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            ...cleanProfileProvidedAlertsDataset,
            name: `${cleanProfileProvidedAlertsDataset.name} (encoded-powershell)`,
            examples: [encodedPowershellProvidedAlertsExample],
          },
        });
      }
    );

    evaluate('scenario registry bits-mshta provided-alerts', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          ...cleanProfileProvidedAlertsDataset,
          name: `${cleanProfileProvidedAlertsDataset.name} (bits-mshta)`,
          examples: [bitsMshtaProvidedAlertsExample],
        },
      });
    });

    evaluate('scenario registry linux-curl provided-alerts', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          ...cleanProfileProvidedAlertsDataset,
          name: `${cleanProfileProvidedAlertsDataset.name} (linux-curl)`,
          examples: [linuxCurlProvidedAlertsExample],
        },
      });
    });

    evaluate('scenario registry wmi-lateral provided-alerts', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          ...cleanProfileProvidedAlertsDataset,
          name: `${cleanProfileProvidedAlertsDataset.name} (wmi-lateral)`,
          examples: [wmiLateralProvidedAlertsExample],
        },
      });
    });
  }
);
