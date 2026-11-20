/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { reviewIocsDataset } from '../../src/datasets/review_iocs_dataset';
import {
  createEmailHuntedEvaluator,
  createEmailNotHuntedEvaluator,
  createEmailUnlabelledEvaluator,
} from '../../src/evaluators/review_iocs_evaluators';

evaluate.describe(
  'Threat Intel Enrichment: review_iocs (emails)',
  { tag: tags.stateful.classic },
  () => {
    evaluate(
      'hunts attacker emails and not contact, researcher or victim addresses',
      async ({ executorClient, threatIntelClient }) => {
        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'threat_intel: review_iocs (emails)',
                description:
                  'Plain-prose emails through the real extract and enrich routes. Real publisher contact lines must not be hunted, authored attacker addresses must be, and the full set must hold on every repetition.',
                examples: reviewIocsDataset,
              },
            ],
            task: async ({ input }) => {
              if (!input) throw new Error('Missing review_iocs input');
              return threatIntelClient.reviewIocs(input);
            },
          },
          [
            createEmailNotHuntedEvaluator(),
            createEmailHuntedEvaluator(),
            createEmailUnlabelledEvaluator(),
          ]
        );
      }
    );
  }
);
