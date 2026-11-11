/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '../src/evaluate';
import { createCoverageEvaluators } from '../src/evaluators';
import { installFixtureRules } from '../src/fixture_rules';
import { createJudgeCalibrationEvaluator } from '../src/judge_calibration';
import { prebuiltSuggestionDataset } from '../datasets/prebuilt_suggestion';
import { rationaleCalibrationDataset } from '../datasets/rationale_calibration';
import { FIXTURE_RULES, verdictDataset } from '../datasets/verdicts';

const PREBUILT_SUGGESTION = 'detection-watch-rule-coverage: prebuilt suggestion';
const VERDICTS = 'detection-watch-rule-coverage: verdicts';
const RATIONALE_CALIBRATION = 'detection-watch-rule-coverage: rationale judge calibration';

evaluate.describe('Detection Coverage Review', { tag: tags.serverless.security.complete }, () => {
  evaluate(
    'suggests the prebuilt rule that covers the gap',
    async ({ executorClient, coverageReviewClient, evaluators, fetch }) => {
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
        createCoverageEvaluators({ evaluators, fetch })
      );
    }
  );

  evaluate(
    'returns the cheapest fix when rules are installed',
    async ({ executorClient, coverageReviewClient, evaluators, fetch, log }) => {
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
          createCoverageEvaluators({ evaluators, fetch })
        );
      } finally {
        await removeFixtureRules();
      }
    }
  );

  // Calibration of the Rationale judge: written answers, no workflow run. The judge must pass the
  // correct answers and fail each bad one. A judge that passes everything would score 0 here.
  evaluate(
    'the rationale judge fails bad answers',
    async ({ executorClient, evaluators, fetch, log }) => {
      // CAL-02 and CAL-05 name an installed fixture rule.
      const removeFixtureRules = await installFixtureRules({ fetch, log, rules: FIXTURE_RULES });
      try {
        await executorClient.runExperiment(
          {
            name: RATIONALE_CALIBRATION,
            datasets: [
              {
                name: RATIONALE_CALIBRATION,
                description:
                  'Written answers with one known fault each, and correct answers as a control. ' +
                  'Scores the Rationale judge, not the coverage review.',
                examples: rationaleCalibrationDataset,
              },
            ],
            task: async ({ input }) => input.answer,
          },
          [createJudgeCalibrationEvaluator({ evaluators, fetch })]
        );
      } finally {
        await removeFixtureRules();
      }
    }
  );
});
