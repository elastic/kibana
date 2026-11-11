/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '../src/evaluate';
import { createCoverageEvaluators } from '../src/evaluators';
import { installFixtureRules } from '../src/fixture_rules';
import { prebuiltSuggestionDataset } from '../datasets/prebuilt_suggestion';
import { FIXTURE_RULES, verdictDataset } from '../datasets/verdicts';

const PREBUILT_SUGGESTION = 'detection-watch-rule-coverage: prebuilt suggestion';
const VERDICTS = 'detection-watch-rule-coverage: verdicts';

evaluate.describe('Detection Coverage Review', { tag: tags.serverless.security.complete }, () => {
  evaluate(
    'suggests the prebuilt rule that covers the gap',
    async ({ executorClient, coverageReviewClient }) => {
      await executorClient.runExperiment(
        {
          name: PREBUILT_SUGGESTION,
          datasets: [
            {
              name: PREBUILT_SUGGESTION,
              description:
                'Gaps that only an Elastic prebuilt rule covers. The review must return ' +
                'prebuilt_available and name the primary rule or an acceptable alternate.',
              examples: prebuiltSuggestionDataset,
            },
          ],
          task: async ({ input }) => coverageReviewClient.run(input),
        },
        createCoverageEvaluators()
      );
    }
  );

  evaluate(
    'returns the cheapest fix when rules are installed',
    async ({ executorClient, coverageReviewClient, fetch, log }) => {
      const removeFixtureRules = await installFixtureRules({ fetch, log, rules: FIXTURE_RULES });
      try {
        await executorClient.runExperiment(
          {
            name: VERDICTS,
            datasets: [
              {
                name: VERDICTS,
                description:
                  'Gaps that an installed rule covers (enabled or disabled), and gaps that ' +
                  'no rule can cover. Prebuilt look-alikes in the catalog are decoys.',
                examples: verdictDataset,
              },
            ],
            task: async ({ input }) => coverageReviewClient.run(input),
          },
          createCoverageEvaluators()
        );
      } finally {
        await removeFixtureRules();
      }
    }
  );
});
