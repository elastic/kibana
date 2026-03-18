/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../src/evaluate';
import { workflowQualityExamples } from '../datasets/workflow_quality';

evaluate.describe('Detection Engineering Skill - Workflow Quality', () => {
  evaluate('handles multi-step detection engineering workflows', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'detection-engineering: workflow quality',
        description:
          'Validates end-to-end workflow quality for multi-step detection engineering scenarios',
        examples: workflowQualityExamples,
      },
    });
  });
});
