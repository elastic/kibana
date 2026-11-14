/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aesopSelectWinnerStepDefinition } from './aesop_select_winner_step';

type Context = Parameters<typeof aesopSelectWinnerStepDefinition.handler>[0];

describe('aesopSelectWinnerStepDefinition', () => {
  it('applies the schema defaults before selecting', async () => {
    const result = await aesopSelectWinnerStepDefinition.handler({
      input: {
        comparison: {
          baseline_id: 'base',
          comparisons: [
            {
              target_id: 'arm',
              results: [
                {
                  evaluatorName: 'correctness.factuality',
                  sampleSize: 10,
                  meanBaseline: 0.4,
                  meanTarget: 0.8,
                  pValue: 0.01,
                  direction: 'maximize',
                },
              ],
            },
          ],
        },
      },
    } as unknown as Context);

    expect(result.output).toMatchObject({ winner_target_id: 'arm', beats_baseline: true });
  });

  it('does not gate on a regressing evaluator when quality_evaluators is omitted', async () => {
    const result = await aesopSelectWinnerStepDefinition.handler({
      input: {
        comparison: {
          baseline_id: 'base',
          comparisons: [
            {
              target_id: 'arm',
              results: [
                {
                  evaluatorName: 'correctness.factuality',
                  sampleSize: 15,
                  meanBaseline: 0.4,
                  meanTarget: 0.8,
                  pValue: 0.01,
                  direction: 'maximize',
                },
                {
                  evaluatorName: 'skill-pii',
                  sampleSize: 15,
                  meanBaseline: 1,
                  meanTarget: 0,
                  pValue: 0.001,
                  direction: 'maximize',
                },
              ],
            },
          ],
        },
        code_tolerance: 0.05,
      },
    } as unknown as Context);

    expect(result.output).toMatchObject({
      winner_target_id: 'arm',
      beats_baseline: true,
      rejected: [],
    });
  });

  it('returns an error for invalid input', async () => {
    const result = await aesopSelectWinnerStepDefinition.handler({
      input: { comparison: {} },
    } as unknown as Context);

    expect(result.error?.message).toContain('Invalid input');
  });
});
