/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../src/evaluate';
import { skillSelectionExamples } from '../datasets/skill_selection';

evaluate.describe('Detection Engineering Skill - Tool Selection', () => {
  evaluate(
    'selects correct tools for detection engineering queries',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'detection-engineering: skill selection',
          description:
            'Validates that the detection engineering skill invokes the correct tools for different query types',
          examples: skillSelectionExamples,
        },
      });
    }
  );
});
