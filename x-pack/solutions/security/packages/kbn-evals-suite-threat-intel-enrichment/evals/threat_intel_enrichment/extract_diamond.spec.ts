/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { extractDiamondDataset } from '../../src/datasets/extract_diamond_dataset';
import {
  createDiamondNoIocLeakEvaluator,
  createSignalCountEvaluator,
} from '../../src/evaluators/extract_diamond_evaluators';

/**
 * LLM-judge criteria for Diamond prose quality and the vertex-separation
 * constraints the prompt enforces. Complements the deterministic CODE checks
 * (signal count, literal-IOC leak).
 */
const DIAMOND_CRITERIA = [
  'The infrastructure vertex summary characterises infrastructure by behaviour and pattern. It does not name a specific literal IP address, domain, URL, or email address.',
  'Every vertex marked HIGH or PARTIAL has a non-empty summary grounded in facts stated in the article; vertices with no support are marked NONE.',
  'The adversary vertex describes actor or operator behaviour and does not describe victim system characteristics.',
  'The victim vertex characterises the compromised systems or organisations generically and does not name a specific victim organisation.',
];

evaluate.describe(
  'Threat Intel Enrichment: extract_diamond',
  { tag: tags.stateful.classic },
  () => {
    evaluate(
      'extracts Diamond vertices within constraints',
      async ({ executorClient, threatIntelClient, evaluators }) => {
        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'threat_intel: extract_diamond',
                description:
                  'Diamond-suitable BlackHat demo packs. CODE-scored on signal count and literal-IOC leak; LLM-judged on vertex separation and prose grounding.',
                examples: extractDiamondDataset,
              },
            ],
            task: async ({ input }) => {
              if (!input) throw new Error('Missing extract_diamond input');
              return threatIntelClient.extractDiamond(input);
            },
          },
          [
            createSignalCountEvaluator(),
            createDiamondNoIocLeakEvaluator(),
            evaluators.criteria(DIAMOND_CRITERIA),
          ]
        );
      }
    );
  }
);
