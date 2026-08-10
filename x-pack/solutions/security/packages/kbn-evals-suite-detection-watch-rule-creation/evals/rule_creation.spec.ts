/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '../src/evaluate';
import {
  createFieldCoverageEvaluator,
  createGapAddressedEvaluator,
  createIntervalFormatEvaluator,
  createLookbackGapEvaluator,
  createMitreAccuracyEvaluator,
  createQuerySyntaxValidityEvaluator,
  createRiskScoreValidityEvaluator,
  createRuleTypeLanguageEvaluator,
  createSeverityValidityEvaluator,
} from '../src/evaluate_dataset';
import { goldenDataset } from '../datasets/rule_creation_golden';

evaluate.describe('Rule Creation Worker', { tag: tags.serverless.security.complete }, () => {
  evaluate(
    'generates a valid ES|QL detection rule for the stated gap',
    async ({ executorClient, evaluators, ruleCreationClient, log }) => {
      const allEvaluators = [
        createQuerySyntaxValidityEvaluator(),
        createFieldCoverageEvaluator(),
        createRuleTypeLanguageEvaluator(),
        createMitreAccuracyEvaluator(),
        createSeverityValidityEvaluator(),
        createRiskScoreValidityEvaluator(),
        createIntervalFormatEvaluator(),
        createLookbackGapEvaluator(),
        createGapAddressedEvaluator(evaluators),
      ];

      log.info(`Running rule creation evaluation with ${goldenDataset.length} examples`);

      await executorClient.runExperiment(
        {
          name: 'generates a valid ES|QL detection rule for the stated gap',
          datasets: [
            {
              name: 'detection-watch-rule-creation: golden',
              description:
                'Evaluates the Rule Creation Worker against known detection gaps with ground-truth MITRE mappings',
              examples: goldenDataset,
            },
          ],
          task: async ({ input }) => ruleCreationClient.run({ input }),
        },
        allEvaluators
      );

      log.info('Rule creation evaluation complete');
    }
  );
});
