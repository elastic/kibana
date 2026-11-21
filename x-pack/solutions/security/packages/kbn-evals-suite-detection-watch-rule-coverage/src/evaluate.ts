/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { prebuiltSuggestionDataset } from '../datasets/prebuilt_suggestion';
import { CoverageReviewClient } from './coverage_review_client';
import { prepareCoverageEnvironment } from './preflight';

// `{}` is the repo-wide convention for an empty test-fixture bag in `base.extend`.
export const evaluate = base.extend<
  {},
  {
    coverageEnvironment: { inferenceId: string };
    coverageReviewClient: CoverageReviewClient;
  }
>({
  // `auto` so a spec cannot skip the setup and score a stack that cannot give a right answer.
  coverageEnvironment: [
    async ({ fetch, esClient, log, connector }, use) => {
      const { inferenceId, cleanup } = await prepareCoverageEnvironment({
        fetch,
        esClient,
        log,
        connector,
        expectedPrebuiltRuleIds: prebuiltSuggestionDataset.flatMap(({ output }) =>
          output.primaryRule ? [output.primaryRule.ruleId] : []
        ),
      });
      await use({ inferenceId });
      await cleanup();
    },
    { scope: 'worker', auto: true },
  ],
  coverageReviewClient: [
    async ({ fetch, esClient, log, coverageEnvironment }, use) => {
      const client = new CoverageReviewClient(
        fetch,
        esClient,
        log,
        coverageEnvironment.inferenceId
      );
      await use(client);
      // A failed experiment does not wait for its running examples, so some runs are still open.
      await client.removeOpenRuns();
    },
    { scope: 'worker' },
  ],
});

export { tags } from '@kbn/evals';
