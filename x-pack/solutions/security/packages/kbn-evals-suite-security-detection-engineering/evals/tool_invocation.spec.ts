/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../src/evaluate';
import { toolInvocationExamples } from '../datasets/tool_invocation';

evaluate.describe('Detection Engineering Skill - Tool Invocation', () => {
  evaluate('invokes tools with correct parameters', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'detection-engineering: tool invocation',
        description:
          'Validates that the detection engineering skill invokes tools with correct parameters and criteria',
        examples: toolInvocationExamples,
      },
    });
  });
});
